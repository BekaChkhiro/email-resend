"use client";

import { useState, useTransition } from "react";
import { prepareCampaignEmails } from "./actions";
import { Button } from "@/components/ui";

export default function PrepareSendButton({
  campaignId,
  contactCount,
  templateCount,
  hasAiEmails,
}: {
  campaignId: string;
  contactCount: number;
  templateCount: number;
  hasAiEmails: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    totalEmails?: number;
    sentCount?: number;
    failedCount?: number;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const canSend = contactCount > 0 && (templateCount >= 2 || hasAiEmails);

  function handleSend() {
    startTransition(async () => {
      const res = await prepareCampaignEmails(campaignId);
      setResult(res);
      setShowConfirm(false);
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Send Campaign</h2>

      <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
        <p>
          Contacts: <span className="font-medium">{contactCount}</span>
        </p>
        <p>
          Templates: <span className="font-medium">{templateCount}</span>
        </p>
      </div>

      {!canSend && (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
          {contactCount === 0 && "Select at least 1 contact. "}
          {templateCount < 2 && !hasAiEmails && "At least 2 templates are required, or save AI-generated emails."}
        </p>
      )}

      {result?.error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{result.error}</p>
      )}

      {result?.success && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-green-600 dark:text-green-400">
            Campaign sent! {result.sentCount} of {result.totalEmails} emails
            delivered successfully.
          </p>
          {(result.failedCount ?? 0) > 0 && (
            <p className="text-red-600 dark:text-red-400">
              {result.failedCount} email(s) failed to send.
            </p>
          )}
        </div>
      )}

      {!result?.success && !showConfirm && (
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={!canSend || isPending}
          className="mt-4"
        >
          Prepare & Send
        </Button>
      )}

      {showConfirm && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
            This will prepare {contactCount} emails with round-robin domain and
            template distribution. Continue?
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={handleSend}
              isLoading={isPending}
              loadingText="Sending..."
            >
              Confirm & Send
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
