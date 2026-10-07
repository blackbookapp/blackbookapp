"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, BookOpen, List, MessageSquareQuote, DollarSign,
  Eye, ArrowRight, ArrowLeft, Plus, Trash2, CheckCircle,
  Instagram, Camera, Sparkles, Upload, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────
interface WizardData {
  // Step 1 — Perfil
  name: string;
  bio: string;
  photo_url: string;
  specialty: string;
  instagram: string;
  slug: string;

  // Step 2 — Curso
  course_title: string;
  course_subtitle: string;
  main_promise: string;
  description: string;
  target_audience: string;

  // Step 3 — Módulos
  modules: string[];

  // Step 4 — Depoimentos
  testimonials: { name: string; role: string; text: string; stars: number }[];

  // Step 5 — Preço
  price: string;
  price_installments: string;
  price_installment_value: string;
  video_id: string;
  // Step 6 — Identidade
  theme_color: string;
}

const INITIAL: WizardData = {
  name: "", bio: "", photo_url: "", specialty: "", instagram: "", slug: "",
  course_title: "", course_subtitle: "", main_promise: "", description: "", target_audience: "",
  modules: ["", "", ""],
  testimonials: [{ name: "", role: "", text: "", stars: 5 }],
  price: "", price_installments: "", price_installment_value: "", video_id: "",
  theme_color: "#A3A3A3",
};

const STEPS = [
  { id: 1, icon: User,                 label: "Seu Perfil" },
  { id: 2, icon: BookOpen,             label: "O Curso" },
  { id: 3, icon: List,                 label: "Conteúdo" },
  { id: 4, icon: MessageSquareQuote,   label: "Depoimentos" },
  { id: 5, icon: DollarSign,           label: "Preço" },
  { id: 6, icon: Eye,                  label: "Preview" },
];

const SPECIALTIES = [
  "Realismo", "Blackwork", "Old School", "New School", "Aquarela",
  "Geométrico", "Fineline", "Pontilhismo", "Tribal", "Japonesa",
  "Neotradicional", "Biomecânica", "Lettering", "Minimalista", "Cover-up",
];

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

// ─── Input component ─────────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all ${className}`}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all resize-none"
    />
  );
}

