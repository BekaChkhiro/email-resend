-- AlterTable
ALTER TABLE "campaign_emails" ADD COLUMN     "ai_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "generated_body" TEXT;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "ai_prompt" TEXT;
