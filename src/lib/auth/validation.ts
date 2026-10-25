import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import { PIN_LENGTH } from "./constants";

export const channelSchema = z.enum(["SMS", "WHATSAPP"]);

export function normalizePhone(input: string) {
  const parsed = parsePhoneNumberFromString(input.trim(), "NG");
  if (!parsed?.isValid()) throw new Error("Enter a valid phone number.");
  return parsed.number;
}

const phoneInput = z.string().min(7).max(24).transform((value, context) => {
  try {
    return normalizePhone(value);
  } catch {
    context.addIssue({ code: "custom", message: "Enter a valid phone number." });
    return z.NEVER;
  }
});

export const requestOtpSchema = z.object({
  preferredName: z.string().trim().min(2, "Tell us what to call you.").max(50).optional(),
  phone: phoneInput,
  channel: channelSchema,
  purpose: z.enum(["REGISTRATION", "PIN_RESET"]).default("REGISTRATION"),
}).superRefine((value, context) => {
  if (value.purpose === "REGISTRATION" && !value.preferredName) {
    context.addIssue({ code: "custom", path: ["preferredName"], message: "Tell us what to call you." });
  }
});

export const verifyOtpSchema = z.object({
  challengeId: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const completeRegistrationSchema = z.object({
  verificationToken: z.string().min(1),
  pin: z.string().regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `Use a ${PIN_LENGTH}-digit PIN.`),
  referralCode: z.string().trim().toUpperCase().min(4).max(24).optional(),
});

export const loginSchema = z.object({
  phone: phoneInput,
  pin: z.string().regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `Use your ${PIN_LENGTH}-digit PIN.`),
});
