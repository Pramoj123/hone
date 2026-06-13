/**
 * Startup env validation — called by ConfigModule.forRoot({ validate }).
 * Throws at boot time if any required variable is absent so misconfigured
 * deployments fail fast instead of sending emails from undefined addresses.
 */

interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  APP_WEB_URL: string;
  APP_ADMIN_URL: string;
  // Optional — AI generation (endpoints return 503 when NVIDIA_API_KEY is unset)
  NVIDIA_API_KEY?: string;
  NVIDIA_BASE_URL?: string;
  NVIDIA_MODEL?: string;
  AI_DAILY_LIMIT?: string;
  [key: string]: unknown;
}

const REQUIRED: (keyof EnvConfig)[] = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'APP_WEB_URL',
  'APP_ADMIN_URL',
];

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const missing = REQUIRED.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `[Config] Missing required environment variables:\n${missing.map((k) => `  • ${k}`).join('\n')}\n` +
      `Check your .env file (see .env.example for reference).`,
    );
  }

  return config as EnvConfig;
}
