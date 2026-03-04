"use client";

import { useState, useCallback, useTransition } from "react";
import {
  saveGeneratedEmails,
  updateGeneratedEmail,
} from "./actions";

interface GeneratedEmail {
  contactId: string;
  contactName: string;
  contactEmail: string;
  body: string;
  error?: string;
  savedId?: string; // campaign email record id after saving
}

interface SavedEmail {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  companyName: string | null;
  generatedBody: string;
}

interface AiEmailGeneratorProps {
  campaignId: string;
  hasPrompt: boolean;
  contactCount: number;
  readOnly: boolean;
  savedEmails: SavedEmail[];
}

export default function AiEmailGenerator({
  campaignId,
  hasPrompt,
  contactCount,
  readOnly,
  savedEmails,
}: AiEmailGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [scrapingStatus, setScrapingStatus] = useState<string | null>(null);
  const [emails, setEmails] = useState<GeneratedEmail[]>(() =>
    savedEmails.map((e) => ({
      contactId: e.contactId,
      contactName: e.contactName,
      contactEmail: e.contactEmail,
      body: e.generatedBody,
      savedId: e.id,
    }))
  );
  const [summary, setSummary] = useState<{
    successCount: number;
    errorCount: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGenerate = useCallback(
    async (contactIds?: string[]) => {
      setGenerating(true);
      setSummary(null);
      setSaveMessage(null);
      setScrapingStatus(null);

      // If regenerating specific contacts, keep other emails
      if (contactIds) {
        setProgress({ completed: 0, total: contactIds.length });
      } else {
        setEmails([]);
        setProgress({ completed: 0, total: contactCount });
      }

      try {
        const res = await fetch(`/api/campaigns/${campaignId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactIds ? { contactIds } : {}),
        });

        if (!res.ok) {
          const data = await res.json();
          setSummary({ successCount: 0, errorCount: 1 });
          setEmails((prev) => [
            ...prev,
            {
              contactId: "error",
              contactName: "Error",
              contactEmail: "",
              body: "",
              error: data.error || "Failed to start generation.",
            },
          ]);
          setGenerating(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setGenerating(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const dataLine = line.replace(/^data: /, "");
            if (!dataLine.trim()) continue;

            try {
              const event = JSON.parse(dataLine);

              if (event.type === "scraping") {
                setScrapingStatus(
                  `Researching ${event.companyDomain}...`
                );
              } else if (event.type === "progress") {
                setScrapingStatus(null);
                const newEmail: GeneratedEmail = {
                  contactId: event.contactId,
                  contactName: event.contactName,
                  contactEmail: event.contactEmail,
                  body: event.body,
                };

                setEmails((prev) => {
                  // Replace if regenerating, otherwise append
                  const idx = prev.findIndex(
                    (e) => e.contactId === event.contactId
                  );
                  if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], ...newEmail, error: undefined };
                    return updated;
                  }
                  return [...prev, newEmail];
                });
                setProgress({
                  completed: event.completed,
                  total: event.total,
                });
              } else if (event.type === "error") {
                setScrapingStatus(null);
                const errorEmail: GeneratedEmail = {
                  contactId: event.contactId,
                  contactName: event.contactName,
                  contactEmail: event.contactEmail,
                  body: "",
                  error: event.error,
                };

                setEmails((prev) => {
                  const idx = prev.findIndex(
                    (e) => e.contactId === event.contactId
                  );
                  if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = errorEmail;
                    return updated;
                  }
                  return [...prev, errorEmail];
                });
                setProgress({
                  completed: event.completed,
                  total: event.total,
                });
              } else if (event.type === "done") {
                setSummary({
                  successCount: event.successCount,
                  errorCount: event.errorCount,
                });
              }
            } catch {
              // skip malformed event
            }
          }
        }
      } catch (err) {
        setSummary({ successCount: 0, errorCount: 1 });
      } finally {
        setGenerating(false);
      }
    },
    [campaignId, contactCount]
  );

  const handleSaveAll = useCallback(() => {
    const successfulEmails = emails.filter((e) => !e.error && e.body);
    if (successfulEmails.length === 0) return;

    startSaveTransition(async () => {
      setSaveMessage(null);
      const result = await saveGeneratedEmails(
        campaignId,
        successfulEmails.map((e) => ({ contactId: e.contactId, body: e.body }))
      );
      if (result.error) {
        setSaveMessage(`Error: ${result.error}`);
      } else {
        setSaveMessage(
          `Saved ${result.savedCount} AI-generated email(s) to campaign.`
        );
      }
    });
  }, [emails, campaignId]);

  const handleStartEdit = (email: GeneratedEmail) => {
    setEditingId(email.contactId);
    setEditBody(email.body);
  };

  const handleSaveEdit = (contactId: string) => {
    const email = emails.find((e) => e.contactId === contactId);

    // Update local state
    setEmails((prev) =>
      prev.map((e) =>
        e.contactId === contactId ? { ...e, body: editBody } : e
      )
    );
    setEditingId(null);

    // If already saved to DB, update the record
    if (email?.savedId) {
      startUpdateTransition(async () => {
        await updateGeneratedEmail(email.savedId!, editBody);
      });
    }
  };

  const handleRegenerate = (contactId: string) => {
    handleGenerate([contactId]);
  };

  const successfulEmails = emails.filter((e) => !e.error && e.body);
  const failedEmails = emails.filter((e) => e.error);
  const progressPercent =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  if (readOnly && emails.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          AI Generated Emails
        </h2>
        {emails.length > 0 && (
          <span className="text-sm text-gray-500">
            {successfulEmails.length} generated
            {failedEmails.length > 0 && `, ${failedEmails.length} failed`}
          </span>
        )}
      </div>

      {!readOnly && (
        <p className="mt-1 text-sm text-gray-500">
          Generate unique AI-powered emails for each selected contact. Review
          and edit before sending.
        </p>
      )}

      {/* Generate Button */}
      {!readOnly && (
        <div className="mt-4">
          <button
            onClick={() => handleGenerate()}
            disabled={generating || !hasPrompt || contactCount === 0}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : emails.length > 0
                ? "Re-generate All Emails"
                : "Generate AI Emails"}
          </button>
          {!hasPrompt && (
            <p className="mt-2 text-sm text-amber-600">
              Save an AI prompt first before generating emails.
            </p>
          )}
          {contactCount === 0 && hasPrompt && (
            <p className="mt-2 text-sm text-amber-600">
              Select at least 1 contact to generate emails.
            </p>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {generating && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {scrapingStatus ?? `Generating email ${progress.completed + 1} of ${progress.total}...`}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-purple-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* API Error Banner */}
      {!generating &&
        failedEmails.length > 0 &&
        failedEmails.some((e) =>
          e.error?.includes("API") || e.error?.includes("billing") || e.error?.includes("API key")
        ) && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-4">
            <h3 className="text-sm font-semibold text-red-800">
              AI API Error
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {failedEmails[0]?.error}
            </p>
            <ol className="mt-2 list-inside list-decimal text-sm text-red-700 space-y-1">
              <li>
                Check your API key and billing at{" "}
                <a
                  href="https://console.anthropic.com/settings/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline hover:text-red-900"
                >
                  console.anthropic.com
                </a>
              </li>
              <li>Verify your <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> in .env</li>
              <li>Come back and click &quot;Retry All Failed&quot;</li>
            </ol>
          </div>
        )}

      {/* Summary */}
      {summary && !generating && (
        <div className="mt-4 space-y-2">
          {summary.successCount > 0 && (
            <p className="text-sm text-green-600">
              Successfully generated {summary.successCount} email(s).
            </p>
          )}
          {summary.errorCount > 0 &&
            !failedEmails.some((e) => e.error?.includes("API") || e.error?.includes("billing") || e.error?.includes("API key")) && (
              <p className="text-sm text-red-600">
                {summary.errorCount} email(s) failed. You can retry them
                individually below.
              </p>
            )}
        </div>
      )}

      {/* Save All Button */}
      {!readOnly && successfulEmails.length > 0 && !generating && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : `Save All (${successfulEmails.length})`}
          </button>
          {saveMessage && (
            <span
              className={`text-sm ${saveMessage.startsWith("Error") ? "text-red-600" : "text-green-600"}`}
            >
              {saveMessage}
            </span>
          )}
        </div>
      )}

      {/* Email List */}
      {emails.length > 0 && (
        <div className="mt-4 space-y-3">
          {emails.map((email) => (
            <div
              key={email.contactId}
              className={`rounded-md border p-4 ${
                email.error
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {email.contactName}
                  </p>
                  <p className="text-xs text-gray-500">{email.contactEmail}</p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  {email.error ? (
                    !readOnly && (
                      <button
                        onClick={() => handleRegenerate(email.contactId)}
                        disabled={generating}
                        className="rounded px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-300 hover:bg-red-100 disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          setExpandedId(
                            expandedId === email.contactId
                              ? null
                              : email.contactId
                          )
                        }
                        className="rounded px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-100"
                      >
                        {expandedId === email.contactId ? "Collapse" : "Preview"}
                      </button>
                      {!readOnly && (
                        <>
                          <button
                            onClick={() => handleStartEdit(email)}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-300 hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRegenerate(email.contactId)}
                            disabled={generating}
                            className="rounded px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-300 hover:bg-purple-100 disabled:opacity-50"
                          >
                            Re-gen
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {email.error && (
                <p className="mt-2 text-sm text-red-600">{email.error}</p>
              )}

              {/* Preview / Edit */}
              {expandedId === email.contactId &&
                !email.error &&
                editingId !== email.contactId && (
                  <div className="mt-3 max-h-64 overflow-y-auto rounded border border-gray-200 bg-white p-3">
                    <div
                      className="email-content max-w-none text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: email.body }}
                    />
                  </div>
                )}

              {/* Edit Mode */}
              {editingId === email.contactId && (
                <div className="mt-3">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={10}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(email.contactId)}
                      disabled={isUpdating}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isUpdating ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Body preview snippet when collapsed */}
              {expandedId !== email.contactId &&
                editingId !== email.contactId &&
                !email.error &&
                email.body && (
                  <p className="mt-2 truncate text-xs text-gray-400">
                    {email.body.replace(/<[^>]*>/g, "").slice(0, 120)}...
                  </p>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Retry All Failed */}
      {!readOnly && failedEmails.length > 0 && !generating && (
        <div className="mt-3">
          <button
            onClick={() =>
              handleGenerate(failedEmails.map((e) => e.contactId))
            }
            disabled={generating}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Retry All Failed ({failedEmails.length})
          </button>
        </div>
      )}
    </div>
  );
}
