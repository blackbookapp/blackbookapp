"use client";

import { useEffect, useRef, useState } from "react";
import * as tus from "tus-js-client";
import { Upload, Video, Image as ImageIcon, Trash2, Copy, Check, Loader2, X, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resizeImage } from "@/lib/resize-image";

interface Media {
  id: string;
  type: "image" | "video";
  url: string | null;
  cloudflare_id: string | null;
  thumbnail_url: string | null;
  title: string | null;
  created_at: string;
}

interface Job {
  key: string;
  name: string;
  kind: "image" | "video";
  progress: number;
  error?: string;
  upload?: tus.Upload;
}

const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

export function MidiasTab() {
  const [medias, setMedias] = useState<Media[] | null>(null);
  const [filter, setFilter] = useState<"all" | "video" | "image">("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => fetch("/api/upload").then((r) => r.json()).then((d) => setMedias(Array.isArray(d) ? d : [])).catch(() => setMedias([]));
  useEffect(() => { load(); }, []);

  const patchJob = (key: string, patch: Partial<Job>) => setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...patch } : j)));
  const dropJob = (key: string) => setJobs((js) => js.filter((j) => j.key !== key));

  const uploadImage = async (file: File) => {
    const key = `${Date.now()}-${file.name}`;
    setJobs((js) => [...js, { key, name: file.name, kind: "image", progress: 10 }]);
    try {
      const small = await resizeImage(file);
      patchJob(key, { progress: 40 });
      const fd = new FormData();
      fd.append("file", small);
      fd.append("title", file.name);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Falha no envio.");
      dropJob(key);
      load();
    } catch (e: any) {
      patchJob(key, { error: e.message, progress: 0 });
    }
  };

  const uploadVideo = (file: File) => {
    const key = `${Date.now()}-${file.name}`;
    if (file.size > MAX_VIDEO_BYTES) {
      setJobs((js) => [...js, { key, name: file.name, kind: "video", progress: 0, error: "Vídeo maior que 5 GB." }]);
      return;
    }
    const upload = new tus.Upload(file, {
      endpoint: "/api/creator/upload-video?public=1&library=1",
      chunkSize: 50 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: { name: file.name, filetype: file.type },
      onProgress: (sent, total) => patchJob(key, { progress: Math.round((sent / total) * 100) }),
      onError: (err) => {
        const msg = String(err?.message || err);
        patchJob(key, { error: /403|401|Unauthorized/.test(msg) ? "Sem permissão para enviar." : /5\d\d/.test(msg) ? "O servidor de vídeo recusou o envio." : "Falha no envio. Tente de novo." });
      },
      onSuccess: () => { dropJob(key); load(); },
    });
    setJobs((js) => [...js, { key, name: file.name, kind: "video", progress: 0, upload }]);
    upload.start();
    // A mídia aparece na biblioteca assim que o envio começa (processando).
    setTimeout(load, 2500);
  };

  const handleFiles = (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      if (f.type.startsWith("video/")) uploadVideo(f);
      else if (f.type.startsWith("image/")) uploadImage(f);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = async (m: Media) => {
    if (!confirm(`Excluir "${m.title || "mídia"}"? Se ela estiver na sua página, vai sumir de lá também.`)) return;
    await fetch(`/api/upload?id=${m.id}`, { method: "DELETE" });
    load();
  };

  const copy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = (medias ?? []).filter((m) => filter === "all" || m.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Mídias</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Fotos e vídeos para a sua página. A IA também usa o que estiver aqui.</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} className="metallic-gradient text-black font-bold text-[11px] tracking-widest uppercase h-10 px-5 rounded-xl">
          <Upload className="w-3.5 h-3.5 mr-1.5" /> Enviar foto ou vídeo
        </Button>
        <input ref={fileRef} type="file" multiple accept="video/*,image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.key} className="glass rounded-xl border border-white/10 px-4 py-3">
              <div className="flex items-center gap-3 text-sm">
                {j.kind === "video" ? <Video className="w-4 h-4 text-primary shrink-0" /> : <ImageIcon className="w-4 h-4 text-primary shrink-0" />}
                <span className="flex-1 truncate">{j.name}</span>
                {j.error ? <span className="text-xs text-red-400">{j.error}</span> : <span className="text-xs font-mono text-primary">{j.progress}%</span>}
                <button onClick={() => { j.upload?.abort(); dropJob(j.key); }} className="text-white/40 hover:text-white" aria-label="Cancelar"><X className="w-4 h-4" /></button>
              </div>
              {!j.error && (
                <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${j.progress}%` }} />
                </div>
              )}
              {j.kind === "video" && !j.error && <p className="text-[10px] text-muted-foreground mt-1">Não feche esta aba até terminar. Se a internet cair, o envio continua de onde parou.</p>}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(["all", "video", "image"] as const).map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
              filter === t ? "bg-primary/20 text-primary border border-primary/30" : "border border-white/15 text-muted-foreground hover:border-white/30")}>
            {t === "all" ? "Todas" : t === "video" ? "Vídeos" : "Fotos"}
          </button>
        ))}
      </div>

      {medias === null ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-white/15 rounded-2xl p-16 text-center hover:border-primary/30 transition-colors cursor-pointer">
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">Arraste fotos ou vídeos aqui</p>
          <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP · MP4, MOV (até 5 GB)</p>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="glass rounded-xl border border-white/10 overflow-hidden">
              <div className="aspect-video bg-white/5 relative flex items-center justify-center">
                {m.type === "video" ? (
                  playing === m.id && m.cloudflare_id ? (
                    <iframe src={`https://iframe.cloudflarestream.com/${m.cloudflare_id}?autoplay=true`} allow="autoplay; fullscreen" className="absolute inset-0 w-full h-full border-0" />
                  ) : (
                    <button onClick={() => setPlaying(m.id)} className="absolute inset-0 group" aria-label="Assistir">
                      {m.thumbnail_url && <img src={m.thumbnail_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                      <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 group-hover:bg-black/10">
                        <PlayCircle className="w-10 h-10 text-white/90" />
                      </span>
                    </button>
                  )
                ) : m.url ? (
                  <img src={m.url} alt={m.title ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground opacity-40" />
                )}
              </div>
              <div className="p-3 flex items-center gap-2">
                {m.type === "video" ? <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                <p className="text-xs font-medium truncate flex-1" title={m.title ?? ""}>{m.title}</p>
                {m.type === "image" && m.url && (
                  <button onClick={() => copy(m.url!, m.id)} title="Copiar link" className="text-white/40 hover:text-white">
                    {copied === m.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button onClick={() => remove(m)} title="Excluir" className="text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {(medias ?? []).some((m) => m.type === "video") && (
        <p className="text-xs text-muted-foreground">
          Vídeos recém-enviados levam alguns minutos para processar. Para colocar um vídeo na página, peça à IA: “coloca meu vídeo &lt;nome&gt; depois dos módulos”.
        </p>
      )}
    </div>
  );
}
