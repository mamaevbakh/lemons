import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeRedirectTarget(value: string | null): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  return value;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectTarget(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(next)}`, url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("auth/callback: exchangeCodeForSession failed", error);
    return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(next)}`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
