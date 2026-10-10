"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/criadores", label: "Criadores" },
  { href: "/admin/vendas", label: "Vendas" },
  { href: "/admin/alunos", label: "Alunos" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href}
            className={cn("px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors",
              active ? "bg-white/10 text-white font-semibold" : "text-muted-foreground hover:text-white")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
