-- CreateEnum
CREATE TYPE "InboxMessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "InboxMessageStatus" AS ENUM ('unread', 'read', 'archived');

-- CreateTable
CREATE TABLE "inbox_messages" (
    "id" TEXT NOT NULL,
    "campaign_email_id" TEXT,
    "contact_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "message_id" TEXT,
    "in_reply_to" TEXT,
    "direction" "InboxMessageDirection" NOT NULL,
    "status" "InboxMessageStatus" NOT NULL DEFAULT 'unread',
    "from_email" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text_body" TEXT,
    "html_body" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resend_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbox_messages_message_id_key" ON "inbox_messages"("message_id");

-- CreateIndex
CREATE INDEX "inbox_messages_contact_id_idx" ON "inbox_messages"("contact_id");

-- CreateIndex
CREATE INDEX "inbox_messages_campaign_id_idx" ON "inbox_messages"("campaign_id");

-- CreateIndex
CREATE INDEX "inbox_messages_status_idx" ON "inbox_messages"("status");

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_campaign_email_id_fkey" FOREIGN KEY ("campaign_email_id") REFERENCES "campaign_emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
