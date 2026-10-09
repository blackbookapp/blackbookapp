"use client";

import { useEffect, useState } from "react";
import { Eye, Percent, GraduationCap, TrendingUp } from "lucide-react";

interface Stats {
  views_30d: number;
  sales_30d: number;
  revenue_30d: number;
  conversion_30d: number;
  active_students: number;
  series: { day: string; revenue: number; sales: number }[];
}

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/creator/stats").then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
  }, []);

  if (!stats) return null;
  const max = Math.max(1, ...stats.series.map((s) => s.revenue));

  return (
    <div className="glass rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-black flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Últimos 30 dias</h2>
        <span className="text-sm font-black text-green-400">{brl(stats.revenue_30d)}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Eye, label: "Visitas na página", value: stats.views_30d.toLocaleString("pt-BR") },
          { icon: Percent, label: "Conversão", value: `${stats.conversion_30d.toLocaleString("pt-BR")}%` },
          { icon: GraduationCap, label: "Alunos ativos", value: stats.active_students.toLocaleString("pt-BR") },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
            <Icon className="w-4 h-4 text-muted-foreground mb-2" />
            <p className="text-lg font-black">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-[3px] h-28" role="img" aria-label="Faturamento por dia nos últimos 30 dias">
        {stats.series.map((s) => (
          <div key={s.day} className="flex-1 h-full flex items-end group relative">
            <div
              className="w-full rounded-t-sm bg-primary/70 group-hover:bg-primary transition-colors"
              style={{ height: `${Math.max(s.revenue ? 6 : 2, (s.revenue / max) * 100)}%`, opacity: s.revenue ? 1 : 0.25 }}
            />
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap bg-black border border-white/15 rounded-md px-2 py-1 text-[10px] z-10">
              {new Date(`${s.day}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {s.sales} vendas · {brl(s.revenue)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
        <span>30 dias atrás</span>
        <span>hoje</span>
      </div>
    </div>
  );
}
