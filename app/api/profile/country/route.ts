import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_COUNTRIES = new Set([
  "AU",
  "AT",
  "BE",
  "BG",
  "CA",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GI",
  "GR",
  "HK",
  "HU",
  "IE",
  "IT",
  "JP",
  "LV",
  "LI",
  "LT",
  "LU",
  "MT",
  "MX",
  "NL",
  "NZ",
  "NO",
  "PL",
  "PT",
  "RO",
  "SG",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "TH",
  "AE",
  "GB",
  "US",
]);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as
      | { country?: string | null }
      | null;

    const raw = body?.country ?? null;
    const country = raw ? raw.toUpperCase() : null;

    if (!country || !ALLOWED_COUNTRIES.has(country)) {
      return NextResponse.json(
        { error: "Invalid country" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        country,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id);

    if (error) {
      console.error("Profile country update failed", error);
      return NextResponse.json(
        { error: "Unable to update country" },
        { status: 500 },
      );
    }

    return NextResponse.json({ country });
  } catch (err) {
    console.error("Profile country route error", err);
    return NextResponse.json(
      { error: "Unable to update country" },
      { status: 500 },
    );
  }
}
