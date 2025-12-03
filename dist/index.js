"use strict";
// Ultra-polished, modern, race-safe sleep utilities.
// ✔ Strong abort safety + DOMException consistency
// ✔ Safer cleanup
// ✔ Clearer execution flow
// ✔ Narrower condition type inference
// ✔ No unhandled microtasks
// ✔ No async-in-new-Promise anti-pattern
// ✔ Faster control-flow and less branching
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncUtils = exports.sleep = exports.sleepFor = exports.RetryError = exports.SleepTimeoutError = void 0;
exports.sleepUntil = sleepUntil;
exports.sleepAt = sleepAt;
exports.retry = retry;
exports.withTimeout = withTimeout;
exports.debounce = debounce;
exports.throttle = throttle;
exports.race = race;
exports.parallel = parallel;
exports.sequential = sequential;
exports.allSettled = allSettled;
exports.any = any;
exports.createPromise = createPromise;
class SleepTimeoutError extends Error {
    constructor(message = 'sleep.until: timeout exceeded') {
        super(message);
        this.name = 'SleepTimeoutError';
    }
}
exports.SleepTimeoutError = SleepTimeoutError;
class RetryError extends Error {
    constructor(attempts, lastError, message = `Retry failed after ${attempts} attempts`) {
        super(message);
        this.attempts = attempts;
        this.lastError = lastError;
        this.name = 'RetryError';
    }
}
exports.RetryError = RetryError;
const sleepFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.sleepFor = sleepFor;
const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
/**
 * Wait until condition() returns a truthy value.
 * Resolves: value returned by condition()
 * Rejects: timeout, abort, or condition() throws
 */
function sleepUntil(condition, opts = {}) {
    var _a;
    const { interval = 100, timeout = Infinity, signal, backoff } = opts;
    // Fast abort
    if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
        return Promise.reject((_a = signal.reason) !== null && _a !== void 0 ? _a : new DOMException('Aborted', 'AbortError'));
    }
    const start = now();
    let attempt = 0;
    return new Promise((resolve, reject) => {
        // --- Abort Handler ---
        const onAbort = () => {
            var _a;
            cleanup();
            reject((_a = signal.reason) !== null && _a !== void 0 ? _a : new DOMException('Aborted', 'AbortError'));
        };
        if (signal)
            signal.addEventListener('abort', onAbort, { once: true });
        const cleanup = () => {
            if (signal)
                signal.removeEventListener('abort', onAbort);
        };
        const loop = async () => {
            while (true) {
                // In-loop check for race conditions
                if (signal === null || signal === void 0 ? void 0 : signal.aborted)
                    return onAbort();
                let value;
                try {
                    value = await condition();
                }
                catch (err) {
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
                if (wait > 0)
                    await (0, exports.sleepFor)(wait);
            }
        };
        // Kick off without async-in-constructor
        void loop();
    });
}
/** Sleep until a specific date or timestamp */
async function sleepAt(time) {
    const target = typeof time === 'string' ? new Date(time) : time;
    const diff = target.getTime() - Date.now();
    if (diff > 0)
        await (0, exports.sleepFor)(diff);
}
async function retry(fn, options = {}) {
    var _a;
    const { attempts = 3, delay = 1000, onRetry, signal, retryIf = () => true, } = options;
    let lastError;
    let attempt = 0;
    while (attempt < attempts) {
        if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
            throw (_a = signal.reason) !== null && _a !== void 0 ? _a : new DOMException('Aborted', 'AbortError');
        }
        try {
            return await fn();
        }
        catch (error) {
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
                await (0, exports.sleepFor)(waitTime);
            }
        }
    }
    throw new RetryError(attempts, lastError);
}
/**
 * Wrap a promise with a timeout
 */
async function withTimeout(promise, ms, timeoutError) {
    const timeout = (0, exports.sleepFor)(ms).then(() => {
        throw timeoutError instanceof Error
            ? timeoutError
            : new SleepTimeoutError(timeoutError || `Operation timed out after ${ms}ms`);
    });
    return Promise.race([promise, timeout]);
}
/**
 * Debounce a function - only execute after delay has passed since last call
 */
function debounce(fn, ms) {
    let timeoutId = null;
    let resolve = null;
    let latestArgs = null;
    return function (...args) {
        latestArgs = args;
        return new Promise((res) => {
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
function throttle(fn, ms) {
    let lastCall = 0;
    let timeoutId = null;
    let pendingResolve = null;
    let pendingArgs = null;
    return function (...args) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;
        return new Promise((resolve) => {
            if (timeSinceLastCall >= ms) {
                lastCall = now;
                const result = fn.apply(this, args);
                resolve(result);
            }
            else {
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
async function race(promises, timeoutMs) {
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
async function parallel(tasks, concurrency = Infinity) {
    if (concurrency <= 0) {
        throw new Error('parallel: concurrency must be greater than 0');
    }
    if (concurrency === Infinity || concurrency >= tasks.length) {
        return Promise.all(tasks.map((task) => task()));
    }
    const results = [];
    const executing = [];
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
async function sequential(tasks) {
    const results = [];
    for (const task of tasks) {
        results.push(await task());
    }
    return results;
}
/**
 * Wait for all promises to settle (fulfilled or rejected)
 */
async function allSettled(promises) {
    return Promise.allSettled(promises);
}
/**
 * Wait for any promise to fulfill (ignore rejections)
 */
async function any(promises) {
    if (promises.length === 0) {
        throw new Error('any: at least one promise is required');
    }
    // Use native Promise.any if available (ES2021+), otherwise polyfill
    const PromiseAny = Promise.any;
    if (typeof PromiseAny === 'function') {
        return PromiseAny.call(Promise, promises);
    }
    // Polyfill for environments without Promise.any
    const errors = [];
    return new Promise((resolve, reject) => {
        let settled = 0;
        promises.forEach((promise, index) => {
            Promise.resolve(promise).then((value) => resolve(value), (error) => {
                errors[index] = error;
                settled++;
                if (settled === promises.length) {
                    const aggregateError = new Error('All promises were rejected');
                    aggregateError.errors = errors;
                    reject(aggregateError);
                }
            });
        });
    });
}
/**
 * Create a promise that can be resolved/rejected externally
 */
function createPromise() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}
/** Namespace-friendly export */
exports.sleep = {
    for: exports.sleepFor,
    until: sleepUntil,
    at: sleepAt,
};
/** Additional async utilities */
exports.asyncUtils = {
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
exports.default = exports.sleep;
