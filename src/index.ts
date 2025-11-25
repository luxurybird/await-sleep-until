// Ultra-polished version with:
// ✔ Safer AbortSignal handling
// ✔ Better typings & return narrowing
// ✔ Proper backoff safety
// ✔ Cancellation promise race support
// ✔ High-precision timers where available
// ✔ Clearer control flow
// ✔ Consistent cleanup
// ✔ JSDoc everywhere
// ✔ Smaller + faster internal loop

export type UntilOptions = {
  /** Interval between condition checks in milliseconds (default: 100ms). */
  interval?: number;
  /** Maximum allowed time for waiting (default: Infinity). */
  timeout?: number;
  /** Optional AbortSignal to cancel early. */
  signal?: AbortSignal;
  /** Optional backoff function. Return millis to wait. */
  backoff?: (attempt: number) => number;
};

/** Error thrown when sleepUntil times out */
export class SleepTimeoutError extends Error {
  constructor(message = 'sleep.until: timeout exceeded') {
    super(message);
    this.name = 'SleepTimeoutError';
  }
}

/** Sleep for a given number of milliseconds */
export function sleepFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Utility: choose high-resolution timer when possible */
function now(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/**
 * Wait until `condition()` returns a truthy value.
 * - Resolves with the returned value
 * - Rejects on timeout or abort
 * - Supports interval or backoff-based waits
 */
export async function sleepUntil<T = unknown>(
  condition: () => T | false | null | undefined | Promise<T | false | null | undefined>,
  options: UntilOptions = {}
): Promise<T> {
  const interval = options.interval ?? 100;
  const timeout = options.timeout ?? Infinity;
  const signal = options.signal;
  const backoff = options.backoff;

  const start = now();
  let attempt = 0;

  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);

    const abortHandler = () => reject(signal?.reason);
    signal?.addEventListener('abort', abortHandler);

    const cleanup = () => signal?.removeEventListener('abort', abortHandler);

    const loop = async () => {
      try {
        while (true) {
          if (signal?.aborted) {
            cleanup();
            return reject(signal.reason);
          }

          const value = await condition();
          if (value !== false && value !== undefined && value !== null) {
            cleanup();
            return resolve(value);
          }

          const elapsed = now() - start;
          if (elapsed >= timeout) {
            cleanup();
            return reject(new SleepTimeoutError());
          }

          const delay = backoff ? Math.max(0, backoff(attempt++)) : interval;
          await sleepFor(delay);
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    loop();
  });
}

/** Sleep until a specific date or timestamp */
export async function sleepAt(time: string | Date): Promise<void> {
  const target = typeof time === 'string' ? new Date(time) : time;
  const diff = target.getTime() - Date.now();
  if (diff > 0) await sleepFor(diff);
}

/** Fully packaged namespace */
export const sleep = {
  for: sleepFor,
  until: sleepUntil,
  at: sleepAt,
};

export default sleep;
