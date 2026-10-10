"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "motion/react";
import {
  CheckCircle, ArrowRight, Star, ChevronDown,
  Globe, Sun, Moon, Shield, Zap, Sparkles,
  BookOpen, DollarSign, Layout, Video, CreditCard,
  Users, Play, Palette, ChevronRight, X
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─────────── Animation helpers ───────────
function FadeUp({ children, delay = 0, className = "" }: any) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

// ─────────── FAQ Item ───────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("border rounded-2xl overflow-hidden transition-colors", open ? "border-primary/40 bg-primary/5" : "border-white/10 bg-white/5")}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
        <span className="font-semibold text-sm">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.3 }}>
            <p className="text-sm text-muted-foreground px-5 pb-5 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────── Blackbook Logo ───────────
function BlackbookLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-5 h-5", md: "w-7 h-7", lg: "w-10 h-10" };
  const textSizes = { sm: "text-base", md: "text-lg", lg: "text-2xl" };
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(sizes[size], "relative flex items-center justify-center")}>
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn(sizes[size], "text-primary")}>
          <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" />
        </svg>
      </div>
      <span className={cn("font-black tracking-tighter uppercase", textSizes[size])}>Blackbook</span>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    icon: <BookOpen className="w-6 h-6" />,
    title: "Conte sobre seu curso",
    desc: "Preencha um formulário guiado com o nome do curso, módulos, depoimentos e preço. Leva menos de 10 minutos.",
  },
  {
    n: "02",
    icon: <Layout className="w-6 h-6" />,
    title: "A plataforma cria sua LP",
    desc: "Geramos automaticamente uma página de vendas profissional no padrão editorial do mercado — sem código, sem designer.",
  },
  {
    n: "03",
    icon: <DollarSign className="w-6 h-6" />,
    title: "Você vende e recebe",
    desc: "Conecte seu checkout, suba seus vídeos e comece a vender. A plataforma cuida de tudo — você só ensina.",
  },
];

const FEATURES = [
  {
    icon: <Layout className="w-6 h-6" />,
    title: "Landing Page Automática",
    desc: "Sua página de vendas é gerada com visual editorial premium — tipografia preta, glassmorphism, animações. Sem contratar designer.",
    badge: "Auto-gerada",
    badgeColor: "bg-primary/20 text-primary border-primary/30",
  },
  {
    icon: <Video className="w-6 h-6" />,
    title: "Hospedagem de Vídeos",
    desc: "Suba suas aulas direto na plataforma com streaming profissional via Cloudflare. Qualidade 4K sem custo extra.",
    badge: "Cloudflare",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-400/20",
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: "Checkout Integrado",
    desc: "Conecte Stripe, Hotmart ou Kiwify. A plataforma gera o botão de compra e direciona o aluno direto para o pagamento.",
    badge: "1-clique",
    badgeColor: "bg-green-500/20 text-green-400 border-green-400/20",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Domínio Personalizado",
    desc: "Sua página fica em blackbook.app/c/seu-nome — ou conecte seu próprio domínio. Profissional do dia um.",
    badge: "SEO Ready",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-400/20",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Área do Aluno",
    desc: "Seus alunos acessam as aulas numa área exclusiva com progresso, certificado e suporte. Tudo incluído.",
    badge: "Incluso",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-400/20",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Setup Guiado",
    desc: "Um checklist passo a passo te mostra exatamente o que falta configurar. Pagamento, domínio, vídeos — nada fica sem fazer.",
    badge: "Assistido",
    badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-400/20",
  },
];

const STYLES = [
  "Blackwork", "Realismo", "Fineline", "Old School",
  "Aquarela", "Geométrico", "Neotraditional", "Japonês",
  "Tribal", "Pontilhismo", "Lettering", "Color Realism",
];

