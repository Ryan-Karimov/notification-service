const RETRY_DELAYS = [0, 1000, 5000, 30000] as const;

export function getRetryDelay(attemptCount: number): number | null {
  if (attemptCount >= RETRY_DELAYS.length) {
    return null;
  }
  return RETRY_DELAYS[attemptCount] ?? null;
}

export function calculateNextRetryAt(attemptCount: number): Date | null {
  const delay = getRetryDelay(attemptCount);
  if (delay === null) {
    return null;
  }
  return new Date(Date.now() + delay);
}

export function shouldRetry(attemptCount: number, maxAttempts: number): boolean {
  return attemptCount < maxAttempts;
}

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
