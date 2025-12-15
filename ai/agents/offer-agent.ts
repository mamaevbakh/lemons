import { ToolLoopAgent, tool, InferAgentUIMessage } from "ai";
import { z } from "zod";

import { openai } from "@/lib/ai/openai";
import {
  OfferWithPackagesSchema,
  type OfferWithPackagesValues,
} from "@/lib/validation/offer-with-packages";

// Call options schema – runtime context passed from API route
export const OfferAgentCallOptionsSchema = z.object({
  offerId: z.string().uuid(),
  userId: z.string().uuid(), // from Supabase auth
  editorState: OfferWithPackagesSchema.optional(),
});

const DraftPatchSchema = z.object({
  type: z.literal("draftPatch"),
  offerPatch: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.string().uuid().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["draft", "active"]).optional(),
      currencyCode: z.string().optional(),
    })
    .optional(),
  packagesPatch: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        id: z.string().uuid().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        priceCents: z.number().int().optional(),
        deliveryDays: z.number().int().optional(),
        revisions: z.number().int().optional(),
        _deleted: z.boolean().optional(),
      }),
    )
    .optional(),
});

export type DraftPatch = z.infer<typeof DraftPatchSchema>;

// Tool: propose draft changes against the in-flight editor state
const updateDraftOfferTool = tool({
  description:
    "Propose changes to the current draft offer fields. Returns a draftPatch to be applied to the editor.",
  inputSchema: z.object({
    title: z.string().min(4).max(120).optional(),
    description: z.string().min(20).max(2000).optional(),
    categoryId: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(["draft", "active"]).optional(),
    currencyCode: z.string().optional(),
  }),
  execute: async (
    input,
    { experimental_context }: { experimental_context?: unknown } = {},
  ) => {
    const options = OfferAgentCallOptionsSchema.parse(experimental_context);
    const current = options.editorState;

    if (!current) {
      throw new Error("Missing editorState in call options.");
    }

    const patch: DraftPatch = {
      type: "draftPatch",
      offerPatch: {
        title: input.title ?? current.offer.title,
        description: input.description ?? current.offer.description,
        categoryId: input.categoryId ?? current.offer.categoryId,
        tags: input.tags ?? current.offer.tags,
        status: input.status ?? current.offer.status,
        currencyCode: input.currencyCode ?? current.offer.currencyCode,
      },
    };

    return DraftPatchSchema.parse(patch);
  },
});

export const offerAgent = new ToolLoopAgent({
  model: openai("gpt-5-mini"),
  instructions: `
You are LemonsLemons' offer-building assistant.

- The source of truth is the provided editorState (current draft in the form).
- Never ask for offerId or userId; they are already provided.
- Use tools to propose JSON patches (draftPatch) that the UI applies to the form.
- Do NOT write to the database; saving is user-triggered.
- Keep responses concise and confirm applied changes.
`,

  tools: {
    update_draft_offer: updateDraftOfferTool,
    // Future: update_draft_package, reorder_packages, etc.
  },

  // v6 call options: strongly typed
  callOptionsSchema: OfferAgentCallOptionsSchema,
  prepareCall: ({ options, ...rest }) => ({
    ...rest,
    experimental_context: options,
  }),
});

export type OfferAgentMessage = InferAgentUIMessage<typeof offerAgent>;
