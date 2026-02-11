import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function getUserDisplayName(user: User): string | null {
  const metadata = user.user_metadata;
  const fullName = metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  const name = metadata?.name;
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim();
  }

  return null;
}

export async function ensureProfileExists(
  supabase: SupabaseServerClient,
  user: User,
): Promise<void> {
  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) {
    console.error("profiles lookup failed", lookupError);
    throw new Error("Failed to initialize user profile");
  }

  if (existingProfile) return;

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: getUserDisplayName(user),
    subscription_tier: "free",
  });

  if (insertError) {
    // Handle race where another request created the profile first.
    if (insertError.code === "23505") return;

    console.error("profiles insert failed", insertError);
    throw new Error("Failed to initialize user profile");
  }
}
