"use client";

import { useState } from "react";
import { resumeCampaignSending } from "./actions";

export default function ResumeSendButton({
  campaignId,
  pendingCount,
}: {
  campaignId: string;
  pendingCount: number;
}) {
  const [isResuming, setIsResuming] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    sentCount?: number;
    failedCount?: number;
  } | null>(null);

  const handleResume = async () => {
    if (!confirm(`Resume sending ${pendingCount} pending emails?`)) {
      return;
    }

    setIsResuming(true);
    setResult(null);

    try {
      const res = await resumeCampaignSending(campaignId);
      setResult(res);
      if (res.success) {
        // Refresh page after success
        window.location.reload();
      }
    } catch (err) {
      setResult({ error: "An unexpected error occurred." });
    } finally {
      setIsResuming(false);
    }
  };

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-yellow-800">Campaign Paused</h3>
          <p className="text-sm text-yellow-700">
            {pendingCount} emails are still pending. The sending process may have
            been interrupted.
          </p>
        </div>
        <button
          onClick={handleResume}
          disabled={isResuming}
          className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
        >
          {isResuming ? "Resuming..." : `Resume Sending (${pendingCount})`}
        </button>
      </div>

      {result?.error && (
        <div className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          {result.error}
        </div>
      )}

      {result?.success && (
        <div className="mt-3 rounded bg-green-100 p-2 text-sm text-green-700">
          Sent: {result.sentCount}, Failed: {result.failedCount}
        </div>
      )}
    </div>
  );
}
