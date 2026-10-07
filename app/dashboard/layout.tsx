"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, Compass, Download, Radio, Users, User } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Meu Aprendizado", path: "/dashboard", icon: <BookOpen className="w-5 h-5" /> },
    { name: "Meus Cursos", path: "/dashboard/courses", icon: <Compass className="w-5 h-5" /> },
    { name: "Ao Vivo", path: "/dashboard/lives", icon: <Radio className="w-5 h-5" /> },
    { name: "Comunidade", path: "/dashboard/community", icon: <Users className="w-5 h-5" /> },
    { name: "Biblioteca", path: "/dashboard/library", icon: <Download className="w-5 h-5" /> },
    { name: "Meu Perfil", path: "/dashboard/profile", icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex bg-[#080808]">
      {/* Sidebar */}
      <aside className="w-60 fixed left-0 top-0 bottom-0 bg-black/80 backdrop-blur-xl border-r border-white/5 hidden lg:flex flex-col z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            <span className="font-black text-sm tracking-tighter uppercase">Blackbook</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">Área do Aluno</p>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                pathname === item.path
                  ? "text-white bg-white/8"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <div className={cn(
                "transition-colors",
                pathname === item.path ? "text-primary" : "group-hover:text-primary"
              )}>
                {item.icon}
              </div>
              {item.name}
              {pathname === item.path && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"
                />
              )}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <UserButton />
          <div>
            <p className="text-xs font-semibold">Minha Conta</p>
            <Link href="/dashboard/profile" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
              Ver perfil
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 w-full relative text-foreground">
        {children}
      </main>
    </div>
  );
}
