import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_profile",
      description: "Atualiza nome, bio, foto, especialidade ou instagram do criador",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          bio: { type: "string" },
          photo_url: { type: "string" },
          specialty: { type: "string" },
          instagram: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_course",
      description: "Atualiza título, subtítulo, promessa, descrição, público-alvo, preço ou URL do checkout do curso",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "set_modules",
      description: "Define a lista completa de módulos do curso (substitui todos os atuais)",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "add_module",
      description: "Adiciona um novo módulo ao curso",
      parameters: {
        type: "object",
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_module",
      description: "Remove um módulo pelo título (ou parte do título)",
      parameters: {
        type: "object",
        required: ["title"],
        properties: { title: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_testimonial",
      description: "Adiciona um depoimento ao curso",
      parameters: {
        type: "object",
        required: ["name", "text"],
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          text: { type: "string" },
          stars: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_testimonial",
      description: "Remove um depoimento pelo nome da pessoa",
      parameters: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" } },
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

  const groqRes = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Você é o assistente de edição da plataforma Blackbook. Ajude o criador a editar sua landing page de curso de tatuagem. Interprete os pedidos em português e use as ferramentas disponíveis para fazer as alterações. Seja direto e eficiente. Confirme o que foi feito em português.\n\n${context}`,
        },
        { role: "user", content: message },
      ],
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 1024,
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    console.error("[ai-editor groq]", err);
    return NextResponse.json({ error: "Erro ao chamar IA" }, { status: 500 });
  }

  const groqData = await groqRes.json();
  const choice = groqData.choices?.[0];
  const msg = choice?.message;
  const toolCalls = msg?.tool_calls ?? [];
  const actions: string[] = [];

  for (const tc of toolCalls) {
    const name = tc.function?.name;
    const input = JSON.parse(tc.function?.arguments ?? "{}");

    if (name === "update_profile") {
      await supabase.from("creator_profiles").update(input).eq("user_id", userId);
      actions.push("perfil atualizado");
    }

    if (name === "update_course" && course) {
      await supabase.from("creator_courses").update(input).eq("id", course.id);
      actions.push("curso atualizado");
    }

    if (name === "set_modules" && course) {
      await supabase.from("creator_modules").delete().eq("course_id", course.id);
      const modules = (input.modules as string[]).map((title: string, i: number) => ({
        course_id: course.id, title, order_index: i,
      }));
      await supabase.from("creator_modules").insert(modules);
      actions.push("módulos redefinidos");
    }

    if (name === "add_module" && course) {
      const count = course.creator_modules?.length ?? 0;
      await supabase.from("creator_modules").insert({
        course_id: course.id, title: input.title, order_index: count,
      });
      actions.push(`módulo "${input.title}" adicionado`);
    }

    if (name === "remove_module" && course) {
      const match = course.creator_modules?.find((m: any) =>
        m.title.toLowerCase().includes(input.title.toLowerCase())
      );
      if (match) {
        await supabase.from("creator_modules").delete().eq("id", match.id);
        actions.push(`módulo "${match.title}" removido`);
      }
    }

    if (name === "add_testimonial" && course) {
      await supabase.from("creator_testimonials").insert({
        course_id: course.id,
        name: input.name,
        role: input.role ?? "",
        text: input.text,
        stars: input.stars ?? 5,
      });
      actions.push(`depoimento de ${input.name} adicionado`);
    }

    if (name === "remove_testimonial" && course) {
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
    action: toolCalls.map((t: any) => t.function?.name).join(", "),
    result: actions.join(", "),
  });

  const reply =
    msg?.content ||
    (actions.length > 0
      ? `Feito! ${actions.join(", ")}.`
      : "Entendi, mas não encontrei nada para alterar. Pode ser mais específico?");

  return NextResponse.json({ reply, actions, refreshLP: actions.length > 0 });
}
