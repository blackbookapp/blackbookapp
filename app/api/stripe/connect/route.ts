import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${appUrl}/api/stripe/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: redirectUri,
    state: userId,
    "stripe_user[business_type]": "individual",
    "stripe_user[country]": "BR",
    "stripe_user[currency]": "brl",
  });

  const url = `https://connect.stripe.com/oauth/authorize?${params}`;
  return NextResponse.redirect(url);
}
