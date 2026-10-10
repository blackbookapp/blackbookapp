import Link from "next/link";
import { Download } from "lucide-react";
import { formatBRL } from "@/lib/creator-server";
import { Badge, Table, FilterBar, Stat, fmtDate } from "../ui";
import { loadSales } from "./data";

const STATUS = [
  { value: "todos", label: "Todas" },
  { value: "pagas", label: "Pagas" },
  { value: "estornadas", label: "Estornadas" },
];

export default async function VendasPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; creator?: string }> }) {
  const params = await searchParams;
  const sales = await loadSales(params);
  const paid = sales.filter((s: any) => s.status === "paid");
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black">Vendas <span className="text-muted-foreground text-base font-normal">({sales.length})</span></h1>
        <div className="flex flex-wrap gap-2">
          <FilterBar action="/admin/vendas" q={params.q} options={STATUS} current={params.status} placeholder="Aluno, criador, cupom ou ID" />
          <a href={`/admin/vendas/csv${qs ? `?${qs}` : ""}`}
            className="px-4 py-2 rounded-xl border border-white/20 text-xs font-bold uppercase tracking-widest hover:bg-white/5 inline-flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total vendido" value={formatBRL(paid.reduce((a: number, s: any) => a + s.amount_total, 0))} />
        <Stat label="Taxa da plataforma" value={formatBRL(paid.reduce((a: number, s: any) => a + s.platform_fee, 0))} />
        <Stat label="Repassado aos criadores" value={formatBRL(paid.reduce((a: number, s: any) => a + s.creator_amount, 0))} />
        <Stat label="Vendas pagas · estornadas" value={`${paid.length} · ${sales.length - paid.length}`} />
      </div>

      <Table head={["Data", "Aluno", "Criador / curso", "Valor", "Taxa", "Cupom", "Status", "Stripe"]} empty={!sales.length}>
        {sales.map((s: any) => (
          <tr key={s.id}>
            <td className="text-muted-foreground whitespace-nowrap">{fmtDate(s.created_at)}</td>
            <td><p>{s.student_name || "—"}</p><p className="text-xs text-muted-foreground">{s.student_email}</p></td>
            <td>
              <Link href={`/admin/criadores/${s.creator_id}`} className="hover:underline">{s.creator_profiles?.name || "—"}</Link>
              <p className="text-xs text-muted-foreground">{s.creator_courses?.title}</p>
            </td>
            <td className="whitespace-nowrap">{formatBRL(s.amount_total)}</td>
            <td className="whitespace-nowrap">{formatBRL(s.platform_fee)}</td>
            <td>{s.coupon_code || "—"}</td>
            <td>{s.status === "paid" ? <Badge tone="green">paga</Badge> : <Badge tone="red">estornada</Badge>}</td>
            <td>
              {s.stripe_payment_id?.startsWith("pi_") && (
                <a href={`https://dashboard.stripe.com/payments/${s.stripe_payment_id}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline">abrir</a>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
