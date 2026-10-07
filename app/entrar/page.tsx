"use client";
import { LoginModal } from "@/components/LoginModal";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, Suspense } from "react";

function EntrarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const redirect = searchParams.get("redirect_url") || "/painel";
      router.replace(redirect);
    }
  }, [isLoaded, isSignedIn]);

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#080808]">
      <LoginModal
        isOpen={true}
        onClose={handleClose}
        initialView="login"
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
