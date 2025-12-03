export type UntilOptions = {
    interval?: number;
    timeout?: number;
    signal?: AbortSignal;
    backoff?: (attempt: number) => number;
};
export declare class SleepTimeoutError extends Error {
    constructor(message?: string);
}
export declare class RetryError extends Error {
    readonly attempts: number;
    readonly lastError: unknown;
    constructor(attempts: number, lastError: unknown, message?: string);
}
export declare const sleepFor: (ms: number) => Promise<void>;
/**
 * Wait until condition() returns a truthy value.
 * Resolves: value returned by condition()
 * Rejects: timeout, abort, or condition() throws
 */
export declare function sleepUntil<T = unknown>(condition: () => T | false | null | undefined | Promise<T | false | null | undefined>, opts?: UntilOptions): Promise<T>;
/** Sleep until a specific date or timestamp */
export declare function sleepAt(time: string | Date): Promise<void>;
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
export declare function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
/**
 * Wrap a promise with a timeout
 */
export declare function withTimeout<T>(promise: Promise<T>, ms: number, timeoutError?: Error | string): Promise<T>;
/**
 * Debounce a function - only execute after delay has passed since last call
 */
export declare function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => Promise<ReturnType<T>>;
/**
 * Throttle a function - execute at most once per interval
 */
export declare function throttle<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined>;
/**
 * Race multiple promises with optional timeout
 */
export declare function race<T>(promises: Promise<T>[], timeoutMs?: number): Promise<T>;
/**
 * Execute promises in parallel with concurrency limit
 */
export declare function parallel<T>(tasks: (() => Promise<T>)[], concurrency?: number): Promise<T[]>;
/**
 * Execute promises sequentially
 */
export declare function sequential<T>(tasks: (() => Promise<T>)[]): Promise<T[]>;
/**
 * Wait for all promises to settle (fulfilled or rejected)
 */
export declare function allSettled<T>(promises: Promise<T>[]): Promise<PromiseSettledResult<T>[]>;
/**
 * Wait for any promise to fulfill (ignore rejections)
 */
export declare function any<T>(promises: Promise<T>[]): Promise<T>;
/**
 * Create a promise that can be resolved/rejected externally
 */
export declare function createPromise<T>(): {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
};
/** Namespace-friendly export */
export declare const sleep: {
    for: (ms: number) => Promise<void>;
    until: typeof sleepUntil;
    at: typeof sleepAt;
};
/** Additional async utilities */
export declare const asyncUtils: {
    retry: typeof retry;
    withTimeout: typeof withTimeout;
    debounce: typeof debounce;
    throttle: typeof throttle;
    race: typeof race;
    parallel: typeof parallel;
    sequential: typeof sequential;
    allSettled: typeof allSettled;
    any: typeof any;
    createPromise: typeof createPromise;
};
export default sleep;
