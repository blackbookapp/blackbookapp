import { redirect } from "next/navigation";

export default async function SignInRedirect({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  const { redirect_url } = await searchParams;
  redirect(redirect_url ? `/entrar?redirect_url=${encodeURIComponent(redirect_url)}` : "/entrar");
}
