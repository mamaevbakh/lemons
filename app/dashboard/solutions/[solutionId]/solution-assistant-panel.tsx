"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Sparkles } from "lucide-react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { SolutionDraftChangeCard } from "@/components/ai-elements/solution-draft-change-card";

import {
  SolutionEditorDraftSchema,
  type SolutionEditorValues,
} from "@/lib/validation/solution-editor";

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

type DraftPatch = z.infer<typeof DraftPatchSchema>;

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

type CaseCreateRequest = z.infer<typeof CaseCreateRequestSchema>;
type CaseUpdateRequest = z.infer<typeof CaseUpdateRequestSchema>;

type Props = {
  form: UseFormReturn<SolutionEditorValues>;
  availableCases: Array<{ id: string; title: string }>;
  onCaseCreated?: (created: {
    id: string;
    title: string;
    summary: string | null;
    problem: string | null;
    solution: string | null;
    result: string | null;
    created_at: string;
  }) => void;
  onCaseUpdated?: (updated: {
    id: string;
    title: string;
    summary: string | null;
    problem: string | null;
    solution: string | null;
    result: string | null;
    created_at: string;
  }) => void;
};

export function SolutionAssistantPanel({
  form,
  availableCases,
  onCaseCreated,
  onCaseUpdated,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState("");
  const [appliedToolIds, setAppliedToolIds] = useState<Set<string>>(new Set());

  const solutionId = form.getValues().solutionId;

  const applyDraftPatch = (patch: DraftPatch) => {
    if (patch.solutionPatch) {
      const { title, headline, description, websiteUrl, slug, status } =
        patch.solutionPatch;

      if (title !== undefined) {
        form.setValue("solution.title", title, { shouldDirty: true });
      }
      if (headline !== undefined) {
        form.setValue("solution.headline", headline, { shouldDirty: true });
      }
      if (description !== undefined) {
        form.setValue("solution.description", description, { shouldDirty: true });
      }
      if (websiteUrl !== undefined) {
        form.setValue("solution.websiteUrl", websiteUrl, { shouldDirty: true });
      }
      if (slug !== undefined) {
        form.setValue("solution.slug", slug, { shouldDirty: true });
      }
      if (status !== undefined) {
        form.setValue("solution.status", status, { shouldDirty: true });
      }
    }

    if (patch.portfolioCaseIds) {
      const current = (form.getValues().caseLinks ?? []) as SolutionEditorValues["caseLinks"];

      const currentByCaseId = new Map(
        current
          .filter((c) => c.caseId)
          .map((c) => [c.caseId as string, c]),
      );

      const next: SolutionEditorValues["caseLinks"] = [];

      patch.portfolioCaseIds.forEach((caseId, position) => {
        const existing = currentByCaseId.get(caseId);
        next.push({
          id: existing?.id ?? crypto.randomUUID(),
          caseId,
          position,
          _deleted: false,
        });
      });

      current.forEach((c) => {
        if (!c.caseId) return;
        if (patch.portfolioCaseIds?.includes(c.caseId)) return;
        next.push({
          id: c.id ?? crypto.randomUUID(),
          caseId: c.caseId,
          position: c.position ?? 0,
          _deleted: true,
        });
      });

      form.setValue("caseLinks", next, { shouldDirty: true });
    }
  };

  const { messages, status, sendMessage } = useChat<UIMessage>({
    id: `solution-assistant-${solutionId}`,
    transport: new DefaultChatTransport({
      api: "/api/assistant/solution",
    }),
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!hasText && !hasAttachments) return;

    const draftState = SolutionEditorDraftSchema.safeParse(form.getValues());
    const safeEditorState = draftState.success
      ? draftState.data
      : { solutionId, solution: {}, links: [], pricingItems: [], caseLinks: [] };

    sendMessage(
      {
        text: message.text ?? "",
        files: message.files,
      },
      {
        body: {
          solutionId,
          editorState: safeEditorState,
          availableCases,
        },
      },
    );

    setText("");
  };

  useEffect(() => {
    const nextApplied = new Set(appliedToolIds);

    const handleCaseCreate = async (req: CaseCreateRequest) => {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: req.title,
          summary: req.summary ?? null,
          problem: req.problem ?? null,
          solution: req.solution ?? null,
          result: req.result ?? null,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | {
            case?: {
              id: string;
              title: string;
              summary: string | null;
              problem: string | null;
              solution: string | null;
              result: string | null;
              created_at: string;
            };
            error?: string;
          }
        | null;

      if (!res.ok || !body?.case) {
        throw new Error(body?.error || "Failed to create case");
      }

      onCaseCreated?.(body.case);

      if (req.attach !== false) {
        const currentIds = (form.getValues().caseLinks ?? [])
          .filter((c) => !c?._deleted)
          .map((c) => c.caseId)
          .filter(Boolean) as string[];

        applyDraftPatch({
          type: "draftPatch",
          portfolioCaseIds: [body.case.id, ...currentIds],
        });
      }
    };

    const handleCaseUpdate = async (req: CaseUpdateRequest) => {
      const res = await fetch(`/api/cases/${req.caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.patch),
      });

      const body = (await res.json().catch(() => null)) as
        | {
            case?: {
              id: string;
              title: string;
              summary: string | null;
              problem: string | null;
              solution: string | null;
              result: string | null;
              created_at: string;
            };
            error?: string;
          }
        | null;

      if (!res.ok || !body?.case) {
        throw new Error(body?.error || "Failed to update case");
      }

      onCaseUpdated?.(body.case);
    };

    messages.forEach((m) => {
      m.parts.forEach((part: any) => {
        const isToolPart =
          part.type === "tool-update_draft_solution" ||
          part.type === "tool-set_portfolio_cases" ||
          part.type === "tool-request_create_case" ||
          part.type === "tool-request_update_case";
        if (!isToolPart || part.state !== "output-available") return;

        const toolCallId = part.toolCallId;
        if (!toolCallId || nextApplied.has(toolCallId)) return;

        if (part.type === "tool-request_create_case") {
          const parsed = CaseCreateRequestSchema.safeParse(part.output);
          if (parsed.success) {
            nextApplied.add(toolCallId);
            handleCaseCreate(parsed.data).catch((e) => {
              // eslint-disable-next-line no-console
              console.warn("assistant case create failed", e);
            });
          }
          return;
        }

        if (part.type === "tool-request_update_case") {
          const parsed = CaseUpdateRequestSchema.safeParse(part.output);
          if (parsed.success) {
            nextApplied.add(toolCallId);
            handleCaseUpdate(parsed.data).catch((e) => {
              // eslint-disable-next-line no-console
              console.warn("assistant case update failed", e);
            });
          }
          return;
        }

        const parsed = DraftPatchSchema.safeParse(part.output);
        if (parsed.success) {
          applyDraftPatch(parsed.data);
          nextApplied.add(toolCallId);
        }
      });
    });

    if (nextApplied.size !== appliedToolIds.size) {
      setAppliedToolIds(nextApplied);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-full flex-col">
      <Conversation>
        {messages.length === 0 ? (
          <ConversationEmptyState
            icon={<Sparkles className="h-8 w-8" />}
            title="Mony AI Assistant"
            description="Ask me to improve your solution page, write headlines, update descriptions, or manage your portfolio cases."
          />
        ) : (
          <ConversationContent>
            {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent>
                {m.parts.map((part, idx) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <MessageResponse key={`${m.id}-${idx}`}>
                          {part.text}
                        </MessageResponse>
                      );
                    case "tool-update_draft_solution": {
                      if (part.state !== "output-available") return null;
                      const parsed = DraftPatchSchema.safeParse(part.output);
                      if (parsed.success) {
                        return (
                          <SolutionDraftChangeCard
                            key={`${m.id}-${idx}`}
                            patch={parsed.data}
                          />
                        );
                      }
                      return null;
                    }
                    default:
                      return null;
                  }
                })}
              </MessageContent>
            </Message>
          ))}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit} className="mt-4">
        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask the assistant to improve your solution page..."
            className="pr-12"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputSubmit
            status={status}
            disabled={!text && !isLoading}
            className="absolute bottom-1 right-1"
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
