-- CreateEnum
CREATE TYPE "ValidationJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "validation_jobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ValidationJobStatus" NOT NULL DEFAULT 'pending',
    "email_column" TEXT NOT NULL,
    "total_emails" INTEGER NOT NULL DEFAULT 0,
    "processed_emails" INTEGER NOT NULL DEFAULT 0,
    "valid_emails" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "validation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_emails" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT,
    "score" INTEGER,
    "is_disposable" BOOLEAN,
    "raw_row" JSONB,
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "validation_emails_job_id_idx" ON "validation_emails"("job_id");

-- CreateIndex
CREATE INDEX "validation_emails_job_id_status_idx" ON "validation_emails"("job_id", "status");

-- AddForeignKey
ALTER TABLE "validation_emails" ADD CONSTRAINT "validation_emails_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "validation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
