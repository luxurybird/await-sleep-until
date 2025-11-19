export type UntilOptions = {
  /**
   * How often the condition should be checked (ms)
   */
  interval?: number;

  /**
   * Maximum time to wait before giving up (ms).
   * If exceeded, the promise rejects with an Error.
   */
  timeout?: number;
};

function sleepFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sleepUntil(
  condition: () => boolean | Promise<boolean>,
  options: UntilOptions = {}
): Promise<void> {
  const interval = options.interval ?? 100;
  const timeout = options.timeout ?? Infinity;

  const start = Date.now();

  while (true) {
    if (await condition()) return;

    if (Date.now() - start >= timeout) {
      throw new Error("sleep.until: timeout exceeded");
    }

    await sleepFor(interval);
  }
}

async function sleepAt(time: string | Date): Promise<void> {
  const target = typeof time === "string" ? new Date(time) : time;
  const now = Date.now();
  const diff = target.getTime() - now;

  if (diff <= 0) return; // time already passed
  await sleepFor(diff);
}

export const sleep = {
  for: sleepFor,
  until: sleepUntil,
  at: sleepAt,
};
