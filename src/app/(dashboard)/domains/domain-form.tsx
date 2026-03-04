"use client";

import { useState } from "react";
import { updateDomain } from "./actions";

type Domain = {
  id: string;
  domain: string;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  createdAt: Date;
};

export default function DomainForm({
  domain,
  onClose,
}: {
  domain: Domain;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateDomain(domain.id, formData);

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
          Edit Domain — {domain.domain}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="fromName" className="block text-sm font-medium text-gray-700">
              From Name *
            </label>
            <input
              id="fromName"
              name="fromName"
              type="text"
              required
              defaultValue={domain.fromName}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700">
              From Email *
            </label>
            <input
              id="fromEmail"
              name="fromEmail"
              type="email"
              required
              defaultValue={domain.fromEmail}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Must end with @{domain.domain}
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
              {loading ? "Saving..." : "Update Domain"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
