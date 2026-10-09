"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, useInView } from "motion/react";
import {
  LayoutDashboard, Bot, ExternalLink, Settings, LogOut,
  DollarSign, TrendingUp, Users, CheckCircle, AlertCircle,
  ArrowRight, CreditCard, Video, Globe, Zap, ChevronRight,
  Star, Send, Upload, Image as ImageIcon, X, RefreshCw,
  BookOpen, Sparkles, Link as LinkIcon, PartyPopper, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { ListVideo, Ticket, GraduationCap } from "lucide-react";
import { ConteudoTab } from "@/components/painel/ConteudoTab";
import { AlunosTab } from "@/components/painel/AlunosTab";
import { CuponsTab } from "@/components/painel/CuponsTab";
import { StatsPanel } from "@/components/painel/StatsPanel";

const PUBLIC_HOST = (process.env.NEXT_PUBLIC_APP_URL || "https://blackbookapp.com.br").replace(/^https?:\/\//, "").replace(/\/$/, "");

const NAV_ITEMS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "conteudo", icon: ListVideo, label: "Conteúdo" },
  { id: "alunos", icon: GraduationCap, label: "Alunos" },
  { id: "cupons", icon: Ticket, label: "Cupons" },
  { id: "editor", icon: Bot, label: "Editor IA" },
  { id: "midias", icon: Video, label: "Mídias" },
  { id: "config", icon: Settings, label: "Configurações" },
];

// ─── Types ───────────────────────────────────────────────────
interface CreatorProfile {
  id: string;
  slug: string;
  name: string;
  bio: string;
  photo_url: string;
  specialty: string;
  stripe_account_id: string | null;
  stripe_onboarding_done: boolean;
  creator_courses: Array<{
    id: string;
    title: string;
    price: string;
    is_published: boolean;
  }>;
}

interface Sale {
  id: string;
  amount_total: number;
  creator_amount: number;
  platform_fee: number;
  student_name: string;
  student_email: string;
  created_at: string;
  status: string;
}

