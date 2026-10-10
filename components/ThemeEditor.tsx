"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { THEME_PRESETS, THEME_FIELDS, type LPTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const METALLIC = "linear-gradient(135deg, #E5E5E5 0%, #A3A3A3 50%, #525252 100%)";

function swatch(v: string) {
  return v === "metallic" ? METALLIC : v;
}

export function ThemeEditor({
  initial,
  previewFrame,
  onChange,
}: {
  initial: LPTheme;
  previewFrame?: React.RefObject<HTMLIFrameElement | null>;
  onChange?: (t: LPTheme) => void;
}) {
  const [theme, setTheme] = useState<LPTheme>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const apply = (next: LPTheme) => {
    setTheme(next);
    onChange?.(next);
    previewFrame?.current?.contentWindow?.postMessage({ type: "bb-theme", theme: next }, window.location.origin);
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/creator", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: next }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Erro ao salvar as cores.");
        setStatus("saved");
        setError("");
      } catch (e: any) {
        setStatus("error");
        setError(e.message);
      }
    }, 600);
  };

  const same = (a: LPTheme, b: LPTheme) => THEME_FIELDS.every(({ key }) => a[key].toLowerCase() === b[key].toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cores da sua página</p>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          {status === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> salvando…</>}
          {status === "saved" && <><Check className="w-3 h-3 text-green-400" /> salvo</>}
          {status === "error" && <span className="text-red-400">{error}</span>}
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {THEME_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => apply(p.theme)}
            title={p.name}
            className={cn(
              "rounded-xl overflow-hidden border-2 transition-all text-left",
              same(theme, p.theme) ? "border-white scale-[1.04]" : "border-white/10 hover:border-white/30"
            )}
          >
            <div className="h-12 p-2 flex flex-col justify-between" style={{ background: p.theme.background }}>
              <div className="h-1.5 w-8 rounded-full" style={{ background: p.theme.text, opacity: 0.8 }} />
              <div className="h-3 w-full rounded" style={{ background: swatch(p.theme.button) }} />
            </div>
            <p className="text-[10px] font-semibold px-2 py-1 bg-black/60 truncate">{p.name}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {THEME_FIELDS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 cursor-pointer hover:border-white/25">
            <span className="relative w-6 h-6 rounded-md border border-white/20 shrink-0 overflow-hidden" style={{ background: swatch(theme[key]) }}>
              <input
                type="color"
                value={theme[key] === "metallic" ? "#a3a3a3" : theme[key]}
                onChange={(e) => apply({ ...theme, [key]: e.target.value.toUpperCase() })}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label={label}
              />
            </span>
            <span className="text-xs text-white/80 leading-tight">{label}</span>
          </label>
        ))}
      </div>
      {theme.button !== "metallic" && (
        <button type="button" onClick={() => apply({ ...theme, button: "metallic" })}
          className="text-[11px] text-muted-foreground hover:text-white underline">
          Usar botão metálico
        </button>
      )}
    </div>
  );
}
