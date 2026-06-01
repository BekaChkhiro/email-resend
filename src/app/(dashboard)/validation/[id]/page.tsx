import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import JobDetailClient from "./job-detail-client";

export const dynamic = "force-dynamic";

export default async function ValidationJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.validationJob.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      totalEmails: true,
      processedEmails: true,
      validEmails: true,
      createdAt: true,
      completedAt: true,
    },
  });

  if (!job) notFound();

  const grouped = await prisma.validationEmail.groupBy({
    by: ["status"],
    where: { jobId: id },
    _count: { _all: true },
  });
  const breakdown: Record<string, number> = {
    valid: 0,
    invalid: 0,
    "catch-all": 0,
    unknown: 0,
    disposable: 0,
    pending: 0,
  };
  for (const g of grouped) {
    const key = g.status ?? "pending";
    breakdown[key] = (breakdown[key] ?? 0) + g._count._all;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/validation"
          className="text-sm text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Back to validation
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
          {job.name}
        </h1>
      </div>

      <JobDetailClient
        jobId={job.id}
        initial={{
          status: job.status,
          totalEmails: job.totalEmails,
          processedEmails: job.processedEmails,
          validEmails: job.validEmails,
        }}
        initialBreakdown={breakdown}
      />
    </div>
  );
}
