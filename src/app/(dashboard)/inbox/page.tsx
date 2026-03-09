import { getConversations, getInboxStats } from "./actions";
import ConversationsList from "./conversations-list";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [conversations, stats] = await Promise.all([
    getConversations(),
    getInboxStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inbox
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            View and respond to email replies
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-gray-200 dark:bg-zinc-800 dark:ring-zinc-700">
            <span className="text-sm text-gray-500 dark:text-zinc-400">Unread</span>
            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-emerald-100 px-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
              {stats.unreadCount}
            </span>
          </div>
        </div>
      </div>

      <ConversationsList conversations={conversations} />
    </div>
  );
}
