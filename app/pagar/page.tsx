"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle, Loader2, ArrowRight, Shield, Crown, Rocket } from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const COMMON = [
  "Landing page profissional no ar em minutos",
  "Web designer com IA para editar a página",
  "Área do aluno com aulas em vídeo protegidas",
  "Cupons, relatórios de vendas e alunos",
  "Recebimento direto na sua conta Stripe",
];

function PagarContent() {
  const params = useSearchParams();
  const slug = params.get("slug") || "";
  const [loading, setLoading] = useState<"free" | "pro" | null>(null);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    fetch("/api/creator?me=1")
      .then((r) => r.json())
      .then((d) => { setIsAdmin(!!d.isAdmin); setIsPro(!!d.profile?.platform_paid); })
      .catch(() => {});
  }, []);

  const go = async (plan: "free" | "pro") => {
    setLoading(plan);
    setError("");
    try {
      const res = await fetch(plan === "free" ? "/api/creator/publish" : "/api/stripe/platform-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível continuar.");
      window.location.href = json.url;
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  };

  const cards = [
    {
      key: "free" as const,
      icon: Rocket,
      title: "Grátis",
      price: "R$ 0",
      note: `${PLANS.free.feePercent}% de comissão por venda`,
      extra: "Comece sem pagar nada. Você só paga quando vender.",
      cta: "Publicar grátis",
    },
    {
      key: "pro" as const,
      icon: Crown,
      title: "Pro",
      price: "R$ 997",
      note: "pagamento único · 0% de comissão",
      extra: "Fique com 100% das vendas (menos a taxa do Stripe).",
      cta: isAdmin ? "Ativar Pro grátis (admin)" : isPro ? "Publicar (já é Pro)" : "Ativar Pro",
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-foreground flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl">
        <Link href="/" className="flex items-center gap-2.5 mb-10 justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
          <span className="font-black text-sm tracking-tighter uppercase">Blackbook</span>
        </Link>

        <div className="text-center space-y-2 mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Escolha seu plano</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter">Publique sua página</h1>
          <p className="text-sm text-muted-foreground">
            Sua página <span className="text-foreground font-semibold">/c/{slug || "sua-pagina"}</span> vai ao ar na hora.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map(({ key, icon: Icon, title, price, note, extra, cta, highlight }) => (
            <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={cn("glass rounded-3xl border p-7 flex flex-col", highlight ? "border-primary/40 bg-primary/5" : "border-white/10")}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-primary" />
                <h2 className="font-black text-lg">{title}</h2>
              </div>
              <p className="text-4xl font-black">{price}</p>
              <p className="text-sm text-primary mt-1">{note}</p>
              <p className="text-sm text-muted-foreground mt-3">{extra}</p>
              <ul className="space-y-2.5 my-6 flex-1">
                {COMMON.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => go(key)}
                disabled={loading !== null}
                className={cn(
                  "w-full h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60",
                  highlight ? "metallic-gradient text-black" : "border border-white/20 hover:bg-white/5"
                )}
              >
                {loading === key ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{cta} <ArrowRight className="w-4 h-4" /></>}
              </button>
            </motion.div>
          ))}
        </div>

        {error && (
          <div className="mt-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400 text-center">{error}</div>
        )}

        <div className="mt-8 space-y-2 text-center text-xs text-muted-foreground/70">
          <p className="flex items-center justify-center gap-2"><Shield className="w-3.5 h-3.5" /> Pagamento seguro via Stripe</p>
          <p>Nos dois planos, a taxa de processamento do Stripe é descontada de cada venda na sua conta Stripe.</p>
          <p>Você pode começar no Grátis e passar para o Pro quando quiser, pelo painel.</p>
        </div>
      </div>
    </div>
  );
}

export default function PagarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <PagarContent />
    </Suspense>
  );
}