const CREATORS = [
  { name: "Lucas Ferreira", specialty: "Blackwork & Fineline", slug: "", students: "847", rating: "4.9" },
  { name: "Rafael Costa", specialty: "Realismo Colorido", slug: "", students: "512", rating: "4.8" },
  { name: "Ana Drummond", specialty: "Aquarela & Neo Trad", slug: "", students: "391", rating: "5.0" },
];

const FAQS = [
  { q: "Preciso saber programar para criar minha LP?", a: "Não. Você preenche um formulário com o nome do curso, seus módulos, depoimentos e preço — a plataforma gera tudo automaticamente. Leva menos de 10 minutos." },
  { q: "Como funciona o pagamento dos meus alunos?", a: "Você conecta sua conta Stripe em poucos cliques. O Blackbook gera o checkout (cartão, com parcelamento) e o dinheiro cai direto na sua conta Stripe. O acesso do aluno é liberado automaticamente." },
  { q: "Onde ficam hospedados os meus vídeos?", a: "Seus vídeos ficam no Cloudflare Stream, um dos CDNs mais rápidos do mundo. O upload é direto pela plataforma — sem custo extra para você." },
  { q: "Posso usar meu próprio domínio?", a: "Sim. Por padrão sua LP fica em blackbook.app/c/seu-nome. Se quiser usar um domínio próprio (ex: meucurso.com.br), basta conectar nas configurações em menos de 5 minutos." },
  { q: "Quanto custa o Blackbook?", a: "Você escolhe: plano Grátis (R$ 0 para começar e 5% de comissão por venda) ou plano Pro (pagamento único de R$ 997 e 0% de comissão). Sem mensalidade. Em qualquer plano, a taxa de processamento do Stripe é descontada pelo próprio Stripe." },
  { q: "Para quais estilos de tatuagem é indicado?", a: "Para todos! Blackwork, realismo, fineline, old school, aquarela, geométrico... qualquer tatuador que quer transformar seu conhecimento em curso pode usar o Blackbook." },
];

