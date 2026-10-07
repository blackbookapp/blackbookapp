"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle, Loader2, Star, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const BENEFICIOS = [
  "Sua landing page profissional no ar em minutos",
  "Editor com IA para editar textos em tempo real",
  "Upload de vídeos e fotos ilimitado",
  "Integração com Stripe para receber pagamentos",
  "Dashboard completo com relatório de vendas",
  "Suporte via WhatsApp",
];

function PagarContent() {
  const params = useSearchParams();
  const slug = params.get("slug") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/platform-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao iniciar pagamento");
      window.location.href = json.url;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <Link href="/vendas" className="flex items-center gap-2.5 mb-12 justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
          <span className="font-black text-sm tracking-tighter uppercase">Blackbook</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl border border-white/10 p-8 space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Ativação da Plataforma</p>
            <h1 className="text-3xl font-black tracking-tighter">Um pagamento. Para sempre.</h1>
            <p className="text-sm text-muted-foreground">
              Sua LP em <span className="text-foreground font-semibold">/c/{slug || "sua-pagina"}</span> ficará ativa assim que o pagamento for confirmado.
            </p>
          </div>

          {/* Price */}
          <div className="text-center py-4 border-y border-white/10">
            <p className="text-5xl font-black">R$ 997</p>
            <p className="text-sm text-muted-foreground mt-1">pagamento único — sem mensalidade</p>
            <p className="text-xs text-primary mt-1">+ 1% de comissão sobre cada venda do seu curso</p>
          </div>

          {/* Benefits */}
          <ul className="space-y-3">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
            <Shield className="w-3.5 h-3.5" />
            <span>Pagamento seguro via Stripe</span>
            <span>·</span>
            <span>Garantia de 7 dias</span>
          </div>

          {/* CTA */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full metallic-gradient text-black font-black text-base py-6 rounded-2xl gap-3"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Redirecionando...</>
            ) : (
              <>Ativar minha página agora <ArrowRight className="w-5 h-5" /></>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground/50">
            Após o pagamento você será redirecionado para o painel de controle.
          </p>
        </motion.div>

        {/* Social proof */}
        <div className="mt-8 flex items-center justify-center gap-1 text-sm text-muted-foreground">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          ))}
          <span className="ml-2">+3.000 tatuadores já vendem pelo Blackbook</span>
        </div>
      </div>
    </div>
  );
}

export default function PagarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PagarContent />
    </Suspense>
  );
}
