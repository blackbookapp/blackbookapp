import Link from "next/link";
import { db, formatBRL } from "@/lib/creator-server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [{ data: creators }, { data: sales }, { count: enrollments }] = await Promise.all([
    db.from("creator_profiles")
      .select("id, slug, name, created_at, platform_paid, stripe_onboarding_done, creator_courses(title, is_published)")
      .order("created_at", { ascending: false }),
    db.from("creator_sales").select("creator_id, amount_total, platform_fee, status"),
    db.from("creator_enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const paidSales = (sales ?? []).filter((s) => s.status === "paid");
  const gmv = paidSales.reduce((a, s) => a + s.amount_total, 0);
  const fees = paidSales.reduce((a, s) => a + s.platform_fee, 0);
  const byCreator = new Map<string, { count: number; total: number }>();
  for (const s of paidSales) {
    const cur = byCreator.get(s.creator_id) ?? { count: 0, total: 0 };
    byCreator.set(s.creator_id, { count: cur.count + 1, total: cur.total + s.amount_total });
  }
  const list = creators ?? [];

  const cards = [
    { label: "Criadores", value: list.length.toString() },
    { label: "Ativações pagas", value: list.filter((c) => c.platform_paid).length.toString() },
    { label: "Vendido na plataforma", value: formatBRL(gmv) },
    { label: "Taxa recebida", value: formatBRL(fees) },
    { label: "Alunos ativos", value: (enrollments ?? 0).toString() },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Visão geral</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl border border-white/10 p-5">
            <p className="text-xl font-black">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-white/8">
              <th className="p-4">Criador</th>
              <th className="p-4">Curso</th>
              <th className="p-4">Ativação</th>
              <th className="p-4">Stripe</th>
              <th className="p-4">Vendas</th>
              <th className="p-4">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c: any) => {
              const course = c.creator_courses?.[0];
              const s = byCreator.get(c.id);
              return (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="p-4">
                    <p className="font-medium">{c.name}</p>
                    <Link href={`/c/${c.slug}`} target="_blank" className="text-xs text-primary hover:underline">/c/{c.slug}</Link>
                  </td>
                  <td className="p-4">
                    {course?.title || "—"}
                    {course && !course.is_published && <span className="block text-[10px] text-yellow-400">rascunho</span>}
                  </td>
                  <td className="p-4">{c.platform_paid ? <span className="text-green-400">Paga</span> : <span className="text-muted-foreground">Pendente</span>}</td>
                  <td className="p-4">{c.stripe_onboarding_done ? <span className="text-green-400">Conectado</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-4 whitespace-nowrap">{s ? `${s.count} · ${formatBRL(s.total)}` : "—"}</td>
                  <td className="p-4 text-muted-foreground whitespace-nowrap">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
