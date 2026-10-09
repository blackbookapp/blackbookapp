"use client";

import { useEffect, useState } from "react";
import { Loader2, Ticket, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Coupon {
  id: string;
  code: string;
  percent_off: number;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  active: boolean;
}

const input = "w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40";

export function CuponsTab({ slug }: { slug: string }) {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/creator/coupons").then((r) => r.json()).then((d) => setCoupons(d.coupons ?? [])).catch(() => setCoupons([]));
  }, []);

  const act = async (payload: any) => {
    setError("");
    const res = await fetch("/api/creator/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Erro.");
      return false;
    }
    setCoupons(d.coupons);
    return true;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await act({ action: "create", code, percent_off: Number(percent), max_uses: maxUses || null, expires_at: expires || null });
    setSaving(false);
    if (ok) { setCode(""); setMaxUses(""); setExpires(""); }
  };

  const copyLink = (c: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/c/${slug}?cupom=${c}`);
    setCopied(c);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-black">Cupons de desconto</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Crie códigos para promoções, parceiros ou influenciadores. O link com cupom já abre a página com o desconto aplicado.
        </p>
      </div>

      <form onSubmit={create} className="glass rounded-2xl border border-white/10 p-5 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <label className="col-span-2 md:col-span-2 text-xs text-muted-foreground space-y-1.5">
          Código
          <input className={input} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="BLACKFRIDAY" />
        </label>
        <label className="text-xs text-muted-foreground space-y-1.5">
          % OFF
          <input className={input} type="number" min={1} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground space-y-1.5">
          Limite de usos
          <input className={input} type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="∞" />
        </label>
        <label className="text-xs text-muted-foreground space-y-1.5">
          Válido até
          <input className={input} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </label>
        <div className="col-span-2 md:col-span-5 flex items-center justify-between gap-4">
          {error ? <p className="text-sm text-red-400">{error}</p> : <span />}
          <Button type="submit" disabled={saving || !code} className="metallic-gradient text-black font-bold text-xs rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar cupom"}
          </Button>
        </div>
      </form>

      {!coupons ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum cupom criado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => {
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            const exhausted = c.max_uses !== null && c.uses >= c.max_uses;
            return (
              <div key={c.id} className="glass rounded-xl border border-white/10 px-4 py-3 flex items-center gap-4 flex-wrap">
                <span className="font-mono font-bold">{c.code}</span>
                <span className="text-sm text-primary font-bold">{c.percent_off}% OFF</span>
                <span className="text-xs text-muted-foreground">
                  {c.uses}{c.max_uses ? `/${c.max_uses}` : ""} usos
                  {c.expires_at && ` · até ${new Date(c.expires_at).toLocaleDateString("pt-BR")}`}
                </span>
                {(expired || exhausted) && <span className="text-[10px] text-yellow-400 font-bold uppercase">{expired ? "Expirado" : "Esgotado"}</span>}
                <div className="ml-auto flex items-center gap-3">
                  <button onClick={() => copyLink(c.code)} className="text-xs text-white/60 hover:text-white flex items-center gap-1">
                    {copied === c.code ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />} Link
                  </button>
                  <label className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
                    <input type="checkbox" checked={c.active} onChange={(e) => act({ action: "toggle", id: c.id, active: e.target.checked })} />
                    Ativo
                  </label>
                  <button onClick={() => { if (confirm(`Excluir o cupom ${c.code}?`)) act({ action: "delete", id: c.id }); }}
                    className="text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
