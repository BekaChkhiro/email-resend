-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "send_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];
