import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { checkIsAdmin } from "@/lib/auth-server";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await checkIsAdmin())) redirect("/");

  return (
    <div className="min-h-screen bg-[#080808] text-foreground">
      <header className="border-b border-white/5 sticky top-0 z-30 bg-[#080808]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 lg:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/admin" className="font-black text-sm tracking-tighter uppercase whitespace-nowrap">Blackbook · Admin</Link>
            <div className="hidden md:block"><AdminNav /></div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/painel" className="text-xs text-muted-foreground hover:text-white whitespace-nowrap">Meu painel</Link>
            <UserButton />
          </div>
        </div>
        <div className="md:hidden px-4 pb-2"><AdminNav /></div>
      </header>
      <main className="p-4 lg:p-10 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
