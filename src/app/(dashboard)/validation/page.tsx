import Link from "next/link";
import { prisma } from "@/lib/db";
import ValidationUpload from "./validation-upload";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300",
  processing: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  failed: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export default async function ValidationPage() {
  const jobs = await prisma.validationJob.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      totalEmails: true,
      processedEmails: true,
      validEmails: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
            Email Validation
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Import a CSV, validate the addresses, then export the valid ones.
          </p>
        </div>
      </div>

      <ValidationUpload />

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
          <thead className="bg-gray-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Progress
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Valid
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
            {jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-500 dark:text-zinc-400"
                >
                  No validation jobs yet. Upload a CSV to get started.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const pct =
                  job.totalEmails > 0
                    ? Math.round((job.processedEmails / job.totalEmails) * 100)
                    : 0;
                return (
                  <tr
                    key={job.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/validation/${job.id}`}
                        className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {job.name}
                      </Link>
                      <p className="text-xs text-gray-400 dark:text-zinc-500">
                        {job.totalEmails.toLocaleString()} emails
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[job.status] ?? STATUS_STYLES.pending
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-zinc-300">
                      {job.processedEmails.toLocaleString()} /{" "}
                      {job.totalEmails.toLocaleString()}{" "}
                      <span className="text-gray-400 dark:text-zinc-500">({pct}%)</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {job.validEmails.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-zinc-500">
                      {job.createdAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
