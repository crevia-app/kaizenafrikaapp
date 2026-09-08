import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";



// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeHex(raw: string): string {
  const s = raw.replace(/^#/, "").trim();
  if (/^[0-9A-Fa-f]{3}$/.test(s))
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s.toUpperCase()}`;
  return "";
}

function buildGradient(from: string, to: string, angle: number): string {
  return `linear-gradient(${angle}deg,${from} 0%,${to} 100%)`;
}

// ─── Invoice State Architecture ───────────────────────────────────────────────
// The selected color is saved to business_settings.invoice_accent_color via
// InvoiceSettingsDialog. Both InvoicePreviewDialog and ReceiptPreviewDialog
// read this single field from Supabase on open, so Invoice + Receipt always
// share the same accent. To wire this component into those dialogs, lift
// `accentColor` state up to a shared parent (or a zustand/context store) and
// pass `value={accentColor}` + `onChange={setAccentColor}` here.

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AdvancedColorSelectorProps {
  variant: "link" | "invoice";
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function AdvancedColorSelector({
  variant,
  value,
  onChange,
  className,
}: AdvancedColorSelectorProps) {
  const [tab, setTab] = useState<"solid" | "gradient">("solid");
  const [hexInput, setHexInput] = useState(() => (value || "").replace(/^#/, ""));
  const [gradFrom, setGradFrom] = useState("#0A0A0A");
  const [gradTo, setGradTo] = useState("#B07D3A");
  const [gradAngle, setGradAngle] = useState(135);

  const hexPreview = normalizeHex(hexInput);

  const handleHexChange = useCallback(
    (raw: string) => {
      // Strip leading # so user can paste either format
      const stripped = raw.replace(/^#/, "");
      setHexInput(stripped);
      const normalized = normalizeHex(stripped);
      if (normalized) onChange(normalized);
    },
    [onChange]
  );

  const customGradientValue = buildGradient(gradFrom, gradTo, gradAngle);

  return (
    <div className={cn("space-y-4", className)}>

      {/* ── Tab bar — Kaizen Link only ────────────────────────────────────── */}
      {variant === "link" && (
        <div className="inline-flex gap-0.5 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          {(["solid", "gradient"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-5 py-1.5 rounded-lg text-xs font-medium capitalize tracking-wide transition-all duration-200",
                tab === t
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/35 hover:text-white/60"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ── Solid panel ──────────────────────────────────────────────────────── */}
      {(variant === "invoice" || tab === "solid") && (
        <div className="space-y-4">

          {/* Custom HEX input */}
          <div className="flex items-center gap-3">
            {/* Preview bubble */}
            <div
              className={cn(
                "w-9 h-9 rounded-xl border border-white/10 flex-shrink-0 transition-all duration-200",
                hexPreview ? "opacity-100 ring-1 ring-inset ring-white/10" : "opacity-25"
              )}
              style={{ background: hexPreview || value || "#0A0A0A" }}
            />

            {/* Input */}
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-mono select-none pointer-events-none">
                #
              </span>
              <input
                type="text"
                placeholder="000000"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                className={cn(
                  "w-full pl-7 pr-4 py-2.5 rounded-xl",
                  "bg-zinc-950 border border-zinc-800",
                  "text-white font-mono placeholder:text-zinc-500",
                  "focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500",
                  "transition-all duration-150"
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Gradient panel — Kaizen Link only ────────────────────────────────── */}
      {variant === "link" && tab === "gradient" && (
        <div className="space-y-4">

          {/* Custom gradient builder */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-medium">
              Custom Gradient
            </p>

            {/* Controls — stacked on mobile, row on sm+ */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">

              {/* From */}
              <div className="space-y-2 sm:flex-1">
                <label className="text-[10px] uppercase tracking-wide text-zinc-400">From</label>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 flex-shrink-0">
                    <input
                      type="color"
                      value={gradFrom}
                      onChange={(e) => setGradFrom(e.target.value)}
                      className={cn(
                        "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
                        "peer"
                      )}
                    />
                    <div
                      className="w-8 h-8 rounded-lg border border-white/15 peer-focus:ring-1 peer-focus:ring-white/30 pointer-events-none transition-all"
                      style={{ background: gradFrom }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-300 tabular-nums">
                    {gradFrom.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Angle */}
              <div className="space-y-2 sm:flex-shrink-0">
                <label className="text-[10px] uppercase tracking-wide text-zinc-400">Angle</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={gradAngle}
                    onChange={(e) => setGradAngle(Number(e.target.value))}
                    className="flex-1 sm:w-24 h-1 accent-white cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-white/40 tabular-nums w-8">
                    {gradAngle}°
                  </span>
                </div>
              </div>

              {/* To */}
              <div className="space-y-2 sm:flex-1">
                <label className="text-[10px] uppercase tracking-wide text-zinc-400">To</label>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 flex-shrink-0">
                    <input
                      type="color"
                      value={gradTo}
                      onChange={(e) => setGradTo(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer"
                    />
                    <div
                      className="w-8 h-8 rounded-lg border border-white/15 peer-focus:ring-1 peer-focus:ring-white/30 pointer-events-none transition-all"
                      style={{ background: gradTo }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-300 tabular-nums">
                    {gradTo.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Live preview strip */}
            <div
              className="w-full h-9 rounded-xl border border-white/10 transition-all duration-200"
              style={{ background: customGradientValue }}
            />

            {/* Apply button */}
            <button
              onClick={() => onChange(customGradientValue)}
              className={cn(
                "w-full py-2.5 rounded-xl text-xs font-medium tracking-wide",
                "bg-white/[0.06] border border-white/10 text-white/60",
                "hover:bg-white/[0.10] hover:text-white hover:border-white/20",
                "transition-all duration-150 active:scale-[0.99]"
              )}
            >
              Apply Gradient
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
