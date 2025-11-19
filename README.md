# await-sleep-until

A smarter sleep utility for modern async JavaScript/TypeScript.  
Wait for **time**, **conditions**, or **events** — with a tiny, dependency-free package.

---

## ✨ Features

- `sleep.for(ms)` — classic delay
- `sleep.until(condition, options?)` — wait until a function becomes true
- `sleep.at(date)` — wait until a specific time in the future
- Fully typed TypeScript API
- No dependencies
- Works in Node.js, Bun, and Browsers

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

### **sleep.for(ms: number): Promise<void>**

Waits the given milliseconds.

---

### **sleep.until(fn, options?): Promise<void>**

#### Parameters

- `fn` — a function returning `boolean` or `Promise<boolean>`
- `options.interval` — how often to check (default: `100ms`)
- `options.timeout` — max time before rejecting (default: no timeout)

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

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

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
