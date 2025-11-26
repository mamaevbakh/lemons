// lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export function createSupabaseServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}
