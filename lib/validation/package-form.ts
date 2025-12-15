// lib/validation/package-form.ts
import { z } from "zod";

export const PackageFormSchema = z.object({
  id: z.uuid(), // package id
  name: z.string().min(1).max(80),
  description: z.string().min(10).max(2000),
  // keep price in cents at the form/type level – consistent with DB
  priceCents: z.number().int().min(0),
  deliveryDays: z.number().int().min(1),
  revisions: z.number().int().min(0).max(50),
});

export type PackageFormValues = z.infer<typeof PackageFormSchema>;
