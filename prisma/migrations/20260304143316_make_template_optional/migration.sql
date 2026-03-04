-- DropForeignKey
ALTER TABLE "campaign_emails" DROP CONSTRAINT "campaign_emails_template_id_fkey";

-- AlterTable
ALTER TABLE "campaign_emails" ALTER COLUMN "template_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "campaign_emails" ADD CONSTRAINT "campaign_emails_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "campaign_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
