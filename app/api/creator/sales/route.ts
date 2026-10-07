import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([], { status: 401 });

  const { data: profile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!profile) return NextResponse.json([]);

  const { data } = await supabase
    .from("creator_sales")
    .select("*")
    .eq("creator_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json(data ?? []);
}
