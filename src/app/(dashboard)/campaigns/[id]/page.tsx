import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import TemplateEditor from "./template-editor";
import ContactSelector from "./contact-selector";
import PrepareSendButton from "./prepare-send-button";
import AiPromptEditor from "./ai-prompt-editor";
import AiEmailGenerator from "./ai-email-generator";
import CampaignAnalytics from "./campaign-analytics";
import ResumeSendButton from "./resume-send-button";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sending: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      templates: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      companyName: true,
      isUnsubscribed: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch existing AI-generated emails for this campaign
  const generatedEmails = await prisma.campaignEmail.findMany({
    where: { campaignId: id, aiGenerated: true },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyName: true,
        },
      },
    },
    orderBy: { contact: { firstName: "asc" } },
  });

  const savedEmails = generatedEmails.map((e) => ({
    id: e.id,
    contactId: e.contact.id,
    contactName: `${e.contact.firstName} ${e.contact.lastName ?? ""}`.trim(),
    contactEmail: e.contact.email,
    companyName: e.contact.companyName,
    generatedBody: e.generatedBody ?? "",
  }));

  const isDraft = campaign.status === "draft";
  const isSending = campaign.status === "sending";

  // Fetch all campaign emails with relations for analytics (non-draft campaigns)
  const campaignEmails = !isDraft
    ? await prisma.campaignEmail.findMany({
        where: { campaignId: id },
        include: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          domain: {
            select: { fromEmail: true },
          },
          template: true,
        },
        orderBy: { sentAt: "desc" },
      })
    : [];

  // Count pending emails for resume functionality
  const pendingEmailCount = campaignEmails.filter(
    (e) => e.status === "pending"
  ).length;

  const analyticsEmails = campaignEmails.map((e) => ({
    id: e.id,
    status: e.status,
    sentAt: e.sentAt?.toISOString() ?? null,
    openedAt: e.openedAt?.toISOString() ?? null,
    clickedAt: e.clickedAt?.toISOString() ?? null,
    errorMessage: e.errorMessage,
    contactName:
      `${e.contact.firstName} ${e.contact.lastName ?? ""}`.trim(),
    contactEmail: e.contact.email,
    domainFrom: e.domain.fromEmail,
    templateName: e.template?.versionName ?? "AI Generated",
  }));

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/campaigns"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          &larr; Back to campaigns
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {campaign.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Subject: {campaign.subject}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[campaign.status] ?? "bg-gray-100 text-gray-700"}`}
          >
            {campaign.status}
          </span>
        </div>
        <div className="mt-3 flex gap-4 text-sm text-gray-500">
          <span>
            Format: {campaign.emailFormat === "html" ? "HTML" : "Plain Text"}
          </span>
          <span>Delay: {campaign.delaySeconds}s</span>
          {campaign.sentAt && (
            <span suppressHydrationWarning>
              Sent: {new Date(campaign.sentAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Resume button for stuck campaigns */}
      {isSending && pendingEmailCount > 0 && (
        <div className="mb-6">
          <ResumeSendButton
            campaignId={campaign.id}
            pendingCount={pendingEmailCount}
          />
        </div>
      )}

      {/* Analytics section for non-draft campaigns */}
      {!isDraft && (
        <CampaignAnalytics
          campaignName={campaign.name}
          sentAt={campaign.sentAt?.toISOString() ?? null}
          emails={analyticsEmails}
        />
      )}

      <TemplateEditor
        campaignId={campaign.id}
        initialTemplates={campaign.templates.map((t) => ({
          id: t.id,
          versionName: t.versionName,
          body: t.body,
          sortOrder: t.sortOrder,
        }))}
        emailFormat={campaign.emailFormat}
        readOnly={!isDraft}
      />

      <ContactSelector
        campaignId={campaign.id}
        contacts={contacts}
        initialSelectedIds={campaign.selectedContactIds}
        readOnly={!isDraft}
      />

      <AiPromptEditor
        campaignId={campaign.id}
        initialPrompt={campaign.aiPrompt}
        readOnly={!isDraft}
      />

      <AiEmailGenerator
        campaignId={campaign.id}
        hasPrompt={!!campaign.aiPrompt?.trim()}
        contactCount={campaign.selectedContactIds.length}
        readOnly={!isDraft}
        savedEmails={savedEmails}
      />

      {isDraft && (
        <div className="mt-6">
          <PrepareSendButton
            campaignId={campaign.id}
            contactCount={campaign.selectedContactIds.length}
            templateCount={campaign.templates.length}
            hasAiEmails={savedEmails.length > 0}
          />
        </div>
      )}
    </div>
  );
}
