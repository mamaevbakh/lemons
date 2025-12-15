import { z } from "zod";

export const OfferFormSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().min(20).max(2000),
  categoryId: z.uuid(),
  tags: z.array(z.string()),
  status: z.enum(["draft", "active"]),
  currencyCode: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase()),
});


export type OfferFormValues = z.infer<typeof OfferFormSchema>;
