import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateEmailForContact, ContactContext } from "@/lib/ai-generate";
import { scrapeWebsite } from "@/lib/scraper";

function isAuthOrBillingError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status: number }).status;
    // 401 = invalid API key, 403 = forbidden/billing issue
    return status === 401 || status === 403;
  }
  return false;
}

function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    return (err as { status: number }).status === 429;
  }
  return false;
}

function getRetryAfterMs(err: unknown): number {
  if (err && typeof err === "object" && "headers" in err) {
    const headers = (err as { headers: Record<string, string> }).headers;
    const retryAfter = headers?.["retry-after"];
    if (retryAfter) {
      const seconds = parseFloat(retryAfter);
      if (!isNaN(seconds)) return seconds * 1000;
    }
  }
  return 5000;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFriendlyErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status: number }).status;
    if (status === 401) return "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY in .env";
    if (status === 403) return "Anthropic API access denied. Please check your billing at console.anthropic.com";
  }
  return err instanceof Error ? err.message : "Unknown error";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  const body = await request.json();
  const contactIds: string[] | undefined = body.contactIds;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      aiPrompt: true,
      subject: true,
      emailFormat: true,
      selectedContactIds: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  if (campaign.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft campaigns can generate AI emails." },
      { status: 400 }
    );
  }

  if (!campaign.aiPrompt?.trim()) {
    return NextResponse.json(
      { error: "AI prompt is required. Save your prompt first." },
      { status: 400 }
    );
  }

  // Determine which contacts to generate for
  const targetContactIds = contactIds ?? campaign.selectedContactIds;

  if (targetContactIds.length === 0) {
    return NextResponse.json(
      { error: "No contacts selected for this campaign." },
      { status: 400 }
    );
  }

  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: targetContactIds },
      isUnsubscribed: false,
    },
  });

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "No eligible contacts found." },
      { status: 400 }
    );
  }

  // Stream results using ReadableStream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const totalTokens = { prompt: 0, completion: 0, total: 0 };
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];

        // Scrape company website if domain is available
        let websiteContent: string | null = null;
        if (contact.companyDomain) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "scraping",
                contactId: contact.id,
                contactName: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
                companyDomain: contact.companyDomain,
              })}\n\n`
            )
          );

          const scrapeResult = await scrapeWebsite(contact.companyDomain);
          if (scrapeResult.content) {
            websiteContent = scrapeResult.content;
            console.log(
              `[scraper] ${contact.companyDomain}: extracted ${scrapeResult.content.length} chars`
            );
          } else {
            console.log(
              `[scraper] ${contact.companyDomain}: failed - ${scrapeResult.error}`
            );
          }
        }

        const contactContext: ContactContext = {
          firstName: contact.firstName,
          lastName: contact.lastName,
          title: contact.title,
          email: contact.email,
          companyName: contact.companyName,
          companyIndustry: contact.companyIndustry,
          companySize: contact.companySize?.toString() ?? null,
          companySizeRange: contact.companySizeRange,
          companyRevenue: contact.companyRevenue,
          companyFunding: contact.companyFunding,
          companyType: contact.companyType,
          companyDescription: contact.companyDescription,
          location: contact.location,
          region: contact.region,
          country: contact.country,
          decisionMaker: contact.decisionMaker,
          websiteContent,
        };

        try {
          const result = await generateEmailForContact(contactContext, {
            aiPrompt: campaign.aiPrompt!,
            subject: campaign.subject,
            emailFormat: campaign.emailFormat as "html" | "plain_text",
          });

          totalTokens.prompt += result.tokensUsed.prompt;
          totalTokens.completion += result.tokensUsed.completion;
          totalTokens.total += result.tokensUsed.total;
          successCount++;

          // Send progress event
          const event = {
            type: "progress" as const,
            contactId: contact.id,
            contactName: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
            contactEmail: contact.email,
            body: result.body,
            completed: i + 1,
            total: contacts.length,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch (err) {
          // If auth/billing error, stop all remaining contacts immediately
          if (isAuthOrBillingError(err)) {
            const quotaError = getFriendlyErrorMessage(err);

            // Mark current contact as failed
            errorCount++;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  contactId: contact.id,
                  contactName: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
                  contactEmail: contact.email,
                  error: quotaError,
                  completed: i + 1,
                  total: contacts.length,
                })}\n\n`
              )
            );

            // Mark all remaining contacts as failed (skip calling API)
            for (let j = i + 1; j < contacts.length; j++) {
              errorCount++;
              const remaining = contacts[j];
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    contactId: remaining.id,
                    contactName: `${remaining.firstName} ${remaining.lastName ?? ""}`.trim(),
                    contactEmail: remaining.email,
                    error: quotaError,
                    completed: j + 1,
                    total: contacts.length,
                  })}\n\n`
                )
              );
            }
            break;
          }

          // If rate limited, retry once after delay
          if (isRateLimitError(err)) {
            const retryAfter = getRetryAfterMs(err);
            await sleep(retryAfter);

            try {
              const result = await generateEmailForContact(contactContext, {
                aiPrompt: campaign.aiPrompt!,
                subject: campaign.subject,
                emailFormat: campaign.emailFormat as "html" | "plain_text",
              });

              totalTokens.prompt += result.tokensUsed.prompt;
              totalTokens.completion += result.tokensUsed.completion;
              totalTokens.total += result.tokensUsed.total;
              successCount++;

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "progress",
                    contactId: contact.id,
                    contactName: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
                    contactEmail: contact.email,
                    body: result.body,
                    completed: i + 1,
                    total: contacts.length,
                  })}\n\n`
                )
              );
              continue;
            } catch {
              // Retry failed, fall through to error handling
            }
          }

          errorCount++;
          const message =
            err instanceof Error ? err.message : "Unknown error";

          const event = {
            type: "error" as const,
            contactId: contact.id,
            contactName: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
            contactEmail: contact.email,
            error: message,
            completed: i + 1,
            total: contacts.length,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        }
      }

      // Send completion event
      const doneEvent = {
        type: "done" as const,
        successCount,
        errorCount,
        totalTokens,
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
