import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, getCreatorByUser } from "@/lib/creator-server";

type Material = { name: string; url: string };

function cleanMaterials(input: unknown): Material[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((m: any) => ({ name: String(m?.name || "").slice(0, 120), url: String(m?.url || "").trim() }))
    .filter((m) => /^https?:\/\//i.test(m.url))
    .slice(0, 20);
}

async function loadContent(courseId: string) {
  const { data: modules } = await db
    .from("creator_modules")
    .select("id, title, order_index")
    .eq("course_id", courseId)
    .order("order_index");
  const { data: lessons } = await db
    .from("creator_lessons")
    .select("id, module_id, title, description, video_id, materials, order_index")
    .eq("course_id", courseId)
    .order("order_index");
  return (modules ?? []).map((m) => ({
    ...m,
    lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
  }));
}

async function context() {
  const { userId } = await auth();
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const creator = await getCreatorByUser(userId);
  if (!creator?.course) return { error: NextResponse.json({ error: "Crie seu curso primeiro." }, { status: 404 }) };
  return { course: creator.course };
}

export async function GET() {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  return NextResponse.json({ modules: await loadContent(ctx.course.id) });
}

export async function POST(req: NextRequest) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const courseId = ctx.course.id;
  const body = await req.json();
  const { action } = body;

  const ownModule = async (id: string) => {
    const { data } = await db.from("creator_modules").select("id").eq("id", id).eq("course_id", courseId).maybeSingle();
    return !!data;
  };
  const ownLesson = async (id: string) => {
    const { data } = await db.from("creator_lessons").select("id, module_id, order_index").eq("id", id).eq("course_id", courseId).maybeSingle();
    return data;
  };

  switch (action) {
    case "add_module": {
      const title = String(body.title || "").trim();
      if (!title) return NextResponse.json({ error: "Dê um nome ao módulo." }, { status: 400 });
      const { count } = await db.from("creator_modules").select("id", { count: "exact", head: true }).eq("course_id", courseId);
      await db.from("creator_modules").insert({ course_id: courseId, title, order_index: count ?? 0 });
      break;
    }
    case "rename_module": {
      if (!(await ownModule(body.id))) return NextResponse.json({ error: "Módulo não encontrado." }, { status: 404 });
      await db.from("creator_modules").update({ title: String(body.title || "").trim() }).eq("id", body.id);
      break;
    }
    case "delete_module": {
      if (!(await ownModule(body.id))) return NextResponse.json({ error: "Módulo não encontrado." }, { status: 404 });
      await db.from("creator_modules").delete().eq("id", body.id);
      break;
    }
    case "move_module": {
      const { data: mods } = await db.from("creator_modules").select("id").eq("course_id", courseId).order("order_index");
      const list = (mods ?? []).map((m) => m.id);
      const i = list.indexOf(body.id);
      const j = i + (body.direction === "up" ? -1 : 1);
      if (i < 0 || j < 0 || j >= list.length) break;
      [list[i], list[j]] = [list[j], list[i]];
      await Promise.all(list.map((id, idx) => db.from("creator_modules").update({ order_index: idx }).eq("id", id)));
      break;
    }
    case "save_lesson": {
      const title = String(body.title || "").trim();
      if (!title) return NextResponse.json({ error: "Dê um título à aula." }, { status: 400 });
      const fields = {
        title,
        description: String(body.description || "").trim() || null,
        video_id: String(body.video_id || "").trim() || null,
        materials: cleanMaterials(body.materials),
      };
      if (body.id) {
        if (!(await ownLesson(body.id))) return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
        await db.from("creator_lessons").update(fields).eq("id", body.id);
      } else {
        if (!(await ownModule(body.module_id))) return NextResponse.json({ error: "Módulo não encontrado." }, { status: 404 });
        const { count } = await db.from("creator_lessons").select("id", { count: "exact", head: true }).eq("module_id", body.module_id);
        await db.from("creator_lessons").insert({ ...fields, course_id: courseId, module_id: body.module_id, order_index: count ?? 0 });
      }
      break;
    }
    case "delete_lesson": {
      if (!(await ownLesson(body.id))) return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
      await db.from("creator_lessons").delete().eq("id", body.id);
      break;
    }
    case "move_lesson": {
      const lesson = await ownLesson(body.id);
      if (!lesson) return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
      const { data: siblings } = await db.from("creator_lessons").select("id").eq("module_id", lesson.module_id).order("order_index");
      const list = (siblings ?? []).map((l) => l.id);
      const i = list.indexOf(body.id);
      const j = i + (body.direction === "up" ? -1 : 1);
      if (j < 0 || j >= list.length) break;
      [list[i], list[j]] = [list[j], list[i]];
      await Promise.all(list.map((id, idx) => db.from("creator_lessons").update({ order_index: idx }).eq("id", id)));
      break;
    }
    default:
      return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  return NextResponse.json({ modules: await loadContent(courseId) });
}
