import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TOOLS: Anthropic.Tool[] = [
  {
    name: "update_profile",
    description: "Atualiza nome, bio, foto, especialidade ou instagram do criador",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        bio: { type: "string" },
        photo_url: { type: "string" },
        specialty: { type: "string" },
        instagram: { type: "string" },
      },
    },
  },
  {
    name: "update_course",
    description: "Atualiza título, subtítulo, promessa, descrição, público-alvo, preço ou URL do checkout do curso",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        main_promise: { type: "string" },
        description: { type: "string" },
        target_audience: { type: "string" },
        price: { type: "string" },
        checkout_url: { type: "string" },
        video_id: { type: "string" },
      },
    },
  },
  {
    name: "set_modules",
    description: "Define a lista completa de módulos do curso (substitui todos os atuais)",
    input_schema: {
      type: "object" as const,
      required: ["modules"],
      properties: {
        modules: {
          type: "array",
          items: { type: "string" },
          description: "Títulos dos módulos em ordem",
        },
      },
    },
  },
  {
    name: "add_module",
    description: "Adiciona um novo módulo ao curso",
    input_schema: {
      type: "object" as const,
      required: ["title"],
      properties: {
        title: { type: "string" },
      },
    },
  },
  {
    name: "remove_module",
    description: "Remove um módulo pelo título (ou parte do título)",
    input_schema: {
      type: "object" as const,
      required: ["title"],
      properties: {
        title: { type: "string" },
      },
    },
  },
  {
    name: "add_testimonial",
    description: "Adiciona um depoimento ao curso",
    input_schema: {
      type: "object" as const,
      required: ["name", "text"],
      properties: {
        name: { type: "string" },
        role: { type: "string" },
        text: { type: "string" },
        stars: { type: "number" },
      },
    },
  },
  {
    name: "remove_testimonial",
    description: "Remove um depoimento pelo nome da pessoa",
    input_schema: {
      type: "object" as const,
      required: ["name"],
      properties: {
        name: { type: "string" },
      },
    },
  },
];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();

  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("*, creator_courses(*, creator_modules(*), creator_testimonials(*))")
    .eq("user_id", userId)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const course = profile.creator_courses?.[0];
  const context = `
Perfil atual do criador:
- Nome: ${profile.name}
- Bio: ${profile.bio}
- Especialidade: ${profile.specialty}
- Instagram: ${profile.instagram}

Curso atual:
- Título: ${course?.title}
- Subtítulo: ${course?.subtitle}
- Promessa principal: ${course?.main_promise}
- Descrição: ${course?.description}
- Público-alvo: ${course?.target_audience}
- Preço: ${course?.price}
- URL Checkout: ${course?.checkout_url}
- Módulos: ${course?.creator_modules?.map((m: any) => m.title).join(", ") || "nenhum"}
- Depoimentos: ${course?.creator_testimonials?.map((t: any) => `${t.name} (${t.stars}★)`).join(", ") || "nenhum"}
  `;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: TOOLS,
    system: `Você é o assistente de edição da plataforma Blackbook. Ajude o criador a editar sua landing page de curso de tatuagem.
Interprete os pedidos em português e use as ferramentas disponíveis para fazer as alterações.
Seja direto e eficiente. Confirme o que foi feito em português.
${context}`,
    messages: [{ role: "user", content: message }],
  });

  const toolUses = response.content.filter((b) => b.type === "tool_use");
  const textBlocks = response.content.filter((b) => b.type === "text");
  const actions: string[] = [];

  for (const tool of toolUses) {
    if (tool.type !== "tool_use") continue;
    const input = tool.input as Record<string, any>;

    if (tool.name === "update_profile") {
      await supabase.from("creator_profiles").update(input).eq("user_id", userId);
      actions.push("perfil atualizado");
    }

    if (tool.name === "update_course" && course) {
      await supabase.from("creator_courses").update(input).eq("id", course.id);
      actions.push("curso atualizado");
    }

    if (tool.name === "set_modules" && course) {
      await supabase.from("creator_modules").delete().eq("course_id", course.id);
      const modules = (input.modules as string[]).map((title, i) => ({
        course_id: course.id,
        title,
        order_index: i,
      }));
      await supabase.from("creator_modules").insert(modules);
      actions.push("módulos redefinidos");
    }

    if (tool.name === "add_module" && course) {
      const count = course.creator_modules?.length ?? 0;
      await supabase.from("creator_modules").insert({
        course_id: course.id,
        title: input.title,
        order_index: count,
      });
      actions.push(`módulo "${input.title}" adicionado`);
    }

    if (tool.name === "remove_module" && course) {
      const match = course.creator_modules?.find((m: any) =>
        m.title.toLowerCase().includes(input.title.toLowerCase())
      );
      if (match) {
        await supabase.from("creator_modules").delete().eq("id", match.id);
        actions.push(`módulo "${match.title}" removido`);
      }
    }

    if (tool.name === "add_testimonial" && course) {
      await supabase.from("creator_testimonials").insert({
        course_id: course.id,
        name: input.name,
        role: input.role ?? "",
        text: input.text,
        stars: input.stars ?? 5,
      });
      actions.push(`depoimento de ${input.name} adicionado`);
    }

    if (tool.name === "remove_testimonial" && course) {
      const match = course.creator_testimonials?.find((t: any) =>
        t.name.toLowerCase().includes(input.name.toLowerCase())
      );
      if (match) {
        await supabase.from("creator_testimonials").delete().eq("id", match.id);
        actions.push(`depoimento de ${match.name} removido`);
      }
    }
  }

  await supabase.from("creator_ai_edits").insert({
    creator_id: profile.id,
    prompt: message,
    action: toolUses.map((t: any) => t.name).join(", "),
    result: actions.join(", "),
  });

  const reply =
    textBlocks.find((b) => b.type === "text")?.text ||
    (actions.length > 0 ? `Feito! ${actions.join(", ")}.` : "Entendi, mas não encontrei nada para alterar. Pode ser mais específico?");

  return NextResponse.json({ reply, actions, refreshLP: actions.length > 0 });
}
