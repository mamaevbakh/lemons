import { ToolLoopAgent, tool, InferAgentUIMessage } from "ai";
import { z } from "zod";

import { openai } from "@/lib/ai/openai";
import {
  SolutionEditorDraftSchema,
  type SolutionEditorDraftValues,
} from "@/lib/validation/solution-editor";

export const SolutionAgentCallOptionsSchema = z.object({
  solutionId: z.string().uuid(),
  userId: z.string().uuid(),
  editorState: SolutionEditorDraftSchema.optional(),
  availableCases: z
    .array(z.object({ id: z.string().uuid(), title: z.string().min(1) }))
    .optional(),
});

const DraftPatchSchema = z.object({
  type: z.literal("draftPatch"),
  solutionPatch: z
    .object({
      title: z.string().optional(),
      headline: z.string().optional(),
      description: z.string().optional(),
      websiteUrl: z.string().optional(),
      slug: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    })
    .optional(),
  portfolioCaseIds: z.array(z.string().uuid()).optional(),
});

export type SolutionDraftPatch = z.infer<typeof DraftPatchSchema>;

const CaseCreateRequestSchema = z.object({
  type: z.literal("caseCreateRequest"),
  title: z.string().min(3).max(120),
  summary: z.string().max(2000).optional().nullable(),
  problem: z.string().max(4000).optional().nullable(),
  solution: z.string().max(4000).optional().nullable(),
  result: z.string().max(4000).optional().nullable(),
  attach: z.boolean().optional(),
});

const CaseUpdateRequestSchema = z.object({
  type: z.literal("caseUpdateRequest"),
  caseId: z.string().uuid(),
  patch: z
    .object({
      title: z.string().min(3).max(120).optional(),
      summary: z.string().max(2000).optional().nullable(),
      problem: z.string().max(4000).optional().nullable(),
      solution: z.string().max(4000).optional().nullable(),
      result: z.string().max(4000).optional().nullable(),
    })
    .refine(
      (v) =>
        v.title !== undefined ||
        v.summary !== undefined ||
        v.problem !== undefined ||
        v.solution !== undefined ||
        v.result !== undefined,
      { message: "Provide at least one field" },
    ),
});

const updateDraftSolutionTool = tool({
  description:
    "Propose changes to the current draft solution fields. Returns a draftPatch to be applied to the editor.",
  inputSchema: z.object({
    title: z.string().min(3).max(120).optional(),
    headline: z.string().min(10).max(160).optional(),
    description: z.string().min(40).max(4000).optional(),
    websiteUrl: z.string().optional(),
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
      .optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
  }),
  execute: async (
    input,
    { experimental_context }: { experimental_context?: unknown } = {},
  ) => {
    const options = SolutionAgentCallOptionsSchema.parse(experimental_context);
    const current = options.editorState;

    if (!current) {
      throw new Error("Missing editorState in call options.");
    }

    const solutionPatch: SolutionDraftPatch["solutionPatch"] = {};

    if (input.title !== undefined) solutionPatch.title = input.title;
    if (input.headline !== undefined) solutionPatch.headline = input.headline;
    if (input.description !== undefined) solutionPatch.description = input.description;
    if (input.websiteUrl !== undefined) solutionPatch.websiteUrl = input.websiteUrl;
    if (input.slug !== undefined) solutionPatch.slug = input.slug;
    if (input.status !== undefined) solutionPatch.status = input.status;

    const patch: SolutionDraftPatch = {
      type: "draftPatch",
      solutionPatch,
    };

    return DraftPatchSchema.parse(patch);
  },
});

const setPortfolioCasesTool = tool({
  description:
    "Set the solution portfolio cases by providing case ids and/or case titles. Returns a draftPatch with portfolioCaseIds.",
  inputSchema: z
    .object({
      caseIds: z.array(z.string().uuid()).optional(),
      caseTitles: z.array(z.string().min(1)).optional(),
    })
    .refine((v) => (v.caseIds?.length ?? 0) + (v.caseTitles?.length ?? 0) > 0, {
      message: "Provide caseIds and/or caseTitles",
    }),
  execute: async (
    input,
    { experimental_context }: { experimental_context?: unknown } = {},
  ) => {
    const options = SolutionAgentCallOptionsSchema.parse(experimental_context);
    const available = options.availableCases ?? [];

    const ids: string[] = [];
    (input.caseIds ?? []).forEach((id) => ids.push(id));

    (input.caseTitles ?? []).forEach((title) => {
      const titleLc = title.trim().toLowerCase();
      const match = available.find(
        (c) => (c.title ?? "").trim().toLowerCase() === titleLc,
      );
      if (!match) {
        const examples = available.slice(0, 10).map((c) => c.title).join(", ");
        throw new Error(
          `Unknown case title: "${title}". Available examples: ${examples}`,
        );
      }
      ids.push(match.id);
    });

    const unique = Array.from(new Set(ids));
    const patch: SolutionDraftPatch = { type: "draftPatch", portfolioCaseIds: unique };
    return DraftPatchSchema.parse(patch);
  },
});

const requestCreateCaseTool = tool({
  description:
    "Request creating a new portfolio case (title + optional summary/problem/solution/result). The UI will create it and attach it.",
  inputSchema: z.object({
    title: z.string().min(3).max(120),
    summary: z.string().max(2000).optional().nullable(),
    problem: z.string().max(4000).optional().nullable(),
    solution: z.string().max(4000).optional().nullable(),
    result: z.string().max(4000).optional().nullable(),
    attach: z.boolean().optional(),
  }),
  execute: async (input) => {
    return CaseCreateRequestSchema.parse({ type: "caseCreateRequest", ...input });
  },
});

const requestUpdateCaseTool = tool({
  description:
    "Request updating an existing case by id. The UI will update it via API.",
  inputSchema: z.object({
    caseId: z.string().uuid(),
    patch: z.object({
      title: z.string().min(3).max(120).optional(),
      summary: z.string().max(2000).optional().nullable(),
      problem: z.string().max(4000).optional().nullable(),
      solution: z.string().max(4000).optional().nullable(),
      result: z.string().max(4000).optional().nullable(),
    }),
  }),
  execute: async (input) => {
    return CaseUpdateRequestSchema.parse({ type: "caseUpdateRequest", ...input });
  },
});

export const solutionAgent = new ToolLoopAgent({
  model: openai("gpt-5-mini"),
  instructions: `
You are LemonsLemons' solution-page assistant.

- The source of truth is the provided editorState (current draft in the form).
- Never ask for solutionId or userId; they are already provided.
- Use tools to propose JSON patches (draftPatch) that the UI applies to the form.
- Do NOT write to the database; saving is user-triggered.
- Keep responses concise and confirm applied changes.
- When asked to attach/detach portfolio cases, call set_portfolio_cases.
- When asked to create a new case, call request_create_case.
- When asked to update an existing case, call request_update_case.
`,
  tools: {
    update_draft_solution: updateDraftSolutionTool,
    set_portfolio_cases: setPortfolioCasesTool,
    request_create_case: requestCreateCaseTool,
    request_update_case: requestUpdateCaseTool,
  },
  callOptionsSchema: SolutionAgentCallOptionsSchema,
  prepareCall: ({ options, ...rest }) => ({
    ...rest,
    experimental_context: options,
  }),
});

export type SolutionAgentMessage = InferAgentUIMessage<typeof solutionAgent>;
