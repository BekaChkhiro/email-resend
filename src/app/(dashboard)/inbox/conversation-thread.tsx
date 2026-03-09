"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  getConversationMessages,
  markAsRead,
  archiveConversation,
  type Message,
} from "./actions";
import { parseEmailContent, formatSignature, type ParsedEmail } from "./email-parser";
import ComposeReply from "./compose-reply";
import { Button, useConfirmDialog } from "@/components/ui";

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isSameDay(date1: string, date2: string) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// Message content component with parsed email
function MessageContent({
  message,
  contactName,
  isOutbound,
}: {
  message: Message;
  contactName: string;
  isOutbound: boolean;
}) {
  const [showQuoted, setShowQuoted] = useState(false);
  const parsed: ParsedEmail = parseEmailContent(message.textBody);

  const hasQuotedContent = parsed.quotedContent.length > 0;

  return (
    <div className="space-y-3">
      {/* Main content */}
      <div
        className={`text-sm leading-relaxed ${
          isOutbound ? "text-white/95" : "text-gray-700 dark:text-zinc-300"
        }`}
      >
        {parsed.mainContent ? (
          <p className="whitespace-pre-wrap">{parsed.mainContent}</p>
        ) : message.htmlBody ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: message.htmlBody }}
          />
        ) : (
          <p className="italic opacity-60">(No content)</p>
        )}
      </div>

      {/* Signature */}
      {parsed.signature && (
        <div
          className={`border-t pt-3 ${
            isOutbound
              ? "border-white/20"
              : "border-gray-200 dark:border-zinc-700"
          }`}
        >
          <div
            className={`space-y-0.5 text-xs ${
              isOutbound ? "text-white/70" : "text-gray-500 dark:text-zinc-500"
            }`}
          >
            {formatSignature(parsed.signature).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Quoted content toggle */}
      {hasQuotedContent && (
        <div
          className={`border-t pt-3 ${
            isOutbound
              ? "border-white/20"
              : "border-gray-200 dark:border-zinc-700"
          }`}
        >
          <button
            type="button"
            onClick={() => setShowQuoted(!showQuoted)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isOutbound
                ? "bg-white/10 text-white/80 hover:bg-white/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
            }`}
          >
            <ChevronIcon
              className={`h-3.5 w-3.5 transition-transform ${
                showQuoted ? "rotate-90" : ""
              }`}
            />
            {showQuoted ? "Hide" : "Show"} quoted text
            <span className="opacity-60">
              ({parsed.quotedContent.length})
            </span>
          </button>

          {showQuoted && (
            <div className="mt-3 space-y-3">
              {parsed.quotedContent.map((block, index) => (
                <div
                  key={index}
                  className={`rounded-lg border-l-2 pl-3 ${
                    isOutbound
                      ? "border-white/30 text-white/60"
                      : "border-gray-300 text-gray-500 dark:border-zinc-600 dark:text-zinc-500"
                  }`}
                >
                  {block.header && (
                    <p className="mb-1.5 text-xs font-medium opacity-80">
                      {block.header}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">
                    {block.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div
          className={`border-t pt-3 ${
            isOutbound
              ? "border-white/20"
              : "border-gray-200 dark:border-zinc-700"
          }`}
        >
          <p
            className={`mb-2 text-xs font-medium ${
              isOutbound ? "text-white/70" : "text-gray-500 dark:text-zinc-500"
            }`}
          >
            {message.attachments.length} attachment
            {message.attachments.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  isOutbound
                    ? "bg-white/15 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300"
                }`}
              >
                <FileIcon className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="max-w-[120px] truncate font-medium">
                    {attachment.filename}
                  </span>
                  <span className="opacity-70">
                    {formatFileSize(attachment.size)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  const { confirm, Dialog } = useConfirmDialog();

  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      const msgs = await getConversationMessages(contactId, campaignId);
      setMessages(msgs);
      setLoading(false);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleArchive() {
    const confirmed = await confirm({
      title: "Archive Conversation",
      message: "Archive this conversation? It will be hidden from the inbox.",
      confirmLabel: "Archive",
      variant: "warning",
    });
    if (!confirmed) return;

    startTransition(async () => {
      await archiveConversation(contactId, campaignId);
      window.location.reload();
    });
  }

  function handleReplySent() {
    getConversationMessages(contactId, campaignId).then(setMessages);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-semibold text-white shadow-sm">
              {getInitials(contactName)}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {contactName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {contactEmail}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {campaignName && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CampaignIcon className="h-3.5 w-3.5" />
                {campaignName}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleArchive}
              disabled={isPending}
              leftIcon={<ArchiveIcon className="h-4 w-4" />}
            >
              Archive
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-100 px-6 py-6 dark:from-zinc-900 dark:to-zinc-900/80">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message, index) => {
            const isOutbound = message.direction === "outbound";
            const showDateSeparator =
              index === 0 ||
              !isSameDay(message.receivedAt, messages[index - 1].receivedAt);

            return (
              <div key={message.id}>
                {/* Date separator */}
                {showDateSeparator && (
                  <div className="mb-6 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                      <div className="h-px w-12 bg-gray-300 dark:bg-zinc-700" />
                      <span className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-500 shadow-sm ring-1 ring-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">
                        {formatDate(message.receivedAt)}
                      </span>
                      <div className="h-px w-12 bg-gray-300 dark:bg-zinc-700" />
                    </div>
                  </div>
                )}

                {/* Message */}
                <div
                  className={`flex items-end gap-3 ${
                    isOutbound ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${
                      isOutbound
                        ? "bg-gradient-to-br from-blue-400 to-blue-600"
                        : "bg-gradient-to-br from-emerald-400 to-emerald-600"
                    }`}
                  >
                    {isOutbound ? "You" : getInitials(contactName)}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`group relative max-w-[70%] ${
                      isOutbound ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-sm ${
                        isOutbound
                          ? "rounded-br-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                          : "rounded-bl-sm bg-white ring-1 ring-gray-200 dark:bg-zinc-800 dark:ring-zinc-700"
                      }`}
                    >
                      {/* Subject */}
                      <p
                        className={`mb-2 text-sm font-semibold ${
                          isOutbound
                            ? "text-white"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {message.subject}
                      </p>

                      {/* Parsed content */}
                      <MessageContent
                        message={message}
                        contactName={contactName}
                        isOutbound={isOutbound}
                      />
                    </div>

                    {/* Time */}
                    <p
                      className={`mt-1.5 text-xs text-gray-400 dark:text-zinc-500 ${
                        isOutbound ? "text-right" : "text-left"
                      }`}
                    >
                      {formatTime(message.receivedAt)}
                      {isOutbound && (
                        <span className="ml-1.5 inline-flex items-center">
                          <CheckIcon className="h-3 w-3 text-emerald-500" />
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply form */}
      <ComposeReply
        contactId={contactId}
        campaignId={campaignId}
        lastMessageId={messages[messages.length - 1]?.id}
        onSent={handleReplySent}
      />

      <Dialog />
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
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function CampaignIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
      />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}
