import { describe, it, expect } from "vitest";
import { sleep } from "../src/index";

describe("sleep.for", () => {
  it("waits at least the given milliseconds", async () => {
    const start = Date.now();
    await sleep.for(50);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(50);
  });
});

describe("sleep.until", () => {
  it("resolves when condition becomes true", async () => {
    let value = false;

    setTimeout(() => {
      value = true;
    }, 60);

    const start = Date.now();
    await sleep.until(() => value, { interval: 10 });
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(60);
  });

  it("throws on timeout", async () => {
    await expect(
      sleep.until(() => false, { timeout: 100, interval: 10 })
    ).rejects.toThrow("timeout");
  });
});

describe("sleep.at", () => {
  it("waits until a future time", async () => {
    const target = new Date(Date.now() + 80);
    const start = Date.now();
    await sleep.at(target);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(80);
  });

  it("returns immediately for past time", async () => {
    const start = Date.now();
    await sleep.at("1990-01-01T00:00:00Z");
    const end = Date.now();
    expect(end - start).toBeLessThan(10); // almost immediate
  });
});
