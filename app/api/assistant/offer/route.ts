import { NextRequest } from "next/server";
import { createAgentUIStreamResponse } from "ai";

import { offerAgent } from "@/ai/agents/offer-agent";
import { createClient } from "@/lib/supabase/server";
import {
  OfferWithPackagesDraftSchema,
  type OfferWithPackagesDraftValues,
} from "@/lib/validation/offer-with-packages";



export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, offerId, editorState } = body as {
    messages: any;
    offerId: string;
    editorState?: OfferWithPackagesDraftValues;
  };

  // Get current user from Supabase (edge/server helper, like you do elsewhere)
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Not authenticated" }),
      { status: 401 },
    );
  }

  const parsedEditorState = editorState
    ? OfferWithPackagesDraftSchema.parse(editorState)
    : undefined;

  // Pass messages + call options to the agent
  return createAgentUIStreamResponse({
    agent: offerAgent,
    messages,
    options: {
      offerId,
      userId: user.id,
      editorState: parsedEditorState,
    },
  });
}
