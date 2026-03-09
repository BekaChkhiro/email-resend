-- CreateEnum
CREATE TYPE "WarmupEmailStatus" AS ENUM ('pending', 'sent', 'delivered', 'replied', 'failed');

-- CreateEnum
CREATE TYPE "WarmupConversationType" AS ENUM ('project_update', 'meeting_scheduling', 'quick_question', 'follow_up', 'document_request', 'general_checkin');

-- AlterTable
ALTER TABLE "domains" ADD COLUMN     "warmup_completed_at" TIMESTAMP(3),
ADD COLUMN     "warmup_day" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warmup_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "warmup_last_sent_at" TIMESTAMP(3),
ADD COLUMN     "warmup_sent_today" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warmup_started_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "warmup_emails" (
    "id" TEXT NOT NULL,
    "sender_domain_id" TEXT NOT NULL,
    "receiver_domain_id" TEXT NOT NULL,
    "resend_id" TEXT,
    "message_id" TEXT,
    "in_reply_to" TEXT,
    "thread_id" TEXT NOT NULL,
    "conversation_type" "WarmupConversationType" NOT NULL,
    "is_initial_email" BOOLEAN NOT NULL DEFAULT true,
    "reply_depth" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "WarmupEmailStatus" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "warmup_day" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warmup_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warmup_emails_message_id_key" ON "warmup_emails"("message_id");

-- CreateIndex
CREATE INDEX "warmup_emails_thread_id_idx" ON "warmup_emails"("thread_id");

-- CreateIndex
CREATE INDEX "warmup_emails_sender_domain_id_idx" ON "warmup_emails"("sender_domain_id");

-- CreateIndex
CREATE INDEX "warmup_emails_status_idx" ON "warmup_emails"("status");

-- AddForeignKey
ALTER TABLE "warmup_emails" ADD CONSTRAINT "warmup_emails_sender_domain_id_fkey" FOREIGN KEY ("sender_domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warmup_emails" ADD CONSTRAINT "warmup_emails_receiver_domain_id_fkey" FOREIGN KEY ("receiver_domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
