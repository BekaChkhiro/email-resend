"use client";

import { useState, useTransition } from "react";
import { updateAiPrompt } from "./actions";

const AVAILABLE_FIELDS = [
  { label: "First Name", value: "firstName" },
  { label: "Last Name", value: "lastName" },
  { label: "Title", value: "title" },
  { label: "Company Name", value: "companyName" },
  { label: "Company Industry", value: "companyIndustry" },
  { label: "Company Size", value: "companySize" },
  { label: "Company Revenue", value: "companyRevenue" },
  { label: "Company Funding", value: "companyFunding" },
  { label: "Company Type", value: "companyType" },
  { label: "Company Description", value: "companyDescription" },
  { label: "Location", value: "location" },
  { label: "Region", value: "region" },
  { label: "Country", value: "country" },
  { label: "Decision Maker", value: "decisionMaker" },
];

interface AiPromptEditorProps {
  campaignId: string;
  initialPrompt: string | null;
  readOnly: boolean;
}

export default function AiPromptEditor({
  campaignId,
  initialPrompt,
  readOnly,
}: AiPromptEditorProps) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasChanges = prompt !== (initialPrompt ?? "");

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      const result = await updateAiPrompt(campaignId, prompt);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "AI prompt saved." });
      }
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          AI Email Generation
        </h2>
        {prompt.trim() ? (
          <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
            AI Enabled
          </span>
        ) : (
          <span className="text-sm text-gray-400">Optional</span>
        )}
      </div>

      <p className="mt-1 text-sm text-gray-500">
        Write instructions for ChatGPT to generate a unique email for each
        contact. Leave empty to use templates instead.
      </p>

      {message && (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-4">
        <label
          htmlFor="ai-prompt"
          className="block text-sm font-medium text-gray-700"
        >
          AI Prompt / Instructions
        </label>
        <textarea
          id="ai-prompt"
          rows={6}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={readOnly}
          placeholder={`Example: Write a cold outreach email for {{companyName}} about our SaaS product. Be personal, mention their industry ({{companyIndustry}}) and company size ({{companySize}}). Keep it under 150 words.`}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          The AI will receive each contact&apos;s data and generate a unique
          email based on these instructions.
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700">
          Available Contact Fields
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVAILABLE_FIELDS.map((field) => (
            <button
              key={field.value}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (!readOnly) {
                  setPrompt((prev) => prev + `{{${field.value}}}`);
                }
              }}
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-default disabled:hover:border-gray-200 disabled:hover:bg-gray-50 disabled:hover:text-gray-600"
            >
              {`{{${field.label}}}`}
            </button>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Prompt"}
          </button>
        </div>
      )}
    </div>
  );
}