// ─── Stars selector ───────────────────────────────────────────────────────────
function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} onClick={() => onChange(s)} type="button"
          className={`text-lg transition-colors ${s <= value ? "text-yellow-400" : "text-white/20"}`}>
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────
function Step1({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleNameChange = (v: string) => {
    set("name", v);
    set("slug", slugify(v));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/profile-photo", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro no upload");
      set("photo_url", json.url);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Seu nome" hint="Como aparecerá na LP">
          <Input value={d.name} onChange={handleNameChange} placeholder="Ex: Lucas Ferreira" />
        </Field>
        <Field label="Slug da sua página" hint={`Sua URL será: /c/${d.slug || "seu-nome"}`}>
          <Input value={d.slug} onChange={(v) => set("slug", slugify(v))} placeholder="lucas-ferreira" />
        </Field>
      </div>

      <Field label="Especialidade" hint="Estilo principal que você ensina">
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => (
            <button key={s} type="button"
              onClick={() => set("specialty", d.specialty === s ? "" : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                d.specialty === s
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Bio" hint="Quem você é, sua história e credenciais (2-4 frases)">
        <Textarea value={d.bio} onChange={(v) => set("bio", v)} rows={4}
          placeholder="Tatuadora especialista em realismo com 8 anos de experiência. Já tatuei mais de 2.000 clientes em SP e internacionalmente. Hoje ensino o que aprendi sobre técnica e negócio..." />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Foto de perfil" hint="JPG ou PNG, máx. 5MB">
          <label className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden
            ${d.photo_url ? "border-primary/40 bg-primary/5" : "border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/5"}`}
            style={{ minHeight: 120 }}>
            {d.photo_url ? (
              <>
                <img src={d.photo_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-xs font-semibold text-white">Trocar foto</span>
                </div>
              </>
            ) : uploading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Enviando...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Clique para enviar</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
        </Field>
        <Field label="Instagram" hint="@seuinstagram">
          <div className="relative">
            <Instagram className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground/50" />
            <Input value={d.instagram} onChange={(v) => set("instagram", v)}
              placeholder="@lucas.ferreira" className="pl-10" />
          </div>
        </Field>
      </div>
    </div>
  );
}

function Step2({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  return (
    <div className="space-y-5">
      <Field label="Título do curso" hint="Direto e poderoso — o que o aluno vai aprender">
        <Input value={d.course_title} onChange={(v) => set("course_title", v)}
          placeholder="Ex: Realismo do Zero — Do Traçado à Pele Perfeita" />
      </Field>

      <Field label="Subtítulo" hint="Complementa o título com mais detalhes">
        <Input value={d.course_subtitle} onChange={(v) => set("course_subtitle", v)}
          placeholder="Ex: Um método completo para dominar a técnica de realismo em 8 semanas" />
      </Field>

      <Field label="A grande promessa" hint="O maior resultado que o aluno vai conquistar — seja específico">
        <Input value={d.main_promise} onChange={(v) => set("main_promise", v)}
          placeholder='Ex: "Em 60 dias você vai tatuar retratos que as pessoas pagam R$1.500+ por sessão"' />
      </Field>

      <Field label="Para quem é este curso?" hint="Descreva o aluno ideal">
        <Textarea value={d.target_audience} onChange={(v) => set("target_audience", v)} rows={3}
          placeholder="Para tatuadores com pelo menos 1 ano de experiência que querem evoluir para o realismo e conseguir clientes de alto padrão..." />
      </Field>

      <Field label="Descrição completa" hint="Conte mais sobre o método, diferenciais e o que torna esse curso único">
        <Textarea value={d.description} onChange={(v) => set("description", v)} rows={5}
          placeholder="Este não é um curso de técnica básica. Aqui você vai aprender o método exato que eu uso para produzir retratos com precisão fotográfica..." />
      </Field>

      <Field label="ID do vídeo de apresentação (Cloudflare Stream)" hint="Opcional — vídeo curto apresentando o curso (cole o ID do Stream)">
        <Input value={d.video_id} onChange={(v) => set("video_id", v)}
          placeholder="Ex: f2a135026e57c0f0fe20dd0b355c0202" />
      </Field>
    </div>
  );
}

function Step3({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  const update = (i: number, v: string) => {
    const next = [...d.modules];
    next[i] = v;
    set("modules", next);
  };
  const add = () => set("modules", [...d.modules, ""]);
  const remove = (i: number) => set("modules", d.modules.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Liste o que o aluno vai aprender — cada item aparecerá com um ✓ na landing page.
        Seja específico: "Como preparar a pele corretamente" é melhor que "Técnica de preparo".
      </p>

      <div className="space-y-3">
        {d.modules.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
            </div>
            <Input value={m} onChange={(v) => update(i, v)}
              placeholder={`Ex: ${i === 0 ? "Selecionar e preparar a referência fotográfica" : i === 1 ? "Técnica de sombreado para criar profundidade" : "Finalização e proteção da tatuagem"}`} />
            {d.modules.length > 1 && (
              <button onClick={() => remove(i)} type="button"
                className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={add} type="button"
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors border border-dashed border-primary/30 rounded-xl px-4 py-3 w-full justify-center hover:bg-primary/5">
        <Plus className="w-4 h-4" /> Adicionar item
      </button>
    </div>
  );
}

function Step4({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  const update = (i: number, key: string, v: any) => {
    const next = d.testimonials.map((t, idx) => idx === i ? { ...t, [key]: v } : t);
    set("testimonials", next);
  };
  const add = () => set("testimonials", [...d.testimonials, { name: "", role: "", text: "", stars: 5 }]);
  const remove = (i: number) => set("testimonials", d.testimonials.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Adicione depoimentos reais de alunos ou clientes. Aparecem na LP como prova social.
        Mínimo 2, ideal 3-5.
      </p>

      <div className="space-y-4">
        {d.testimonials.map((t, i) => (
          <div key={i} className="glass rounded-2xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Depoimento {i + 1}
              </span>
              {d.testimonials.length > 1 && (
                <button onClick={() => remove(i)} type="button"
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome">
                <Input value={t.name} onChange={(v) => update(i, "name", v)} placeholder="João Silva" />
              </Field>
              <Field label="Papel / Cargo">
                <Input value={t.role} onChange={(v) => update(i, "role", v)} placeholder="Tatuador, SP" />
              </Field>
            </div>

            <Field label="Depoimento">
              <Textarea value={t.text} onChange={(v) => update(i, "text", v)} rows={3}
                placeholder="Depois do curso minha técnica evoluiu absurdamente. Em 3 meses já estava cobrando 3x mais por sessão..." />
            </Field>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Avaliação</span>
              <Stars value={t.stars} onChange={(v) => update(i, "stars", v)} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={add} type="button"
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors border border-dashed border-primary/30 rounded-xl px-4 py-3 w-full justify-center hover:bg-primary/5">
        <Plus className="w-4 h-4" /> Adicionar depoimento
      </button>
    </div>
  );
}

function Step5({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          O Blackbook gera o checkout automaticamente via Stripe. Quando o aluno clicar em
          {" "}<strong className="text-foreground">Garantir Vaga</strong>, ele é redirecionado para um
          link seguro gerado pela plataforma — o valor cai direto na sua conta Stripe (conecte em Configurações).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Field label="Preço (R$)" hint="Valor cheio">
          <Input value={d.price} onChange={(v) => set("price", v)} placeholder="997" type="number" />
        </Field>
        <Field label="Nº de parcelas" hint="0 = à vista">
          <Input value={d.price_installments} onChange={(v) => set("price_installments", v)} placeholder="12" type="number" />
        </Field>
        <Field label="Valor da parcela (R$)" hint="Automático ou manual">
          <Input value={d.price_installment_value} onChange={(v) => set("price_installment_value", v)}
            placeholder="99,70" />
        </Field>
      </div>

      <div className="glass rounded-2xl border border-primary/20 p-6 bg-primary/5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">Preview do cartão de preço</span>
        </div>
        <div className="text-center py-4">
          {d.price ? (
            <>
              <p className="text-4xl font-black">R$ {parseFloat(d.price).toLocaleString("pt-BR")}</p>
              {d.price_installments && parseInt(d.price_installments) > 1 && (
                <p className="text-sm text-muted-foreground mt-1">
                  ou {d.price_installments}x de R$ {d.price_installment_value || "..."}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Preencha o preço acima</p>
          )}
        </div>
      </div>
    </div>
  );
}

const THEME_COLORS = [
  { name: "Prata",    value: "#A3A3A3" },
  { name: "Roxo",     value: "#a855f7" },
  { name: "Ciano",    value: "#06b6d4" },
  { name: "Dourado",  value: "#eab308" },
  { name: "Verde",    value: "#22c55e" },
  { name: "Laranja",  value: "#f97316" },
  { name: "Azul",     value: "#3b82f6" },
  { name: "Rosa",     value: "#ec4899" },
];

function Step6Preview({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [iframeKey, setIframeKey] = useState(0);
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Sua LP está pronta para visualização! Me diga o que quer ajustar — título, bio, módulos, depoimentos, preço — e eu edito na hora." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const saveDraft = async (overrides?: Partial<WizardData>) => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = { ...d, ...overrides, is_published: false };
      const res = await fetch("/api/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar");
      setSaved(true);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save when entering step
  useEffect(() => { saveDraft(); }, []);

  const pickColor = async (color: string) => {
    set("theme_color", color);
    await fetch("/api/creator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_color: color }),
    });
    setIframeKey(k => k + 1);
  };

  const sendAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput.trim();
    setAiInput("");
    setAiMessages(p => [...p, { role: "user", text: msg }]);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiMessages(p => [...p, { role: "ai", text: `Erro: ${data.error || "Tente novamente."}` }]);
        return;
      }
      setAiMessages(p => [...p, { role: "ai", text: data.reply || "Feito!" }]);
      if (data.actions?.length > 0) setIframeKey(k => k + 1);
    } catch (e: any) {
      setAiMessages(p => [...p, { role: "ai", text: "Erro de conexão. Tente novamente." }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${
        saveError ? "bg-red-500/10 border border-red-500/20 text-red-400" :
        saved ? "bg-green-500/10 border border-green-500/20 text-green-400" :
        "bg-white/5 border border-white/10 text-muted-foreground"
      }`}>
        {saving ? <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Salvando rascunho...</> :
         saveError ? <><CheckCircle className="w-3 h-3" /> {saveError}</> :
         saved ? <><CheckCircle className="w-3 h-3" /> Rascunho salvo — sua LP está no preview abaixo</> :
         "Preparando..."}
      </div>

      {/* Color picker */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Cor de destaque da sua LP</p>
        <div className="flex flex-wrap gap-2">
          {THEME_COLORS.map((c) => (
            <button key={c.value} type="button" onClick={() => pickColor(c.value)}
              title={c.name}
              className={`w-8 h-8 rounded-full border-2 transition-all ${d.theme_color === c.value ? "scale-125 border-white" : "border-transparent hover:scale-110"}`}
              style={{ backgroundColor: c.value }} />
          ))}
        </div>
      </div>

      {/* Split: preview + AI chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: 480 }}>
        {/* Preview iframe */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-white/8 flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">blackbookapp.com.br/c/{d.slug}</span>
            {saved && (
              <button onClick={() => setIframeKey(k => k + 1)}
                className="text-muted-foreground hover:text-foreground transition-colors text-[10px] flex items-center gap-1">
                <Upload className="w-3 h-3" /> Atualizar
              </button>
            )}
          </div>
          {saved ? (
            <iframe key={iframeKey} src={`/c/${d.slug}/preview`} className="flex-1 w-full border-none" title="Preview" />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* AI chat */}
        <div className="glass rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold">Editar com IA</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-primary/20 border border-primary/30" : "bg-white/5 border border-white/10"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex gap-1">
                  {[0,1,2].map(i => (
                    <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ))}
                </div>
              </div>
            )}
            <div ref={aiBottomRef} />
          </div>
          <div className="p-3 border-t border-white/8 flex gap-2">
            <input value={aiInput} onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendAI()}
              placeholder="Ex: Muda o título para..."
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary/40" />
            <Button onClick={sendAI} disabled={aiLoading || !aiInput.trim() || !saved}
              className="metallic-gradient text-black font-bold px-3 rounded-xl text-xs h-8">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {saveError && (
        <p className="text-xs text-red-400 text-center">{saveError}</p>
      )}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function CriarPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof WizardData, v: any) => setData((prev) => ({ ...prev, [k]: v }));

  const canProceed = () => {
    if (step === 1) return data.name.trim() && data.slug.trim() && data.bio.trim();
    if (step === 2) return data.course_title.trim() && data.main_promise.trim();
    if (step === 3) return data.modules.filter(m => m.trim()).length >= 3;
    if (step === 4) return data.testimonials.some(t => t.name.trim() && t.text.trim());
    if (step === 5) return data.price.trim();
    return true;
  };

  const handlePublish = async () => {
    setSaving(true);
    setError("");
    try {
      // 1. Save creator data
      const res = await fetch("/api/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, is_published: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar");

      // 2. Redirect to platform payment
      router.push(`/pagar?slug=${data.slug}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const StepIcon = STEPS[step - 1].icon;

  return (
    <div className="min-h-screen bg-[#080808] text-foreground">
      {/* Top bar */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/vendas" className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
          <span className="font-black text-sm tracking-tighter uppercase">Blackbook</span>
        </Link>
        <span className="text-xs text-muted-foreground">Criador de Landing Page</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 pb-28">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  isActive ? "bg-primary text-black" :
                  isDone ? "bg-primary/20 text-primary" :
                  "bg-white/5 text-muted-foreground"
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.id}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-px flex-shrink-0 ${isDone ? "bg-primary/40" : "bg-white/10"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Passo {step} de {STEPS.length}
              </p>
              <h1 className="text-2xl font-black uppercase tracking-tighter">
                {STEPS[step - 1].label}
              </h1>
            </div>
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 1 && <Step1 d={data} set={set} />}
            {step === 2 && <Step2 d={data} set={set} />}
            {step === 3 && <Step3 d={data} set={set} />}
            {step === 4 && <Step4 d={data} set={set} />}
            {step === 5 && <Step5 d={data} set={set} />}
            {step === 6 && <Step6Preview d={data} set={set} />}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Bottom navigation — fixed */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#080808]/95 backdrop-blur-md px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}
              className="border-white/20 hover:bg-white/5 gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {STEPS.map((s) => (
              <div key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  s.id === step ? "w-6 bg-primary" :
                  s.id < step ? "w-3 bg-primary/50" :
                  "w-3 bg-white/15"
                }`} />
            ))}
          </div>

          {step < 6 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="metallic-gradient text-black font-bold gap-2 disabled:opacity-40">
              Próximo <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={saving}
              className="metallic-gradient text-black font-bold gap-2 px-8">
              {saving ? "Salvando..." : "Publicar e Ativar"}
              {!saving && <ArrowRight className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
