import { z } from "zod";

export const OfferFormSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().min(20).max(2000),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).default([]),
  startingPrice: z.number().int().min(0),
  standardDeliveryDays: z.number().int().min(1),
  status: z.enum(["draft", "active"]),
  currencyCode: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase())
    .default("EUR"),
});

export type OfferFormValues = z.infer<typeof OfferFormSchema>;
