"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient(){
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    browserClient = createBrowserClient<Database>(url, anonKey);
  }

  return browserClient;
}