/**
 * Cron script to send pending campaign emails
 * Run with: npx tsx scripts/send-emails.ts
 */

import pg from "pg";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const resend = new Resend(process.env.RESEND_API_KEY);

type ContactForTemplate = {
  firstName?: string;
  lastName?: string;
  title?: string;
  companyName?: string;
  companyIndustry?: string;
  location?: string;
  country?: string;
};

function replaceTemplateVariables(
  body: string,
  contact: ContactForTemplate,
  unsubscribeUrl?: string
): string {
  let result = body
    .replace(/\{\{firstName\}\}/g, contact.firstName ?? "")
    .replace(/\{\{lastName\}\}/g, contact.lastName ?? "")
    .replace(/\{\{title\}\}/g, contact.title ?? "")
    .replace(/\{\{companyName\}\}/g, contact.companyName ?? "")
    .replace(/\{\{companyIndustry\}\}/g, contact.companyIndustry ?? "")
    .replace(/\{\{location\}\}/g, contact.location ?? "")
    .replace(/\{\{country\}\}/g, contact.country ?? "");

  if (unsubscribeUrl) {
    result = result.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);
  }

  return result;
}

async function main() {
  console.log("[CRON] Starting email send job...");

  // Find campaigns in "sending" status
  const campaignsResult = await pool.query(`
    SELECT id, subject, email_format, delay_seconds
    FROM campaigns
    WHERE status = 'sending'
  `);

  if (campaignsResult.rows.length === 0) {
    console.log("[CRON] No campaigns in sending status");
    await pool.end();
    return;
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const campaign of campaignsResult.rows) {
    console.log(`[CRON] Processing campaign: ${campaign.id}`);

    // Get last sent email to check delay
    const lastSentResult = await pool.query(
      `
      SELECT sent_at FROM campaign_emails
      WHERE campaign_id = $1 AND status IN ('sent', 'delivered')
      ORDER BY sent_at DESC LIMIT 1
    `,
      [campaign.id]
    );

    const lastSentAt = lastSentResult.rows[0]?.sent_at;
    if (lastSentAt && campaign.delay_seconds > 0) {
      const timeSinceLastSend =
        (Date.now() - new Date(lastSentAt).getTime()) / 1000;

      if (timeSinceLastSend < campaign.delay_seconds) {
        const waitTime = Math.ceil(campaign.delay_seconds - timeSinceLastSend);
        console.log(`[CRON] Campaign ${campaign.id}: waiting ${waitTime}s`);
        continue;
      }
    }

    // Get one pending email
    const pendingResult = await pool.query(
      `
      SELECT ce.id, ce.contact_id, ce.generated_body,
             c.email, c.first_name, c.last_name, c.title,
             c.company_name, c.company_industry, c.location, c.country,
             d.from_name, d.from_email,
             ct.body as template_body
      FROM campaign_emails ce
      JOIN contacts c ON ce.contact_id = c.id
      JOIN domains d ON ce.domain_id = d.id
      LEFT JOIN campaign_templates ct ON ce.template_id = ct.id
      WHERE ce.campaign_id = $1 AND ce.status = 'pending'
      ORDER BY ce.id ASC LIMIT 1
    `,
      [campaign.id]
    );

    if (pendingResult.rows.length === 0) {
      console.log(`[CRON] Campaign ${campaign.id}: no pending emails, marking completed`);
      await pool.query(`UPDATE campaigns SET status = 'completed' WHERE id = $1`, [
        campaign.id,
      ]);
      continue;
    }

    const email = pendingResult.rows[0];
    console.log(`[CRON] Sending to: ${email.email}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?contactId=${email.contact_id}`;

    const contactData: ContactForTemplate = {
      firstName: email.first_name,
      lastName: email.last_name,
      title: email.title,
      companyName: email.company_name,
      companyIndustry: email.company_industry,
      location: email.location,
      country: email.country,
    };

    const rawBody = email.generated_body ?? email.template_body ?? "";
    const emailBody = replaceTemplateVariables(rawBody, contactData, unsubscribeUrl);

    // Apply template variables to subject for personalization
    const personalizedSubject = replaceTemplateVariables(campaign.subject, contactData);

    const finalBody =
      campaign.email_format === "html"
        ? `<div style="margin-bottom:20px"><img src="${appUrl}/giorgi.png" alt="${email.from_name}" style="width:48px;height:48px;border-radius:50%;object-fit:cover" /></div>${emailBody}`
        : emailBody;

    try {
      const result = await resend.emails.send({
        from: `${email.from_name} <${email.from_email}>`,
        to: [email.email],
        subject: personalizedSubject,
        ...(campaign.email_format === "html"
          ? { html: finalBody }
          : { text: finalBody }),
      });

      if (result.error) {
        console.log(`[CRON] FAILED:`, result.error.message);
        await pool.query(
          `UPDATE campaign_emails SET status = 'failed', error_message = $1 WHERE id = $2`,
          [result.error.message, email.id]
        );
        totalFailed++;
      } else {
        console.log(`[CRON] SUCCESS:`, result.data?.id);
        await pool.query(
          `UPDATE campaign_emails SET status = 'sent', resend_id = $1, sent_at = NOW() WHERE id = $2`,
          [result.data?.id, email.id]
        );
        totalSent++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.log(`[CRON] EXCEPTION:`, message);
      await pool.query(
        `UPDATE campaign_emails SET status = 'failed', error_message = $1 WHERE id = $2`,
        [message, email.id]
      );
      totalFailed++;
    }
  }

  console.log(`[CRON] Done. Sent: ${totalSent}, Failed: ${totalFailed}`);
  await pool.end();
}

main().catch((err) => {
  console.error("[CRON] Fatal error:", err);
  process.exit(1);
});
