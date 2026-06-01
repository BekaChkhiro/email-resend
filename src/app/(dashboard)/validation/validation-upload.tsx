"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** Minimal quote-aware CSV parser (mirrors the contacts importer). */
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else current += char;
    }
    values.push(current.trim());
    return values;
  };

  const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const v = (values[idx] ?? "").replace(/^"|"$/g, "");
      if (v) row[h] = v;
    });
    rows.push(row);
  }
  return { headers, rows };
}

/** Pick the most likely email column from the headers / sample data. */
function detectEmailColumn(headers: string[], rows: Record<string, string>[]): string {
  const byName = headers.find((h) => /e-?mail/i.test(h));
  if (byName) return byName;
  // Fall back to the column whose first non-empty sample looks like an email.
  for (const h of headers) {
    const sample = rows.find((r) => r[h])?.[h];
    if (sample && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sample)) return h;
  }
  return headers[0] ?? "";
}

export default function ValidationUpload() {
  const router = useRouter();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [emailColumn, setEmailColumn] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setHeaders([]);
    setRows([]);
    setEmailColumn("");
    setFileName("");
    setError("");
    setUploadPct(0);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleFile = useCallback((file: File) => {
    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target?.result as string);
      if (rows.length === 0) {
        setError("No data rows found in CSV.");
        return;
      }
      setHeaders(headers);
      setRows(rows);
      setEmailColumn(detectEmailColumn(headers, rows));
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

  // De-dupe + normalize emails across the whole file before chunking, so each
  // upload chunk is already clean and the server doesn't need a cross-chunk
  // uniqueness constraint.
  const buildEmailRows = useCallback((): { email: string; rawRow: Record<string, string> }[] => {
    const seen = new Set<string>();
    const out: { email: string; rawRow: Record<string, string> }[] = [];
    for (const row of rows) {
      const email = (row[emailColumn] ?? "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) continue;
      seen.add(email);
      out.push({ email, rawRow: row });
    }
    return out;
  }, [rows, emailColumn]);

  async function handleCreate() {
    if (!emailColumn) {
      setError("Select which column holds the email address.");
      return;
    }
    const emailRows = buildEmailRows();
    if (emailRows.length === 0) {
      setError("No valid email addresses found in the selected column.");
      return;
    }

    setCreating(true);
    setUploadPct(0);
    setError("");
    try {
      const createRes = await fetch("/api/validation/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fileName.replace(/\.csv$/i, "") || "Untitled import",
          emailColumn,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        setError(created.error || "Failed to create job.");
        return;
      }
      const jobId: string = created.job.id;

      // Stream the emails up in chunks to stay well under the serverless
      // request-body limit on large files.
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < emailRows.length; i += CHUNK_SIZE) {
        const chunk = emailRows.slice(i, i + CHUNK_SIZE);
        const res = await fetch(`/api/validation/jobs/${jobId}/emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed while uploading emails.");
          return;
        }
        setUploadPct(Math.round(((i + chunk.length) / emailRows.length) * 100));
      }

      router.push(`/validation/${jobId}`);
    } catch {
      setError("Network error while creating the job.");
    } finally {
      setCreating(false);
    }
  }

  const sampleValues = emailColumn
    ? rows
        .map((r) => r[emailColumn])
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      {rows.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
            dragOver
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
              : "border-gray-300 dark:border-zinc-600"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <svg
            className="mb-3 h-10 w-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Drag and drop a CSV file here, or
          </p>
          <Button onClick={() => fileRef.current?.click()} className="mt-2">
            Browse Files
          </Button>
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
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{fileName}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {rows.length.toLocaleString()} rows found
              </p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Choose a different file
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400">
              Email column
            </label>
            <select
              value={emailColumn}
              onChange={(e) => setEmailColumn(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {sampleValues.length > 0 && (
              <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-500">
                Sample: {sampleValues.join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {rows.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleCreate}
            isLoading={creating}
            loadingText={uploadPct > 0 ? `Uploading ${uploadPct}%...` : "Creating..."}
          >
            Start Validation
          </Button>
        </div>
      )}
    </div>
  );
}
