import { getConversations } from "./actions";
import ConversationsList from "./conversations-list";

export default async function InboxPage() {
  const conversations = await getConversations();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and respond to email replies from your campaigns.
        </p>
      </div>

      <ConversationsList conversations={conversations} />
    </div>
  );
}