// ─────────── Main Page ───────────
export default function BlackbookPage() {
  const [theme] = useState("dark");
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], ["rgba(0,0,0,0)", "rgba(0,0,0,0.9)"]);

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden bg-[#080808]">

      {/* ─── NAVBAR ─── */}
      <motion.nav style={{ backgroundColor: navBg }}
        className="fixed top-0 left-0 right-0 z-50 h-18 flex items-center justify-between px-6 lg:px-12 backdrop-blur-md border-b border-white/5">
        <BlackbookLogo />

        <div className="hidden md:flex items-center gap-8">
          {[
            { href: "#como-funciona", label: "Como Funciona" },
            { href: "#recursos", label: "Recursos" },
            { href: "#criadores", label: "Criadores" },
            { href: "#planos", label: "Planos" },
          ].map((item) => (
            <a key={item.href} href={item.href}
              className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/entrar" className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
            Entrar
          </Link>
          <Link href="/criar" className="hidden sm:block">
            <Button className="metallic-gradient text-black font-bold text-[10px] tracking-widest uppercase px-5 h-9 rounded-full">
              Criar Minha Página <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-20">
        {/* Animated blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/15 rounded-full blur-[100px]" />
          <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-[11px] font-bold tracking-[0.3em] uppercase text-primary mb-6 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Plataforma Para Tatuadores Que Ensinam
          <Sparkles className="w-3.5 h-3.5" />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
          className="text-6xl md:text-8xl lg:text-[108px] font-black uppercase tracking-tighter leading-none mb-8 max-w-6xl">
          Crie. Publique.
          <br />
          <span className="metallic-text neon-glow">Venda.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          O Blackbook cria sua página de vendas, configura seu checkout e hospeda seus vídeos.
          Você só precisa ensinar.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link href="/criar">
            <Button className="metallic-gradient text-black font-bold h-14 px-8 rounded-2xl text-[12px] tracking-widest uppercase hover:scale-[1.03] transition-transform shadow-2xl shadow-primary/20">
              Criar Minha Página Grátis <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Button variant="outline" onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
            className="h-14 px-8 rounded-2xl text-[12px] tracking-widest uppercase border-white/20 hover:bg-white/5">
            Ver Como Funciona
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10 w-full max-w-3xl">
          {[
            { n: "3.000+", l: "Tatuadores Cadastrados" },
            { n: "10 min", l: "Para Criar sua LP" },
            { n: "R$ 0", l: "Para Começar" },
            { n: "4.9★", l: "Avaliação Média" },
          ].map((s) => (
            <div key={s.l} className="bg-background/80 backdrop-blur-sm px-6 py-5 text-center">
              <p className="text-2xl font-black text-primary mb-1">{s.n}</p>
              <p className="text-xs text-muted-foreground font-medium">{s.l}</p>
            </div>
          ))}
        </motion.div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 text-muted-foreground/40">
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section id="como-funciona" className="py-28 px-6 lg:px-12 max-w-7xl mx-auto">
        <FadeUp className="text-center mb-20">
          <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-primary block mb-4">Como Funciona</span>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
            3 Passos Para Vender
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Do zero à sua página de vendas no ar em menos de 10 minutos.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-14 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {STEPS.map((step, i) => (
            <FadeUp key={step.n} delay={i * 0.15}>
              <div className="glass rounded-3xl border border-white/10 p-8 text-center hover:border-primary/30 transition-all group relative">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors text-primary">
                  {step.icon}
                </div>
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary/60 block mb-2">
                  Passo {step.n}
                </span>
                <h3 className="text-xl font-black mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.4} className="text-center mt-12">
          <Link href="/criar">
            <Button className="metallic-gradient text-black font-bold h-12 px-8 rounded-2xl text-[11px] tracking-widest uppercase hover:scale-[1.02] transition-transform">
              Começar Agora — É Grátis <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </FadeUp>
      </section>

      {/* ─── RECURSOS ─── */}
      <section id="recursos" className="py-28 px-6 lg:px-12 bg-gradient-to-b from-transparent via-primary/3 to-transparent">
        <div className="max-w-7xl mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-primary block mb-4">Recursos</span>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
              A plataforma faz tudo
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Você não precisa de desenvolvedor, designer ou 10 ferramentas diferentes. O Blackbook é tudo em um.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.08}>
                <div className="glass rounded-3xl border border-white/10 p-7 h-full hover:border-primary/30 hover:-translate-y-1 transition-all group">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                      {f.icon}
                    </div>
                    <span className={cn("text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border", f.badgeColor)}>
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-black mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ESTILOS ─── */}
      <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto">
        <FadeUp className="text-center mb-12">
          <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-primary block mb-4">Para Quem É</span>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
            Para todo estilo de tattoo
          </h2>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="flex flex-wrap gap-3 justify-center">
            {STYLES.map((style) => (
              <span key={style}
                className="px-5 py-2.5 rounded-full border border-white/15 bg-white/5 text-sm font-semibold hover:border-primary/40 hover:bg-primary/5 transition-all cursor-default">
                {style}
              </span>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ─── CRIADORES ─── */}
      <section id="criadores" className="py-28 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-primary block mb-4">Criadores</span>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
              Quem já está vendendo
            </h2>
            <p className="text-muted-foreground">Tatuadores que criaram seus cursos no Blackbook e estão faturando.</p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CREATORS.map((c, i) => (
              <FadeUp key={c.name} delay={i * 0.1}>
                <div className="glass rounded-3xl border border-white/10 p-6 hover:border-primary/30 transition-all group">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary text-2xl font-black">
                    {c.name[0]}
                  </div>
                  <div className="text-center mb-4">
                    <h3 className="font-black text-lg">{c.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.specialty}</p>
                  </div>
                  <div className="flex justify-center gap-6 text-center mb-5">
                    <div>
                      <p className="text-xl font-black text-primary">{c.students}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Alunos</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-primary">{c.rating}★</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Avaliação</p>
                    </div>
                  </div>
                  <Link href="/criar">
                    <Button variant="outline" size="sm"
                      className="w-full rounded-xl text-[10px] tracking-widest uppercase border-white/15 hover:border-primary/40 group-hover:bg-primary/5">
                      Criar como este <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLANOS ─── */}
      <section id="planos" className="py-28 px-6 lg:px-12 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-4xl mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-primary block mb-4">Planos</span>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Escolha seu plano</h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                name: "Grátis", price: "R$ 0", sub: "para começar", fee: "5% de comissão por venda",
                desc: "Publique hoje sem pagar nada. Você só paga quando vender.", cta: "Começar grátis", highlight: false,
              },
              {
                name: "Pro", price: "R$ 997", sub: "pagamento único", fee: "0% de comissão",
                desc: "Fique com todas as vendas. Ideal para quem já tem audiência.", cta: "Quero o Pro", highlight: true,
              },
            ].map((p) => (
              <FadeUp key={p.name}>
                <div className={`glass rounded-3xl border p-8 h-full flex flex-col relative overflow-hidden ${p.highlight ? "border-primary/50 bg-primary/5" : "border-white/10"}`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">{p.name}</p>
                  <div className="mb-2">
                    <span className="text-5xl font-black">{p.price}</span>
                    <span className="text-muted-foreground text-sm ml-2">{p.sub}</span>
                  </div>
                  <p className="text-sm font-bold mb-2">{p.fee}</p>
                  <p className="text-sm text-muted-foreground mb-8">{p.desc}</p>
                  <div className="space-y-3 mb-8 flex-1">
                    {[
                      "Landing page de vendas com IA",
                      "Checkout com parcelamento no cartão",
                      "Área do aluno com aulas protegidas",
                      "Upload de vídeos e fotos",
                      "Cupons e relatórios de vendas",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                      </div>
                    ))}
                  </div>
                  <Link href="/criar">
                    <Button className={`w-full font-bold h-12 rounded-2xl text-[11px] tracking-widest uppercase ${p.highlight ? "metallic-gradient text-black" : "bg-transparent border border-white/20 hover:bg-white/5"}`}>
                      {p.cta} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-2 text-center">
            <Shield className="w-3 h-3 shrink-0" />
            Sem mensalidade. A taxa de processamento do Stripe é descontada pelo próprio Stripe em cada venda.
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-28 px-6 lg:px-12 max-w-3xl mx-auto">
        <FadeUp className="text-center mb-12">
          <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-primary block mb-4">Dúvidas Frequentes</span>
          <h2 className="text-4xl font-black uppercase tracking-tighter">Respostas rápidas</h2>
        </FadeUp>
        <div className="space-y-3">
          {FAQS.map((f) => <FAQItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-28 px-6 lg:px-12 text-center max-w-4xl mx-auto">
        <FadeUp>
          <div className="glass rounded-3xl border border-primary/30 p-16 bg-primary/5 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/15 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
            <div className="relative">
              <div className="flex justify-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-5">
                Sua arte merece<br />ser ensinada
              </h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
                Mais de 3.000 tatuadores já criaram sua página no Blackbook. Em 10 minutos você tem sua LP no ar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/criar">
                  <Button className="metallic-gradient text-black font-bold h-14 px-10 rounded-2xl text-[12px] tracking-widest uppercase hover:scale-[1.03] transition-transform shadow-2xl shadow-primary/25">
                    Criar Minha Página Agora <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-5 flex items-center justify-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Gratuito para começar · Sem cartão de crédito
              </p>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 border-t border-border/20 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <BlackbookLogo size="sm" />
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Blackbook. Todos os direitos reservados.</p>
        <p className="text-xs text-muted-foreground mt-1">A plataforma para tatuadores que ensinam.</p>
      </footer>
    </div>
  );
}
