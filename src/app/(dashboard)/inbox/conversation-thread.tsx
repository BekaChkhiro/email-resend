"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  getConversationMessages,
  markAsRead,
  archiveConversation,
  type Message,
} from "./actions";
import ComposeReply from "./compose-reply";

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ConversationThread({
  contactId,
  contactName,
  contactEmail,
  campaignId,
  campaignName,
}: {
  contactId: string;
  contactName: string;
  contactEmail: string;
  campaignId: string | null;
  campaignName: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      const msgs = await getConversationMessages(contactId, campaignId);
      setMessages(msgs);
      setLoading(false);

      // Mark unread messages as read
      const unreadIds = msgs
        .filter((m) => m.status === "unread" && m.direction === "inbound")
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await markAsRead(unreadIds);
      }
    }

    loadMessages();
  }, [contactId, campaignId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleArchive() {
    if (!confirm("Archive this conversation? It will be hidden from the inbox.")) {
      return;
    }

    startTransition(async () => {
      await archiveConversation(contactId, campaignId);
      // Refresh will happen via revalidatePath
      window.location.reload();
    });
  }

  function handleReplySent() {
    // Reload messages after sending a reply
    getConversationMessages(contactId, campaignId).then(setMessages);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{contactName}</h2>
            <p className="text-sm text-gray-500">{contactEmail}</p>
            {campaignName && (
              <p className="text-xs text-blue-600 mt-0.5">
                Campaign: {campaignName}
              </p>
            )}
          </div>
          <button
            onClick={handleArchive}
            disabled={isPending}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ArchiveIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.direction === "outbound" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.direction === "outbound"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-medium ${
                    message.direction === "outbound"
                      ? "text-blue-100"
                      : "text-gray-500"
                  }`}
                >
                  {message.direction === "outbound" ? "You" : contactName}
                </span>
                <span
                  className={`text-xs ${
                    message.direction === "outbound"
                      ? "text-blue-200"
                      : "text-gray-400"
                  }`}
                >
                  {formatDateTime(message.receivedAt)}
                </span>
              </div>
              <p
                className={`text-sm font-medium mb-2 ${
                  message.direction === "outbound"
                    ? "text-blue-50"
                    : "text-gray-700"
                }`}
              >
                {message.subject}
              </p>
              <div
                className={`text-sm whitespace-pre-wrap ${
                  message.direction === "outbound"
                    ? "text-white"
                    : "text-gray-800"
                }`}
              >
                {message.textBody || (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: message.htmlBody || "(No content)",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply form */}
      <ComposeReply
        contactId={contactId}
        campaignId={campaignId}
        lastMessageId={messages[messages.length - 1]?.id}
        onSent={handleReplySent}
      />
    </div>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  );
}
