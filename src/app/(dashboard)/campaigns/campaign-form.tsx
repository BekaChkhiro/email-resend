"use client";

import { useState } from "react";
import { createCampaign, updateCampaign } from "./actions";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  emailFormat: string;
  delaySeconds: number;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
};

export default function CampaignForm({
  campaign,
  onClose,
}: {
  campaign?: Campaign;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isEditing = !!campaign;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = isEditing
      ? await updateCampaign(campaign!.id, formData)
      : await createCampaign(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? `Edit Campaign` : "New Campaign"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Campaign Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={campaign?.name}
              placeholder="e.g. Q1 Outreach"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              Subject Line *
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              defaultValue={campaign?.subject}
              placeholder="e.g. Quick question about {{companyName}}"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="emailFormat" className="block text-sm font-medium text-gray-700">
              Email Format *
            </label>
            <select
              id="emailFormat"
              name="emailFormat"
              defaultValue={campaign?.emailFormat ?? "html"}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="html">HTML</option>
              <option value="plain_text">Plain Text</option>
            </select>
          </div>

          <div>
            <label htmlFor="delaySeconds" className="block text-sm font-medium text-gray-700">
              Delay Between Sends (seconds)
            </label>
            <input
              id="delaySeconds"
              name="delaySeconds"
              type="number"
              min="0"
              defaultValue={campaign?.delaySeconds ?? 0}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Time to wait between sending each email. 0 = no delay.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : isEditing
                  ? "Update Campaign"
                  : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
