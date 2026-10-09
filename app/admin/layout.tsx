import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { checkIsAdmin } from "@/lib/auth-server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await checkIsAdmin())) redirect("/");

  return (
    <div className="min-h-screen bg-[#080808] text-foreground">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 bg-[#080808]/90 backdrop-blur">
        <Link href="/admin" className="font-black text-sm tracking-tighter uppercase">Blackbook · Admin</Link>
        <UserButton />
      </header>
      <main className="p-6 lg:p-10 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
