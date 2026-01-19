import { NextRequest } from "next/server";
import { createAgentUIStreamResponse } from "ai";

import { solutionAgent } from "@/ai/agents/solution-agent";
import { createClient } from "@/lib/supabase/server";
import {
  SolutionEditorDraftSchema,
  type SolutionEditorDraftValues,
} from "@/lib/validation/solution-editor";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, solutionId, editorState, availableCases } = body as {
    messages: any;
    solutionId: string;
    editorState?: SolutionEditorDraftValues;
    availableCases?: Array<{ id: string; title: string }>;
  };

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  const parsedEditorState = editorState
    ? SolutionEditorDraftSchema.parse(editorState)
    : undefined;

  return createAgentUIStreamResponse({
    agent: solutionAgent,
    messages,
    options: {
      solutionId,
      userId: user.id,
      editorState: parsedEditorState,
      availableCases,
    },
  });
}
