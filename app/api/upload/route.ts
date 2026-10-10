import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, getCreatorByUser } from "@/lib/creator-server";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // limite de corpo da Vercel é ~4,5 MB; o navegador reduz antes

async function creatorId() {
  const { userId } = await auth();
  if (!userId) return null;
  return (await getCreatorByUser(userId))?.profile.id ?? null;
}

// POST: envia uma imagem para a biblioteca do criador (vídeos usam /api/creator/upload-video)
export async function POST(req: NextRequest) {
  const id = await creatorId();
  if (!id) return NextResponse.json({ error: "Faça login como criador." }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo." }, { status: 400 });
  if (!IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Formato não suportado. Use JPG, PNG ou WebP." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Imagem muito grande (máx. 4 MB)." }, { status: 413 });

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `creators/${id}/${Date.now()}.${ext}`;
  const { error } = await db.storage.from("media").upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: `Falha ao salvar: ${error.message}` }, { status: 500 });

  const { data: { publicUrl } } = db.storage.from("media").getPublicUrl(path);
  const title = (formData.get("title") as string) || file.name;
  await db.from("creator_media").insert({ creator_id: id, type: "image", url: publicUrl, title: title.slice(0, 200), size_bytes: file.size });
  return NextResponse.json({ url: publicUrl, type: "image" });
}

// GET: lista a biblioteca (?type=image|video)
export async function GET(req: NextRequest) {
  const id = await creatorId();
  if (!id) return NextResponse.json([], { status: 401 });
  const type = req.nextUrl.searchParams.get("type");
  let query = db.from("creator_media").select("*").eq("creator_id", id).order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);
  const { data } = await query;
  return NextResponse.json(data ?? []);
}

// DELETE ?id=: remove da biblioteca (e do Cloudflare, se for vídeo)
export async function DELETE(req: NextRequest) {
  const id = await creatorId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mediaId = req.nextUrl.searchParams.get("id");
  const { data: media } = await db.from("creator_media").select("*").eq("id", mediaId).eq("creator_id", id).maybeSingle();
  if (!media) return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });

  if (media.type === "video" && media.cloudflare_id) {
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${media.cloudflare_id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } }
    ).catch(() => {});
  }
  if (media.type === "image" && media.url) {
    const marker = "/object/public/media/";
    const i = media.url.indexOf(marker);
    if (i >= 0) await db.storage.from("media").remove([media.url.slice(i + marker.length)]);
  }
  await db.from("creator_media").delete().eq("id", media.id);
  return NextResponse.json({ ok: true });
}
