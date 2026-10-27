import { z } from "zod";

const variantFields = {
  name: z.string().trim().min(1).max(80),
  sku: z.string().trim().max(80).nullable(),
  priceDeltaKobo: z.number().int().min(0),
  isActive: z.boolean(),
  position: z.number().int().min(0).max(10000),
};

const optionFields = {
  name: z.string().trim().min(1).max(80),
  groupName: z.string().trim().min(1).max(80),
  priceDeltaKobo: z.number().int().min(0),
  isRequired: z.boolean(),
  maxSelections: z.number().int().min(1).max(20),
  position: z.number().int().min(0).max(10000),
};

export const createVariantSchema = z.object({
  ...variantFields,
  sku: variantFields.sku.default(null),
  priceDeltaKobo: variantFields.priceDeltaKobo.default(0),
  isActive: variantFields.isActive.default(true),
  position: variantFields.position.default(0),
});

export const updateVariantSchema = z.object({
  name: variantFields.name.optional(),
  sku: variantFields.sku.optional(),
  priceDeltaKobo: variantFields.priceDeltaKobo.optional(),
  isActive: variantFields.isActive.optional(),
  position: variantFields.position.optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one change.");

export const createOptionSchema = z.object({
  ...optionFields,
  priceDeltaKobo: optionFields.priceDeltaKobo.default(0),
  isRequired: optionFields.isRequired.default(false),
  maxSelections: optionFields.maxSelections.default(1),
  position: optionFields.position.default(0),
});

export const updateOptionSchema = z.object({
  name: optionFields.name.optional(),
  groupName: optionFields.groupName.optional(),
  priceDeltaKobo: optionFields.priceDeltaKobo.optional(),
  isRequired: optionFields.isRequired.optional(),
  maxSelections: optionFields.maxSelections.optional(),
  position: optionFields.position.optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one change.");
