"use client";

import { useState, useCallback, useRef } from "react";

const CSV_TO_DB_MAP: Record<string, string> = {
  email: "email",
  first_name: "firstName",
  last_name: "lastName",
  full_name: "fullName",
  title: "title",
  list_name: "listName",
  email_type: "emailType",
  email_status: "emailStatus",
  location: "location",
  locality: "locality",
  region: "region",
  country: "country",
  linkedin: "linkedin",
  profile_url: "profileUrl",
  domain: "domain",
  company: "companyName",
  company_domain: "companyDomain",
  company_industry: "companyIndustry",
  company_subindustry: "companySubindustry",
  company_size: "companySize",
  company_size_range: "companySizeRange",
  company_founded: "companyFounded",
  company_revenue: "companyRevenue",
  company_funding: "companyFunding",
  company_type: "companyType",
  company_linkedin: "companyLinkedin",
  company_twitter: "companyTwitter",
  company_facebook: "companyFacebook",
  company_description: "companyDescription",
  linkedin_profile_url: "linkedinProfileUrl",
  company_last_funding_round: "companyLastFundingRound",
  company_last_funding_amount: "companyLastFundingAmount",
  company_last_funding_at: "companyLastFundingAt",
  company_location: "companyLocation",
  company_street: "companyStreet",
  company_locality: "companyLocality",
  company_region: "companyRegion",
  company_country: "companyCountry",
  company_postal_code: "companyPostalCode",
  other_work_emails: "otherWorkEmails",
  "Decision Maker": "decisionMaker",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (values[idx]) row[h] = values[idx];
    });
    rows.push(row);
  }

  return rows;
}

type ImportResult = { imported: number; skipped: number; errors: string[] };

export default function CSVImport({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError("");
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError("No data rows found in CSV.");
        return;
      }
      const hdrs = Object.keys(parsed[0]);
      setHeaders(hdrs);
      setRows(parsed);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) handleFile(file);
      else setError("Please upload a .csv file.");
    },
    [handleFile]
  );

  async function handleImport() {
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: rows, mapping: CSV_TO_DB_MAP }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed.");
      } else {
        setResult(data);
        if (data.imported > 0) onSuccess();
      }
    } catch {
      setError("Network error during import.");
    } finally {
      setImporting(false);
    }
  }

  const mappedCount = headers.filter((h) => CSV_TO_DB_MAP[h]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900">Import Contacts from CSV</h2>

        {rows.length === 0 ? (
          <div
            className={`mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <svg className="mb-3 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600">Drag and drop a CSV file here, or</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Browse Files
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        ) : result ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">
                Import complete: {result.imported} imported, {result.skipped} skipped.
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 text-xs text-red-600">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-md bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                <strong>{rows.length}</strong> rows found. <strong>{mappedCount}</strong> of {headers.length} columns mapped.
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">CSV Column</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Maps To</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Sample</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {headers.map((h) => (
                    <tr key={h} className={CSV_TO_DB_MAP[h] ? "" : "opacity-50"}>
                      <td className="px-3 py-1.5 font-mono text-gray-700">{h}</td>
                      <td className="px-3 py-1.5 text-gray-600">{CSV_TO_DB_MAP[h] || "—"}</td>
                      <td className="max-w-[200px] truncate px-3 py-1.5 text-gray-500">{rows[0]?.[h] || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {result ? "Close" : "Cancel"}
          </button>
          {rows.length > 0 && !result && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? "Importing..." : `Import ${rows.length} Contacts`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
