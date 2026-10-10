import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, syncModules, priceToCents } from "@/lib/creator-server";
import { normalizeTheme, isValidThemeValue, THEME_FIELDS, HEADING_FONTS, type LPTheme } from "@/lib/theme";
import {
  defaultPage, sanitizePage, sanitizeSection, schemaForPrompt, isAllowedImageUrl, isValidVideoId, newSectionId,
  type PageDoc, type Section,
} from "@/lib/page-schema";
import { generateImage, searchStockPhoto, listCreatorPhotos } from "@/lib/ai-images";
import { buildTools, buildDesignManual, IMAGE_TOOLS } from "@/lib/ai-designer";

export const maxDuration = 60;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MAX_ROUNDS = 6;
const MAX_IMAGE_CALLS = 4;

const PROFILE_FIELDS = ["name", "bio", "specialty", "instagram"];
const COURSE_FIELDS = ["title", "subtitle", "main_promise", "description", "target_audience", "price"];

function pick(input: Record<string, any>, allowed: string[]) {
  const out: Record<string, any> = {};
  for (const k of allowed) if (typeof input?.[k] === "string") out[k] = input[k].slice(0, 4000);
  return out;
}

const TOOLS = buildTools(Object.keys(HEADING_FONTS));
const DESIGN_MANUAL = buildDesignManual(schemaForPrompt(), MAX_IMAGE_CALLS);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  const { message } = await req.json();
  if (typeof message !== "string" || !message.trim()) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });

  const { data: profile } = await db
    .from("creator_profiles")
    .select("*, creator_courses(*, creator_modules(*), creator_testimonials(*))")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado. Salve sua página primeiro." }, { status: 404 });

  const course = profile.creator_courses?.[0];
  if (course?.creator_modules) course.creator_modules.sort((a: any, b: any) => a.order_index - b.order_index);
  let page: PageDoc = sanitizePage(course?.page) ?? defaultPage(course);
  let pageDirty = false;
  let theme: LPTheme = normalizeTheme(profile.theme, profile.theme_color);
  const actions: string[] = [];
  const imageErrors = new Set<string>();
  let imageCalls = 0;

  const photos = (await listCreatorPhotos(profile.id, profile.photo_url)).filter((p) => isAllowedImageUrl(p.url)).slice(0, 12);
  const { data: videoRows } = await db
    .from("creator_media")
    .select("cloudflare_id, title")
    .eq("creator_id", profile.id)
    .eq("type", "video")
    .order("created_at", { ascending: false })
    .limit(15);
  const videos = (videoRows ?? []).filter((v) => isValidVideoId(v.cloudflare_id)).map((v) => ({ video_id: v.cloudflare_id, title: v.title }));

  const dataContext = () => `
DADOS ATUAIS
Fotos do criador (use estas URLs): ${photos.length ? JSON.stringify(photos) : "nenhuma (pode sugerir subir na aba Mídias)"}
Vídeos do criador (use video_id numa seção video): ${videos.length ? JSON.stringify(videos) : "nenhum"}
Criador: ${JSON.stringify({ name: profile.name, bio: profile.bio, specialty: profile.specialty, instagram: profile.instagram })}
Curso: ${JSON.stringify({ title: course?.title, subtitle: course?.subtitle, main_promise: course?.main_promise, description: course?.description, target_audience: course?.target_audience, price: course?.price, tem_video: !!course?.video_id })}
Módulos: ${JSON.stringify(course?.creator_modules?.map((m: any) => m.title) ?? [])}
Depoimentos reais: ${JSON.stringify(course?.creator_testimonials?.map((t: any) => ({ name: t.name, stars: t.stars })) ?? [])}
Tema: ${JSON.stringify(theme)}
Página (seções em ordem, com ids): ${JSON.stringify(page.sections)}`;

  const findIdx = (id: string) => page.sections.findIndex((s) => s.id === id);
  const clampPos = (p: unknown, len: number) => Math.max(0, Math.min(len, Number.isFinite(Number(p)) ? Math.round(Number(p)) : len));

  async function applyTheme(input: any): Promise<string> {
    const next: LPTheme = { ...theme };
    for (const { key } of THEME_FIELDS) {
      let v = typeof input?.[key] === "string" ? input[key].trim() : undefined;
      if (!v) continue;
      if (/^metallic$/i.test(v)) v = "metallic";
      if (/^#[0-9a-fA-F]{3}$/.test(v)) v = `#${[...v.slice(1)].map((c) => c + c).join("")}`;
      if (isValidThemeValue(key, v)) next[key] = v;
    }
    if (isValidThemeValue("headingFont", input?.headingFont)) next.headingFont = input.headingFont;
    const { error } = await db.from("creator_profiles").update({ theme: next, theme_color: next.accent }).eq("id", profile.id);
    if (error) return `erro: ${error.message}`;
    theme = next;
    actions.push("cores/fonte atualizadas");
    return "ok";
  }

  const BATCH_ACTIONS = [
    "add_section", "update_section", "remove_section", "move_section", "update_theme",
    "update_profile", "update_course", "set_modules", "add_testimonial", "remove_testimonial",
  ];

  async function runTool(name: string, input: any): Promise<string> {
    switch (name) {
      case "apply_changes": {
        const changes = Array.isArray(input?.changes) ? input.changes.slice(0, 30) : [];
        if (!changes.length) return "erro: lista changes vazia";
        const results: string[] = [];
        for (const c of changes) {
          const action = String(c?.action || "");
          results.push(`${action}: ${BATCH_ACTIONS.includes(action) ? await runTool(action, c) : "erro: ação inválida"}`);
        }
        return results.join("\n");
      }
      case "redesign_page":
      case "replace_page": {
        const next = sanitizePage({ sections: input.sections });
        if (!next || !next.sections.length) return "erro: nenhuma seção válida";
        page = next;
        pageDirty = true;
        actions.push("página redesenhada");
        const themeResult = input.theme ? await applyTheme(input.theme) : "sem tema";
        return `ok: ${page.sections.length} seções (${page.sections.map((s) => `${s.type}=${s.id}`).join(", ")}); tema: ${themeResult}`;
      }
      case "add_section": {
        const s = sanitizeSection({ ...input.section, id: newSectionId() });
        if (!s) return "erro: tipo de seção inválido";
        const ctaIdx = page.sections.findIndex((x) => x.type === "cta");
        const pos = input.position === undefined ? (ctaIdx >= 0 ? ctaIdx : page.sections.length) : clampPos(input.position, page.sections.length);
        page.sections.splice(pos, 0, s);
        pageDirty = true;
        actions.push(`seção "${s.type}" adicionada`);
        return `ok: id=${s.id}`;
      }
      case "update_section": {
        const i = findIdx(input.id);
        if (i < 0) return "erro: id não encontrado";
        const cur = page.sections[i];
        const merged = sanitizeSection({
          ...cur,
          variant: input.variant ?? cur.variant,
          props: { ...cur.props, ...(input.props ?? {}) },
          style: { ...cur.style, ...(input.style ?? {}) },
        });
        if (!merged) return "erro: dados inválidos";
        page.sections[i] = merged;
        pageDirty = true;
        actions.push(`seção "${cur.type}" atualizada`);
        return "ok";
      }
      case "remove_section": {
        const i = findIdx(input.id);
        if (i < 0) return "erro: id não encontrado";
        const [removed] = page.sections.splice(i, 1);
        pageDirty = true;
        actions.push(`seção "${removed.type}" removida`);
        return "ok";
      }
      case "move_section": {
        const i = findIdx(input.id);
        if (i < 0) return "erro: id não encontrado";
        const [s] = page.sections.splice(i, 1);
        page.sections.splice(clampPos(input.position, page.sections.length), 0, s);
        pageDirty = true;
        actions.push(`seção "${s.type}" movida`);
        return "ok";
      }
      case "update_theme":
        return applyTheme(input);
      case "update_profile": {
        const f = pick(input, PROFILE_FIELDS);
        if (!Object.keys(f).length) return "erro: nada para atualizar";
        await db.from("creator_profiles").update(f).eq("id", profile.id);
        Object.assign(profile, f);
        actions.push("perfil atualizado");
        return "ok";
      }
      case "update_course": {
        if (!course) return "erro: curso não existe";
        const f = pick(input, COURSE_FIELDS);
        if (f.price !== undefined) {
          const cents = priceToCents(f.price);
          if (cents <= 0) delete f.price;
          else f.price = cents / 100;
        }
        if (!Object.keys(f).length) return "erro: nada para atualizar";
        await db.from("creator_courses").update(f).eq("id", course.id);
        Object.assign(course, f);
        actions.push("dados do curso atualizados");
        return "ok";
      }
      case "set_modules": {
        if (!course || !Array.isArray(input.modules)) return "erro";
        const titles = input.modules.map((m: unknown) => String(m).slice(0, 200)).filter(Boolean).slice(0, 40);
        await syncModules(course.id, titles);
        course.creator_modules = titles.map((title: string, order_index: number) => ({ title, order_index }));
        actions.push("módulos atualizados");
        return "ok";
      }
      case "add_testimonial": {
        if (!course || !input.name || !input.text) return "erro";
        await db.from("creator_testimonials").insert({
          course_id: course.id,
          name: String(input.name).slice(0, 100),
          role: String(input.role ?? "").slice(0, 100),
          text: String(input.text).slice(0, 1500),
          stars: Math.min(5, Math.max(1, Math.round(Number(input.stars) || 5))),
        });
        course.creator_testimonials = [...(course.creator_testimonials ?? []), { name: input.name, stars: input.stars ?? 5 }];
        actions.push(`depoimento de ${input.name} adicionado`);
        return "ok";
      }
      case "remove_testimonial": {
        const match = course?.creator_testimonials?.find((t: any) => t.name?.toLowerCase().includes(String(input.name).toLowerCase()));
        if (!match?.id) return "erro: não encontrado";
        await db.from("creator_testimonials").delete().eq("id", match.id);
        course.creator_testimonials = course.creator_testimonials.filter((t: any) => t.id !== match.id);
        actions.push(`depoimento de ${match.name} removido`);
        return "ok";
      }
      case "list_my_photos": {
        const photos = await listCreatorPhotos(profile.id, profile.photo_url);
        const usable = photos.filter((p) => isAllowedImageUrl(p.url));
        return usable.length ? JSON.stringify(usable) : "nenhuma foto enviada ainda (o criador pode subir na aba Mídias)";
      }
      case "search_stock_photo": {
        if (imageCalls >= MAX_IMAGE_CALLS) return "erro: limite de imagens deste pedido atingido";
        imageCalls++;
        const r = await searchStockPhoto(String(input.query || "tattoo studio"), input.orientation);
        if (!r.ok) imageErrors.add(r.error);
        return r.ok ? JSON.stringify({ url: r.url, credit: r.credit }) : `erro: ${r.error}`;
      }
      case "generate_image": {
        if (imageCalls >= MAX_IMAGE_CALLS) return "erro: limite de imagens deste pedido atingido";
        imageCalls++;
        const r = await generateImage(profile.id, String(input.prompt || ""));
        if (r.ok) actions.push("imagem gerada");
        else imageErrors.add(r.error);
        return r.ok ? JSON.stringify({ url: r.url }) : `erro: ${r.error}`;
      }
      default:
        return "erro: ferramenta desconhecida";
    }
  }

  const messages: any[] = [
    { role: "system", content: DESIGN_MANUAL },
    { role: "system", content: dataContext() },
    { role: "user", content: message.slice(0, 4000) },
  ];

  const callGroq = () =>
    fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 6000,
        ...(MODEL.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
      }),
    });

  let reply = "";
  const started = Date.now();
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let groqRes = await callGroq();

    // Plano grátis do Groq limita tokens por minuto: espera o tempo indicado e tenta uma vez.
    if (groqRes.status === 429) {
      const body = await groqRes.text();
      const wait = Math.ceil(Number(body.match(/try again in ([\d.]+)s/)?.[1] ?? 20)) + 1;
      if (Date.now() - started + wait * 1000 < 50_000) {
        await new Promise((r) => setTimeout(r, wait * 1000));
        groqRes = await callGroq();
      } else {
        groqRes = new Response(body, { status: 429 });
      }
    }

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error("[ai-editor groq]", groqRes.status, err.slice(0, 500));
      if (!actions.length) {
        const detail = groqRes.status === 429 ? "limite de uso da IA atingido, tente em alguns minutos" : `código ${groqRes.status}`;
        return NextResponse.json({ error: `A IA não respondeu (${detail}).` }, { status: 502 });
      }
      break;
    }

    const msg = (await groqRes.json()).choices?.[0]?.message;
    const toolCalls = msg?.tool_calls ?? [];
    if (!toolCalls.length) {
      reply = msg?.content || "";
      break;
    }

    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });
    for (const tc of toolCalls) {
      let input: any = {};
      try {
        input = JSON.parse(tc.function?.arguments || "{}");
      } catch {
        messages.push({ role: "tool", tool_call_id: tc.id, content: "erro: argumentos inválidos" });
        continue;
      }
      const result = await runTool(tc.function?.name, input);
      messages.push({ role: "tool", tool_call_id: tc.id, content: result.slice(0, 4000) });
    }

    // Só volta ao modelo quando ele precisa do resultado (URL de imagem). Economiza o limite de tokens.
    const needsResult = toolCalls.some((tc: any) => IMAGE_TOOLS.includes(tc.function?.name));
    if (!needsResult) {
      reply = msg.content || "";
      break;
    }
    if (pageDirty) messages.push({ role: "system", content: `Página atualizada: ${JSON.stringify(page.sections.map((s: Section) => ({ id: s.id, type: s.type })))}` });
  }

  if (pageDirty && course) {
    const { error } = await db.from("creator_courses").update({ page }).eq("id", course.id);
    if (error) {
      console.error("[ai-editor] salvar page", error.message);
      return NextResponse.json({
        error: /page/.test(error.message) ? "Falta rodar o supabase_schema_v5.sql no Supabase." : "Erro ao salvar a página.",
      }, { status: 500 });
    }
  }

  await db.from("creator_ai_edits").insert({
    creator_id: profile.id,
    prompt: message.slice(0, 2000),
    action: actions.join(", ").slice(0, 500),
    result: reply.slice(0, 2000),
  });

  if (!reply) {
    reply = actions.length ? `Feito: ${Array.from(new Set(actions)).join(", ")}.` : "Não consegui aplicar mudanças. Pode detalhar o que quer alterar?";
  }
  if (imageErrors.size && !/imagem|foto/i.test(reply)) {
    reply += `\nAtenção: não consegui obter a imagem. ${Array.from(imageErrors).join(" ")}`;
  }

  return NextResponse.json({ reply, actions: Array.from(new Set(actions)), refreshLP: actions.length > 0 });
}
