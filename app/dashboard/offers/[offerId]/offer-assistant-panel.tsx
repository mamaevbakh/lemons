"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";

import {
  Conversation,
  ConversationContent,
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
});

type DraftPatch = z.infer<typeof DraftPatchSchema>;

type OfferAssistantPanelProps = {
  form: UseFormReturn<OfferWithPackagesValues>;
};

export function OfferAssistantPanel({ form }: OfferAssistantPanelProps) {
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
      : { offerId, offer: {}, packages: [] };

    sendMessage(
      {
        text: message.text ?? "",
        files: message.files,
      },
      {
        body: {
          offerId,
          editorState: safeEditorState,
        },
      },
    );

    setText("");
  };

  // Apply tool results that contain draftPatch output
  useEffect(() => {
    const nextApplied = new Set(appliedToolIds);

    messages.forEach((m) => {
      m.parts.forEach((part: any) => {
        // In AI SDK 6 beta, tool parts are typed as tool-{toolName}
        const isToolPart =
          part.type === "tool-update_draft_offer" ||
          part.type === "tool-update_draft_package";
        
        // Only process when output is available
        if (!isToolPart || part.state !== "output-available") return;
        
        const toolCallId = part.toolCallId;
        if (!toolCallId || nextApplied.has(toolCallId)) return;
        
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
