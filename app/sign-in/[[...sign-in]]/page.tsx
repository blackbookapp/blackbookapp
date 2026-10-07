"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export default function SignInRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/entrar"); }, []);
  return null;
}
