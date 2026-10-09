import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCreatorByUser } from "@/lib/creator-server";

// Proxy TUS → Cloudflare Stream para vídeos de aula do criador.
// Aulas sobem com "requiresignedurls" (só tocam com token gerado para alunos matriculados).
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const creator = await getCreatorByUser(userId);
  if (!creator) return NextResponse.json({ error: "Perfil de criador não encontrado." }, { status: 403 });

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return NextResponse.json({ error: "Upload de vídeo não configurado." }, { status: 500 });
  }

  const uploadLength = request.headers.get("upload-length");
  if (!uploadLength) return NextResponse.json({ error: "Upload-Length obrigatório." }, { status: 400 });
  if (Number(uploadLength) > 5 * 1024 * 1024 * 1024) {
    return NextResponse.json({ error: "Vídeo maior que 5GB." }, { status: 413 });
  }

  const isPublic = new URL(request.url).searchParams.get("public") === "1";
  const clientMeta = request.headers.get("upload-metadata") || "";
  const b64 = (s: string) => Buffer.from(s).toString("base64");
  const metadata = [
    clientMeta,
    `creator ${b64(creator.profile.id)}`,
    isPublic ? "" : "requiresignedurls",
  ].filter(Boolean).join(",");

  const cf = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": uploadLength,
        "Upload-Metadata": metadata,
        "Upload-Creator": creator.profile.id,
      },
    }
  );

  const destination = cf.headers.get("location");
  if (!destination) {
    console.error("[creator upload-video] Cloudflare:", await cf.text());
    return NextResponse.json({ error: "Falha ao iniciar o upload." }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Access-Control-Expose-Headers", "Location, stream-media-id");
  headers.set("Location", destination);
  const mediaId = cf.headers.get("stream-media-id");
  if (mediaId) headers.set("stream-media-id", mediaId);
  return new NextResponse(null, { status: 201, headers });
}
