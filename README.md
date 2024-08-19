# retry

Retry fetch with zero dependency.

## Usage

```js
const Retry = retry()
const response = await Retry(async () => fetch('https://localhost:8080/api/200'))
```

## Install

```
pnpm add -D @patoi/retry
npm add -D @patoi/retry
yarn add -D @patoi/retry
```

## Config

```typescript
type Config = { retries?: number; sleepTime?: number; debug?: boolean }
```

```js
const Retry = retry({ retries: 2, sleepTime: 500, debug: true })
const response = await Retry(async () => fetch('https://localhost:8080/api/200'))
```

Defaults:

- retries: 3
- sleepTime: 1000 ms
- debug: `false`

## Description

Retry request if response is an Error (Timeout, Network, etc. - except `AbortError`) or `Response.status` is 500 or greater.

> DO NOT USE retry() with Promise.{all, allSettled, any, ...}, because it causes sequential requests.

Handles `AbortError`: if request aborted, no more retries, throws `AbortError` immediately.

See tests for more: [examples](test.ts)

Sleep time **increases the delay** between request: when a request is completed, the delayed start beginning, for example (sleepTime is 1s):

- First request starts at 0s (immediately), delay is 0s
- Second at 1s (delay is 1s)
- Third at 3s (delay is 2s)
- Fourth at 6s (delay is 3s)
- Fifth at 10s (delay is 4s)
  and so on..
