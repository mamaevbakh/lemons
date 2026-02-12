import { z } from "zod";

import { SolutionFormSchema } from "@/lib/validation/solution-form";

const UrlSchema = z.string().url();

const LinkSchema = z
  .object({
    id: z.string().uuid(),
    platform: z.string().max(40),
    url: z.string(),
    position: z.number().int().nonnegative(),
    _deleted: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value._deleted) return;

    const platform = value.platform.trim();
    if (!platform) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Platform is required",
        path: ["platform"],
      });
    }

    const url = value.url.trim();
    if (!url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL is required",
        path: ["url"],
      });
      return;
    }

    if (!UrlSchema.safeParse(url).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid URL",
        path: ["url"],
      });
    }
  });

const LinkDraftSchema = z.object({
  id: z.string().uuid().optional(),
  platform: z.string().max(40).optional(),
  url: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
  _deleted: z.boolean().optional(),
});

const PricingItemSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().max(120),
    priceText: z.string().max(60),
    description: z.string().max(2000).optional(),
    ctaLabel: z.string().max(40).optional(),
    ctaUrl: z.string().optional(),
    position: z.number().int().nonnegative(),
    _deleted: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value._deleted) return;

    if (!value.title.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Title is required",
        path: ["title"],
      });
    }

    if (!value.priceText.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Price is required",
        path: ["priceText"],
      });
    }

    const ctaUrl = value.ctaUrl?.trim();
    if (ctaUrl && !UrlSchema.safeParse(ctaUrl).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid URL",
        path: ["ctaUrl"],
      });
    }
  });

const PricingItemDraftSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(120).optional(),
  priceText: z.string().max(60).optional(),
  description: z.string().max(2000).optional(),
  ctaLabel: z.string().max(40).optional(),
  ctaUrl: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
  _deleted: z.boolean().optional(),
});

const CaseLinkSchema = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  position: z.number().int().nonnegative(),
  _deleted: z.boolean().optional(),
});

const CaseLinkDraftSchema = z.object({
  id: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  position: z.number().int().nonnegative().optional(),
  _deleted: z.boolean().optional(),
});

export const SolutionEditorSchema = z.object({
  solutionId: z.string().uuid(),
  solution: SolutionFormSchema,
  links: z.array(LinkSchema),
  pricingItems: z.array(PricingItemSchema),
  caseLinks: z.array(CaseLinkSchema),
});

export type SolutionEditorValues = z.infer<typeof SolutionEditorSchema>;

const SolutionDraftSchema = z.object({
  title: z.string().max(120).optional(),
  headline: z.string().max(160).optional(),
  description: z.string().max(4000).optional(),
  websiteUrl: z.string().optional(),
  slug: z.string().max(80).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  featuredOfferIds: z.array(z.string().uuid()).optional(),
});

export const SolutionEditorDraftSchema = z.object({
  solutionId: z.string().uuid(),
  solution: SolutionDraftSchema,
  links: z.array(LinkDraftSchema),
  pricingItems: z.array(PricingItemDraftSchema),
  caseLinks: z.array(CaseLinkDraftSchema),
});

export type SolutionEditorDraftValues = z.infer<typeof SolutionEditorDraftSchema>;
