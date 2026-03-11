import { prisma } from "@/lib/db";
import ContactsTable from "./contacts-table";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = 50;
  const skip = (page - 1) * limit;

  const [contacts, total, unsubscribedCount] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        campaignEmails: {
          select: {
            campaignId: true,
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
          distinct: ['campaignId'],
        },
      },
    }),
    prisma.contact.count(),
    prisma.contact.count({ where: { isUnsubscribed: true } }),
  ]);

  const subscribedCount = total - unsubscribedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Manage your email contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-6 rounded-lg bg-white px-5 py-2.5 shadow-sm ring-1 ring-gray-200 dark:bg-zinc-800 dark:ring-zinc-700">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {total.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Total</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700" />
            <div className="text-center">
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {subscribedCount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Subscribed</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700" />
            <div className="text-center">
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                {unsubscribedCount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Unsubscribed</p>
            </div>
          </div>
        </div>
      </div>

      <ContactsTable contacts={contacts} total={total} page={page} limit={limit} />
    </div>
  );
}
