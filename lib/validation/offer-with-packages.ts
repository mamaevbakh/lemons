// lib/validation/offer-with-packages.ts
import { z } from "zod";
import { OfferFormSchema } from "@/lib/validation/offer-form";
import { PackageFormSchema } from "@/lib/validation/package-form";

const PackageDraftSchema = z.object({
  id: PackageFormSchema.shape.id.optional(),
  name: z.string().max(80).optional(),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().min(0).optional(),
  deliveryDays: z.number().int().min(1).optional(),
  revisions: z.number().int().min(0).max(50).optional(),
  _deleted: z.boolean().optional(),
});

const OfferDraftSchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "active"]).optional(),
  currencyCode: z.string().optional(),
});

export const OfferWithPackagesSchema = z.object({
  offerId: z.uuid(),

  offer: OfferFormSchema,

  packages: z.array(
    PackageFormSchema.extend({
      // id is optional here so later we can support new packages too
      id: PackageFormSchema.shape.id.optional(),
      _deleted: z.boolean().optional(),
    }),
  ),
});

export type OfferWithPackagesValues = z.infer<typeof OfferWithPackagesSchema>;

export const OfferWithPackagesDraftSchema = z.object({
  offerId: z.string().uuid(),
  offer: OfferDraftSchema,
  packages: z.array(PackageDraftSchema),
});

export type OfferWithPackagesDraftValues = z.infer<
  typeof OfferWithPackagesDraftSchema
>;
