// Ultra-polished, modern, race-safe sleep utilities.
// ✔ Strong abort safety + DOMException consistency
// ✔ Safer cleanup
// ✔ Clearer execution flow
// ✔ Narrower condition type inference
// ✔ No unhandled microtasks
// ✔ No async-in-new-Promise anti-pattern
// ✔ Faster control-flow and less branching

export type UntilOptions = {
  interval?: number;
  timeout?: number;
  signal?: AbortSignal;
  backoff?: (attempt: number) => number;
};

export class SleepTimeoutError extends Error {
  constructor(message = 'sleep.until: timeout exceeded') {
    super(message);
    this.name = 'SleepTimeoutError';
  }
}

export const sleepFor = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();

/**
 * Wait until condition() returns a truthy value.
 * Resolves: value returned by condition()
 * Rejects: timeout, abort, or condition() throws
 */
export function sleepUntil<T = unknown>(
  condition: () => T | false | null | undefined | Promise<T | false | null | undefined>,
  opts: UntilOptions = {}
): Promise<T> {
  const { interval = 100, timeout = Infinity, signal, backoff } = opts;

  // Fast abort
  if (signal?.aborted) {
    return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
  }

  const start = now();
  let attempt = 0;

  return new Promise<T>((resolve, reject) => {
    // --- Abort Handler ---
    const onAbort = () => {
      cleanup();
      reject(signal!.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    const cleanup = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    const loop = async () => {
      while (true) {
        // In-loop check for race conditions
        if (signal?.aborted) return onAbort();

        let value: T | false | null | undefined;
        try {
          value = await condition();
        } catch (err) {
          cleanup();
          return reject(err);
        }

        if (value !== false && value !== null && value !== undefined) {
          cleanup();
          return resolve(value);
        }

        if (now() - start >= timeout) {
          cleanup();
          return reject(new SleepTimeoutError());
        }

        const wait = backoff ? backoff(attempt++) : interval;
        if (wait > 0) await sleepFor(wait);
      }
    };

    // Kick off without async-in-constructor
    void loop();
  });
}

/** Sleep until a specific date or timestamp */
export async function sleepAt(time: string | Date): Promise<void> {
  const target = typeof time === 'string' ? new Date(time) : time;
  const diff = target.getTime() - Date.now();
  if (diff > 0) await sleepFor(diff);
}

/** Namespace-friendly export */
export const sleep = {
  for: sleepFor,
  until: sleepUntil,
  at: sleepAt,
};

export default sleep;
