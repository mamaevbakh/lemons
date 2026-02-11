import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

function safeRedirectTarget(value: string | null, origin: string): string {
  if (!value) return "/dashboard";
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const parsed = new URL(value);
    if (parsed.origin !== origin) return "/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  const next = safeRedirectTarget(url.searchParams.get("next"), url.origin);
  const authRedirect = new URL(`/auth?next=${encodeURIComponent(next)}`, url.origin);

  const supabase = await createClient();
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error) {
      console.error("auth/callback: verifyOtp(token_hash) failed", error);
      return NextResponse.redirect(authRedirect);
    }

    return NextResponse.redirect(new URL(next, url.origin));
  }

  if (!code) return NextResponse.redirect(authRedirect);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth/callback: exchangeCodeForSession failed", error);
    return NextResponse.redirect(authRedirect);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
