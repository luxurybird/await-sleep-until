import { describe, it, expect } from 'vitest';
import { sleepFor, sleepUntil, SleepTimeoutError } from '../src/index';

describe('sleep', () => {
  it('sleepFor waits ~50ms', async () => {
    const t = performance.now();
    await sleepFor(50);
    expect(performance.now() - t).toBeGreaterThan(45);
  });

  it('sleepUntil resolves when condition true', async () => {
    let x = 0;

    setTimeout(() => (x = 1), 50);

    const result = await sleepUntil(() => (x === 1 ? 'done' : false), { interval: 10 });

    expect(result).toBe('done');
  });

  it('sleepUntil throws on timeout', async () => {
    await expect(sleepUntil(() => false, { timeout: 50, interval: 10 })).rejects.toBeInstanceOf(SleepTimeoutError);
  });
});
