import { z } from 'zod';

/**
 * Security validation schemas using Zod
 * These schemas enforce input constraints to prevent injection attacks and data corruption
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required" })
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

export const passwordSchema = z
  .string()
  .min(6, { message: "Password must be at least 6 characters" })
  .max(128, { message: "Password must be less than 128 characters" });

export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(100, { message: "Name must be less than 100 characters" })
  .regex(/^[a-zA-Z\s\-']+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" });

export const urlSchema = z
  .string()
  .trim()
  .url({ message: "Invalid URL format" })
  .max(2048, { message: "URL must be less than 2048 characters" })
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: "URL must use http or https protocol" }
  );

export const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (url) => {
      if (!url || url === '') return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: "URL must use http or https protocol" }
  );

export const textContentSchema = z
  .string()
  .trim()
  .max(10000, { message: "Content must be less than 10000 characters" });

export const companySchema = z
  .string()
  .trim()
  .max(200, { message: "Company name must be less than 200 characters" })
  .optional();

// Combined schemas for forms
export const signUpSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema
});

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const inviteSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  company: companySchema
});
