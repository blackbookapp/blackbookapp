"use client";
import { LoginModal } from "@/components/LoginModal";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, Suspense } from "react";

function safeRedirect(url: string | null) {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/painel";
}

function EntrarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const redirect = safeRedirect(searchParams.get("redirect_url"));
  const initialView = searchParams.get("modo") === "cadastro" ? "register" : "login";

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace(redirect);
  }, [isLoaded, isSignedIn, redirect, router]);

  return (
    <div className="min-h-screen bg-[#080808]">
      <LoginModal
        isOpen={true}
        onClose={() => router.push("/")}
        onSuccess={() => { window.location.href = redirect; }}
        initialView={initialView}
      />
    </div>
  );
}

export default function EntrarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808]" />}>
      <EntrarContent />
    </Suspense>
  );
}
