import { one } from "@/lib/one";
import Link from "next/link";
import { db, formatBRL } from "@/lib/creator-server";
import { Stat, Badge, Table, BarChart, fmtDate } from "./ui";

const DAYS = 30;
const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export default async function AdminOverview() {
  const since = new Date(Date.now() - DAYS * 86400000).toISOString();
  const [{ data: creators }, { data: sales }, { count: activeStudents }, { count: views }] = await Promise.all([
    db.from("creator_profiles")
      .select("id, slug, name, created_at, platform_paid, stripe_onboarding_done, creator_courses(is_published)")
      .order("created_at", { ascending: false }),
    db.from("creator_sales")
      .select("id, creator_id, amount_total, platform_fee, status, student_email, student_name, created_at")
      .order("created_at", { ascending: false }),
    db.from("creator_enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("creator_page_views").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);

  const list = creators ?? [];
  const all = sales ?? [];
  const paid = all.filter((s) => s.status === "paid");
  const refunded = all.filter((s) => s.status === "refunded");
  const gmv = paid.reduce((a, s) => a + s.amount_total, 0);
  const fees = paid.reduce((a, s) => a + s.platform_fee, 0);
  const paid30 = paid.filter((s) => s.created_at >= since);
  const published = list.filter((c: any) => one(c.creator_courses)?.is_published).length;
  const names = new Map(list.map((c) => [c.id, c]));

  const series = Array.from({ length: DAYS }, (_, i) => ({ day: dayKey(new Date(Date.now() - (DAYS - 1 - i) * 86400000)), value: 0 }));
  const byDay = new Map(series.map((s) => [s.day, s]));
  for (const s of paid30) {
    const b = byDay.get(dayKey(new Date(s.created_at)));
    if (b) b.value += s.amount_total;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Visão geral</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Vendido na plataforma" value={formatBRL(gmv)} hint={`${paid.length} vendas`} />
        <Stat label="Comissões recebidas" value={formatBRL(fees)} />
        <Stat label="Vendido nos últimos 30 dias" value={formatBRL(paid30.reduce((a, s) => a + s.amount_total, 0))} hint={`${paid30.length} vendas · ${views ?? 0} visitas`} />
        <Stat label="Estornos" value={refunded.length.toString()} hint={formatBRL(refunded.reduce((a, s) => a + s.amount_total, 0))} />
        <Stat label="Criadores" value={list.length.toString()} />
        <Stat label="Criadores no Pro" value={list.filter((c) => c.platform_paid).length.toString()} />
        <Stat label="Páginas no ar" value={published.toString()} />
        <Stat label="Alunos ativos" value={(activeStudents ?? 0).toString()} />
      </div>

      <div className="glass rounded-2xl border border-white/10 p-6">
        <h2 className="font-black mb-5">Vendas por dia (30 dias)</h2>
        <BarChart label="Valor vendido por dia nos últimos 30 dias"
          series={series.map((s) => ({ ...s, display: formatBRL(s.value) }))} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black">Últimas vendas</h2>
            <Link href="/admin/vendas" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          <Table head={["Aluno", "Criador", "Valor", "Data"]} empty={!all.length}>
            {all.slice(0, 8).map((s) => (
              <tr key={s.id}>
                <td><p>{s.student_name || "—"}</p><p className="text-xs text-muted-foreground">{s.student_email}</p></td>
                <td><Link href={`/admin/criadores/${s.creator_id}`} className="hover:underline">{names.get(s.creator_id)?.name || "—"}</Link></td>
                <td className="whitespace-nowrap">{formatBRL(s.amount_total)} {s.status !== "paid" && <Badge tone="red">estornada</Badge>}</td>
                <td className="text-muted-foreground whitespace-nowrap">{fmtDate(s.created_at)}</td>
              </tr>
            ))}
          </Table>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black">Novos criadores</h2>
            <Link href="/admin/criadores" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          <Table head={["Criador", "Status", "Cadastro"]} empty={!list.length}>
            {list.slice(0, 8).map((c: any) => (
              <tr key={c.id}>
                <td><Link href={`/admin/criadores/${c.id}`} className="font-medium hover:underline">{c.name}</Link><p className="text-xs text-muted-foreground">/c/{c.slug}</p></td>
                <td className="space-x-1">
                  {one(c.creator_courses)?.is_published ? <Badge tone="green">no ar</Badge> : <Badge tone="gray">rascunho</Badge>}
                  {!c.stripe_onboarding_done && <Badge tone="yellow">sem stripe</Badge>}
                </td>
                <td className="text-muted-foreground whitespace-nowrap">{fmtDate(c.created_at)}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </div>
  );
}
