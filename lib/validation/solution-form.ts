import { z } from "zod";

const SlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Invalid slug");

export const SolutionFormSchema = z.object({
  title: z.string().min(3).max(120),
  headline: z.string().max(160),
  description: z.string().max(4000),
  websiteUrl: z
    .string()
    .url()
    .or(z.literal(""))
    .transform((v) => v.trim())
    .optional(),
  slug: SlugSchema,
  status: z.enum(["draft", "published", "archived"]),
  featuredOfferIds: z.array(z.string().uuid()),
});

export type SolutionFormValues = z.infer<typeof SolutionFormSchema>;
