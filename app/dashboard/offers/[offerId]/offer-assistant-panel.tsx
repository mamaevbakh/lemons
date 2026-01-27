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
import { DraftChangeCard } from "@/components/ai-elements/draft-change-card";
import {
  OfferWithPackagesDraftSchema,
  type OfferWithPackagesValues,
} from "@/lib/validation/offer-with-packages";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Sparkles } from "lucide-react";

const DraftPatchSchema = z.object({
  type: z.literal("draftPatch"),
  offerPatch: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["draft", "active"]).optional(),
      currencyCode: z.string().optional(),
    })
    .optional(),
  packagesPatch: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        id: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        priceCents: z.number().int().optional(),
        deliveryDays: z.number().int().optional(),
        revisions: z.number().int().optional(),
        _deleted: z.boolean().optional(),
      }),
    )
    .optional(),
  portfolioCaseIds: z.array(z.string().uuid()).optional(),
});

type DraftPatch = z.infer<typeof DraftPatchSchema>;

type OfferAssistantPanelProps = {
  form: UseFormReturn<OfferWithPackagesValues>;
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

export function OfferAssistantPanel({
  form,
  availableCases,
  onCaseCreated,
  onCaseUpdated,
}: OfferAssistantPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState("");
  const [appliedToolIds, setAppliedToolIds] = useState<Set<string>>(new Set());

  const offerId = form.getValues().offerId;

  const applyDraftPatch = (patch: DraftPatch) => {
    if (patch.offerPatch) {
      const { title, description, categoryId, tags, status, currencyCode } =
        patch.offerPatch;
      if (title !== undefined) {
        form.setValue("offer.title", title, { shouldDirty: true });
      }
      if (description !== undefined) {
        form.setValue("offer.description", description, { shouldDirty: true });
      }
      if (categoryId !== undefined) {
        form.setValue("offer.categoryId", categoryId, { shouldDirty: true });
      }
      if (tags !== undefined) {
        form.setValue("offer.tags", tags, { shouldDirty: true });
      }
      if (status !== undefined) {
        form.setValue("offer.status", status, { shouldDirty: true });
      }
      if (currencyCode !== undefined) {
        form.setValue("offer.currencyCode", currencyCode, { shouldDirty: true });
      }
    }

    if (patch.packagesPatch) {
      patch.packagesPatch.forEach((pkg) => {
        const idx = pkg.index;
        if (pkg.name !== undefined) {
          form.setValue(`packages.${idx}.name`, pkg.name, { shouldDirty: true });
        }
        if (pkg.description !== undefined) {
          form.setValue(`packages.${idx}.description`, pkg.description, {
            shouldDirty: true,
          });
        }
        if (pkg.priceCents !== undefined) {
          form.setValue(`packages.${idx}.priceCents`, pkg.priceCents, {
            shouldDirty: true,
          });
        }
        if (pkg.deliveryDays !== undefined) {
          form.setValue(`packages.${idx}.deliveryDays`, pkg.deliveryDays, {
            shouldDirty: true,
          });
        }
        if (pkg.revisions !== undefined) {
          form.setValue(`packages.${idx}.revisions`, pkg.revisions, {
            shouldDirty: true,
          });
        }
        if (pkg._deleted !== undefined) {
          form.setValue(`packages.${idx}._deleted`, pkg._deleted, {
            shouldDirty: true,
          });
        }
      });
    }

    if (patch.portfolioCaseIds) {
      const current = (form.getValues().caseLinks ?? []) as OfferWithPackagesValues["caseLinks"];

      const currentByCaseId = new Map(
        current
          .filter((c) => c.caseId)
          .map((c) => [c.caseId as string, c]),
      );

      const next: OfferWithPackagesValues["caseLinks"] = [];

      patch.portfolioCaseIds.forEach((caseId, position) => {
        const existing = currentByCaseId.get(caseId);
        next.push({
          id: existing?.id ?? crypto.randomUUID(),
          caseId,
          position,
          _deleted: false,
        });
      });

      // Keep any removed links around (soft-delete) so save-actions can delete them.
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
    id: `offer-assistant-${offerId}`,
    transport: new DefaultChatTransport({
      api: "/api/assistant/offer",
    }),
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!hasText && !hasAttachments) return;

    const draftState =
      OfferWithPackagesDraftSchema.safeParse(form.getValues());
    const safeEditorState = draftState.success
      ? draftState.data
      : { offerId, offer: {}, packages: [], caseLinks: [] };

    sendMessage(
      {
        text: message.text ?? "",
        files: message.files,
      },
      {
        body: {
          offerId,
          editorState: safeEditorState,
          availableCases,
        },
      },
    );

    setText("");
  };

  // Apply tool results that contain draftPatch output
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
        // Attach by setting portfolioCaseIds including the new one.
        const currentIds = (form.getValues().caseLinks ?? [])
          .filter((c) => !c?._deleted)
          .map((c) => c.caseId)
          .filter(Boolean) as string[];

        applyDraftPatch({ type: "draftPatch", portfolioCaseIds: [body.case.id, ...currentIds] });
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
        // In AI SDK 6 beta, tool parts are typed as tool-{toolName}
        const isToolPart =
          part.type === "tool-update_draft_offer" ||
          part.type === "tool-update_draft_package" ||
          part.type === "tool-set_portfolio_cases" ||
          part.type === "tool-request_create_case" ||
          part.type === "tool-request_update_case";
        
        // Only process when output is available
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

        // eslint-disable-next-line no-console
        console.debug("assistant tool-output", part.output);
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
      {/* Messages */}
      <Conversation>
        {messages.length === 0 ? (
          <ConversationEmptyState
            icon={<Sparkles className="h-8 w-8" />}
            title="Mony AI Assistant"
            description="Ask me to improve your offer title, write descriptions, adjust package pricing, or manage your portfolio cases."
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
                    case "tool-update_draft_offer":
                    case "tool-update_draft_package": {
                      // Only show when output is available
                      if (part.state !== "output-available") {
                        return null;
                      }
                      const parsed = DraftPatchSchema.safeParse(part.output);
                      if (parsed.success) {
                        return (
                          <DraftChangeCard
                            key={`${m.id}-${idx}`}
                            patch={parsed.data}
                          />
                        );
                      }
                      return null;
                    }
                    case "tool-set_portfolio_cases": {
                      if (part.state !== "output-available") return null;
                      return null;
                    }
                    case "reasoning":
                      return (
                        <Reasoning
                          key={`${m.id}-${idx}`}
                          className="w-full"
                          isStreaming={
                            status === "streaming" &&
                            idx === m.parts.length - 1 &&
                            m.id === messages.at(-1)?.id
                          }
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
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

      {/* Input */}
      <PromptInput onSubmit={handleSubmit} className="mt-4">
        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask the assistant to improve your offer or edit your packages..."
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
