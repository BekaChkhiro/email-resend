"use client";

import { useState, useTransition } from "react";
import { toggleDomainActive, deleteDomain, seedDomains } from "./actions";
import DomainForm from "./domain-form";
import AddDomainForm from "./add-domain-form";

type Domain = {
  id: string;
  domain: string;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  createdAt: Date;
};

export default function DomainsTable({ domains }: { domains: Domain[] }) {
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [seedError, setSeedError] = useState("");

  async function handleToggle(id: string) {
    setTogglingId(id);
    startTransition(async () => {
      await toggleDomainActive(id);
      setTogglingId(null);
    });
  }

  async function handleDelete(id: string, domainName: string) {
    if (!confirm(`Are you sure you want to delete ${domainName}?`)) return;
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteDomain(id);
      setDeletingId(null);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  async function handleSeed() {
    setSeedError("");
    startTransition(async () => {
      const result = await seedDomains();
      if (result.error) {
        setSeedError(result.error);
      }
    });
  }

  if (domains.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">
          No domains configured yet.
        </p>
        <button
          onClick={handleSeed}
          disabled={isPending}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Seeding..." : "Seed 5 Default Domains"}
        </button>
        {seedError && (
          <p className="mt-2 text-sm text-red-600">{seedError}</p>
        )}
      </div>
    );
  }

  const activeCount = domains.filter((d) => d.isActive).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {activeCount} of {domains.length} domains active
        </p>
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Domain
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Domain
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                From Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                From Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {domains.map((domain) => (
              <tr key={domain.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {domain.domain}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {domain.fromName}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {domain.fromEmail}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <button
                    onClick={() => handleToggle(domain.id)}
                    disabled={togglingId === domain.id || isPending}
                    className="disabled:opacity-50"
                  >
                    {domain.isActive ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Inactive
                      </span>
                    )}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm space-x-3">
                  <button
                    onClick={() => setEditingDomain(domain)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(domain.id, domain.domain)}
                    disabled={deletingId === domain.id || isPending}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {deletingId === domain.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {domains.length} {domains.length === 1 ? "domain" : "domains"}
      </p>

      {editingDomain && (
        <DomainForm
          domain={editingDomain}
          onClose={() => setEditingDomain(null)}
        />
      )}

      {showAddForm && (
        <AddDomainForm onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
}