// ─── Sidebar ─────────────────────────────────────────────────
function Sidebar({ active, setActive, slug }: { active: string; setActive: (v: string) => void; slug: string }) {
  const { signOut } = useClerk();

  return (
    <>
    <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/8">
      <div className="flex items-center justify-between px-4 h-12">
        <span className="font-black text-sm tracking-tighter uppercase">Blackbook</span>
        <button onClick={() => signOut()} className="text-xs text-muted-foreground flex items-center gap-1">
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActive(id)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
              active === id ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </nav>
    </div>
    <aside className="w-60 min-h-screen bg-[#0a0a0a] border-r border-white/8 hidden lg:flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <Link href="/vendas" className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary">
            <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" />
          </svg>
          <span className="font-black text-sm tracking-tighter uppercase">Blackbook</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActive(id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              active === id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Ver LP */}
      <div className="px-3 pb-4 space-y-2">
        {slug && (
          <Link href={`/c/${slug}`} target="_blank">
            <Button variant="outline" size="sm"
              className="w-full justify-between text-[11px] tracking-widest uppercase border-white/15 hover:border-primary/40">
              Ver Minha LP <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        )}
        <button onClick={() => signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </div>
    </aside>
    </>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────
function DashboardTab({ profile, sales, lessonCount, setActive }: {
  profile: CreatorProfile; sales: Sale[]; lessonCount: number | null; setActive: (v: string) => void;
}) {
  const totalEarned = sales.filter(s => s.status === "paid").reduce((a, s) => a + s.creator_amount, 0);
  const thisMonth = sales.filter(s => {
    const d = new Date(s.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && s.status === "paid";
  }).reduce((a, s) => a + s.creator_amount, 0);

  const course = profile.creator_courses?.[0];

  const checklist: { done: boolean; label: string; href?: string; tab?: string }[] = [
    { done: !!profile.name && !!profile.bio, label: "Perfil preenchido", tab: "editor" },
    { done: !!course?.title, label: "Curso criado", href: "/criar" },
    { done: (lessonCount ?? 0) > 0, label: "Aulas adicionadas", tab: "conteudo" },
    { done: !!course?.is_published, label: "LP publicada", href: "/criar" },
    { done: !!profile.stripe_onboarding_done, label: "Stripe conectado (para receber pagamentos)", href: "/api/stripe/connect" },
  ];

  const allDone = checklist.every(c => c.done);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black">Olá, {profile.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {allDone ? "Sua LP está no ar e pronta para vender." : "Complete o checklist abaixo para começar a vender."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <DollarSign className="w-5 h-5" />, label: "Total ganho (líquido)", value: `R$ ${(totalEarned / 100).toFixed(2).replace(".", ",")}`, color: "text-green-400" },
          { icon: <TrendingUp className="w-5 h-5" />, label: "Este mês", value: `R$ ${(thisMonth / 100).toFixed(2).replace(".", ",")}`, color: "text-primary" },
          { icon: <Users className="w-5 h-5" />, label: "Vendas", value: sales.filter(s => s.status === "paid").length.toString(), color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl border border-white/10 p-5">
            <div className={cn("mb-3", stat.color)}>{stat.icon}</div>
            <p className={cn("text-2xl font-black mb-1", stat.color)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <StatsPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist */}
        <div className="glass rounded-2xl border border-white/10 p-6">
          <h2 className="font-black mb-5 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Setup da sua LP
          </h2>
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.label}
                className={cn("flex items-center gap-3 p-3 rounded-xl text-sm transition-all", item.done ? "bg-green-500/5 border border-green-500/20" : "bg-white/3 border border-white/8")}>
                {item.done
                  ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />}
                <span className={item.done ? "text-foreground/70 line-through" : ""}>{item.label}</span>
                {!item.done && (item.tab ? (
                  <button onClick={() => setActive(item.tab!)} className="ml-auto text-primary hover:underline text-xs font-bold">
                    Fazer <ArrowRight className="w-3 h-3 inline" />
                  </button>
                ) : (
                  <a href={item.href} className="ml-auto text-primary hover:underline text-xs font-bold">
                    Fazer <ArrowRight className="w-3 h-3 inline" />
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Últimas vendas */}
        <div className="glass rounded-2xl border border-white/10 p-6">
          <h2 className="font-black mb-5 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Últimas vendas
          </h2>
          {sales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma venda ainda.</p>
              <p className="text-xs mt-1">Complete o setup acima para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{sale.student_name || "Anônimo"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-green-400">+R$ {(sale.creator_amount / 100).toFixed(2).replace(".", ",")}</p>
                    <p className="text-[10px] text-muted-foreground">{sale.status === "paid" ? "Pago" : "Estornado"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Link da LP */}
      {profile.slug && (
        <div className="glass rounded-2xl border border-primary/30 p-5 bg-primary/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Sua LP pública</p>
            <p className="font-mono text-sm break-all">{PUBLIC_HOST}/c/{profile.slug}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/c/${profile.slug}`)}
              className="text-[10px] tracking-widest uppercase border-white/20">
              <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Copiar
            </Button>
            <Link href={`/c/${profile.slug}`} target="_blank">
              <Button size="sm" className="metallic-gradient text-black font-bold text-[10px] tracking-widest uppercase">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Ver
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Editor IA Tab ────────────────────────────────────────────
function EditorTab({ profile }: { profile: CreatorProfile }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string; actions?: string[] }>>([
    {
      role: "ai",
      text: `Oi, ${profile.name.split(" ")[0]}! Sou seu assistente de edição. Me diga o que quer mudar na sua LP e eu faço na hora.\n\nExemplos:\n• "Muda o título do curso para Blackwork do Zero ao Avançado"\n• "Adiciona um módulo chamado Técnicas de sombreamento"\n• "Minha bio agora é: Tatuador há 10 anos..."\n• "Remove o depoimento da Maria"`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lpKey, setLpKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.reply, actions: data.actions }]);
      if (data.refreshLP) setLpKey((k) => k + 1);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Erro ao processar. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
      {/* Chat */}
      <div className="glass rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-black">Editor IA</p>
            <p className="text-[10px] text-muted-foreground">Edite sua LP conversando</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-primary/20 border border-primary/30 text-foreground"
                  : "bg-white/5 border border-white/10 text-foreground/90"
              )}>
                {msg.role === "ai" && <Bot className="w-3.5 h-3.5 text-primary inline mr-1.5 mb-0.5" />}
                {msg.text}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.actions.map((a) => (
                      <span key={a} className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                        ✓ {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-white/8">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ex: Muda o título do meu curso para..."
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            />
            <Button onClick={send} disabled={loading || !input.trim()}
              className="metallic-gradient text-black font-bold px-4 rounded-xl">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{PUBLIC_HOST}/c/{profile.slug}</span>
          </div>
          <button onClick={() => setLpKey((k) => k + 1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <iframe
          key={lpKey}
          src={`/c/${profile.slug}`}
          className="flex-1 w-full border-none"
          title="Preview da LP"
        />
      </div>
    </div>
  );
}

// ─── Mídias Tab ───────────────────────────────────────────────
function MidiasTab() {
  const [medias, setMedias] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<"all" | "video" | "image">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/upload").then((r) => r.json()).then(setMedias);
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", file.type.startsWith("video/") ? "video" : "image");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (data.uploadURL) {
        await fetch(data.uploadURL, { method: "PUT", body: file });
      }

      const updated = await fetch("/api/upload").then((r) => r.json());
      setMedias(updated);
    } finally {
      setUploading(false);
    }
  };

  const filtered = filter === "all" ? medias : medias.filter((m) => m.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Mídias</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Seus vídeos e fotos</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="metallic-gradient text-black font-bold text-[11px] tracking-widest uppercase h-10 px-5 rounded-xl">
          {uploading ? "Enviando..." : <><Upload className="w-3.5 h-3.5 mr-1.5" /> Enviar mídia</>}
        </Button>
        <input ref={fileRef} type="file" accept="video/*,image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </div>

      <div className="flex gap-2">
        {(["all", "video", "image"] as const).map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
              filter === t ? "bg-primary/20 text-primary border border-primary/30" : "border border-white/15 text-muted-foreground hover:border-white/30"
            )}>
            {t === "all" ? "Todas" : t === "video" ? "Vídeos" : "Fotos"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
          className="border-2 border-dashed border-white/15 rounded-2xl p-16 text-center hover:border-primary/30 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}>
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">Arraste vídeos ou fotos aqui</p>
          <p className="text-xs text-muted-foreground/60 mt-1">MP4, MOV, JPG, PNG, WebP</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="glass rounded-xl border border-white/10 overflow-hidden group">
              <div className="aspect-video bg-white/5 flex items-center justify-center">
                {m.type === "video"
                  ? <Video className="w-8 h-8 text-muted-foreground opacity-40" />
                  : m.url
                    ? <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                    : <ImageIcon className="w-8 h-8 text-muted-foreground opacity-40" />}
              </div>
              <div className="p-3">
                <p className="text-xs font-medium truncate">{m.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {m.type === "video" ? "Vídeo" : "Imagem"}
                  {m.cloudflare_id && (
                    <button className="ml-2 text-primary hover:underline"
                      onClick={() => navigator.clipboard.writeText(m.cloudflare_id)}>
                      Copiar ID
                    </button>
                  )}
                  {m.url && m.type === "image" && (
                    <button className="ml-2 text-primary hover:underline"
                      onClick={() => navigator.clipboard.writeText(m.url)}>
                      Copiar URL
                    </button>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Config Tab ───────────────────────────────────────────────
function ConfigTab({ profile }: { profile: CreatorProfile }) {
  const stripeConnected = profile.stripe_onboarding_done;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-black">Configurações</h2>

      {/* Stripe Connect */}
      <div className="glass rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
              stripeConnected ? "bg-green-500/15" : "bg-yellow-500/10")}>
              <CreditCard className={cn("w-5 h-5", stripeConnected ? "text-green-400" : "text-yellow-400")} />
            </div>
            <div>
              <p className="font-black">Stripe — Receber Pagamentos</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stripeConnected ? "Conta conectada. Você recebe automaticamente." : "Conecte para receber vendas direto na sua conta."}
              </p>
            </div>
          </div>
          {stripeConnected
            ? <span className="text-xs font-bold text-green-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Conectado</span>
            : (
              <a href="/api/stripe/connect">
                <Button className="metallic-gradient text-black font-bold text-[10px] tracking-widest uppercase h-9 px-4 rounded-xl">
                  Conectar <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </a>
            )}
        </div>
        {stripeConnected && (
          <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3 text-xs text-green-400">
            ID da conta: {profile.stripe_account_id}
          </div>
        )}
      </div>

      {/* Domínio personalizado */}
      <div className="glass rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-black">Domínio Personalizado</p>
            <p className="text-xs text-muted-foreground mt-0.5">Use seu próprio domínio (ex: meucurso.com.br)</p>
          </div>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">Em breve</p>
      </div>

      {/* Sua LP atual */}
      <div className="glass rounded-2xl border border-white/10 p-6">
        <p className="font-black mb-3">Sua LP pública</p>
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
          <span className="font-mono text-sm text-muted-foreground flex-1 break-all">{PUBLIC_HOST}/c/{profile.slug}</span>
          <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/c/${profile.slug}`)}
            className="text-xs text-primary hover:underline font-bold">Copiar</button>
          <Link href={`/c/${profile.slug}`} target="_blank" className="text-xs text-primary hover:underline font-bold flex items-center gap-1">
            Abrir <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
function PainelContent() {
  const { userId, isLoaded } = useAuth();
  const params = useSearchParams();
  const ativado = params.get("ativado") === "true";
  const [showBanner, setShowBanner] = useState(ativado);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [active, setActive] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [lessonCount, setLessonCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    const sessionId = params.get("session_id");
    const confirmed = sessionId
      ? fetch("/api/stripe/confirm-activation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        }).catch(() => null)
      : Promise.resolve(null);

    confirmed.then(() => fetch(`/api/creator?me=1`))
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/creator/sales")
      .then((r) => r.json())
      .then(setSales)
      .catch(() => {});

    fetch("/api/creator/content")
      .then((r) => (r.ok ? r.json() : { modules: [] }))
      .then((d) => setLessonCount((d.modules ?? []).reduce((a: number, m: any) => a + m.lessons.length, 0)))
      .catch(() => setLessonCount(0));
  }, [isLoaded, userId, active]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full bg-primary" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-center px-6">
        <div>
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4 opacity-60" />
          <h2 className="text-xl font-black mb-2">Você ainda não tem um curso</h2>
          <p className="text-muted-foreground mb-6">Crie sua primeira LP de curso agora.</p>
          <Link href="/criar">
            <Button className="metallic-gradient text-black font-bold text-[11px] tracking-widest uppercase h-11 px-6 rounded-xl">
              Criar Minha LP <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-foreground">
      <Sidebar active={active} setActive={setActive} slug={profile.slug} />

      <main className="lg:ml-60 px-4 pt-28 pb-10 lg:p-8">
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between gap-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/30"
          >
            <div className="flex items-center gap-3">
              <PartyPopper className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-300">Plataforma ativada com sucesso!</p>
                <p className="text-xs text-green-400/70">Sua landing page está no ar. Conecte o Stripe para começar a receber.</p>
              </div>
            </div>
            <button onClick={() => setShowBanner(false)}
              className="text-green-400/60 hover:text-green-400 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {active === "dashboard" && <DashboardTab profile={profile} sales={sales} lessonCount={lessonCount} setActive={setActive} />}
        {active === "conteudo" && <ConteudoTab courseId={profile.creator_courses?.[0]?.id} />}
        {active === "alunos" && <AlunosTab />}
        {active === "cupons" && <CuponsTab slug={profile.slug} />}
        {active === "editor" && <EditorTab profile={profile} />}
        {active === "midias" && <MidiasTab />}
        {active === "config" && <ConfigTab profile={profile} />}
      </main>
    </div>
  );
}

export default function PainelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PainelContent />
    </Suspense>
  );
}
