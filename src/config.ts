import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Define the environment schema using Zod
const EnvSchema = z.object({
  POLL_URL: z.string().url(),
  POLL_INTERVAL: z.coerce.number().int().positive(),
  DISCORD_WEBHOOK_URL: z.string().url(),
});

// Type for the loaded environment
type Env = z.infer<typeof EnvSchema>;

/**
 * Loads and validates environment variables
 */
export function loadEnvs(): Env {
  try {
    // Load environment variables
    const env = {
      POLL_URL: process.env.POLL_URL,
      POLL_INTERVAL: process.env.POLL_INTERVAL,
      DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    };

    // Validate environment variables
    const result = EnvSchema.safeParse(env);
    
    if (!result.success) {
      console.error('Invalid environment configuration:');
      result.error.issues.forEach(issue => {
        console.error(`- ${issue.path.join('.')}: ${issue.message}`);
      });
      throw new Error('Invalid environment configuration');
    }
    
    return result.data;
  } catch (error) {
    throw error;
  }
}
export const payloadSchema = z.object({
    id: z.string(),
    daily_active_users: z.coerce.number(),
    weekly_active_users: z.coerce.number(),
    monthly_active_users: z.coerce.number(),
});

export type Payload = z.infer<typeof payloadSchema>;
