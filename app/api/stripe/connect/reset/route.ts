import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Strict two-step onboarding:
    // Reset is the only way to change country after starting onboarding.
    // We intentionally do NOT clear `country` so the user can keep it or change it next.
    const { error } = await supabase
      .from("profiles")
      .update({
        stripe_account_id: null,
        stripe_onboarding_status: "not_connected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id);

    if (error) {
      console.error("Stripe connect reset: profile update failed", error);
      return NextResponse.json(
        { error: "Unable to reset onboarding" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Stripe connect reset error", err);
    return NextResponse.json(
      { error: "Unable to reset onboarding" },
      { status: 500 },
    );
  }
}
