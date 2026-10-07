import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cria URL de upload direto no Cloudflare Stream (para vídeos)
async function createStreamUploadUrl() {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ maxDurationSeconds: 7200, requireSignedURLs: false }),
    }
  );
  return res.json();
}

// Faz upload de imagem para o Supabase Storage
async function uploadImageToStorage(file: File, creatorId: string) {
  const ext = file.name.split(".").pop();
  const path = `creators/${creatorId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data, error } = await supabase.storage
    .from("media")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
  return publicUrl;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string; // 'video' | 'image'

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (type === "video") {
    const cfResponse = await createStreamUploadUrl();
    if (!cfResponse.success) {
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    const { uid, uploadURL } = cfResponse.result;

    await supabase.from("creator_media").insert({
      creator_id: profile.id,
      type: "video",
      cloudflare_id: uid,
      title: file.name,
      size_bytes: file.size,
    });

    return NextResponse.json({ uploadURL, videoId: uid, type: "video" });
  }

  if (type === "image") {
    const url = await uploadImageToStorage(file, profile.id);

    await supabase.from("creator_media").insert({
      creator_id: profile.id,
      type: "image",
      url,
      title: file.name,
      size_bytes: file.size,
    });

    return NextResponse.json({ url, type: "image" });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// Lista mídias do criador
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!profile) return NextResponse.json([]);

  let query = supabase
    .from("creator_media")
    .select("*")
    .eq("creator_id", profile.id)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}
