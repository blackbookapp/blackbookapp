"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { CheckCircle, ArrowRight, Star, ChevronDown, Shield, Instagram, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeTheme, type LPTheme } from "@/lib/theme";

function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Animation helper ─────────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

// ─── Star rating display ──────────────────────────────────────────────────────
function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= count ? "text-yellow-400 fill-yellow-400" : "text-(--lp-text)/20"}`} />
      ))}
    </div>
  );
}

// ─── Main LP ──────────────────────────────────────────────────────────────────
export default function CreatorLP({ profile, course, isPreview }: { profile: CreatorProfile; course: CreatorCourse | null; isPreview?: boolean }) {
  const { scrollY } = useScroll();
  const [theme, setTheme] = useState<LPTheme>(() => normalizeTheme(profile.theme, profile.theme_color));
  const navBg = useTransform(scrollY, [0, 80], [rgba(theme.background, 0), rgba(theme.background, 0.92)]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "bb-theme") return;
      setTheme(normalizeTheme(e.data.theme));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isPreview]);

  const btnBg = theme.button === "metallic"
    ? "linear-gradient(135deg, #E5E5E5 0%, #A3A3A3 50%, #525252 100%)"
    : theme.button;
  const themeCss = `
    .lp-root { --lp-bg: ${theme.background}; --lp-text: ${theme.text}; --lp-accent: ${theme.accent};
      --color-primary: ${theme.accent}; --color-ring: ${theme.accent};
      background: var(--lp-bg); color: var(--lp-text); }
    .lp-root .glass { background: color-mix(in srgb, var(--lp-text) 4%, transparent);
      border-color: color-mix(in srgb, var(--lp-text) 10%, transparent); }
    .lp-root .lp-btn { background: ${btnBg}; color: ${theme.buttonText}; }
    body { background: ${theme.background}; }`;

  const modules = course?.creator_modules?.sort((a, b) => a.order_index - b.order_index) || [];
  const testimonials = course?.creator_testimonials || [];

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

  return (
    <div className="lp-root min-h-screen overflow-x-hidden">
      <style>{themeCss}</style>

      {/* ─── NAVBAR ─── */}
      <motion.nav style={{ backgroundColor: navBg }}
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 lg:px-12 backdrop-blur-md border-b border-(--lp-text)/5">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-(--lp-accent)">
            <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
          </svg>
          <span className="font-black text-sm tracking-tighter uppercase text-(--lp-text)/80">
            {profile.name}
          </span>
        </div>
        <Button onClick={handleCTA} disabled={checkoutLoading}
          className="lp-btn font-bold text-[10px] tracking-widest uppercase px-5 h-9 rounded-full">
          {checkoutLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><span>Garantir Vaga</span><ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
        </Button>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-16">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-(--lp-accent)/8 rounded-full blur-[120px]" />
          <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-(--lp-text)/5 rounded-full blur-[120px]" />
        </div>

        {/* Fine grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(${rgba(theme.text, 0.5)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(theme.text, 0.5)} 1px, transparent 1px)`,
            backgroundSize: "60px 60px"
          }} />

        {/* Specialty badge */}
        {profile.specialty && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[11px] font-bold tracking-[0.3em] uppercase text-(--lp-accent) mb-6 flex items-center gap-3">
            <span className="w-12 h-px bg-(--lp-accent)/30" />
            {profile.specialty}
            <span className="w-12 h-px bg-(--lp-accent)/30" />
          </motion.div>
        )}

        {/* Main headline */}
        <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-7xl lg:text-[88px] font-black uppercase tracking-tighter leading-none mb-6 max-w-5xl">
          {course?.title || profile.name}
        </motion.h1>

        {/* Subtitle or main promise */}
        {(course?.subtitle || course?.main_promise) && (
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="text-lg md:text-xl text-(--lp-text)/55 max-w-2xl mb-6 leading-relaxed font-light">
            {course.subtitle || course.main_promise}
          </motion.p>
        )}

        {/* Big promise callout */}
        {course?.main_promise && course?.subtitle && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="glass rounded-2xl border border-(--lp-text)/10 px-8 py-5 max-w-xl mb-10">
            <p className="text-(--lp-text)/90 text-base font-light italic leading-relaxed">
              "{course.main_promise}"
            </p>
            <p className="text-(--lp-accent) text-xs font-bold uppercase tracking-widest mt-3">
              — {profile.name}
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 items-center">
          <Button onClick={handleCTA} disabled={checkoutLoading}
            className="lp-btn font-bold h-14 px-10 rounded-2xl text-[12px] tracking-widest uppercase hover:scale-[1.03] transition-transform shadow-2xl">
            {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Garantir Minha Vaga <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
          {course?.price && (
            <div className="text-center">
              <p className="text-2xl font-black">
                {coupon && <span className="text-base text-(--lp-text)/40 line-through mr-2">R$ {brl(basePrice)}</span>}
                R$ {brl(finalPrice)}
              </p>
              {!coupon && course.price_installments > 1 && (
                <p className="text-xs text-(--lp-text)/50">
                  ou {course.price_installments}x de R$ {Number(course.price_installment_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Scroll cue */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 text-(--lp-text)/20">
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </section>

      {/* ─── VIDEO ─── */}
      {course?.video_id && (
        <section className="py-20 px-6 lg:px-12 max-w-4xl mx-auto">
          <FadeUp>
            <div className="relative">
              <div className="absolute -inset-4 bg-(--lp-accent)/8 rounded-3xl blur-2xl" />
              <div className="relative glass rounded-3xl border border-(--lp-text)/10 overflow-hidden shadow-2xl aspect-video">
                <iframe
                  src={`https://iframe.cloudflarestream.com/${course.video_id}?controls=true&preload=true`}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  style={{ border: "none" }}
                />
              </div>
            </div>
          </FadeUp>
        </section>
      )}

      {/* ─── SOBRE O CRIADOR ─── */}
      <section className="py-24 px-6 lg:px-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <FadeUp>
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-(--lp-accent) block mb-4">
              Seu Professor
            </span>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">
              {profile.name}
            </h2>
            {profile.specialty && (
              <p className="text-[11px] font-bold tracking-widest uppercase text-(--lp-text)/40 mb-4">
                Especialista em {profile.specialty}
              </p>
            )}
            <p className="text-(--lp-text)/65 text-lg leading-relaxed mb-6 font-light">
              {profile.bio}
            </p>
            {profile.instagram && (
              <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-(--lp-accent) hover:text-(--lp-text) transition-colors border border-(--lp-text)/10 rounded-full px-4 py-2 hover:bg-(--lp-text)/5">
                <Instagram className="w-4 h-4" />
                {profile.instagram}
              </a>
            )}
          </FadeUp>

          <FadeUp delay={0.2}>
            {profile.photo_url ? (
              <div className="relative">
                <div className="absolute -inset-4 bg-(--lp-accent)/10 rounded-3xl blur-2xl" />
                <div className="relative rounded-3xl overflow-hidden border border-(--lp-text)/10 aspect-[3/4] max-w-sm mx-auto">
                  <img src={profile.photo_url} alt={profile.name}
                    className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              </div>
            ) : (
              <div className="relative rounded-3xl border border-(--lp-text)/10 aspect-[3/4] max-w-sm mx-auto bg-(--lp-text)/5 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-(--lp-text)/10 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl font-black text-(--lp-text)/30">
                      {profile.name.charAt(0)}
                    </span>
                  </div>
                  <p className="text-(--lp-text)/30 text-sm">{profile.name}</p>
                </div>
              </div>
            )}
          </FadeUp>
        </div>
      </section>

      {/* ─── O QUE VOCÊ VAI APRENDER ─── */}
      {modules.length > 0 && (
        <section className="py-24 px-6 lg:px-12 bg-gradient-to-b from-transparent via-(--lp-text)/[0.02] to-transparent">
          <div className="max-w-6xl mx-auto">
            <FadeUp className="text-center mb-16">
              <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-(--lp-accent) block mb-4">
                Conteúdo do Curso
              </span>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                O Que Você Vai Aprender
              </h2>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map((m, i) => (
                <FadeUp key={i} delay={i * 0.06}>
                  <div className="flex items-start gap-4 glass rounded-2xl border border-(--lp-text)/8 p-5 hover:border-(--lp-text)/20 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-(--lp-accent)/15 border border-(--lp-accent)/20 flex items-center justify-center flex-shrink-0 group-hover:bg-(--lp-accent)/25 transition-colors">
                      <CheckCircle className="w-4 h-4 text-(--lp-accent)" />
                    </div>
                    <p className="text-sm text-(--lp-text)/80 leading-relaxed pt-1 font-light">{m.title}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── PARA QUEM É ─── */}
      {course?.target_audience && (
        <section className="py-24 px-6 lg:px-12 max-w-4xl mx-auto">
          <FadeUp className="text-center mb-10">
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-(--lp-accent) block mb-4">
              Este Curso é Para Você
            </span>
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">
              Para Quem É?
            </h2>
            <div className="glass rounded-3xl border border-(--lp-text)/10 p-10 text-left max-w-2xl mx-auto">
              <p className="text-(--lp-text)/70 text-lg leading-relaxed font-light">{course.target_audience}</p>
            </div>
          </FadeUp>
        </section>
      )}

      {/* ─── DEPOIMENTOS ─── */}
      {testimonials.length > 0 && (
        <section className="py-24 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <FadeUp className="text-center mb-16">
              <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-(--lp-accent) block mb-4">
                Resultados Reais
              </span>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                O Que Dizem os Alunos
              </h2>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {testimonials.map((t, i) => (
                <FadeUp key={i} delay={i * 0.08}>
                  <div className="glass rounded-3xl border border-(--lp-text)/10 p-7 flex flex-col gap-4 h-full hover:border-(--lp-text)/20 transition-colors">
                    <StarRating count={t.stars} />
                    <p className="text-(--lp-text)/75 text-sm leading-relaxed italic flex-1 font-light">
                      "{t.text}"
                    </p>
                    <div className="flex items-center gap-3 pt-2 border-t border-(--lp-text)/5">
                      {t.photo_url ? (
                        <img src={t.photo_url} alt={t.name}
                          className="w-9 h-9 rounded-full object-cover border border-(--lp-text)/10" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-(--lp-text)/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-black text-(--lp-text)/50">{t.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        {t.role && <p className="text-xs text-(--lp-text)/40">{t.role}</p>}
                      </div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA FINAL ─── */}
      <section className="py-24 px-6 lg:px-12 text-center max-w-4xl mx-auto">
        <FadeUp>
          <div className="glass rounded-3xl border border-(--lp-text)/15 p-14 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute -top-28 -left-28 w-72 h-72 bg-(--lp-accent)/10 rounded-full blur-[90px]" />
            <div className="absolute -bottom-28 -right-28 w-72 h-72 bg-(--lp-text)/5 rounded-full blur-[90px]" />

            <div className="relative">
              {/* Stars */}
              {testimonials.length > 0 && (
                <div className="flex justify-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              )}

              <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-(--lp-accent) block mb-4">
                Comece Agora
              </span>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                Pronto Para Evoluir?
              </h2>

              {course?.main_promise && (
                <p className="text-(--lp-text)/55 text-lg mb-8 max-w-xl mx-auto leading-relaxed font-light">
                  {course.main_promise}
                </p>
              )}

              {/* Price card */}
              {course?.price && (
                <div className="inline-block glass rounded-2xl border border-(--lp-text)/15 px-10 py-6 mb-8">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-(--lp-accent)/60 mb-1">
                    Acesso completo
                  </p>
                  {coupon && (
                    <p className="text-lg text-(--lp-text)/40 line-through">R$ {brl(basePrice)}</p>
                  )}
                  <p className="text-5xl font-black">
                    R$ {brl(finalPrice)}
                  </p>
                  {coupon && (
                    <p className="text-xs font-bold text-green-400 mt-1">
                      Cupom {coupon.code} aplicado · {coupon.percent_off}% OFF
                    </p>
                  )}
                  {!coupon && course.price_installments > 1 && (
                    <p className="text-sm text-(--lp-text)/40 mt-1">
                      ou {course.price_installments}x de R$ {Number(course.price_installment_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col items-center gap-4">
                <Button onClick={handleCTA} disabled={checkoutLoading}
                  className="lp-btn font-bold h-14 px-12 rounded-2xl text-[12px] tracking-widest uppercase hover:scale-[1.03] transition-transform shadow-2xl">
                  {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Garantir Minha Vaga <ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>
                {checkoutError && (
                  <p className="text-sm text-red-400 max-w-sm">{checkoutError}</p>
                )}
                {!coupon && (couponOpen ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); applyCoupon(couponInput); }}
                    className="flex gap-2"
                  >
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      className="bg-(--lp-text)/5 border border-(--lp-text)/15 rounded-xl px-4 py-2 text-sm uppercase tracking-widest w-40 focus:outline-none focus:border-(--lp-text)/30"
                    />
                    <button type="submit" className="px-4 py-2 rounded-xl border border-(--lp-text)/20 text-xs font-bold uppercase tracking-widest hover:bg-(--lp-text)/5">
                      Aplicar
                    </button>
                  </form>
                ) : (
                  <button onClick={() => setCouponOpen(true)} className="text-xs text-(--lp-text)/40 hover:text-(--lp-text)/70 underline">
                    Tenho um cupom
                  </button>
                ))}
                {couponMsg && <p className="text-xs text-red-400">{couponMsg}</p>}
                <p className="text-xs text-(--lp-text)/30 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  Pagamento seguro · Acesso imediato após confirmação
                </p>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10 border-t border-(--lp-text)/5 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-(--lp-accent)">
            <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
          </svg>
          <span className="font-black text-xs tracking-tighter uppercase text-(--lp-text)/50">
            {profile.name}
          </span>
        </div>
        <p className="text-xs text-(--lp-text)/25">
          Criado com Blackbook · © {new Date().getFullYear()}
        </p>
        {profile.instagram && (
          <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-(--lp-text)/30 hover:text-(--lp-text)/50 transition-colors mt-2">
            <Instagram className="w-3.5 h-3.5" />
            {profile.instagram}
          </a>
        )}
      </footer>
    </div>
  );
}
