"use client";

import { useState, useMemo, useTransition } from "react";
import { updateSelectedContacts } from "./actions";

interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  isUnsubscribed: boolean;
}

interface ContactSelectorProps {
  campaignId: string;
  contacts: Contact[];
  initialSelectedIds: string[];
  readOnly: boolean;
}

export default function ContactSelector({
  campaignId,
  contacts,
  initialSelectedIds,
  readOnly,
}: ContactSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelectedIds)
  );
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const subscribedContacts = useMemo(
    () => contacts.filter((c) => !c.isUnsubscribed),
    [contacts]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return subscribedContacts;
    const q = search.toLowerCase();
    return subscribedContacts.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q))
    );
  }, [subscribedContacts, search]);

  const hasChanges =
    selectedIds.size !== initialSelectedIds.length ||
    initialSelectedIds.some((id) => !selectedIds.has(id));

  function toggleContact(id: string) {
    if (readOnly) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (readOnly) return;
    setSelectedIds(new Set(subscribedContacts.map((c) => c.id)));
  }

  function deselectAll() {
    if (readOnly) return;
    setSelectedIds(new Set());
  }

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      const result = await updateSelectedContacts(
        campaignId,
        Array.from(selectedIds)
      );
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Contact selection saved." });
      }
    });
  }

  const unsubscribedCount = contacts.length - subscribedContacts.length;

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Contact Selection
        </h2>
        <span className="text-sm text-gray-500">
          {selectedIds.size} of {subscribedContacts.length} contacts selected
        </span>
      </div>

      {unsubscribedCount > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {unsubscribedCount} unsubscribed contact
          {unsubscribedCount !== 1 ? "s" : ""} automatically excluded.
        </p>
      )}

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

      {!readOnly && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={selectAll}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Deselect All
          </button>
        </div>
      )}

      <div className="mt-4 max-h-80 overflow-y-auto rounded-md border border-gray-200">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            {subscribedContacts.length === 0
              ? "No subscribed contacts available. Add contacts first."
              : "No contacts match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-left text-xs text-gray-500">
                {!readOnly && <th className="w-10 px-3 py-2" />}
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Company</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => toggleContact(contact.id)}
                  className={`${!readOnly ? "cursor-pointer hover:bg-gray-50" : ""} ${
                    selectedIds.has(contact.id) ? "bg-blue-50" : ""
                  }`}
                >
                  {!readOnly && (
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 text-gray-900">
                    {contact.firstName} {contact.lastName}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{contact.email}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {contact.companyName || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!readOnly && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Selection"}
          </button>
        </div>
      )}
    </div>
  );
}
