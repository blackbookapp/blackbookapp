import Link from "next/link";

export const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl border border-white/10 p-5">
      <p className="text-xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {hint && <p className="text-[10px] text-muted-foreground/70 mt-1">{hint}</p>}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "green" | "yellow" | "red" | "gray"; children: React.ReactNode }) {
  const map = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    gray: "bg-white/5 text-muted-foreground border-white/10",
  };
  return <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[tone]}`}>{children}</span>;
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="glass rounded-2xl border border-white/10 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-white/8">
            {head.map((h) => <th key={h} className="p-4 font-semibold whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-white/5 [&>tr:last-child]:border-0 [&_td]:p-4 [&_td]:align-top">
          {children}
        </tbody>
      </table>
      {empty && <p className="text-center text-sm text-muted-foreground py-10">Nada encontrado.</p>}
    </div>
  );
}

export function FilterBar({ action, q, options, current, placeholder }: {
  action: string;
  q?: string;
  options?: { value: string; label: string }[];
  current?: string;
  placeholder: string;
}) {
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input name="q" defaultValue={q} placeholder={placeholder}
        className="bg-white/5 border border-white/15 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:border-primary/40" />
      {options && (
        <select name="status" defaultValue={current}
          className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm focus:outline-none">
          {options.map((o) => <option key={o.value} value={o.value} className="bg-black">{o.label}</option>)}
        </select>
      )}
      <button className="px-4 py-2 rounded-xl border border-white/20 text-xs font-bold uppercase tracking-widest hover:bg-white/5">Filtrar</button>
      {(q || (current && current !== "todos")) && (
        <Link href={action} className="px-3 py-2 text-xs text-muted-foreground hover:text-white">Limpar</Link>
      )}
    </form>
  );
}

export function BarChart({ series, label }: { series: { day: string; value: number; display: string }[]; label: string }) {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div>
      <div className="flex items-end gap-[3px] h-32" role="img" aria-label={label}>
        {series.map((s) => (
          <div key={s.day} className="flex-1 h-full flex items-end" title={`${new Date(`${s.day}T12:00:00`).toLocaleDateString("pt-BR")}: ${s.display}`}>
            <div className="w-full rounded-t-sm bg-primary/70 hover:bg-primary"
              style={{ height: `${Math.max(s.value ? 6 : 2, (s.value / max) * 100)}%`, opacity: s.value ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
        <span>30 dias atrás</span><span>hoje</span>
      </div>
    </div>
  );
}
