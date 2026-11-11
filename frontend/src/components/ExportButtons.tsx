import { useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { downloadReport } from "../api/client";
import type { Filters } from "../types";
export default function ExportButtons({ filters }: { filters: Filters }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <div className="export-wrap">
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        <Download size={16} />
        {busy ? "Génération…" : "Exporter"}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="dropdown">
          {(["xlsx", "pdf"] as const).map((f) => (
            <button
              key={f}
              onClick={async () => {
                setOpen(false);
                setBusy(true);
                try {
                  await downloadReport(f, filters);
                  toast.success("Rapport téléchargé.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {f === "xlsx" ? "Tableau Excel (.xlsx)" : "Rapport PDF (.pdf)"}
            </button>
          ))}
          <small>Respecte la sélection en cours.</small>
        </div>
      )}
    </div>
  );
}
