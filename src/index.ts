export type UntilOptions = {
  interval?: number;
  timeout?: number;
  signal?: AbortSignal;
  backoff?: (attempt: number) => number;
};

export class SleepTimeoutError extends Error {
  constructor(msg = 'sleep.until: timeout exceeded') {
    super(msg);
    this.name = 'SleepTimeoutError';
  }
}

export function sleepFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleepUntil<T = unknown>(
  condition: () => T | false | Promise<T | false>,
  options: UntilOptions = {}
): Promise<T> {
  const interval = options.interval ?? 100;
  const timeout = options.timeout ?? Infinity;
  const signal = options.signal;
  const backoff = options.backoff;

  const start = performance.now();
  let attempt = 0;

  return new Promise<T>(async (resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);

    const abortHandler = () => reject(signal?.reason);
    signal?.addEventListener('abort', abortHandler);

    try {
      while (true) {
        const value = await condition();
        if (value !== false) {
          signal?.removeEventListener('abort', abortHandler);
          return resolve(value);
        }

        const elapsed = performance.now() - start;
        if (elapsed >= timeout) {
          return reject(new SleepTimeoutError());
        }

        const wait = backoff ? backoff(attempt++) : interval;

        await sleepFor(wait);
      }
    } catch (err) {
      reject(err);
    } finally {
      signal?.removeEventListener('abort', abortHandler);
    }
  });
}

export async function sleepAt(time: string | Date): Promise<void> {
  const target = typeof time === 'string' ? new Date(time) : time;
  const diff = target.getTime() - Date.now();
  if (diff > 0) await sleepFor(diff);
}

export const sleep = {
  for: sleepFor,
  until: sleepUntil,
  at: sleepAt,
};
