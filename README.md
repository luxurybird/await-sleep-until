# await-sleep-until

A comprehensive async utility library for modern JavaScript/TypeScript.  
Wait for **time**, **conditions**, or **events** — plus retry, debounce, throttle, and more — all in a tiny, dependency-free package.

---

## ✨ Features

### Sleep Utilities
- `sleep.for(ms)` — classic delay
- `sleep.until(condition, options?)` — wait until a function becomes true
- `sleep.at(date)` — wait until a specific time in the future

### Async Utilities
- `retry(fn, options?)` — retry failed operations with configurable backoff
- `withTimeout(promise, ms)` — wrap promises with timeout
- `debounce(fn, ms)` — debounce function calls
- `throttle(fn, ms)` — throttle function calls
- `race(promises, timeout?)` — race promises with optional timeout
- `parallel(tasks, concurrency?)` — execute tasks in parallel with concurrency limit
- `sequential(tasks)` — execute tasks one after another
- `allSettled(promises)` — wait for all promises to settle
- `any(promises)` — wait for any promise to fulfill
- `createPromise()` — create externally resolvable promises

### Additional Benefits
- Fully typed TypeScript API
- Zero dependencies
- Works in Node.js, Bun, and Browsers
- Comprehensive test coverage
- AbortSignal support for cancellation

---

## 📦 Installation

```bash
npm install await-sleep-until
```

or

```bash
yarn add await-sleep-until
```

---

## 🚀 Quick Start

**Import individual functions:**

```ts
import { sleep, retry, withTimeout, debounce, throttle } from "await-sleep-until";
```

**Or import the asyncUtils namespace:**

```ts
import { sleep, asyncUtils } from "await-sleep-until";

// Use asyncUtils.retry(), asyncUtils.debounce(), etc.
```

**Or use default export for sleep:**

```ts
import sleep from "await-sleep-until";
// Use sleep.for(), sleep.until(), sleep.at()
```

### Wait for a delay

```ts
await sleep.for(1500); // wait 1.5 seconds
```

### Wait until a condition becomes true

```ts
import fs from "node:fs";

await sleep.until(() => fs.existsSync("done.txt"));
console.log("File appeared!");
```

### Wait until a specific time

```ts
await sleep.at("2025-01-01T00:00:00Z");
console.log("Happy New Year!");
```

### Retry failed operations

```ts
const result = await retry(
  async () => {
    const response = await fetch("https://api.example.com/data");
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  },
  {
    attempts: 3,
    delay: 1000, // wait 1s between retries
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}:`, error);
    },
  }
);
```

### Add timeout to promises

```ts
const data = await withTimeout(
  fetch("https://api.example.com/data").then(r => r.json()),
  5000, // 5 second timeout
  "Request timed out"
);
```

### Debounce function calls

```ts
const debouncedSearch = debounce(async (query: string) => {
  const results = await searchAPI(query);
  return results;
}, 300);

// Only executes 300ms after last call
const results = await debouncedSearch("typescript");
```

### Throttle function calls

```ts
const throttledScroll = throttle((event: Event) => {
  console.log("Scroll event");
}, 100);

// Executes at most once per 100ms
window.addEventListener("scroll", throttledScroll);
```

### Execute tasks in parallel with concurrency limit

```ts
const tasks = [
  () => fetchUser(1),
  () => fetchUser(2),
  () => fetchUser(3),
  () => fetchUser(4),
];

// Execute max 2 at a time
const users = await parallel(tasks, 2);
```

### Execute tasks sequentially

```ts
const results = await sequential([
  () => createUser({ name: "Alice" }),
  () => createPost({ userId: 1, title: "Hello" }),
  () => sendNotification(1),
]);
```

---

## ⚙️ API Reference

### Sleep Utilities

#### **sleep.for(ms: number): Promise<void>**

Waits the given milliseconds.

```ts
await sleep.for(1000); // wait 1 second
```

---

#### **sleep.until(condition, options?): Promise<T>**

Wait until a condition function returns a truthy value.

**Parameters:**
- `condition` — function returning `T | false | null | undefined | Promise<T | false | null | undefined>`
- `options.interval` — how often to check (default: `100ms`)
- `options.timeout` — max time before rejecting (default: `Infinity`)
- `options.signal` — `AbortSignal` for cancellation
- `options.backoff` — function `(attempt: number) => number` for custom backoff

**Example:**

```ts
await sleep.until(() => somethingIsReady(), {
  interval: 200,
  timeout: 5000,
  signal: abortController.signal,
});
```

---

#### **sleep.at(time: string | Date): Promise<void>**

Wait until a specific date or time.

```ts
await sleep.at("2025-01-01T00:00:00Z");
await sleep.at(new Date(Date.now() + 5000));
```

---

### Async Utilities

#### **retry(fn, options?): Promise<T>**

Retry an async function with configurable attempts and backoff.

**Parameters:**
- `fn` — async function to retry
- `options.attempts` — number of attempts (default: `3`)
- `options.delay` — delay between retries in ms, or function `(attempt, error) => number` (default: `1000`)
- `options.onRetry` — callback `(attempt, error) => void | Promise<void>`
- `options.signal` — `AbortSignal` for cancellation
- `options.retryIf` — function `(error) => boolean` to determine if error should be retried (default: always retry)

**Example:**

```ts
const result = await retry(
  () => fetchData(),
  {
    attempts: 5,
    delay: (attempt, error) => attempt * 1000, // exponential backoff
    retryIf: (error) => error.status !== 404, // don't retry 404s
  }
);
```

**Throws:** `RetryError` if all attempts fail

---

#### **withTimeout(promise, ms, timeoutError?): Promise<T>**

Wrap a promise with a timeout.

**Parameters:**
- `promise` — promise to wrap
- `ms` — timeout in milliseconds
- `timeoutError` — optional custom error or error message

**Example:**

```ts
const data = await withTimeout(
  fetchData(),
  5000,
  "Request took too long"
);
```

**Throws:** `SleepTimeoutError` or custom error on timeout

---

#### **debounce(fn, ms): (...args) => Promise<ReturnType<T>>**

Debounce a function — only execute after delay has passed since last call.

**Parameters:**
- `fn` — function to debounce
- `ms` — delay in milliseconds

**Example:**

```ts
const debouncedSave = debounce(async (data) => {
  await saveToServer(data);
}, 500);

