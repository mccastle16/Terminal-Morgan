"use client";

// Export cards — each generates a real file client-side (Blob + object URL)
// from the rows serialized by the server page.

import { useState } from "react";
import { Card, ghostBtnCls, MonoTag } from "@/components/terminal/ui";

export type ExportFile = {
  id: string;
  title: string;
  description: string;
  filename: string;
  kind: "csv" | "txt";
  rowCount: number;
  header?: string[];
  rows?: string[][];
  text?: string;
};

function csvEscape(v: string): string {
  return v.includes(",") || v.includes('"') || v.includes("\n")
    ? `"${v.replace(/"/g, '""')}"`
    : v;
}

function buildContent(f: ExportFile): string {
  if (f.kind === "txt") return f.text ?? "";
  const lines = [(f.header ?? []).map(csvEscape).join(",")];
  for (const row of f.rows ?? []) lines.push(row.map(csvEscape).join(","));
  return lines.join("\n");
}

function download(f: ExportFile) {
  const mime = f.kind === "csv" ? "text/csv" : "text/plain";
  const blob = new Blob([buildContent(f)], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportsClient({ files }: { files: ExportFile[] }) {
  const [done, setDone] = useState<string[]>([]);

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
      {files.map((f) => (
        <Card key={f.id} className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <p className="text-body-sm font-w510 text-mist">{f.title}</p>
            <MonoTag>
              {f.rowCount.toLocaleString("en-US")} {f.kind === "txt" ? "lines" : "rows"}
            </MonoTag>
          </div>
          <p className="mt-1.5 flex-1 text-caption text-fog">{f.description}</p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => {
                download(f);
                setDone((d) => (d.includes(f.id) ? d : [...d, f.id]));
              }}
              className={ghostBtnCls()}
            >
              Download {f.kind.toUpperCase()}
            </button>
            {done.includes(f.id) && <span className="text-label text-ash">Downloaded</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}
