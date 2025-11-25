// Improved version of your sleep utilities
// Includes: better AbortSignal handling, safer backoff, JSDoc, Node-friendly timing, cleaner loop

export type UntilOptions = {
  /** Interval between checks (ms). Default: 100 */
  interval?: number;
  /** Max time to wait (ms). Default: Infinity */
  timeout?: number;
  /** Optional AbortSignal */
  signal?: AbortSignal;
  /** Optional exponential/linear backoff function */
  backoff?: (attempt: number) => number;
};

/** Custom timeout error */
export class SleepTimeoutError extends Error {
  constructor(msg = 'sleep.until: timeout exceeded') {
    super(msg);
    this.name = 'SleepTimeoutError';
  }
}

/** Sleep for given milliseconds */
export function sleepFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Wait until condition() returns a truthy value */
export async function sleepUntil<T = unknown>(
  condition: () => T | false | null | undefined | Promise<T | false | null | undefined>,
  options: UntilOptions = {}
): Promise<T> {
  const interval = options.interval ?? 100;
  const timeout = options.timeout ?? Infinity;
  const signal = options.signal;
  const backoff = options.backoff;

  const start = Date.now();
  let attempt = 0;

  return new Promise<T>(async (resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);

    const abortHandler = () => reject(signal?.reason);
    signal?.addEventListener('abort', abortHandler);

    const cleanup = () => signal?.removeEventListener('abort', abortHandler);

    try {
      while (true) {
        if (signal?.aborted) {
          cleanup();
          return reject(signal.reason);
        }

        const value = await condition();
        if (value !== false && value !== undefined && value !== null) {
          cleanup();
          return resolve(value as T);
        }

        const elapsed = Date.now() - start;
        if (elapsed >= timeout) {
          cleanup();
          return reject(new SleepTimeoutError());
        }

        const wait = backoff ? Math.max(0, backoff(attempt++)) : interval;
        await sleepFor(wait);
      }
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

/** Sleep until a specific date or time */
export async function sleepAt(time: string | Date): Promise<void> {
  const target = typeof time === 'string' ? new Date(time) : time;
  const diff = target.getTime() - Date.now();
  if (diff > 0) await sleepFor(diff);
}

/** Convenience wrapper */
export const sleep = {
  for: sleepFor,
  until: sleepUntil,
  at: sleepAt,
};

export default sleep;
