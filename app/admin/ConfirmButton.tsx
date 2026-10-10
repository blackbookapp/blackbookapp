"use client";

import { useFormStatus } from "react-dom";

export function ConfirmButton({ children, confirm, tone = "default" }: {
  children: React.ReactNode;
  confirm?: string;
  tone?: "default" | "danger" | "primary";
}) {
  const { pending } = useFormStatus();
  const cls = {
    default: "border border-white/20 hover:bg-white/5",
    danger: "border border-red-500/30 text-red-400 hover:bg-red-500/10",
    primary: "metallic-gradient text-black",
  }[tone];
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-50 ${cls}`}
    >
      {pending ? "…" : children}
    </button>
  );
}
