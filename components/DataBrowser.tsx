"use client";
import { useEffect, useMemo, useState } from "react";

type Row = Record<string, unknown>;

interface DataBrowserProps {
  title: string;
  endpoint: string; // API endpoint to fetch
  pageSize?: number;
  columns?: string[]; // optional subset ordering
  dark?: boolean;
}

export function DataBrowser({
  title,
  endpoint,
  pageSize = 100,
  columns,
  dark = true,
}: DataBrowserProps) {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  // Determine columns
  const allColumns: string[] = useMemo(() => {
    if (columns?.length) return columns;
    return data.length ? Object.keys(data[0]) : [];
  }, [columns, data]);

  // Unique values per column (stringify non-strings)
  const uniques = useMemo(() => {
    const map: Record<string, string[]> = {};
    // Special bucketing for Accounts view
    const isAccounts = /Accounts/i.test(title);
    // Employee buckets mirroring server logic
    const employeeBuckets = [
      { label: "1–10", min: 1, max: 10 },
      { label: "11–25", min: 11, max: 25 },
      { label: "26–50", min: 26, max: 50 },
      { label: "51–100", min: 51, max: 100 },
      { label: "101–250", min: 101, max: 250 },
      { label: "251–500", min: 251, max: 500 },
      { label: "501–1000", min: 501, max: 1000 },
      { label: "1001–2000", min: 1001, max: 2000 },
      { label: "2001–3000", min: 2001, max: 3000 },
      { label: "3001–4000", min: 3001, max: 4000 },
      { label: "4001–5000", min: 4001, max: 5000 },
      { label: "5001+", min: 5001, max: Infinity },
    ];
    const arrBuckets = Array.from({ length: 20 }, (_, i) => ({
      label: `${i * 10000}–${(i + 1) * 10000 - 1}`,
      min: i * 10000,
      max: (i + 1) * 10000 - 1,
    }));
    arrBuckets.push({ label: `200000+`, min: 200000, max: Infinity });

    allColumns.forEach((col) => {
      const set = new Set<string>();
      if (isAccounts && col === "employee_count") {
        // collect bucket labels present
        const seen = new Set<string>();
        data.forEach((row) => {
          const raw = Number(row[col]);
          if (!Number.isFinite(raw)) return;
          const bucket = employeeBuckets.find(
            (b) => raw >= b.min && raw <= b.max,
          );
          if (bucket) seen.add(bucket.label);
        });
        const sorted = [...seen].sort((a, b) => a.localeCompare(b));
        sorted.forEach((l) => {
          set.add(l);
        });
      } else if (isAccounts && col === "arr") {
        const seen = new Set<string>();
        data.forEach((row) => {
          const raw = Number(row[col]);
          if (!Number.isFinite(raw)) return;
          const bucket = arrBuckets.find((b) => raw >= b.min && raw <= b.max);
          if (bucket) seen.add(bucket.label);
        });
        const sortedArr = [...seen].sort((a, b) => {
          const aMin = parseInt(a.split("–")[0]);
          const bMin = parseInt(b.split("–")[0]);
          return aMin - bMin;
        });
        sortedArr.forEach((l) => {
          set.add(l);
        });
      } else {
        data.forEach((row) => {
          const v = row[col];
          if (v === null || typeof v === "undefined" || v === "") return;
          set.add(String(v));
        });
      }
      map[col] = Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 2000); // safeguard
    });
    return map;
  }, [data, allColumns, title]);

  // Apply filters
  const filtered = useMemo(() => {
    const isAccounts = /Accounts/i.test(title);
    // Reconstruct bucket definitions (duplicate minimal logic inside memo scope)
    const employeeBuckets = [
      { label: "1–10", min: 1, max: 10 },
      { label: "11–25", min: 11, max: 25 },
      { label: "26–50", min: 26, max: 50 },
      { label: "51–100", min: 51, max: 100 },
      { label: "101–250", min: 101, max: 250 },
      { label: "251–500", min: 251, max: 500 },
      { label: "501–1000", min: 501, max: 1000 },
      { label: "1001–2000", min: 1001, max: 2000 },
      { label: "2001–3000", min: 2001, max: 3000 },
      { label: "3001–4000", min: 3001, max: 4000 },
      { label: "4001–5000", min: 4001, max: 5000 },
      { label: "5001+", min: 5001, max: Infinity },
    ];
    const arrBuckets = Array.from({ length: 20 }, (_, i) => ({
      label: `${i * 10000}–${(i + 1) * 10000 - 1}`,
      min: i * 10000,
      max: (i + 1) * 10000 - 1,
    }));
    arrBuckets.push({ label: `200000+`, min: 200000, max: Infinity });

    function matchBucket(
      val: number,
      label: string,
      bucketDefs: { label: string; min: number; max: number }[],
    ) {
      const def = bucketDefs.find((b) => b.label === label);
      if (!def) return false;
      return val >= def.min && val <= def.max;
    }

    return data.filter((row) => {
      for (const [col, val] of Object.entries(filters)) {
        if (!val) continue;
        const cell = row[col];
        if (isAccounts && col === "employee_count") {
          const num = Number(cell);
          if (!Number.isFinite(num) || !matchBucket(num, val, employeeBuckets))
            return false;
        } else if (isAccounts && col === "arr") {
          const num = Number(cell);
          if (!Number.isFinite(num) || !matchBucket(num, val, arrBuckets))
            return false;
        } else if (String(cell) !== val) {
          return false;
        }
      }
      return true;
    });
  }, [data, filters, title]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize,
  );

  // Reset to first page when filters change length or data changes size
  // (Removed useEffect auto-reset to satisfy lint; we reset page explicitly when filters change.)

  const color = dark ? "#0f172a" : "#111";

  return (
    <div style={{ color, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: 8,
          color: "#ffffff",
        }}
      >
        {title}
      </h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "#b91c1c" }}>Error: {error}</p>}
      {!loading && !error && (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {allColumns.map((col) => (
              <label
                key={col}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 600, color: "#ffffff" }}>{col}</span>
                <select
                  value={filters[col] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters((f) => ({ ...f, [col]: value }));
                    setPage(0);
                  }}
                  style={{
                    minWidth: 140,
                    fontSize: 12,
                    padding: "4px 6px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    background: "#fff",
                    color,
                  }}
                >
                  <option value="">(All)</option>
                  {uniques[col]?.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setFilters({})}
              style={{
                padding: "6px 10px",
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#fff",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              Clear Filters
            </button>
            <span style={{ fontSize: 12, color: "#ffffff" }}>
              Rows: {filtered.length.toLocaleString()} (showing{" "}
              {pageRows.length} of {data.length.toLocaleString()})
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              style={{
                padding: "6px 12px",
                border: "1px solid #334155",
                background: currentPage === 0 ? "#475569" : "#1e293b",
                color: "#fff",
                opacity: currentPage === 0 ? 0.5 : 1,
                cursor: currentPage === 0 ? "not-allowed" : "pointer",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              Prev 100
            </button>
            <span style={{ fontSize: 12, color: "#ffffff" }}>
              Page {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              style={{
                padding: "6px 12px",
                border: "1px solid #334155",
                background:
                  currentPage >= totalPages - 1 ? "#475569" : "#1e293b",
                color: "#fff",
                opacity: currentPage >= totalPages - 1 ? 0.5 : 1,
                cursor:
                  currentPage >= totalPages - 1 ? "not-allowed" : "pointer",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              Next 100
            </button>
          </div>
          <div
            style={{
              maxHeight: "60vh",
              overflow: "auto",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: 12,
              background: "#f1f5f9",
            }}
          >
            <pre style={{ fontSize: 12, lineHeight: 1.4, margin: 0 }}>
              {JSON.stringify(pageRows, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
