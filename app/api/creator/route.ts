import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { syncModules, priceToCents } from "@/lib/creator-server";
import { THEME_FIELDS, isValidThemeValue } from "@/lib/theme";
import { checkIsAdmin } from "@/lib/auth-server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST /api/creator — salva ou atualiza um criador + curso
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, bio, photo_url, specialty, instagram, theme_color,
      course_title, course_subtitle, main_promise, description, target_audience,
      modules, testimonials,
      price, price_installments, price_installment_value, video_id,
    } = body;
    const slug = String(body.slug || "").toLowerCase().trim();

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

    if (!slug || !name || !course_title) {
      return NextResponse.json({ error: "Campos obrigatórios: slug, name, course_title" }, { status: 400 });
    }
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) {
      return NextResponse.json({ error: "O link deve ter de 3 a 40 caracteres: letras minúsculas, números e hífen." }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Perfil: um por usuário; o slug não pode pertencer a outra pessoa
    const { data: slugOwner } = await supabase
      .from("creator_profiles").select("id, user_id").eq("slug", slug).maybeSingle();
    if (slugOwner && slugOwner.user_id && slugOwner.user_id !== userId) {
      return NextResponse.json({ error: "Esse link já está em uso. Escolha outro." }, { status: 409 });
    }
    const { data: mine } = await supabase
      .from("creator_profiles").select("id").eq("user_id", userId).maybeSingle();

    const profileFields = {
      slug, name, bio, photo_url, specialty, instagram,
      ...(theme_color ? { theme_color } : {}),
      user_id: userId,
    };
    const existingId = mine?.id || slugOwner?.id;
    const { data: profile, error: profileErr } = existingId
      ? await supabase.from("creator_profiles").update(profileFields).eq("id", existingId).select().single()
      : await supabase.from("creator_profiles").insert(profileFields).select().single();

    if (profileErr) throw new Error(`Perfil: ${profileErr.message}`);

    // 2. Curso (publicação só acontece pelo webhook após o pagamento da ativação)
    const toNumber = (v: unknown) => {
      const cents = priceToCents(v);
      return cents > 0 ? cents / 100 : null;
    };
    const { data: course, error: courseErr } = await supabase
      .from("creator_courses")
      .upsert({
        creator_id: profile.id,
        title: course_title,
        subtitle: course_subtitle,
        main_promise,
        description,
        target_audience,
        price: toNumber(price),
        price_installments: price_installments ? parseInt(price_installments) : null,
        price_installment_value: toNumber(price_installment_value),
        video_id,
      }, { onConflict: "creator_id" })
      .select()
      .single();

    if (courseErr) throw new Error(`Curso: ${courseErr.message}`);

    // 3. Módulos: atualiza no lugar para não apagar as aulas
    await syncModules(course.id, Array.isArray(modules) ? modules : []);

    // 4. Replace testimonials
    await supabase.from("creator_testimonials").delete().eq("course_id", course.id);
    const cleanTestimonials = (testimonials as any[])
      .filter((t: any) => t.name?.trim() && t.text?.trim())
      .map((t: any) => ({ course_id: course.id, name: t.name, role: t.role, text: t.text, stars: t.stars || 5 }));
    if (cleanTestimonials.length > 0) {
      const { error: testErr } = await supabase.from("creator_testimonials").insert(cleanTestimonials);
      if (testErr) throw new Error(`Depoimentos: ${testErr.message}`);
    }

    return NextResponse.json({ success: true, slug, url: `/c/${slug}` });
  } catch (e: any) {
    console.error("[/api/creator POST]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/creator — atualiza só theme_color
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (body.theme && typeof body.theme === "object") {
      const theme: Record<string, string> = {};
      for (const { key } of THEME_FIELDS) {
        if (isValidThemeValue(key, body.theme[key])) theme[key] = body.theme[key];
      }
      update.theme = theme;
      if (theme.accent) update.theme_color = theme.accent;
    } else if (isValidThemeValue("accent", body.theme_color)) {
      update.theme_color = body.theme_color;
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

    const { error } = await getSupabase().from("creator_profiles").update(update).eq("user_id", userId);
    if (error) {
      if (/theme/.test(error.message)) {
        return NextResponse.json({ error: "Falta rodar o supabase_schema_v4.sql no Supabase." }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/creator?me=1 (perfil do usuário logado) ou ?slug=xxx (dados públicos)
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const wantsMe = req.nextUrl.searchParams.has("me") || req.nextUrl.searchParams.has("user_id");

  const supabase = getSupabase();

  if (wantsMe) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ profile: null }, { status: 401 });
    const { data } = await supabase
      .from("creator_profiles")
      .select(`*, creator_courses(*, creator_modules(*), creator_testimonials(*))`)
      .eq("user_id", userId)
      .maybeSingle();
    return NextResponse.json({ profile: data ?? null, isAdmin: await checkIsAdmin() });
  }

  if (!slug) return NextResponse.json({ error: "slug obrigatório" }, { status: 400 });

  const { data } = await supabase
    .from("creator_profiles")
    .select(`slug, name, bio, photo_url, specialty, instagram, theme_color,
      creator_courses(title, subtitle, main_promise, price, is_published, creator_modules(title, order_index))`)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Criador não encontrado" }, { status: 404 });
  return NextResponse.json(data);
}
