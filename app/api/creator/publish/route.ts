import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, getCreatorByUser } from "@/lib/creator-server";

// Plano Grátis: publica a página sem pagamento (a plataforma cobra comissão por venda).
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const creator = await getCreatorByUser(userId);
  if (!creator) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  if (!creator.course) {
    return NextResponse.json({ error: "Seu curso ainda não foi salvo. Volte e salve a página antes de publicar." }, { status: 400 });
  }
  await db.from("creator_courses").update({ is_published: true }).eq("id", creator.course.id);
  return NextResponse.json({ ok: true, url: "/painel?publicado=true" });
}
