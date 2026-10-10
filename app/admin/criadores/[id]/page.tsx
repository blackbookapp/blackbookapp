import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Eye, PlayCircle, Instagram } from "lucide-react";
import { db, formatBRL } from "@/lib/creator-server";
import { setActivation, setPublished, setEnrollmentStatus } from "../../actions";
import { ConfirmButton } from "../../ConfirmButton";
import { Stat, Badge, Table, fmtDate } from "../../ui";

export default async function CriadorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: c } = await db
    .from("creator_profiles")
    .select("*, creator_courses(id, title, subtitle, price, is_published, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  const course = (c as any).creator_courses?.[0];

  const [{ data: sales }, { data: enrollments }, { count: modules }, { count: lessons }, { count: views }, { count: coupons }] = await Promise.all([
    db.from("creator_sales").select("*").eq("creator_id", id).order("created_at", { ascending: false }),
    db.from("creator_enrollments").select("*").eq("creator_id", id).order("created_at", { ascending: false }),
    course ? db.from("creator_modules").select("id", { count: "exact", head: true }).eq("course_id", course.id) : Promise.resolve({ count: 0 }),
    course ? db.from("creator_lessons").select("id", { count: "exact", head: true }).eq("course_id", course.id) : Promise.resolve({ count: 0 }),
    db.from("creator_page_views").select("id", { count: "exact", head: true }).eq("creator_id", id),
    course ? db.from("creator_coupons").select("id", { count: "exact", head: true }).eq("course_id", course.id) : Promise.resolve({ count: 0 }),
  ]);

  const paid = (sales ?? []).filter((s) => s.status === "paid");
  const gross = paid.reduce((a, s) => a + s.amount_total, 0);
  const fees = paid.reduce((a, s) => a + s.platform_fee, 0);

  return (
    <div className="space-y-8">
      <Link href="/admin/criadores" className="text-sm text-muted-foreground hover:text-white inline-flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" /> Criadores
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          {c.photo_url
            ? <img src={c.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border border-white/15" />
            : <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-black">{c.name?.charAt(0)}</div>}
          <div>
            <h1 className="text-2xl font-black">{c.name}</h1>
            <p className="text-sm text-muted-foreground">
              {c.specialty || "—"} · cadastro {fmtDate(c.created_at)}
              {c.instagram && <> · <Instagram className="w-3.5 h-3.5 inline" /> {c.instagram}</>}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {course?.is_published ? <Badge tone="green">página no ar</Badge> : <Badge tone="gray">rascunho</Badge>}
              {c.platform_paid ? <Badge tone="green">ativação {fmtDate(c.platform_paid_at)}</Badge> : <Badge tone="yellow">ativação pendente</Badge>}
              {c.stripe_onboarding_done ? <Badge tone="green">stripe conectado</Badge> : <Badge tone="yellow">sem stripe</Badge>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/c/${c.slug}/preview`} target="_blank" className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:bg-white/5 inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Prévia</Link>
          {course?.is_published && (
            <Link href={`/c/${c.slug}`} target="_blank" className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:bg-white/5 inline-flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Página pública</Link>
          )}
          {course && (
            <Link href={`/dashboard/courses/${course.id}`} target="_blank" className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:bg-white/5 inline-flex items-center gap-1.5"><PlayCircle className="w-3.5 h-3.5" /> Ver aulas</Link>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/10 p-5 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-2">Ações</span>
        {course && (course.is_published ? (
          <form action={setPublished.bind(null, id, false)}>
            <ConfirmButton tone="danger" confirm={`Tirar a página de ${c.name} do ar? Ninguém conseguirá comprar até ela voltar.`}>Tirar página do ar</ConfirmButton>
          </form>
        ) : (
          <form action={setPublished.bind(null, id, true)}>
            <ConfirmButton tone="primary">Colocar página no ar</ConfirmButton>
          </form>
        ))}
        {c.platform_paid ? (
          <form action={setActivation.bind(null, id, false)}>
            <ConfirmButton tone="danger" confirm="Revogar a ativação? A página sai do ar e o criador precisará pagar de novo para publicar.">Revogar ativação</ConfirmButton>
          </form>
        ) : (
          <form action={setActivation.bind(null, id, true)}>
            <ConfirmButton confirm={`Liberar a ativação de ${c.name} sem cobrança? A página vai para o ar.`}>Liberar ativação grátis</ConfirmButton>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Stat label="Vendido" value={formatBRL(gross)} hint={`${paid.length} vendas`} />
        <Stat label="Taxa da plataforma" value={formatBRL(fees)} />
        <Stat label="Alunos ativos" value={String((enrollments ?? []).filter((e) => e.status === "active").length)} />
        <Stat label="Visitas na página" value={String(views ?? 0)} hint={views ? `conversão ${((paid.length / views) * 100).toFixed(1).replace(".", ",")}%` : undefined} />
        <Stat label="Módulos · aulas" value={`${modules ?? 0} · ${lessons ?? 0}`} />
        <Stat label="Cupons" value={String(coupons ?? 0)} />
      </div>

      <div className="glass rounded-2xl border border-white/10 p-5 text-sm space-y-1">
        <p><span className="text-muted-foreground">Curso:</span> {course?.title || "—"} {course?.price && <>· R$ {course.price}</>}</p>
        <p><span className="text-muted-foreground">Link:</span> /c/{c.slug}</p>
        <p><span className="text-muted-foreground">Conta Stripe:</span> <span className="font-mono">{c.stripe_account_id || "—"}</span></p>
        <p><span className="text-muted-foreground">Usuário (Clerk):</span> <span className="font-mono">{c.user_id || "—"}</span></p>
        {c.bio && <p className="text-muted-foreground pt-2 whitespace-pre-wrap">{c.bio}</p>}
      </div>

      <section className="space-y-3">
        <h2 className="font-black">Vendas ({sales?.length ?? 0})</h2>
        <Table head={["Aluno", "Valor", "Taxa", "Líquido", "Cupom", "Status", "Data"]} empty={!sales?.length}>
          {(sales ?? []).map((s) => (
            <tr key={s.id}>
              <td><p>{s.student_name || "—"}</p><p className="text-xs text-muted-foreground">{s.student_email}</p></td>
              <td className="whitespace-nowrap">{formatBRL(s.amount_total)}</td>
              <td className="whitespace-nowrap">{formatBRL(s.platform_fee)}</td>
              <td className="whitespace-nowrap">{formatBRL(s.creator_amount)}</td>
              <td>{s.coupon_code || "—"}</td>
              <td>{s.status === "paid" ? <Badge tone="green">paga</Badge> : <Badge tone="red">estornada</Badge>}</td>
              <td className="text-muted-foreground whitespace-nowrap">{fmtDate(s.created_at)}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="font-black">Alunos ({enrollments?.length ?? 0})</h2>
        <Table head={["Aluno", "Origem", "Conta criada", "Status", "Data", ""]} empty={!enrollments?.length}>
          {(enrollments ?? []).map((e) => (
            <tr key={e.id}>
              <td><p>{e.student_name || "—"}</p><p className="text-xs text-muted-foreground">{e.student_email}</p></td>
              <td>{e.coupon_code === "MANUAL" ? <Badge tone="gray">liberado pelo admin</Badge> : formatBRL(e.amount_paid ?? 0)}</td>
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
      </section>
    </div>
  );
}
