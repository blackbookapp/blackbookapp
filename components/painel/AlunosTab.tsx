"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Users, Download, Search } from "lucide-react";

interface Student {
  id: string;
  student_email: string;
  student_name: string | null;
  amount_paid: number | null;
  coupon_code: string | null;
  status: string;
  created_at: string;
  activated: boolean;
  completed_lessons: number;
  progress: number;
}

export function AlunosTab() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/creator/students")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .catch(() => setStudents([]));
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return (students ?? []).filter(
      (s) => !term || s.student_email.includes(term) || (s.student_name || "").toLowerCase().includes(term)
    );
  }, [students, q]);

  const exportCsv = () => {
    const rows = [["Nome", "E-mail", "Data", "Valor", "Cupom", "Status", "Progresso"]];
    for (const s of filtered) {
      rows.push([
        s.student_name || "",
        s.student_email,
        new Date(s.created_at).toLocaleDateString("pt-BR"),
        ((s.amount_paid ?? 0) / 100).toFixed(2).replace(".", ","),
        s.coupon_code || "",
        s.status === "active" ? "Ativo" : s.status === "refunded" ? "Estornado" : "Revogado",
        `${s.progress}%`,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `alunos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!students) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Alunos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {students.filter((s) => s.status === "active").length} com acesso ativo
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar"
              className="bg-white/5 border border-white/15 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/40 w-48" />
          </div>
          <button onClick={exportCsv} disabled={!filtered.length}
            className="flex items-center gap-1.5 px-4 rounded-xl border border-white/15 text-xs font-bold uppercase tracking-widest hover:bg-white/5 disabled:opacity-40">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="glass rounded-2xl border border-white/10 p-12 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum aluno ainda. Quando alguém comprar, aparece aqui.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-white/8">
                <th className="p-4">Aluno</th>
                <th className="p-4">Compra</th>
                <th className="p-4">Valor</th>
                <th className="p-4 w-48">Progresso</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-white/5 last:border-0">
                  <td className="p-4">
                    <p className="font-medium">{s.student_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{s.student_email}</p>
                  </td>
                  <td className="p-4 text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4 whitespace-nowrap">
                    R$ {((s.amount_paid ?? 0) / 100).toFixed(2).replace(".", ",")}
                    {s.coupon_code && <span className="block text-[10px] text-primary">{s.coupon_code}</span>}
                  </td>
                  <td className="p-4">
                    {s.activated ? (
                      <>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                          <div className="h-full bg-primary" style={{ width: `${s.progress}%` }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground">{s.progress}%</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-yellow-400">Ainda não acessou</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={s.status === "active" ? "text-green-400 text-xs font-bold" : "text-red-400 text-xs font-bold"}>
                      {s.status === "active" ? "Ativo" : s.status === "refunded" ? "Estornado" : "Revogado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
