"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportRow {
  [key: string]: string | number | null | undefined;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: ExportRow[string]) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function ExportButtons({
  rows,
  columns,
  filename,
  title,
  subtitle,
}: {
  rows: ExportRow[];
  columns: ExportColumn[];
  filename: string;
  title: string;
  subtitle?: string;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);

  function exportCsv() {
    if (!rows.length) {
      toast.error("There are no rows to export.");
      return;
    }
    const header = columns.map((column) => csvCell(column.label)).join(",");
    const body = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(","));
    download(
      new Blob([`\uFEFF${[header, ...body].join("\r\n")}`], { type: "text/csv;charset=utf-8;" }),
      `${filename}.csv`,
    );
    toast.success("CSV export downloaded.");
  }

  async function exportPdf() {
    if (!rows.length) {
      toast.error("There are no rows to export.");
      return;
    }
    setPdfLoading(true);
    try {
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(title, 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(
        subtitle || `Generated ${new Date().toLocaleString("en-IN")} · EcoCampus AI`,
        40,
        58,
      );
      autoTable(doc, {
        startY: 72,
        head: [columns.map((column) => column.label)],
        body: rows.map((row) => columns.map((column) => String(row[column.key] ?? ""))),
        styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [20, 83, 45], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [246, 250, 247] },
        margin: { left: 40, right: 40 },
      });
      doc.save(`${filename}.pdf`);
      toast.success("PDF export downloaded.");
    } catch {
      toast.error("Could not generate the PDF export.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportCsv}>
        <FileSpreadsheet className="h-4 w-4" /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportPdf} loading={pdfLoading}>
        {pdfLoading ? <Download className="h-4 w-4" /> : <FileText className="h-4 w-4" />} PDF
      </Button>
    </div>
  );
}
