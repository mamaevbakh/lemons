import { ToolLoopAgent, tool, InferAgentUIMessage } from "ai";
import { z } from "zod";

import { openai } from "@/lib/ai/openai";
import {
  OfferWithPackagesDraftSchema,
  type OfferWithPackagesDraftValues,
} from "@/lib/validation/offer-with-packages";

// Call options schema – runtime context passed from API route
export const OfferAgentCallOptionsSchema = z.object({
  offerId: z.string().uuid(),
  userId: z.string().uuid(), // from Supabase auth
  editorState: OfferWithPackagesDraftSchema.optional(),
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

const PackageTargetSchema = z
  .object({
    index: z.number().int().nonnegative().optional(),
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120).optional(),
  })
  .refine((t) => t.index !== undefined || t.id !== undefined || !!t.name, {
    message: "Provide package id, index, or name",
  });

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

    // Only include fields that were actually provided in the input
    const offerPatch: DraftPatch["offerPatch"] = {};
    
    if (input.title !== undefined) offerPatch.title = input.title;
    if (input.description !== undefined) offerPatch.description = input.description;
    if (input.categoryId !== undefined) offerPatch.categoryId = input.categoryId;
    if (input.tags !== undefined) offerPatch.tags = input.tags;
    if (input.status !== undefined) offerPatch.status = input.status;
    if (input.currencyCode !== undefined) offerPatch.currencyCode = input.currencyCode;

    const patch: DraftPatch = {
      type: "draftPatch",
      offerPatch,
    };

    return DraftPatchSchema.parse(patch);
  },
});

// Tool: update a single package in the draft by index or id
const updateDraftPackageTool = tool({
  description:
    "Update a package in the current draft by id, index, or name. Returns a draftPatch for that package only.",
  inputSchema: z.object({
    target: PackageTargetSchema,
    // If priceIsCents is false/omitted, price is assumed to be in major currency units (e.g., USD/EUR).
    patch: z.object({
      name: z.string().min(1).max(80).optional(),
      description: z.string().min(10).max(2000).optional(),
      price: z.number().min(0).optional(),
      priceIsCents: z.boolean().optional(),
      deliveryDays: z.number().int().min(1).optional(),
      revisions: z.number().int().min(0).max(50).optional(),
      _deleted: z.boolean().optional(),
    }),
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

    const { target, patch } = input;
    let index = target.index;

    // Resolve by id first if provided
    if (index === undefined && target.id) {
      index = current.packages.findIndex((p) => p.id === target.id);
    }

    // Resolve by name (case-insensitive exact match) if provided
    if (index === undefined && target.name) {
      const nameLc = target.name.trim().toLowerCase();
      index = current.packages.findIndex(
        (p) => (p.name ?? "").trim().toLowerCase() === nameLc,
      );
    }

    // If still not resolved, but only one package exists, pick it
    if (
      index === undefined &&
      current.packages.length === 1 &&
      current.packages[0]
    ) {
      index = 0;
    }

    if (index === undefined || index < 0 || index >= current.packages.length) {
      const availableNames = current.packages
        .map((p, i) => `${i}: ${p.name ?? "(unnamed)"}`)
        .join(", ");
      throw new Error(
        `Package not found. Provide name/id or choose one of: ${availableNames}`,
      );
    }

    const pkg = current.packages[index];
    const resolvedPatch: any = {
      id: pkg.id,
    };

    if (patch.name !== undefined) resolvedPatch.name = patch.name;
    if (patch.description !== undefined) resolvedPatch.description = patch.description;
    if (patch.deliveryDays !== undefined) resolvedPatch.deliveryDays = patch.deliveryDays;
    if (patch.revisions !== undefined) resolvedPatch.revisions = patch.revisions;
    if (patch._deleted !== undefined) resolvedPatch._deleted = patch._deleted;

    if (patch.price !== undefined) {
      const priceCents = patch.priceIsCents
        ? Math.round(patch.price)
        : Math.round(patch.price * 100);
      resolvedPatch.priceCents = priceCents;
    }

    const draftPatch: DraftPatch = {
      type: "draftPatch",
      packagesPatch: [
        {
          index,
          ...resolvedPatch,
        },
      ],
    };

    return DraftPatchSchema.parse(draftPatch);
  },
});

// Tool: list all draft packages with friendly pricing
const listDraftPackagesTool = tool({
  description: "List all current draft packages with names, prices, and ids if present.",
  inputSchema: z.object({}),
  execute: async (
    _input,
    { experimental_context }: { experimental_context?: unknown } = {},
  ) => {
    const options = OfferAgentCallOptionsSchema.parse(experimental_context);
    const current = options.editorState;
    if (!current) {
      throw new Error("Missing editorState in call options.");
    }

    const packages = (current.packages ?? [])
      .map((p, index) => ({
        index,
        id: p.id ?? null,
        name: p.name ?? "(unnamed)",
        priceCents: p.priceCents ?? 0,
        price: (p.priceCents ?? 0) / 100,
        deliveryDays: p.deliveryDays ?? null,
        revisions: p.revisions ?? null,
        deleted: p._deleted ?? false,
      }))
      .filter((p) => !p.deleted);

    return { packages };
  },
});

export const offerAgent = new ToolLoopAgent({
  model: openai("gpt-5-mini"),
  instructions: `
You are LemonsLemons' offer-building assistant.

- The source of truth is the provided editorState (current draft in the form).
- Never ask for offerId or userId; they are already provided.
- Assume editorState is present; use tools to read it instead of asking the user for it.
- Use tools to propose JSON patches (draftPatch) that the UI applies to the form.
- Do NOT write to the database; saving is user-triggered.
- Keep responses concise and confirm applied changes.
- When asked about current packages, call list_draft_packages and summarize them.
`,

  tools: {
    update_draft_offer: updateDraftOfferTool,
    update_draft_package: updateDraftPackageTool,
    list_draft_packages: listDraftPackagesTool,
    // Future: reorder_packages, set_category_by_name, etc.
  },

  // v6 call options: strongly typed
  callOptionsSchema: OfferAgentCallOptionsSchema,
  prepareCall: ({ options, ...rest }) => ({
    ...rest,
    experimental_context: options,
  }),
});

export type OfferAgentMessage = InferAgentUIMessage<typeof offerAgent>;
