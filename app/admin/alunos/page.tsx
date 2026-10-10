import Link from "next/link";
import { db, formatBRL } from "@/lib/creator-server";
import { grantAccess, setEnrollmentStatus } from "../actions";
import { ConfirmButton } from "../ConfirmButton";
import { Badge, Table, FilterBar, fmtDate } from "../ui";

const STATUS = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Revogados / estornados" },
  { value: "sem-conta", label: "Ainda não acessaram" },
];

const input = "bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40";

export default async function AlunosPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "todos" } = await searchParams;

  const [{ data: enrollments }, { data: courses }] = await Promise.all([
    db.from("creator_enrollments")
      .select("*, creator_profiles(id, name), creator_courses(title)")
      .order("created_at", { ascending: false })
      .limit(2000),
    db.from("creator_courses").select("id, title, creator_profiles(name)").order("created_at", { ascending: false }),
  ]);

  const term = q.toLowerCase();
  const list = (enrollments ?? []).filter((e: any) => {
    if (term && ![e.student_email, e.student_name, e.creator_profiles?.name, e.creator_courses?.title].some((v) => (v || "").toLowerCase().includes(term))) return false;
    if (status === "ativos") return e.status === "active";
    if (status === "inativos") return e.status !== "active";
    if (status === "sem-conta") return !e.user_id;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black">Alunos <span className="text-muted-foreground text-base font-normal">({list.length})</span></h1>
        <FilterBar action="/admin/alunos" q={q} options={STATUS} current={status} placeholder="E-mail, nome, criador ou curso" />
      </div>

      <form action={grantAccess} className="glass rounded-2xl border border-white/10 p-5 flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="lg:mr-2">
          <p className="font-black">Liberar curso manualmente</p>
          <p className="text-xs text-muted-foreground">Para brindes, parcerias ou correções. O aluno entra com este e-mail.</p>
        </div>
        <input name="email" type="email" required placeholder="email@aluno.com" className={`${input} lg:w-64`} />
        <input name="name" placeholder="Nome (opcional)" className={`${input} lg:w-48`} />
        <select name="course_id" required className={`${input} lg:w-72`} defaultValue="">
          <option value="" disabled className="bg-black">Escolha o curso</option>
          {(courses ?? []).map((c: any) => (
            <option key={c.id} value={c.id} className="bg-black">{c.title} — {c.creator_profiles?.name}</option>
          ))}
        </select>
        <ConfirmButton tone="primary">Liberar acesso</ConfirmButton>
      </form>

      <Table head={["Aluno", "Curso", "Origem", "Conta criada", "Status", "Data", ""]} empty={!list.length}>
        {list.map((e: any) => (
          <tr key={e.id}>
            <td><p>{e.student_name || "—"}</p><p className="text-xs text-muted-foreground">{e.student_email}</p></td>
            <td>
              <p>{e.creator_courses?.title || "—"}</p>
              <Link href={`/admin/criadores/${e.creator_id}`} className="text-xs text-muted-foreground hover:underline">{e.creator_profiles?.name}</Link>
            </td>
            <td>{e.coupon_code === "MANUAL" ? <Badge tone="gray">admin</Badge> : <>{formatBRL(e.amount_paid ?? 0)}{e.coupon_code && <p className="text-[10px] text-primary">{e.coupon_code}</p>}</>}</td>
            <td>{e.user_id ? "sim" : <span className="text-yellow-400 text-xs">ainda não</span>}</td>
            <td>{e.status === "active" ? <Badge tone="green">ativo</Badge> : <Badge tone="red">{e.status === "refunded" ? "estornado" : "revogado"}</Badge>}</td>
            <td className="text-muted-foreground whitespace-nowrap">{fmtDate(e.created_at)}</td>
            <td>
              {e.status === "active" ? (
                <form action={setEnrollmentStatus.bind(null, e.id, "revoked")}>
                  <ConfirmButton tone="danger" confirm={`Revogar o acesso de ${e.student_email}?`}>Revogar</ConfirmButton>
                </form>
              ) : (
                <form action={setEnrollmentStatus.bind(null, e.id, "active")}>
                  <ConfirmButton>Reativar</ConfirmButton>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