debouncedSave({ name: "Alice" });
debouncedSave({ name: "Bob" }); // Only this call executes
```

---

#### **throttle(fn, ms): (...args) => Promise<ReturnType<T> | undefined>**

Throttle a function — execute at most once per interval.

**Parameters:**
- `fn` — function to throttle
- `ms` — interval in milliseconds

**Example:**

```ts
const throttledLog = throttle((message) => {
  console.log(message);
}, 1000);

throttledLog("Message 1"); // Executes immediately
throttledLog("Message 2"); // Queued
throttledLog("Message 3"); // Queued (replaces Message 2)
```

---

#### **race(promises, timeoutMs?): Promise<T>**

Race multiple promises with optional timeout.

**Parameters:**
- `promises` — array of promises
- `timeoutMs` — optional timeout in milliseconds

**Example:**

```ts
const result = await race([
  fetchFromServer1(),
  fetchFromServer2(),
], 5000); // 5 second timeout
```

---

#### **parallel(tasks, concurrency?): Promise<T[]>**

Execute tasks in parallel with optional concurrency limit.

**Parameters:**
- `tasks` — array of functions returning promises
- `concurrency` — max concurrent executions (default: `Infinity`)

**Example:**

```ts
const results = await parallel([
  () => fetchUser(1),
  () => fetchUser(2),
  () => fetchUser(3),
], 2); // max 2 at a time
```

---

#### **sequential(tasks): Promise<T[]>**

Execute tasks one after another.

**Parameters:**
- `tasks` — array of functions returning promises

**Example:**

```ts
const results = await sequential([
  () => createUser(),
  () => createPost(),
  () => sendEmail(),
]);
```

---

#### **allSettled(promises): Promise<PromiseSettledResult<T>[]>**

Wait for all promises to settle (fulfilled or rejected).

**Parameters:**
- `promises` — array of promises

**Example:**

```ts
const results = await allSettled([
  fetchUser(1),
  fetchUser(2),
  fetchUser(999), // might fail
]);

results.forEach((result) => {
  if (result.status === "fulfilled") {
    console.log("Success:", result.value);
  } else {
    console.log("Failed:", result.reason);
  }
});
```

---

#### **any(promises): Promise<T>**

Wait for any promise to fulfill (ignores rejections).

**Parameters:**
- `promises` — array of promises

**Example:**

```ts
const result = await any([
  fetchFromPrimaryServer(),
  fetchFromBackupServer(),
  fetchFromCache(),
]); // Returns first successful result
```

---

#### **createPromise(): { promise, resolve, reject }**

Create a promise that can be resolved/rejected externally.

**Example:**

```ts
const { promise, resolve, reject } = createPromise<string>();

setTimeout(() => resolve("Success!"), 1000);

const result = await promise; // "Success!"
```

---

## 🧪 Testing

This package includes comprehensive test coverage with Vitest.

**Run tests:**

```bash
npm test
```

**Watch mode:**

```bash
npm run test:watch
```

**Build:**

```bash
npm run build
```

The test suite covers:
- All sleep utilities (for, until, at)
- Retry logic with various configurations
- Timeout wrappers
- Debounce and throttle behavior
- Parallel and sequential execution
- Promise utilities (race, any, allSettled)
- Error handling and edge cases

---

## 🔄 GitHub Actions CI

The project includes CI that runs:

- TypeScript build
- Vitest test suite

Automatically on every push and pull request.

---

## 🤝 Contributing

Contributions are welcome!

Whether you want to:

- report a bug
- submit a pull request
- improve documentation
- suggest new features
- or help refine the API

…your input is appreciated.

### How to contribute

1. **Open an issue** for bugs, feature requests, or questions.
2. **Submit a pull request** — all PRs are reviewed.
3. Follow standard TypeScript style and ensure the test suite passes.
4. If adding features, include tests where appropriate.

### Bug Reports

If you encounter a bug:

- Describe the issue clearly
- Include reproduction steps
- Provide environment details (Node version, OS, etc.)

This helps maintainers fix the issue quickly.

---

## 📜 License

MIT © luxurybird
