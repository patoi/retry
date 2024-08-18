import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupServer } from 'msw/node'
import { delay, http, HttpResponse } from 'msw'

import retry, { RetryResponeType } from './index.js'

let requestCounter = 0
const handlers = [
  http.all('https://localhost:8080/api/:status', async ({ params }) => {
    await delay(100)
    return HttpResponse.json({}, { status: parseInt(params.status as string) })
  }),
  http.all('https://localhost:8080/retry', async () => {
    await delay(100)
    if (requestCounter === 0) {
      requestCounter++
      return HttpResponse.json({}, { status: 500 })
    } else {
      requestCounter = 0
      return HttpResponse.json({}, { status: 200 })
    }
  }),
  http.all('https://localhost:8080/http500', async () => {
    await delay(100)
    return HttpResponse.json({}, { status: 500 })
  }),
  http.all('https://localhost:8080/error', async () => {
    await delay(100)
    if (requestCounter < 2) {
      requestCounter++
      return HttpResponse.error()
    } else {
      requestCounter = 0
      return HttpResponse.json({}, { status: 200 })
    }
  }),
  http.all('https://localhost:8080/abort', async () => {
    await delay(100)
    return HttpResponse.error()
  })
]
const server = setupServer(...handlers)

before(() => server.listen())
beforeEach(() => server.resetHandlers())
after(() => server.close())

describe('retry test', () => {
  it('success on first request, HTTP200', async () => {
    const Retry = retry({ debug: false })
    try {
      const response = await Retry(async () => fetch('https://localhost:8080/api/200'))
      assert.strictEqual(response?.status, 200)
      assert.strictEqual((response as RetryResponeType)!.count, 1)
    } catch (error) {
      assert.fail(error as Error)
    }
  })

  it('success on first request, HTTP3xx an HTTP4xx', async () => {
    const Retry = retry({ debug: false })
    try {
      const response = await Retry(async () => fetch('https://localhost:8080/api/404'))
      assert.strictEqual(response?.status, 404)
      assert.strictEqual((response as RetryResponeType)!.count, 1)
    } catch (error) {
      assert.fail(error as Error)
    }
  })

  it('first request result is HTTP500, success on second request, HTTP200', async () => {
    const Retry = retry({ debug: false })
    try {
      const response = await Retry(async () => fetch('https://localhost:8080/retry'))
      // request retried because response was HTTP500, success on second request
      assert.strictEqual(response?.status, 200)
      assert.strictEqual((response as RetryResponeType)!.count, 2)
    } catch (error) {
      assert.fail(error as Error)
    }
  })

  it('all request result is HTTP500, retried three times', async () => {
    const Retry = retry({ debug: false })
    try {
      const response = await Retry(async () => fetch('https://localhost:8080/http500'))
      assert.strictEqual(response?.status, 500)
      assert.strictEqual((response as RetryResponeType)!.count, 3)
    } catch (error) {
      assert.fail(error as Error)
    }
  })

  it('network failure for the first and second requests, and success for the third', async () => {
    const Retry = retry({ debug: false })
    try {
      const response = await Retry(async () => fetch('https://localhost:8080/error'))
      assert.strictEqual(response?.status, 200)
      assert.strictEqual((response as RetryResponeType)!.count, 3)
    } catch (error) {
      assert.fail(error as Error)
    }
  })

  /**
   * Aborting request means, we do not try again.
   */
  it('aborted request', async () => {
    const controller = new AbortController()

    async function myApiRequest() {
      const signal = controller.signal
      signal.addEventListener('abort', () => {
        Promise.reject(signal.reason)
      })
      return fetch('https://localhost:8080/abort', { signal })
    }

    const Retry = retry({ debug: false })
    await assert.rejects(
      async () => {
        controller.abort()
        await Retry(myApiRequest)
      },
      { name: 'AbortError', count: 1 }
    )
  })

  it('success on Promise.all request, no retrying', async () => {
    const Retry = retry({ debug: false })
    try {
      const response = await Promise.all([
        Retry(async () => fetch('https://localhost:8080/api/404')),
        Retry(async () => fetch('https://localhost:8080/api/404'))
      ])
      assert.strictEqual(response[0]?.status, 404)
      assert.strictEqual(response[1]?.status, 404)
      assert.strictEqual((response[0] as RetryResponeType)!.count, 1)
      assert.strictEqual((response[1] as RetryResponeType)!.count, 1)
    } catch (error) {
      assert.fail(error as Error)
    }
  })

  it('success on Promise.all request, one request retrying', async () => {
    const Retry = retry({ debug: false })
    try {
      const response = await Promise.all([
        Retry(async () => fetch('https://localhost:8080/retry')),
        Retry(async () => fetch('https://localhost:8080/api/404'))
      ])
      assert.strictEqual(response[0]?.status, 200)
      assert.strictEqual(response[1]?.status, 404)
      assert.strictEqual((response[0] as RetryResponeType)!.count, 2)
      assert.strictEqual((response[1] as RetryResponeType)!.count, 1)
    } catch (error) {
      assert.fail(error as Error)
    }
  })

  /**
   * Aborting request means, we do not try again.
   */
  it('on Promise.all, all request aborted', async () => {
    const controller = new AbortController()

    async function myApiRequest1() {
      const signal = controller.signal
      signal.addEventListener('abort', () => {
        Promise.reject(signal.reason)
      })
      return fetch('https://localhost:8080/abort', { signal })
    }

    async function myApiRequest2() {
      const signal = controller.signal
      signal.addEventListener('abort', () => {
        Promise.reject(signal.reason)
      })
      return fetch('https://localhost:8080/abort', { signal })
    }

    const Retry = retry({ debug: false })
    await assert.rejects(
      async () => {
        controller.abort()
        await Promise.all([Retry(myApiRequest1), Retry(myApiRequest2)])
      },
      { name: 'AbortError', count: 1 }
    )
  })
})
