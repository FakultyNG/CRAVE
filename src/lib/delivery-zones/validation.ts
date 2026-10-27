import { z } from "zod";

const fields = {
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locationId: z.string().min(1),
  feeKobo: z.number().int().min(0),
  minimumOrderKobo: z.number().int().min(0),
  estimatedMinutes: z.number().int().min(1).max(600),
  isActive: z.boolean(),
};

export const createDeliveryZoneSchema = z.object({
  ...fields,
  isActive: fields.isActive.default(true),
});

export const updateDeliveryZoneSchema = z.object({
  name: fields.name.optional(),
  slug: fields.slug.optional(),
  locationId: fields.locationId.optional(),
  feeKobo: fields.feeKobo.optional(),
  minimumOrderKobo: fields.minimumOrderKobo.optional(),
  estimatedMinutes: fields.estimatedMinutes.optional(),
  isActive: fields.isActive.optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one change.");
