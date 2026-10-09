"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  PlayCircle, CheckCircle2, Circle, ChevronDown, ChevronUp, Link2, ArrowLeft,
  ArrowRight, Loader2, Lock, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  materials: { name: string; url: string }[];
  has_video: boolean;
}
interface Module { id: string; title: string; lessons: Lesson[] }
interface CourseData {
  course: { id: string; title: string; description: string | null; creator: { name: string; photo_url: string | null; slug: string; instagram: string | null } };
  isOwner: boolean;
  completed: string[];
  modules: Module[];
}

export default function StudentCoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CourseData | null>(null);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [playback, setPlayback] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/aluno/cursos/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erro ao carregar o curso.");
        return d as CourseData;
      })
      .then((d) => {
        setData(d);
        const done = new Set(d.completed);
        setCompleted(done);
        const all = d.modules.flatMap((m) => m.lessons);
        const next = all.find((l) => !done.has(l.id)) || all[0];
        if (next) {
          setActiveId(next.id);
          setExpanded([next.module_id]);
        }
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const allLessons = useMemo(() => data?.modules.flatMap((m) => m.lessons) ?? [], [data]);
  const activeIndex = allLessons.findIndex((l) => l.id === activeId);
  const active = activeIndex >= 0 ? allLessons[activeIndex] : null;
  const progress = allLessons.length ? Math.round((completed.size / allLessons.length) * 100) : 0;

  useEffect(() => {
    setPlayback(null);
    if (!active?.has_video) return;
    setVideoLoading(true);
    fetch(`/api/aluno/aula/${active.id}`)
      .then((r) => r.json())
      .then((d) => setPlayback(d.playback ?? null))
      .finally(() => setVideoLoading(false));
  }, [active?.id, active?.has_video]);

  const select = (lesson: Lesson) => {
    setActiveId(lesson.id);
    setExpanded((prev) => (prev.includes(lesson.module_id) ? prev : [...prev, lesson.module_id]));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleDone = async (lesson: Lesson, value?: boolean) => {
    const next = value ?? !completed.has(lesson.id);
    setCompleted((prev) => {
      const s = new Set(prev);
      if (next) s.add(lesson.id);
      else s.delete(lesson.id);
      return s;
    });
    await fetch(`/api/aluno/aula/${lesson.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    }).catch(() => {});
  };

  const completeAndNext = async () => {
    if (!active) return;
    if (!completed.has(active.id)) await toggleDone(active, true);
    const next = allLessons[activeIndex + 1];
    if (next) select(next);
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link href="/dashboard" className="text-primary hover:underline text-sm">Voltar aos meus cursos</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-3 md:p-6 pb-20">
      <div className="flex items-center justify-between gap-4 mb-4">
        <Link href={data.isOwner ? "/painel" : "/dashboard"} className="text-sm text-muted-foreground hover:text-white flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> {data.isOwner ? "Voltar ao painel" : "Meus cursos"}
        </Link>
        {data.isOwner && (
          <span className="text-[11px] font-bold uppercase tracking-widest text-yellow-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Visualizando como aluno
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video relative">
            {!active ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Este curso ainda não tem aulas publicadas.
              </div>
            ) : !active.has_video ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Esta aula não tem vídeo — veja o conteúdo abaixo.
              </div>
            ) : videoLoading || !playback ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <iframe
                key={playback}
                src={`https://iframe.cloudflarestream.com/${playback}?controls=true&preload=true`}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            )}
          </div>

          {active && (
            <div className="glass p-5 md:p-6 rounded-2xl border border-white/10">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                <h1 className="text-xl md:text-2xl font-bold">{active.title}</h1>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleDone(active)}
                    className={cn(
                      "flex items-center gap-2 px-4 h-10 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors",
                      completed.has(active.id)
                        ? "bg-green-500/15 border-green-500/30 text-green-400"
                        : "border-white/15 text-white/70 hover:bg-white/5"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {completed.has(active.id) ? "Concluída" : "Marcar concluída"}
                  </button>
                  {activeIndex < allLessons.length - 1 && (
                    <button
                      onClick={completeAndNext}
                      className="flex items-center gap-2 px-4 h-10 rounded-xl text-xs font-bold uppercase tracking-widest metallic-gradient text-black"
                    >
                      Próxima <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {active.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{active.description}</p>
              )}
              {active.materials?.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/10">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Materiais da aula</p>
                  <div className="flex flex-col gap-2">
                    {active.materials.map((m, i) => (
                      <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Link2 className="w-4 h-4 shrink-0" /> {m.name || m.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="glass rounded-2xl border border-white/10 flex flex-col lg:max-h-[calc(100vh-100px)] lg:sticky lg:top-6 overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{data.course.creator?.name}</p>
            <h2 className="font-bold leading-tight mt-1">{data.course.title}</h2>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-4 mb-1.5">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">{completed.size}/{allLessons.length} aulas · {progress}%</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {data.modules.map((mod, mi) => {
              const open = expanded.includes(mod.id);
              const doneCount = mod.lessons.filter((l) => completed.has(l.id)).length;
              return (
                <div key={mod.id} className="border-b border-white/5 last:border-0">
                  <button
                    onClick={() => setExpanded((p) => (open ? p.filter((x) => x !== mod.id) : [...p, mod.id]))}
                    className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/5 text-left"
                  >
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Módulo {mi + 1}</p>
                      <p className="font-semibold text-sm leading-tight">{mod.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{doneCount}/{mod.lessons.length} aulas</p>
                    </div>
                    {open ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
                  </button>
                  {open && (
                    <div className="bg-black/30 py-1">
                      {mod.lessons.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-6 py-3">Em breve.</p>
                      ) : (
                        mod.lessons.map((lesson, li) => {
                          const current = lesson.id === activeId;
                          const done = completed.has(lesson.id);
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => select(lesson)}
                              className={cn(
                                "w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-white/5 border-l-2",
                                current ? "bg-primary/10 border-primary" : "border-transparent"
                              )}
                            >
                              {done ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                              ) : current ? (
                                <PlayCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                              )}
                              <span className={cn("text-sm leading-tight", current ? "text-white font-semibold" : "text-muted-foreground")}>
                                {li + 1}. {lesson.title}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
