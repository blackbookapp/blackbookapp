"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, User } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const menuItems = [
  { name: "Meus Cursos", path: "/dashboard", icon: BookOpen },
  { name: "Meu Perfil", path: "/dashboard/profile", icon: User },
];

function isActive(pathname: string, path: string) {
  if (path === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/courses");
  return pathname.startsWith(path);
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
      <span className="font-black text-sm tracking-tighter uppercase">Blackbook</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-[#080808] text-foreground">
      <aside className="w-60 fixed left-0 top-0 bottom-0 bg-black/80 backdrop-blur-xl border-r border-white/5 hidden lg:flex flex-col z-40">
        <div className="px-5 py-5 border-b border-white/5">
          <Logo />
        </div>
        <nav className="flex-1 py-6 px-4 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">Área do Aluno</p>
          {menuItems.map(({ name, path, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive(pathname, path) ? "text-white bg-white/8" : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive(pathname, path) && "text-primary")} />
              {name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <UserButton />
          <p className="text-xs font-semibold">Minha Conta</p>
        </div>
      </aside>

      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 bg-black/90 backdrop-blur border-b border-white/5 flex items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-4">
          {menuItems.map(({ name, path, icon: Icon }) => (
            <Link key={path} href={path} aria-label={name}
              className={cn("p-1", isActive(pathname, path) ? "text-primary" : "text-muted-foreground")}>
              <Icon className="w-5 h-5" />
            </Link>
          ))}
          <UserButton />
        </div>
      </header>

      <main className="flex-1 lg:ml-60 w-full pt-14 lg:pt-0 min-w-0">{children}</main>
    </div>
  );
}
