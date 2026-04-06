import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.string().default("4000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_SECRET: z.string().min(12, "JWT_SECRET must be at least 12 characters"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  API_BASE_URL: z.string().url()
});

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}

