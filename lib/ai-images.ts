import { db } from "@/lib/creator-server";

type ImageResult = { ok: true; url: string; credit?: string } | { ok: false; error: string };

/** Gera uma imagem com Cloudflare Workers AI (FLUX) e salva no bucket "media". */
export async function generateImage(creatorId: string, prompt: string): Promise<ImageResult> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) return { ok: false, error: "Geração de imagens não configurada (CLOUDFLARE_AI_TOKEN)." };

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 6 }),
      }
    );
    const json = await res.json().catch(() => null);
    const b64 = json?.result?.image;
    if (!res.ok || !b64) {
      console.error("[ai-images] cloudflare", res.status, JSON.stringify(json?.errors ?? json).slice(0, 300));
      return { ok: false, error: res.status === 401 || res.status === 403 ? "Token do Cloudflare sem permissão de Workers AI." : "Falha ao gerar a imagem." };
    }

    const path = `ai/${creatorId}/${Date.now()}.jpg`;
    const { error } = await db.storage.from("media").upload(path, Buffer.from(b64, "base64"), {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) return { ok: false, error: `Falha ao salvar a imagem: ${error.message}` };
    const { data } = db.storage.from("media").getPublicUrl(path);
    await db.from("creator_media").insert({ creator_id: creatorId, type: "image", url: data.publicUrl, title: `IA: ${prompt.slice(0, 80)}` });
    return { ok: true, url: data.publicUrl };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Falha ao gerar a imagem." };
  }
}

/** Busca uma foto no Unsplash (precisa de crédito ao autor, conforme as regras deles). */
export async function searchStockPhoto(query: string, orientation: "landscape" | "portrait" | "squarish" = "landscape"): Promise<ImageResult> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return { ok: false, error: "Banco de imagens não configurado (UNSPLASH_ACCESS_KEY)." };
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=${orientation}&content_filter=high`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" } });
    const json = await res.json();
    const photo = json?.results?.[0];
    if (!res.ok || !photo) return { ok: false, error: "Nenhuma foto encontrada para essa busca." };
    // Exigido pelas diretrizes da API do Unsplash ao usar uma foto.
    fetch(photo.links.download_location, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
    return { ok: true, url: photo.urls.regular, credit: `Foto de ${photo.user?.name || "autor desconhecido"} no Unsplash` };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Falha na busca de fotos." };
  }
}

/** Fotos que o próprio criador já enviou. */
export async function listCreatorPhotos(creatorId: string, profilePhoto?: string | null) {
  const { data } = await db
    .from("creator_media")
    .select("url, title, created_at")
    .eq("creator_id", creatorId)
    .eq("type", "image")
    .order("created_at", { ascending: false })
    .limit(30);
  const photos = (data ?? []).filter((m) => m.url).map((m) => ({ url: m.url as string, title: m.title as string | null }));
  if (profilePhoto) photos.unshift({ url: profilePhoto, title: "Foto de perfil" });
  return photos;
}
