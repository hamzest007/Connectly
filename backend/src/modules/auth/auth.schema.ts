import {z} from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(60).optional(),
  name: z.string().trim().min(2).max(60).optional(),
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(8).max(72),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),
  phoneNumber: z.string().trim().max(30).optional().default(''),
  acceptedTerms: z.literal(true),
}).refine(value => Boolean(value.fullName ?? value.name), {message: 'Full name is required.', path: ['fullName']});

export const loginSchema = z.object({identifier: z.string().trim().min(1), password: z.string().min(1).max(72)});
