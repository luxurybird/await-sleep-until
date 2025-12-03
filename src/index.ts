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

export class RetryError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastError: unknown,
    message = `Retry failed after ${attempts} attempts`
  ) {
    super(message);
    this.name = 'RetryError';
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

/**
 * Retry an async function with configurable attempts and backoff
 */
export type RetryOptions = {
  attempts?: number;
  delay?: number | ((attempt: number, error: unknown) => number);
  onRetry?: (attempt: number, error: unknown) => void | Promise<void>;
  signal?: AbortSignal;
  retryIf?: (error: unknown) => boolean;
};

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    attempts = 3,
    delay = 1000,
    onRetry,
    signal,
    retryIf = () => true,
  } = options;

  let lastError: unknown;
  let attempt = 0;

  while (attempt < attempts) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!retryIf(error)) {
        throw error;
      }

      attempt++;

      if (attempt >= attempts) {
        throw new RetryError(attempts, lastError);
      }

      if (onRetry) {
        await onRetry(attempt, error);
      }

      const waitTime = typeof delay === 'function' ? delay(attempt, error) : delay;
      if (waitTime > 0) {
        await sleepFor(waitTime);
      }
    }
  }

  throw new RetryError(attempts, lastError!);
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutError?: Error | string
): Promise<T> {
  const timeout = sleepFor(ms).then(() => {
    throw timeoutError instanceof Error
      ? timeoutError
      : new SleepTimeoutError(timeoutError || `Operation timed out after ${ms}ms`);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Debounce a function - only execute after delay has passed since last call
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolve: ((value: ReturnType<T>) => void) | null = null;
  let latestArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    latestArgs = args;

    return new Promise<ReturnType<T>>((res) => {
      resolve = res;

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (resolve && latestArgs) {
          const result = fn.apply(this, latestArgs);
          resolve(result);
          resolve = null;
          latestArgs = null;
        }
        timeoutId = null;
      }, ms);
    });
  };
}

/**
 * Throttle a function - execute at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: ReturnType<T>) => void) | null = null;
  let pendingArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T> | undefined> {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    return new Promise<ReturnType<T> | undefined>((resolve) => {
      if (timeSinceLastCall >= ms) {
        lastCall = now;
        const result = fn.apply(this, args);
        resolve(result);
      } else {
        pendingArgs = args;
        pendingResolve = resolve;

        if (timeoutId === null) {
          timeoutId = setTimeout(() => {
            if (pendingArgs && pendingResolve) {
              lastCall = Date.now();
              const result = fn.apply(this, pendingArgs);
              pendingResolve(result);
              pendingArgs = null;
              pendingResolve = null;
            }
            timeoutId = null;
          }, ms - timeSinceLastCall);
        }
      }
    });
  };
}

/**
 * Race multiple promises with optional timeout
 */
export async function race<T>(
  promises: Promise<T>[],
  timeoutMs?: number
): Promise<T> {
  if (promises.length === 0) {
    throw new Error('race: at least one promise is required');
  }

  if (timeoutMs !== undefined) {
    return withTimeout(Promise.race(promises), timeoutMs);
  }

  return Promise.race(promises);
}

/**
 * Execute promises in parallel with concurrency limit
 */
export async function parallel<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = Infinity
): Promise<T[]> {
  if (concurrency <= 0) {
    throw new Error('parallel: concurrency must be greater than 0');
  }

  if (concurrency === Infinity || concurrency >= tasks.length) {
    return Promise.all(tasks.map((task) => task()));
  }

  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then((result) => {
      results.push(result);
      executing.splice(executing.indexOf(promise), 1);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Execute promises sequentially
 */
export async function sequential<T>(
  tasks: (() => Promise<T>)[]
): Promise<T[]> {
  const results: T[] = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

/**
 * Wait for all promises to settle (fulfilled or rejected)
 */
export async function allSettled<T>(
  promises: Promise<T>[]
): Promise<PromiseSettledResult<T>[]> {
  return Promise.allSettled(promises);
}

/**
 * Wait for any promise to fulfill (ignore rejections)
 */
export async function any<T>(promises: Promise<T>[]): Promise<T> {
  if (promises.length === 0) {
    throw new Error('any: at least one promise is required');
  }
  return Promise.any(promises);
}

/**
 * Create a promise that can be resolved/rejected externally
 */
export function createPromise<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/** Namespace-friendly export */
export const sleep = {
  for: sleepFor,
  until: sleepUntil,
  at: sleepAt,
};

/** Additional async utilities */
export const asyncUtils = {
  retry,
  withTimeout,
  debounce,
  throttle,
  race,
  parallel,
  sequential,
  allSettled,
  any,
  createPromise,
};

export default sleep;
