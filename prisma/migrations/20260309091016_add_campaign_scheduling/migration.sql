-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "send_end_hour" INTEGER,
ADD COLUMN     "send_start_hour" INTEGER,
ADD COLUMN     "timezone" TEXT;
