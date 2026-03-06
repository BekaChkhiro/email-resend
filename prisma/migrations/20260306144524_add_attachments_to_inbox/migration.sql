-- AlterTable
ALTER TABLE "inbox_messages" ADD COLUMN     "attachments" JSONB DEFAULT '[]';
