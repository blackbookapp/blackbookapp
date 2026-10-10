"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Shield, Instagram, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeTheme, HEADING_FONTS, type LPTheme } from "@/lib/theme";
import { defaultPage, sanitizePage, type PageDoc } from "@/lib/page-schema";
import { LPSection, rgba, type LPContext } from "./LPSections";

interface CreatorProfile {
  name: string;
  bio: string;
  photo_url: string;
  specialty: string;
  instagram: string;
  slug: string;
  theme_color?: string;
  theme?: Partial<LPTheme> | null;
}

interface CreatorCourse {
  title: string;
  subtitle: string;
  main_promise: string;
  description: string;
  target_audience: string;
  price: number;
  price_installments: number;
  price_installment_value: number;
  video_id: string;
  page?: unknown;
  creator_modules: { title: string; order_index: number }[];
  creator_testimonials: { name: string; role: string; text: string; stars: number; photo_url?: string }[];
}

function priceToNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  let s = String(value).replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export default function CreatorLP({ profile, course, isPreview }: { profile: CreatorProfile; course: CreatorCourse | null; isPreview?: boolean }) {
  const { scrollY } = useScroll();
  const [theme, setTheme] = useState<LPTheme>(() => normalizeTheme(profile.theme, profile.theme_color));
  const navBg = useTransform(scrollY, [0, 80], [rgba(theme.background, 0), rgba(theme.background, 0.92)]);
  const page: PageDoc = useMemo(() => sanitizePage(course?.page) ?? defaultPage(course), [course]);

  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "bb-theme") return;
      setTheme(normalizeTheme(e.data.theme));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isPreview]);

  const font = HEADING_FONTS[theme.headingFont || "inter"] ?? HEADING_FONTS.inter;
  const btnBg = theme.button === "metallic" ? "linear-gradient(135deg, #E5E5E5 0%, #A3A3A3 50%, #525252 100%)" : theme.button;
  const themeCss = `
    .lp-root { --lp-bg: ${theme.background}; --lp-text: ${theme.text}; --lp-accent: ${theme.accent};
      --color-primary: ${theme.accent}; --color-ring: ${theme.accent};
      background: var(--lp-bg); color: var(--lp-text); }
    .lp-root .glass { background: color-mix(in srgb, var(--lp-text) 4%, transparent);
      border-color: color-mix(in srgb, var(--lp-text) 10%, transparent); }
    .lp-root .lp-btn { background: ${btnBg}; color: ${theme.buttonText}; }
    .lp-root h1, .lp-root h2, .lp-root h3 { font-family: ${font.family};
      ${font.uppercase ? "" : "text-transform: none !important;"}
      ${font.tracking ? `letter-spacing: ${font.tracking} !important;` : ""} }
    body { background: ${theme.background}; }`;

  const modules = [...(course?.creator_modules ?? [])].sort((a, b) => a.order_index - b.order_index);
  const testimonials = course?.creator_testimonials ?? [];

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; percent_off: number; final_cents: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");

  const applyCoupon = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    setCouponMsg("");
    try {
      const res = await fetch(`/api/stripe/checkout?slug=${encodeURIComponent(profile.slug)}&coupon=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.valid) {
        setCoupon(data);
        setCouponOpen(false);
      } else {
        setCoupon(null);
        setCouponMsg("Cupom inválido ou expirado.");
      }
    } catch {
      setCouponMsg("Não foi possível validar o cupom.");
    }
  };

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("cupom");
    if (fromUrl) applyCoupon(fromUrl);
    if (isPreview) return;
    try {
      const key = `bb_view_${profile.slug}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: profile.slug }),
      keepalive: true,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCTA = async () => {
    setCheckoutError("");
    if (isPreview) {
      setCheckoutError("Isto é uma prévia — o checkout fica ativo depois que a página for publicada.");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: profile.slug, coupon: coupon?.code }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data.error || "Não foi possível abrir o pagamento. Tente novamente.");
    } catch {
      setCheckoutError("Erro de conexão. Tente novamente.");
    }
    setCheckoutLoading(false);
  };

  const basePrice = priceToNumber(course?.price);
  const finalPrice = coupon ? coupon.final_cents / 100 : basePrice;
  const installments = Number(course?.price_installments) || 0;

  const heroPrice = basePrice > 0 ? (
    <div className="text-center">
      <p className="text-2xl font-black">
        {coupon && <span className="text-base text-(--lp-text)/40 line-through mr-2">R$ {brl(basePrice)}</span>}
        R$ {brl(finalPrice)}
      </p>
      {!coupon && installments > 1 && (
        <p className="text-xs text-(--lp-text)/50">
          ou {installments}x de R$ {Number(course?.price_installment_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      )}
    </div>
  ) : null;

  const priceBlock = (
    <div className="flex flex-col items-center gap-4 mb-6">
      {basePrice > 0 && (
        <div className="inline-block glass rounded-2xl border border-(--lp-text)/15 px-10 py-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-(--lp-accent)/70 mb-1">Acesso completo</p>
          {coupon && <p className="text-lg text-(--lp-text)/40 line-through">R$ {brl(basePrice)}</p>}
          <p className="text-5xl font-black">R$ {brl(finalPrice)}</p>
          {coupon && (
            <p className="text-xs font-bold text-green-500 mt-1">Cupom {coupon.code} aplicado · {coupon.percent_off}% OFF</p>
          )}
          {!coupon && installments > 1 && (
            <p className="text-sm text-(--lp-text)/40 mt-1">
              ou {installments}x de R$ {Number(course?.price_installment_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      )}
      {!coupon && (couponOpen ? (
        <form onSubmit={(e) => { e.preventDefault(); applyCoupon(couponInput); }} className="flex gap-2">
          <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="CÓDIGO"
            className="bg-(--lp-text)/5 border border-(--lp-text)/15 rounded-xl px-4 py-2 text-sm uppercase tracking-widest w-40 focus:outline-none" />
          <button type="submit" className="px-4 py-2 rounded-xl border border-(--lp-text)/20 text-xs font-bold uppercase tracking-widest">Aplicar</button>
        </form>
      ) : (
        <button onClick={() => setCouponOpen(true)} className="text-xs text-(--lp-text)/40 hover:text-(--lp-text)/70 underline">Tenho um cupom</button>
      ))}
      {couponMsg && <p className="text-xs text-red-500">{couponMsg}</p>}
      <p className="text-xs text-(--lp-text)/35 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5" /> Pagamento seguro · Acesso imediato após confirmação
      </p>
    </div>
  );

  const ctx: LPContext = {
    profile,
    course,
    modules,
    testimonials,
    theme,
    onCTA: handleCTA,
    ctaLoading: checkoutLoading,
    heroPrice,
    priceBlock,
  };

  return (
    <div className="lp-root min-h-screen overflow-x-hidden">
      <style>{themeCss}</style>
      {font.google && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${font.google}&display=swap`} precedence="default" />
      )}

      <motion.nav style={{ backgroundColor: navBg }}
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 lg:px-12 backdrop-blur-md border-b border-(--lp-text)/5">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-(--lp-accent)">
            <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
          </svg>
          <span className="font-black text-sm tracking-tighter uppercase text-(--lp-text)/80">{profile.name}</span>
        </div>
        <Button onClick={handleCTA} disabled={checkoutLoading}
          className="lp-btn font-bold text-[10px] tracking-widest uppercase px-5 h-9 rounded-full">
          {checkoutLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><span>Garantir Vaga</span><ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
        </Button>
      </motion.nav>

      {page.sections.map((s) => <LPSection key={s.id} section={s} ctx={ctx} />)}

      <footer className="py-10 border-t border-(--lp-text)/5 text-center">
        <p className="font-black text-xs tracking-tighter uppercase text-(--lp-text)/50 mb-2">{profile.name}</p>
        <p className="text-xs text-(--lp-text)/25">Criado com Blackbook · © {new Date().getFullYear()}</p>
        {profile.instagram && (
          <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-(--lp-text)/30 hover:text-(--lp-text)/50 mt-2">
            <Instagram className="w-3.5 h-3.5" />{profile.instagram}
          </a>
        )}
      </footer>

      {checkoutError && (
        <div role="alert" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)] bg-red-600 text-white text-sm rounded-xl px-4 py-3 shadow-2xl flex items-start gap-3">
          <p className="flex-1">{checkoutError}</p>
          <button onClick={() => setCheckoutError("")} aria-label="Fechar"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
