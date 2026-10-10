"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  CheckCircle, ArrowRight, Star, ChevronDown, Instagram, Loader2, ShieldCheck, Gift, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Section } from "@/lib/page-schema";
import type { LPTheme } from "@/lib/theme";

export interface LPContext {
  profile: { name: string; bio?: string; photo_url?: string; specialty?: string; instagram?: string };
  course: {
    title?: string; subtitle?: string; main_promise?: string; target_audience?: string; video_id?: string;
  } | null;
  modules: { title: string }[];
  testimonials: { name: string; role?: string; text: string; stars: number; photo_url?: string }[];
  theme: LPTheme;
  onCTA: () => void;
  ctaLoading: boolean;
  heroPrice: React.ReactNode;
  priceBlock: React.ReactNode;
}

export function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-(--lp-accent) block mb-4">{children}</span>;
}

function Credit({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-[10px] text-(--lp-text)/35 mt-2">{text}</p>;
}

function CTAButton({ ctx, label, big = true }: { ctx: LPContext; label?: string; big?: boolean }) {
  return (
    <Button onClick={ctx.onCTA} disabled={ctx.ctaLoading}
      className={`lp-btn font-bold rounded-2xl tracking-widest uppercase hover:scale-[1.03] transition-transform shadow-2xl ${big ? "h-14 px-10 text-[12px]" : "h-11 px-6 text-[11px]"}`}>
      {ctx.ctaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{label || "Garantir Minha Vaga"} <ArrowRight className="w-4 h-4 ml-2" /></>}
    </Button>
  );
}

function Shell({ section, ctx, children, className = "", inner = "max-w-6xl" }: {
  section: Section; ctx: LPContext; children: React.ReactNode; className?: string; inner?: string;
}) {
  const st = section.style ?? {};
  const pad = { compact: "py-14", normal: "py-24", spacious: "py-32" }[st.spacing ?? "normal"];
  let style: React.CSSProperties | undefined;
  if (st.background === "alt") style = { background: "color-mix(in srgb, var(--lp-text) 3%, var(--lp-bg))" };
  if (st.background === "accent") style = { background: "color-mix(in srgb, var(--lp-accent) 14%, var(--lp-bg))" };
  if (st.background === "image" && st.image) {
    style = {
      backgroundImage: `linear-gradient(${rgba(ctx.theme.background, 0.8)}, ${rgba(ctx.theme.background, 0.9)}), url("${encodeURI(st.image)}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return (
    <section style={style} className={`${pad} px-6 lg:px-12 ${className}`}>
      <div className={`${inner} mx-auto`}>{children}</div>
    </section>
  );
}

// ─── Seções ───────────────────────────────────────────────────────────────────

function Hero({ s, ctx }: { s: Section; ctx: LPContext }) {
  const p = s.props;
  const title = p.title || ctx.course?.title || ctx.profile.name;
  const subtitle = p.subtitle || ctx.course?.subtitle || ctx.course?.main_promise;
  const eyebrow = p.eyebrow || ctx.profile.specialty;
  const image = p.image || ctx.profile.photo_url;

  const text = (align: "center" | "left") => (
    <>
      {eyebrow && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className={`text-[11px] font-bold tracking-[0.3em] uppercase text-(--lp-accent) mb-6 flex items-center gap-3 ${align === "center" ? "justify-center" : ""}`}>
          <span className="w-12 h-px bg-(--lp-accent)/30" />{eyebrow}{align === "center" && <span className="w-12 h-px bg-(--lp-accent)/30" />}
        </motion.div>
      )}
      <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className={`text-5xl md:text-7xl ${align === "center" ? "lg:text-[88px]" : "lg:text-7xl"} font-black uppercase tracking-tighter leading-none mb-6`}>
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25 }}
          className={`text-lg md:text-xl text-(--lp-text)/60 mb-10 leading-relaxed font-light ${align === "center" ? "max-w-2xl mx-auto" : "max-w-xl"}`}>
          {subtitle}
        </motion.p>
      )}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
        className={`flex flex-col sm:flex-row gap-4 items-center ${align === "center" ? "justify-center" : ""}`}>
        <CTAButton ctx={ctx} label={p.cta_label} />
        {ctx.heroPrice}
      </motion.div>
    </>
  );

  if (s.variant === "split") {
    return (
      <section className="relative min-h-screen flex items-center px-6 lg:px-12 pt-24 pb-16 overflow-hidden">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">{text("left")}</div>
          {image && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9 }} className="relative">
              <div className="absolute -inset-6 bg-(--lp-accent)/15 rounded-[2rem] blur-3xl" />
              <img src={image} alt="" className="relative w-full aspect-[4/5] object-cover rounded-3xl border border-(--lp-text)/10" />
            </motion.div>
          )}
        </div>
      </section>
    );
  }

  if (s.variant === "image" && image) {
    return (
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center pt-16"
        style={{
          backgroundImage: `linear-gradient(${rgba(ctx.theme.background, 0.55)}, ${rgba(ctx.theme.background, 0.95)}), url("${encodeURI(image)}")`,
          backgroundSize: "cover", backgroundPosition: "center",
        }}>
        <div className="max-w-5xl">{text("center")}</div>
        <ChevronDown className="w-6 h-6 absolute bottom-10 text-(--lp-text)/30 animate-bounce" />
      </section>
    );
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-(--lp-accent)/10 rounded-full blur-[120px]" />
        <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-(--lp-text)/5 rounded-full blur-[120px]" />
      </div>
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `linear-gradient(${rgba(ctx.theme.text, 0.5)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(ctx.theme.text, 0.5)} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div className="relative max-w-5xl">{text("center")}</div>
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-10 text-(--lp-text)/20">
        <ChevronDown className="w-6 h-6" />
      </motion.div>
    </section>
  );
}

function Video({ s, ctx }: { s: Section; ctx: LPContext }) {
  if (!ctx.course?.video_id) return null;
  return (
    <Shell section={s} ctx={ctx} inner="max-w-4xl">
      {(s.props.title || s.props.eyebrow) && (
        <FadeUp className="text-center mb-10">
          <Eyebrow>{s.props.eyebrow}</Eyebrow>
          {s.props.title && <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{s.props.title}</h2>}
          {s.props.subtitle && <p className="text-(--lp-text)/55 mt-4">{s.props.subtitle}</p>}
        </FadeUp>
      )}
      <FadeUp>
        <div className="relative">
          <div className="absolute -inset-4 bg-(--lp-accent)/10 rounded-3xl blur-2xl" />
          <div className="relative glass rounded-3xl border border-(--lp-text)/10 overflow-hidden shadow-2xl aspect-video">
            <iframe src={`https://iframe.cloudflarestream.com/${ctx.course.video_id}?controls=true&preload=true`}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen
              className="absolute inset-0 w-full h-full" style={{ border: "none" }} />
          </div>
        </div>
      </FadeUp>
    </Shell>
  );
}

function About({ s, ctx }: { s: Section; ctx: LPContext }) {
  const p = s.props;
  const image = p.image || ctx.profile.photo_url;
  const text = (
    <FadeUp>
      <Eyebrow>{p.eyebrow || "Seu Professor"}</Eyebrow>
      <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">{p.title || ctx.profile.name}</h2>
      {ctx.profile.specialty && !p.title && (
        <p className="text-[11px] font-bold tracking-widest uppercase text-(--lp-text)/40 mb-4">Especialista em {ctx.profile.specialty}</p>
      )}
      <p className="text-(--lp-text)/70 text-lg leading-relaxed mb-6 font-light whitespace-pre-line">{p.text || ctx.profile.bio}</p>
      {ctx.profile.instagram && (
        <a href={`https://instagram.com/${ctx.profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-(--lp-accent) hover:text-(--lp-text) transition-colors border border-(--lp-text)/10 rounded-full px-4 py-2">
          <Instagram className="w-4 h-4" />{ctx.profile.instagram}
        </a>
      )}
    </FadeUp>
  );
  const photo = (
    <FadeUp delay={0.2}>
      {image ? (
        <div className="relative">
          <div className="absolute -inset-4 bg-(--lp-accent)/10 rounded-3xl blur-2xl" />
          <div className="relative rounded-3xl overflow-hidden border border-(--lp-text)/10 aspect-[3/4] max-w-sm mx-auto">
            <img src={image} alt={ctx.profile.name} className="w-full h-full object-cover" />
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-(--lp-text)/10 aspect-[3/4] max-w-sm mx-auto bg-(--lp-text)/5 flex items-center justify-center">
          <span className="text-6xl font-black text-(--lp-text)/20">{ctx.profile.name.charAt(0)}</span>
        </div>
      )}
    </FadeUp>
  );

  if (s.variant === "centered") {
    return (
      <Shell section={s} ctx={ctx} inner="max-w-3xl" className="text-center">
        {image && <img src={image} alt={ctx.profile.name} className="w-32 h-32 rounded-full object-cover mx-auto mb-8 border-2 border-(--lp-accent)/40" />}
        {text}
      </Shell>
    );
  }
  return (
    <Shell section={s} ctx={ctx}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {s.variant === "image-left" ? <>{photo}{text}</> : <>{text}{photo}</>}
      </div>
    </Shell>
  );
}

function SectionTitle({ s, fallbackEyebrow, fallbackTitle }: { s: Section; fallbackEyebrow?: string; fallbackTitle: string }) {
  return (
    <FadeUp className="text-center mb-16">
      <Eyebrow>{s.props.eyebrow ?? fallbackEyebrow}</Eyebrow>
      <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">{s.props.title || fallbackTitle}</h2>
      {s.props.subtitle && <p className="text-(--lp-text)/55 text-lg mt-5 max-w-2xl mx-auto font-light">{s.props.subtitle}</p>}
    </FadeUp>
  );
}

function Modules({ s, ctx }: { s: Section; ctx: LPContext }) {
  if (!ctx.modules.length) return null;
  return (
    <Shell section={s} ctx={ctx}>
      <SectionTitle s={s} fallbackEyebrow="Conteúdo do Curso" fallbackTitle="O Que Você Vai Aprender" />
      {s.variant === "list" ? (
        <div className="max-w-3xl mx-auto divide-y divide-(--lp-text)/10 border-y border-(--lp-text)/10">
          {ctx.modules.map((m, i) => (
            <FadeUp key={i} delay={i * 0.04}>
              <div className="flex items-center gap-6 py-5">
                <span className="text-3xl font-black text-(--lp-accent) w-12 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-lg text-(--lp-text)/85">{m.title}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ctx.modules.map((m, i) => (
            <FadeUp key={i} delay={i * 0.06}>
              <div className="flex items-start gap-4 glass rounded-2xl border border-(--lp-text)/10 p-5 h-full">
                <div className="w-8 h-8 rounded-lg bg-(--lp-accent)/15 border border-(--lp-accent)/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-(--lp-accent)" />
                </div>
                <p className="text-sm text-(--lp-text)/80 leading-relaxed pt-1">{m.title}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Benefits({ s, ctx }: { s: Section; ctx: LPContext }) {
  const items: { title?: string; text?: string }[] = s.props.items ?? [];
  if (!items.length) return null;
  return (
    <Shell section={s} ctx={ctx}>
      <SectionTitle s={s} fallbackTitle="Por Que Este Curso" />
      <div className={s.variant === "list" ? "max-w-3xl mx-auto space-y-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"}>
        {items.map((it, i) => (
          <FadeUp key={i} delay={i * 0.06}>
            <div className="glass rounded-2xl border border-(--lp-text)/10 p-6 h-full flex gap-4">
              <CheckCircle className="w-5 h-5 text-(--lp-accent) shrink-0 mt-0.5" />
              <div>
                {it.title && <h3 className="font-bold mb-1.5">{it.title}</h3>}
                {it.text && <p className="text-sm text-(--lp-text)/65 leading-relaxed">{it.text}</p>}
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </Shell>
  );
}

function Audience({ s, ctx }: { s: Section; ctx: LPContext }) {
  const text: string = s.props.text || ctx.course?.target_audience || "";
  const items: string[] = (s.props.items ?? []).map((i: any) => i.text).filter(Boolean);
  if (!text && !items.length) return null;
  const list = items.length ? items : text.split(/\n+/).map((t) => t.trim()).filter(Boolean);
  return (
    <Shell section={s} ctx={ctx} inner="max-w-4xl">
      <FadeUp className="text-center mb-10">
        <Eyebrow>{s.props.eyebrow ?? "Este Curso é Para Você"}</Eyebrow>
        <h2 className="text-4xl font-black uppercase tracking-tighter">{s.props.title || "Para Quem É?"}</h2>
      </FadeUp>
      <FadeUp>
        {s.variant === "checklist" ? (
          <div className="max-w-2xl mx-auto space-y-3">
            {list.map((t, i) => (
              <div key={i} className="flex gap-3 glass rounded-xl border border-(--lp-text)/10 px-5 py-4">
                <CheckCircle className="w-5 h-5 text-(--lp-accent) shrink-0" /><p className="text-(--lp-text)/80">{t}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-3xl border border-(--lp-text)/10 p-10 max-w-2xl mx-auto">
            <p className="text-(--lp-text)/75 text-lg leading-relaxed font-light whitespace-pre-line">{text || list.join("\n")}</p>
          </div>
        )}
      </FadeUp>
    </Shell>
  );
}

function Gallery({ s, ctx }: { s: Section; ctx: LPContext }) {
  const images: { url: string; caption?: string; credit?: string }[] = (s.props.images ?? []).filter((i: any) => i.url);
  if (!images.length) return null;
  return (
    <Shell section={s} ctx={ctx}>
      {(s.props.title || s.props.eyebrow) && <SectionTitle s={s} fallbackTitle="" />}
      <div className={s.variant === "mosaic" ? "columns-2 md:columns-3 gap-4 [&>*]:mb-4" : "grid grid-cols-2 md:grid-cols-3 gap-4"}>
        {images.map((img, i) => (
          <FadeUp key={i} delay={i * 0.05} className="break-inside-avoid">
            <figure>
              <img src={img.url} alt={img.caption || ""} loading="lazy"
                className={`w-full rounded-2xl border border-(--lp-text)/10 object-cover ${s.variant === "mosaic" ? "" : "aspect-square"}`} />
              {img.caption && <figcaption className="text-xs text-(--lp-text)/55 mt-2">{img.caption}</figcaption>}
              <Credit text={img.credit} />
            </figure>
          </FadeUp>
        ))}
      </div>
    </Shell>
  );
}

function ImageBlock({ s, ctx }: { s: Section; ctx: LPContext }) {
  if (!s.props.url) return null;
  if (s.variant === "full") {
    return (
      <figure className="w-full">
        <img src={s.props.url} alt={s.props.caption || ""} className="w-full max-h-[80vh] object-cover" />
        {(s.props.caption || s.props.credit) && (
          <div className="max-w-6xl mx-auto px-6 pt-2">
            {s.props.caption && <figcaption className="text-xs text-(--lp-text)/55">{s.props.caption}</figcaption>}
            <Credit text={s.props.credit} />
          </div>
        )}
      </figure>
    );
  }
  return (
    <Shell section={s} ctx={ctx} inner="max-w-5xl">
      <FadeUp>
        <figure>
          <img src={s.props.url} alt={s.props.caption || ""} className="w-full rounded-3xl border border-(--lp-text)/10 object-cover" />
          {s.props.caption && <figcaption className="text-sm text-(--lp-text)/55 mt-3 text-center">{s.props.caption}</figcaption>}
          <Credit text={s.props.credit} />
        </figure>
      </FadeUp>
    </Shell>
  );
}

function Testimonials({ s, ctx }: { s: Section; ctx: LPContext }) {
  if (!ctx.testimonials.length) return null;
  return (
    <Shell section={s} ctx={ctx}>
      <SectionTitle s={s} fallbackEyebrow="Resultados Reais" fallbackTitle="O Que Dizem os Alunos" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ctx.testimonials.map((t, i) => (
          <FadeUp key={i} delay={i * 0.08}>
            <div className="glass rounded-3xl border border-(--lp-text)/10 p-7 flex flex-col gap-4 h-full">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= t.stars ? "text-yellow-400 fill-yellow-400" : "text-(--lp-text)/20"}`} />
                ))}
              </div>
              <p className="text-(--lp-text)/75 text-sm leading-relaxed italic flex-1">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-2 border-t border-(--lp-text)/5">
                {t.photo_url
                  ? <img src={t.photo_url} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                  : <div className="w-9 h-9 rounded-full bg-(--lp-text)/10 flex items-center justify-center text-sm font-black">{t.name.charAt(0)}</div>}
                <div>
                  <p className="text-sm font-bold">{t.name}</p>
                  {t.role && <p className="text-xs text-(--lp-text)/40">{t.role}</p>}
                </div>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </Shell>
  );
}

function Bonus({ s, ctx }: { s: Section; ctx: LPContext }) {
  const items: { title?: string; text?: string; value?: string }[] = s.props.items ?? [];
  if (!items.length) return null;
  return (
    <Shell section={s} ctx={ctx}>
      <SectionTitle s={s} fallbackEyebrow="Incluso no curso" fallbackTitle="Bônus Exclusivos" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {items.map((b, i) => (
          <FadeUp key={i} delay={i * 0.06}>
            <div className="glass rounded-2xl border border-(--lp-accent)/25 p-6 h-full">
              <div className="flex items-center justify-between gap-3 mb-3">
                <Gift className="w-5 h-5 text-(--lp-accent)" />
                {b.value && <span className="text-[10px] font-bold uppercase tracking-widest text-(--lp-accent)">{b.value}</span>}
              </div>
              {b.title && <h3 className="font-bold text-lg mb-2">{b.title}</h3>}
              {b.text && <p className="text-sm text-(--lp-text)/65 leading-relaxed">{b.text}</p>}
            </div>
          </FadeUp>
        ))}
      </div>
    </Shell>
  );
}

function Guarantee({ s, ctx }: { s: Section; ctx: LPContext }) {
  const days = s.props.days;
  const title = s.props.title || (days ? `Garantia de ${days} dias` : "Garantia");
  if (!s.props.text && !days) return null;
  return (
    <Shell section={s} ctx={ctx} inner="max-w-3xl">
      <FadeUp>
        <div className="glass rounded-3xl border border-(--lp-text)/10 p-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="w-24 h-24 rounded-full bg-(--lp-accent)/15 border border-(--lp-accent)/30 flex flex-col items-center justify-center shrink-0">
            <ShieldCheck className="w-8 h-8 text-(--lp-accent)" />
            {days && <span className="text-xs font-black mt-1">{days} dias</span>}
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-3">{title}</h2>
            {s.props.text && <p className="text-(--lp-text)/65 leading-relaxed">{s.props.text}</p>}
          </div>
        </div>
      </FadeUp>
    </Shell>
  );
}

function Faq({ s, ctx }: { s: Section; ctx: LPContext }) {
  const items: { q?: string; a?: string }[] = (s.props.items ?? []).filter((i: any) => i.q && i.a);
  if (!items.length) return null;
  return (
    <Shell section={s} ctx={ctx} inner="max-w-3xl">
      <SectionTitle s={s} fallbackEyebrow="Dúvidas" fallbackTitle="Perguntas Frequentes" />
      <div className="space-y-3">
        {items.map((f, i) => (
          <details key={i} className="group glass rounded-2xl border border-(--lp-text)/10 px-6 py-5">
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold">
              {f.q}
              <Plus className="w-4 h-4 shrink-0 text-(--lp-accent) transition-transform group-open:rotate-45" />
            </summary>
            <p className="text-(--lp-text)/65 leading-relaxed mt-4 whitespace-pre-line">{f.a}</p>
          </details>
        ))}
      </div>
    </Shell>
  );
}

function TextBlock({ s, ctx }: { s: Section; ctx: LPContext }) {
  if (!s.props.text && !s.props.title) return null;
  const center = s.variant === "center";
  return (
    <Shell section={s} ctx={ctx} inner="max-w-3xl" className={center ? "text-center" : ""}>
      <FadeUp>
        <Eyebrow>{s.props.eyebrow}</Eyebrow>
        {s.props.title && <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6">{s.props.title}</h2>}
        {s.props.text && (
          <div className="space-y-4 text-(--lp-text)/70 text-lg leading-relaxed font-light">
            {String(s.props.text).split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
          </div>
        )}
      </FadeUp>
    </Shell>
  );
}

function CTA({ s, ctx }: { s: Section; ctx: LPContext }) {
  const p = s.props;
  const content = (
    <div className="relative">
      <Eyebrow>{p.eyebrow ?? "Comece Agora"}</Eyebrow>
      <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">{p.title || "Pronto Para Evoluir?"}</h2>
      {(p.text || ctx.course?.main_promise) && (
        <p className="text-(--lp-text)/60 text-lg mb-8 max-w-xl mx-auto leading-relaxed font-light">{p.text || ctx.course?.main_promise}</p>
      )}
      {ctx.priceBlock}
      <div className="flex justify-center"><CTAButton ctx={ctx} label={p.button_label} /></div>
    </div>
  );
  return (
    <Shell section={s} ctx={ctx} inner="max-w-4xl" className="text-center">
      <FadeUp>
        {s.variant === "plain" ? content : (
          <div className="glass rounded-3xl border border-(--lp-text)/15 p-8 md:p-14 relative overflow-hidden">
            <div className="absolute -top-28 -left-28 w-72 h-72 bg-(--lp-accent)/10 rounded-full blur-[90px]" />
            {content}
          </div>
        )}
      </FadeUp>
    </Shell>
  );
}

const RENDERERS: Record<string, (p: { s: Section; ctx: LPContext }) => React.ReactNode> = {
  hero: Hero, video: Video, about: About, modules: Modules, benefits: Benefits, audience: Audience,
  gallery: Gallery, image: ImageBlock, testimonials: Testimonials, bonus: Bonus, guarantee: Guarantee,
  faq: Faq, text: TextBlock, cta: CTA,
};

export function LPSection({ section, ctx }: { section: Section; ctx: LPContext }) {
  const R = RENDERERS[section.type];
  return R ? <div id={`sec-${section.id}`}><R s={section} ctx={ctx} /></div> : null;
}
