import {z} from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/),
});

export const loginSchema = z.object({identifier: z.string().trim().min(1), password: z.string().min(1).max(72)});
