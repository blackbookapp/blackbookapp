import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/auth-server";
import { loadSales } from "../data";

const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export async function GET(req: NextRequest) {
  if (!(await checkIsAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = req.nextUrl.searchParams;
  const sales = await loadSales({ q: p.get("q") || "", status: p.get("status") || "todos", creator: p.get("creator") || "" });

  const rows = [["Data", "Aluno", "E-mail", "Criador", "Curso", "Valor", "Taxa", "Liquido criador", "Cupom", "Status", "Pagamento Stripe"]];
  for (const s of sales as any[]) {
    rows.push([
      new Date(s.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      s.student_name || "",
      s.student_email || "",
      s.creator_profiles?.name || "",
      s.creator_courses?.title || "",
      money(s.amount_total),
      money(s.platform_fee),
      money(s.creator_amount),
      s.coupon_code || "",
      s.status === "paid" ? "Paga" : "Estornada",
      s.stripe_payment_id || "",
    ]);
  }
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vendas-blackbook-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
