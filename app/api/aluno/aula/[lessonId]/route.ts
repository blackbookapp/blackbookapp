import { NextRequest, NextResponse } from "next/server";
import { db, streamPlaybackId } from "@/lib/creator-server";
import { canAccessCourse } from "@/lib/student-access";

async function loadLesson(lessonId: string) {
  const { data } = await db
    .from("creator_lessons")
    .select("id, course_id, video_id")
    .eq("id", lessonId)
    .maybeSingle();
  return data;
}

// GET → identificador de reprodução (token assinado) do vídeo da aula
export async function GET(_req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await loadLesson(lessonId);
  if (!lesson) return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
  if (!(await canAccessCourse(lesson.course_id))) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }
  if (!lesson.video_id) return NextResponse.json({ playback: null });
  return NextResponse.json({ playback: await streamPlaybackId(lesson.video_id) });
}

// POST { completed: boolean } → marca/desmarca a aula como concluída
export async function POST(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await loadLesson(lessonId);
  if (!lesson) return NextResponse.json({ error: "Aula não encontrada." }, { status: 404 });
  const me = await canAccessCourse(lesson.course_id);
  if (!me) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });

  const { completed } = await req.json();
  if (completed) {
    await db.from("creator_lesson_progress").upsert(
      { user_id: me.userId, lesson_id: lesson.id, course_id: lesson.course_id },
      { onConflict: "user_id,lesson_id" }
    );
  } else {
    await db.from("creator_lesson_progress").delete().eq("user_id", me.userId).eq("lesson_id", lesson.id);
  }
  return NextResponse.json({ ok: true });
}
