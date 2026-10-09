import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, getCreatorByUser } from "@/lib/creator-server";

async function courseId() {
  const { userId } = await auth();
  if (!userId) return null;
  const creator = await getCreatorByUser(userId);
  return creator?.course?.id ?? null;
}

async function list(id: string) {
  const { data } = await db
    .from("creator_coupons")
    .select("*")
    .eq("course_id", id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function GET() {
  const id = await courseId();
  if (!id) return NextResponse.json({ coupons: [] });
  return NextResponse.json({ coupons: await list(id) });
}

export async function POST(req: NextRequest) {
  const id = await courseId();
  if (!id) return NextResponse.json({ error: "Crie seu curso primeiro." }, { status: 404 });
  const body = await req.json();

  if (body.action === "create") {
    const code = String(body.code || "").trim().toUpperCase();
    const percent = Number(body.percent_off);
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
      return NextResponse.json({ error: "Código: 3 a 20 letras, números, - ou _." }, { status: 400 });
    }
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) {
      return NextResponse.json({ error: "Desconto entre 1% e 90%." }, { status: 400 });
    }
    const maxUses = body.max_uses ? Number(body.max_uses) : null;
    const expires = body.expires_at ? new Date(`${body.expires_at}T23:59:59-03:00`).toISOString() : null;
    const { error } = await db.from("creator_coupons").insert({
      course_id: id, code, percent_off: percent, max_uses: maxUses, expires_at: expires,
    });
    if (error) {
      const msg = error.code === "23505" ? "Já existe um cupom com esse código." : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } else if (body.action === "toggle") {
    await db.from("creator_coupons").update({ active: !!body.active }).eq("id", body.id).eq("course_id", id);
  } else if (body.action === "delete") {
    await db.from("creator_coupons").delete().eq("id", body.id).eq("course_id", id);
  } else {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  return NextResponse.json({ coupons: await list(id) });
}
