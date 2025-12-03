import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sleepFor,
  sleepUntil,
  sleepAt,
  SleepTimeoutError,
  retry,
  RetryError,
  withTimeout,
  debounce,
  throttle,
  race,
  parallel,
  sequential,
  allSettled,
  any,
  createPromise,
  sleep,
} from "../src/index";

describe("sleep", () => {
  describe("sleepFor", () => {
    it("waits approximately the specified milliseconds", async () => {
      const t = performance.now();
      await sleepFor(50);
      const elapsed = performance.now() - t;
      expect(elapsed).toBeGreaterThan(45);
      expect(elapsed).toBeLessThan(100);
    });

    it("handles zero delay", async () => {
      const start = performance.now();
      await sleepFor(0);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe("sleepUntil", () => {
    it("resolves when condition becomes true", async () => {
      let x = 0;
      setTimeout(() => (x = 1), 50);

      const result = await sleepUntil(() => (x === 1 ? "done" : false), {
        interval: 10,
      });

      expect(result).toBe("done");
    });

    it("resolves with the value returned by condition", async () => {
      let count = 0;
      setTimeout(() => (count = 5), 30);

      const result = await sleepUntil(() => (count === 5 ? count : false), {
        interval: 10,
      });

      expect(result).toBe(5);
    });

    it("throws SleepTimeoutError on timeout", async () => {
      await expect(
        sleepUntil(() => false, { timeout: 50, interval: 10 })
      ).rejects.toBeInstanceOf(SleepTimeoutError);
    });

    it("respects abort signal", async () => {
      const controller = new AbortController();
      const promise = sleepUntil(() => false, {
        interval: 10,
        signal: controller.signal,
      });

      setTimeout(() => controller.abort(), 20);

      await expect(promise).rejects.toThrow();
    });

    it("handles async condition functions", async () => {
      let ready = false;
      setTimeout(() => (ready = true), 30);

      const result = await sleepUntil(async () => {
        await sleepFor(5);
        return ready ? "ready" : false;
      }, { interval: 10 });

      expect(result).toBe("ready");
    });

    it("respects backoff function", async () => {
      const backoffCalls: number[] = [];
      let attempts = 0;

      const backoff = (attempt: number) => {
        backoffCalls.push(attempt);
        return attempt * 10;
      };

      setTimeout(() => {
        attempts = 10;
      }, 100);

      await sleepUntil(() => (attempts === 10 ? true : false), {
        interval: 10,
        backoff,
      });

      expect(backoffCalls.length).toBeGreaterThan(0);
    });

    it("handles condition that throws", async () => {
      await expect(
        sleepUntil(() => {
          throw new Error("Condition error");
        }, { interval: 10 })
      ).rejects.toThrow("Condition error");
    });
  });

  describe("sleepAt", () => {
    it("waits until specified date", async () => {
      const target = new Date(Date.now() + 50);
      const start = performance.now();
      await sleepAt(target);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeGreaterThan(45);
      expect(elapsed).toBeLessThan(100);
    });

    it("handles date string", async () => {
      const target = new Date(Date.now() + 50);
      const start = performance.now();
      await sleepAt(target.toISOString());
      const elapsed = performance.now() - start;
      expect(elapsed).toBeGreaterThan(45);
    });

    it("does not wait if date is in the past", async () => {
      const past = new Date(Date.now() - 1000);
      const start = performance.now();
      await sleepAt(past);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe("sleep namespace", () => {
    it("exports sleep.for", () => {
      expect(sleep.for).toBe(sleepFor);
    });

    it("exports sleep.until", () => {
      expect(sleep.until).toBe(sleepUntil);
    });

    it("exports sleep.at", () => {
      expect(sleep.at).toBe(sleepAt);
    });
  });
});

describe("retry", () => {
  it("succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await retry(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure", async () => {
    let attempts = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) throw new Error("Failed");
      return "success";
    });

    const result = await retry(fn, { attempts: 5, delay: 10 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws RetryError after max attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Always fails"));
    await expect(retry(fn, { attempts: 3, delay: 10 })).rejects.toBeInstanceOf(
      RetryError
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects retryIf condition", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Fatal error"));
    await expect(
      retry(fn, {
        attempts: 3,
        delay: 10,
        retryIf: (error) => error instanceof Error && error.message !== "Fatal error",
      })
    ).rejects.toThrow("Fatal error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry callback", async () => {
    const onRetry = vi.fn();
    let attempts = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) throw new Error("Failed");
      return "success";
    });

    await retry(fn, { attempts: 3, delay: 10, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("respects abort signal", async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error("Failed"));

    const promise = retry(fn, {
      attempts: 5,
      delay: 100,
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 50);
    await expect(promise).rejects.toThrow();
  });

  it("uses dynamic delay function", async () => {
    const delays: number[] = [];
    let attempts = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) throw new Error("Failed");
      return "success";
    });

    await retry(fn, {
      attempts: 3,
      delay: (attempt, error) => {
        const delay = attempt * 10;
        delays.push(delay);
        return delay;
      },
    });

    expect(delays.length).toBeGreaterThan(0);
  });
});

describe("withTimeout", () => {
  it("resolves if promise completes before timeout", async () => {
    const promise = sleepFor(20).then(() => "success");
    const result = await withTimeout(promise, 100);
    expect(result).toBe("success");
  });

  it("rejects if timeout exceeded", async () => {
    const promise = sleepFor(200).then(() => "success");
    await expect(withTimeout(promise, 50)).rejects.toBeInstanceOf(
      SleepTimeoutError
    );
  });

  it("uses custom timeout error", async () => {
    const promise = sleepFor(200).then(() => "success");
    const customError = new Error("Custom timeout");
    await expect(withTimeout(promise, 50, customError)).rejects.toBe(
      customError
    );
  });

  it("uses custom timeout error message", async () => {
    const promise = sleepFor(200).then(() => "success");
    await expect(withTimeout(promise, 50, "Custom message")).rejects.toThrow(
      "Custom message"
    );
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("delays execution", async () => {
    const fn = vi.fn().mockReturnValue("result");
    const debounced = debounce(fn, 100);

    const promise = debounced();
    expect(fn).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    await promise;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("only executes last call", async () => {
    const fn = vi.fn().mockReturnValue("result");
    const debounced = debounce(fn, 100);

    debounced(1);
    debounced(2);
    const promise3 = debounced(3);

    await vi.runAllTimersAsync();
    await promise3;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it("returns promise with result", async () => {
    const fn = vi.fn().mockReturnValue("result");
    const debounced = debounce(fn, 100);

    const promise = debounced();
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe("result");
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("executes immediately on first call", async () => {
    const fn = vi.fn().mockReturnValue("result");
    const throttled = throttle(fn, 100);

    const result = await throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBe("result");
  });

  it("throttles subsequent calls", async () => {
    const fn = vi.fn().mockReturnValue("result");
    const throttled = throttle(fn, 100);

    const promise1 = throttled();
    await promise1;
    expect(fn).toHaveBeenCalledTimes(1);

    throttled();
    const promise3 = throttled();

    await vi.runAllTimersAsync();
    await promise3;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("race", () => {
  it("resolves with first fulfilled promise", async () => {
    const promises = [
      sleepFor(50).then(() => "slow"),
      sleepFor(10).then(() => "fast"),
    ];
    const result = await race(promises);
    expect(result).toBe("fast");
  });

  it("rejects if all promises reject", async () => {
    const promises = [
      Promise.reject(new Error("Error 1")),
      Promise.reject(new Error("Error 2")),
    ];
    await expect(race(promises)).rejects.toThrow();
  });

  it("throws error if no promises provided", async () => {
    await expect(race([])).rejects.toThrow("at least one promise is required");
  });

  it("respects timeout", async () => {
    const promises = [sleepFor(200).then(() => "slow")];
    await expect(race(promises, 50)).rejects.toBeInstanceOf(SleepTimeoutError);
  });
});

describe("parallel", () => {
  it("executes all tasks in parallel", async () => {
    const tasks = [
      () => sleepFor(10).then(() => 1),
      () => sleepFor(10).then(() => 2),
      () => sleepFor(10).then(() => 3),
    ];
    const results = await parallel(tasks);
    expect(results).toEqual([1, 2, 3]);
  });

  it("respects concurrency limit", async () => {
    const executionOrder: number[] = [];
    const tasks = [
      () =>
        sleepFor(50).then(() => {
          executionOrder.push(1);
          return 1;
        }),
      () =>
        sleepFor(50).then(() => {
          executionOrder.push(2);
          return 2;
        }),
      () =>
        sleepFor(50).then(() => {
          executionOrder.push(3);
          return 3;
        }),
    ];

    await parallel(tasks, 2);
    expect(executionOrder.length).toBe(3);
  });

  it("handles empty array", async () => {
    const results = await parallel([]);
    expect(results).toEqual([]);
  });

  it("throws error for invalid concurrency", async () => {
    const tasks = [() => Promise.resolve(1)];
    await expect(parallel(tasks, 0)).rejects.toThrow(
      "concurrency must be greater than 0"
    );
  });
});

describe("sequential", () => {
  it("executes tasks in order", async () => {
    const executionOrder: number[] = [];
    const tasks = [
      () =>
        sleepFor(10).then(() => {
          executionOrder.push(1);
          return 1;
        }),
      () =>
        sleepFor(10).then(() => {
          executionOrder.push(2);
          return 2;
        }),
      () =>
        sleepFor(10).then(() => {
          executionOrder.push(3);
          return 3;
        }),
    ];

    const results = await sequential(tasks);
    expect(results).toEqual([1, 2, 3]);
    expect(executionOrder).toEqual([1, 2, 3]);
  });

  it("handles empty array", async () => {
    const results = await sequential([]);
    expect(results).toEqual([]);
  });
});

describe("allSettled", () => {
  it("waits for all promises to settle", async () => {
    const promises = [
      Promise.resolve("success"),
      Promise.reject(new Error("failure")),
    ];
    const results = await allSettled(promises);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
  });
});

describe("any", () => {
  it("resolves with first fulfilled promise", async () => {
    const promises = [
      Promise.reject(new Error("Error 1")),
      sleepFor(10).then(() => "success"),
      Promise.reject(new Error("Error 2")),
    ];
    const result = await any(promises);
    expect(result).toBe("success");
  });

  it("throws if all promises reject", async () => {
    const promises = [
      Promise.reject(new Error("Error 1")),
      Promise.reject(new Error("Error 2")),
    ];
    await expect(any(promises)).rejects.toThrow();
  });

  it("throws error if no promises provided", async () => {
    await expect(any([])).rejects.toThrow("at least one promise is required");
  });
});

describe("createPromise", () => {
  it("creates a resolvable promise", async () => {
    const { promise, resolve } = createPromise<string>();
    setTimeout(() => resolve("success"), 10);
    const result = await promise;
    expect(result).toBe("success");
  });

  it("creates a rejectable promise", async () => {
    const { promise, reject } = createPromise<string>();
    setTimeout(() => reject(new Error("failure")), 10);
    await expect(promise).rejects.toThrow("failure");
  });

  it("can be resolved with a value", async () => {
    const { promise, resolve } = createPromise<number>();
    resolve(42);
    const result = await promise;
    expect(result).toBe(42);
  });
});
