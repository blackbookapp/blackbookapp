"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, ChevronUp, ChevronDown, Pencil, Trash2, Video, CheckCircle, X, Loader2, Eye, Link2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoUploader } from "@/components/admin/VideoUploader";

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_id: string | null;
  materials: { name: string; url: string }[];
}
interface Module { id: string; title: string; lessons: Lesson[] }

const input = "w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40";

function LessonEditor({
  moduleId, lesson, onSave, onCancel,
}: {
  moduleId: string;
  lesson?: Lesson;
  onSave: (payload: any) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [videoId, setVideoId] = useState(lesson?.video_id ?? "");
  const [replaceVideo, setReplaceVideo] = useState(false);
  const [materials, setMaterials] = useState(lesson?.materials ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    const err = await onSave({
      action: "save_lesson",
      id: lesson?.id,
      module_id: moduleId,
      title,
      description,
      video_id: videoId,
      materials: materials.filter((m) => m.url.trim()),
    });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-2xl p-5 space-y-4">
      <input className={input} placeholder="Título da aula" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <textarea className={`${input} min-h-[90px]`} placeholder="Descrição / resumo da aula (opcional)"
        value={description} onChange={(e) => setDescription(e.target.value)} />

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Vídeo da aula</p>
        {videoId && !replaceVideo ? (
          <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <span className="text-sm text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Vídeo enviado</span>
            <button onClick={() => setReplaceVideo(true)} className="text-xs text-white/60 hover:text-white underline">Trocar vídeo</button>
          </div>
        ) : (
          <VideoUploader endpoint="/api/creator/upload-video" onSuccess={(id) => { setVideoId(id); setReplaceVideo(false); }} />
        )}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Materiais (links: PDF, Drive, etc.)</p>
        <div className="space-y-2">
          {materials.map((m, i) => (
            <div key={i} className="flex gap-2">
              <input className={input} placeholder="Nome" value={m.name}
                onChange={(e) => setMaterials(materials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className={input} placeholder="https://..." value={m.url}
                onChange={(e) => setMaterials(materials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              <button onClick={() => setMaterials(materials.filter((_, j) => j !== i))} className="text-white/40 hover:text-red-400 px-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => setMaterials([...materials, { name: "", url: "" }])}
            className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Adicionar material</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} className="border-white/20 text-xs">Cancelar</Button>
        <Button onClick={save} disabled={saving || !title.trim()} className="metallic-gradient text-black font-bold text-xs">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar aula"}
        </Button>
      </div>
    </div>
  );
}

export function ConteudoTab({ courseId }: { courseId?: string }) {
  const [modules, setModules] = useState<Module[] | null>(null);
  const [newModule, setNewModule] = useState("");
  const [editing, setEditing] = useState<{ moduleId: string; lessonId?: string } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/creator/content")
      .then((r) => r.json())
      .then((d) => setModules(d.modules ?? []))
      .catch(() => setModules([]));
  }, []);

  const act = async (payload: any): Promise<string | null> => {
    setError("");
    const res = await fetch("/api/creator/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Erro ao salvar.");
      return d.error || "Erro ao salvar.";
    }
    setModules(d.modules);
    return null;
  };

  const totalLessons = modules?.reduce((a, m) => a + m.lessons.length, 0) ?? 0;
  const withoutVideo = modules?.reduce((a, m) => a + m.lessons.filter((l) => !l.video_id).length, 0) ?? 0;

  if (!modules) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Conteúdo do curso</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {modules.length} módulos · {totalLessons} aulas
            {withoutVideo > 0 && <span className="text-yellow-400"> · {withoutVideo} sem vídeo</span>}
          </p>
        </div>
        {courseId && totalLessons > 0 && (
          <Link href={`/dashboard/courses/${courseId}`} target="_blank">
            <Button variant="outline" size="sm" className="border-white/20 text-[10px] tracking-widest uppercase">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver como aluno
            </Button>
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {modules.map((mod, mi) => (
        <div key={mod.id} className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-white/8 bg-white/[0.02]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-14 shrink-0">Módulo {mi + 1}</span>
            {renaming?.id === mod.id ? (
              <form className="flex-1 flex gap-2" onSubmit={async (e) => {
                e.preventDefault();
                if (!(await act({ action: "rename_module", id: mod.id, title: renaming.title }))) setRenaming(null);
              }}>
                <input className={input} value={renaming.title} onChange={(e) => setRenaming({ id: mod.id, title: e.target.value })} autoFocus />
                <Button type="submit" size="sm" className="metallic-gradient text-black text-xs font-bold">OK</Button>
              </form>
            ) : (
              <p className="flex-1 font-bold">{mod.title}</p>
            )}
            <div className="flex items-center gap-1 text-white/40">
              <button title="Subir" disabled={mi === 0} onClick={() => act({ action: "move_module", id: mod.id, direction: "up" })} className="p-1.5 hover:text-white disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
              <button title="Descer" disabled={mi === modules.length - 1} onClick={() => act({ action: "move_module", id: mod.id, direction: "down" })} className="p-1.5 hover:text-white disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
              <button title="Renomear" onClick={() => setRenaming({ id: mod.id, title: mod.title })} className="p-1.5 hover:text-white"><Pencil className="w-4 h-4" /></button>
              <button title="Excluir" onClick={() => {
                if (confirm(`Excluir o módulo "${mod.title}" e todas as ${mod.lessons.length} aulas dele?`)) act({ action: "delete_module", id: mod.id });
              }} className="p-1.5 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {mod.lessons.map((lesson, li) =>
              editing?.lessonId === lesson.id ? (
                <LessonEditor key={lesson.id} moduleId={mod.id} lesson={lesson}
                  onCancel={() => setEditing(null)}
                  onSave={async (p) => { const err = await act(p); if (!err) setEditing(null); return err; }} />
              ) : (
                <div key={lesson.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 group">
                  {lesson.video_id
                    ? <Video className="w-4 h-4 text-green-400 shrink-0" />
                    : <FileText className="w-4 h-4 text-yellow-400 shrink-0" />}
                  <span className="text-sm flex-1">{li + 1}. {lesson.title}</span>
                  {lesson.materials?.length > 0 && <Link2 className="w-3.5 h-3.5 text-white/30" />}
                  <div className="flex items-center gap-1 text-white/40 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button disabled={li === 0} onClick={() => act({ action: "move_lesson", id: lesson.id, direction: "up" })} className="p-1 hover:text-white disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                    <button disabled={li === mod.lessons.length - 1} onClick={() => act({ action: "move_lesson", id: lesson.id, direction: "down" })} className="p-1 hover:text-white disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={() => setEditing({ moduleId: mod.id, lessonId: lesson.id })} className="p-1 hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm(`Excluir a aula "${lesson.title}"?`)) act({ action: "delete_lesson", id: lesson.id }); }} className="p-1 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )
            )}

            {editing?.moduleId === mod.id && !editing.lessonId ? (
              <LessonEditor moduleId={mod.id}
                onCancel={() => setEditing(null)}
                onSave={async (p) => { const err = await act(p); if (!err) setEditing(null); return err; }} />
            ) : (
              <button onClick={() => setEditing({ moduleId: mod.id })}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-xs text-muted-foreground hover:text-white hover:border-white/30">
                <Plus className="w-3.5 h-3.5" /> Nova aula
              </button>
            )}
          </div>
        </div>
      ))}

      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault();
        if (!newModule.trim()) return;
        if (!(await act({ action: "add_module", title: newModule }))) setNewModule("");
      }}>
        <input className={input} placeholder="Nome do novo módulo" value={newModule} onChange={(e) => setNewModule(e.target.value)} />
        <Button type="submit" className="metallic-gradient text-black font-bold text-xs whitespace-nowrap rounded-xl h-[42px]">
          <Plus className="w-4 h-4 mr-1" /> Módulo
        </Button>
      </form>
    </div>
  );
}
