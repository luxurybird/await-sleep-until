# await-sleep-until

A smarter sleep utility for modern async JavaScript/TypeScript.\
Wait for **time**, **conditions**, or **events** --- with a tiny
dependency-free package.

---

## ✨ Features

- `sleep.for(ms)` -- classic delay
- `sleep.until(condition, options?)` -- wait until a function becomes true
- `sleep.at(date)` -- wait until a specific time in the future
- Fully typed TypeScript API
- No dependencies
- Works in Node.js, Bun, and Browsers

---

## 📦 Installation

    npm install await-sleep-until

or

    yarn add await-sleep-until

---

## 🚀 Quick Start

```ts
import { sleep } from "await-sleep-until";
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

---

## ⚙️ API

### **sleep.for(ms: number): Promise`<void>`**

Waits the given milliseconds.

---

### **sleep.until(fn, options?): Promise`<void>`**

#### Parameters

- `fn` --- a function returning `boolean` or `Promise<boolean>`
- `options.interval` --- how often to check (default: `100ms`)
- `options.timeout` --- max time before rejecting (default: no
  timeout)

#### Example

```ts
await sleep.until(() => somethingIsReady(), {
  interval: 200,
  timeout: 5000,
});
```

---

## 🧪 Testing (Vitest)

This package includes a full test suite.

Run:

    npm test

Watch mode:

    npm run test:watch

---

## 🔄 GitHub Actions CI

The project includes CI that runs:

- TypeScript build
- Vitest test suite

Automatically on every push and pull request.

---

## 📁 Project Structure

    src/
      index.ts
    tests/
      sleep.test.ts
    .github/
      workflows/
        ci.yml

---

## 📜 License

MIT © luxurybird
