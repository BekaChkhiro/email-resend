"use client";

import { useState } from "react";
import { createContact, updateContact } from "./actions";

type Contact = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string | null;
  title: string | null;
  companyName: string | null;
  companyIndustry: string | null;
  companyDomain: string | null;
  location: string | null;
  country: string | null;
  linkedin: string | null;
  linkedinProfileUrl: string | null;
  domain: string | null;
  isUnsubscribed: boolean;
  createdAt: Date;
};

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelCls = "block text-sm font-medium text-gray-700";

export default function ContactForm({
  contact,
  onClose,
}: {
  contact?: Contact;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isEditing = !!contact;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = isEditing
      ? await updateContact(contact!.id, formData)
      : await createContact(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edit Contact" : "Add Contact"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Basic Info */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-800 mb-2">Basic Info</legend>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className={labelCls}>First Name *</label>
                  <input id="firstName" name="firstName" type="text" required defaultValue={contact?.firstName ?? ""} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="lastName" className={labelCls}>Last Name *</label>
                  <input id="lastName" name="lastName" type="text" required defaultValue={contact?.lastName ?? ""} className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="email" className={labelCls}>Email *</label>
                <input id="email" name="email" type="email" required defaultValue={contact?.email ?? ""} className={inputCls} />
              </div>
              <div>
                <label htmlFor="title" className={labelCls}>Job Title</label>
                <input id="title" name="title" type="text" defaultValue={contact?.title ?? ""} className={inputCls} />
              </div>
            </div>
          </fieldset>

          {/* Company */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-800 mb-2">Company</legend>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="companyName" className={labelCls}>Company Name</label>
                  <input id="companyName" name="companyName" type="text" defaultValue={contact?.companyName ?? ""} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="companyDomain" className={labelCls}>Company Domain</label>
                  <input id="companyDomain" name="companyDomain" type="text" defaultValue={contact?.companyDomain ?? ""} className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="companyIndustry" className={labelCls}>Industry</label>
                <input id="companyIndustry" name="companyIndustry" type="text" defaultValue={contact?.companyIndustry ?? ""} className={inputCls} />
              </div>
            </div>
          </fieldset>

          {/* Location */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-800 mb-2">Location</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="location" className={labelCls}>Location</label>
                <input id="location" name="location" type="text" defaultValue={contact?.location ?? ""} className={inputCls} />
              </div>
              <div>
                <label htmlFor="country" className={labelCls}>Country</label>
                <input id="country" name="country" type="text" defaultValue={contact?.country ?? ""} className={inputCls} />
              </div>
            </div>
          </fieldset>

          {/* Social */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-800 mb-2">Social</legend>
            <div>
              <label htmlFor="linkedin" className={labelCls}>LinkedIn</label>
              <input id="linkedin" name="linkedin" type="url" defaultValue={contact?.linkedin ?? ""} className={inputCls} />
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}

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
              {loading ? "Saving..." : isEditing ? "Update" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
