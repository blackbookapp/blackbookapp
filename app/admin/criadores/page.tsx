import { one } from "@/lib/one";
import Link from "next/link";
import { db, formatBRL } from "@/lib/creator-server";
import { Badge, Table, FilterBar, fmtDate } from "../ui";

const STATUS = [
  { value: "todos", label: "Todos" },
  { value: "no-ar", label: "Página no ar" },
  { value: "rascunho", label: "Rascunho" },
  { value: "sem-ativacao", label: "Ativação pendente" },
  { value: "sem-stripe", label: "Sem Stripe" },
];

export default async function CriadoresPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "todos" } = await searchParams;

  const [{ data: creators }, { data: sales }, { data: enrollments }] = await Promise.all([
    db.from("creator_profiles")
      .select("id, slug, name, instagram, created_at, platform_paid, stripe_onboarding_done, creator_courses(title, price, is_published)")
      .order("created_at", { ascending: false }),
    db.from("creator_sales").select("creator_id, amount_total, status"),
    db.from("creator_enrollments").select("creator_id").eq("status", "active"),
  ]);

  const totals = new Map<string, { count: number; total: number }>();
  for (const s of sales ?? []) {
    if (s.status !== "paid") continue;
    const t = totals.get(s.creator_id) ?? { count: 0, total: 0 };
    totals.set(s.creator_id, { count: t.count + 1, total: t.total + s.amount_total });
  }
  const students = new Map<string, number>();
  for (const e of enrollments ?? []) students.set(e.creator_id, (students.get(e.creator_id) ?? 0) + 1);

  const term = q.toLowerCase();
  const list = (creators ?? []).filter((c: any) => {
    const course = one(c.creator_courses);
    if (term && ![c.name, c.slug, c.instagram, course?.title].some((v) => (v || "").toLowerCase().includes(term))) return false;
    if (status === "no-ar") return !!course?.is_published;
    if (status === "rascunho") return !course?.is_published;
    if (status === "sem-ativacao") return !c.platform_paid;
    if (status === "sem-stripe") return !c.stripe_onboarding_done;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black">Criadores <span className="text-muted-foreground text-base font-normal">({list.length})</span></h1>
        <FilterBar action="/admin/criadores" q={q} options={STATUS} current={status} placeholder="Nome, link, Instagram ou curso" />
      </div>

      <Table head={["Criador", "Curso", "Status", "Vendas", "Alunos", "Cadastro"]} empty={!list.length}>
        {list.map((c: any) => {
          const course = one(c.creator_courses);
          const t = totals.get(c.id);
          return (
            <tr key={c.id}>
              <td>
                <Link href={`/admin/criadores/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                <p className="text-xs text-muted-foreground">/c/{c.slug}</p>
              </td>
              <td>{course?.title || "—"}{course?.price ? <p className="text-xs text-muted-foreground">R$ {course.price}</p> : null}</td>
              <td className="space-y-1">
                <div>{course?.is_published ? <Badge tone="green">no ar</Badge> : <Badge tone="gray">rascunho</Badge>}</div>
                <div>{c.platform_paid ? <Badge tone="green">ativação ok</Badge> : <Badge tone="yellow">ativação pendente</Badge>}</div>
                <div>{c.stripe_onboarding_done ? <Badge tone="green">stripe ok</Badge> : <Badge tone="yellow">sem stripe</Badge>}</div>
              </td>
              <td className="whitespace-nowrap">{t ? <>{formatBRL(t.total)}<p className="text-xs text-muted-foreground">{t.count} vendas</p></> : "—"}</td>
              <td>{students.get(c.id) ?? 0}</td>
              <td className="text-muted-foreground whitespace-nowrap">{fmtDate(c.created_at)}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
