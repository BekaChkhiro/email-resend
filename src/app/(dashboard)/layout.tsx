import Sidebar from "@/components/sidebar";
import { getInboxStats } from "./inbox/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { unreadCount } = await getInboxStats();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar inboxUnreadCount={unreadCount} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
