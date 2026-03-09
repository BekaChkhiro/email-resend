"use client";

import { useState } from "react";
import type { Conversation } from "./actions";
import ConversationThread from "./conversation-thread";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-rose-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function ConversationsList({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    conversations[0]?.id ?? null
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700">
          <InboxIcon className="h-7 w-7 text-gray-400 dark:text-zinc-500" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
          No messages yet
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Replies to your campaign emails will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      {/* Conversations sidebar */}
      <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-zinc-700">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/80 px-4 py-3 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-800/80">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
            Conversations ({conversations.length})
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-700">
          {conversations.map((conversation) => {
            const isSelected = selectedId === conversation.id;
            const hasUnread = conversation.unreadCount > 0;

            return (
              <button
                key={conversation.id}
                onClick={() => setSelectedId(conversation.id)}
                className={`group w-full px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "bg-emerald-50 dark:bg-emerald-500/10"
                    : "hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                }`}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium text-white ${getAvatarColor(
                      conversation.contactName
                    )}`}
                  >
                    {getInitials(conversation.contactName)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-sm ${
                          hasUnread
                            ? "font-semibold text-gray-900 dark:text-white"
                            : "font-medium text-gray-700 dark:text-zinc-300"
                        }`}
                      >
                        {conversation.contactName}
                      </span>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {hasUnread && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-medium text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-zinc-500">
                          {formatDate(conversation.lastMessage.receivedAt)}
                        </span>
                      </div>
                    </div>

                    {conversation.campaignName && (
                      <p className="mt-0.5 truncate text-xs text-emerald-600 dark:text-emerald-400">
                        {conversation.campaignName}
                      </p>
                    )}

                    <p
                      className={`mt-1 truncate text-sm ${
                        hasUnread
                          ? "font-medium text-gray-900 dark:text-white"
                          : "text-gray-600 dark:text-zinc-400"
                      }`}
                    >
                      {conversation.lastMessage.subject}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-zinc-500">
                      {conversation.lastMessage.direction === "outbound" && (
                        <span className="text-gray-400 dark:text-zinc-500">You: </span>
                      )}
                      {conversation.lastMessage.preview}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread view */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedConversation ? (
          <ConversationThread
            key={selectedConversation.id}
            contactId={selectedConversation.contactId}
            contactName={selectedConversation.contactName}
            contactEmail={selectedConversation.contactEmail}
            campaignId={selectedConversation.campaignId}
            campaignName={selectedConversation.campaignName}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-500 dark:text-zinc-400">
            <MailOpenIcon className="h-12 w-12 text-gray-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium">Select a conversation</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
              Choose from the list on the left
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  );
}

function MailOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
    </svg>
  );
}
