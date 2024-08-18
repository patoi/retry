const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export type RetryResponeType = (Response & { count: number }) | undefined
export type RetryErrorType = (Error & { count: number }) | undefined
type RetryFunctionType = () => Promise<Response>

let MAX_RETRY = 3
let SLEEP_TIME = 1000
let DEBUG = false

async function retryHandler(fn: RetryFunctionType) {
  const _fn: RetryFunctionType = fn
  let sleepTime = 100
  let lastError: RetryErrorType
  let lastResponse: RetryResponeType
  let count = 0

  function debug(log: string) {
    if (DEBUG) {
      console.debug((_fn.name || 'anonymous') + ' - ' + count + '.', log)
    }
  }

  /**
   * Delay retry call.
   * It will be called when error occurs or status code is 500 and above.
   * Since retry results can be mixed e.g. [error, HTTP500, error, HTTP500],
   * the same waiting time generator should be applied in both cases.
   */
  async function delay() {
    sleepTime = sleepTime + SLEEP_TIME
    debug('retry after: ' + sleepTime + ' ms')
    await sleep(sleepTime)
  }

  /**
   * Retry async function call, if result is an error.
   */
  async function* retry() {
    while (count < MAX_RETRY) {
      count++
      lastError = undefined
      try {
        yield _fn()
      } catch (error) {
        lastError = error as RetryErrorType
        debug('retry error: ' + lastError!.name)
        // aborted request, do not retry again
        if ((error as Error).name === 'AbortError') {
          ;(error as RetryErrorType)!.count = count
          debug('Abort error has occured')
          break
        }
        // do not wait after last call
        if (count < MAX_RETRY - 1) {
          debug('start sleep: ' + sleepTime)
          await delay()
        }
      }
    }
  }

  for await (const response of retry()) {
    lastResponse = response as RetryResponeType
    const status = (response as Response)?.status
    debug('status: ' + status)
    if (status && status < 500) {
      // processing is successful if status code is less than 500
      debug('success fetch: ' + status)
      break
    } else {
      // retry
      // processing is unsuccessful if status code is 500 and above
      debug('retry fetch: ' + status)
      await delay()
    }
  }
  debug('done')
  // if last call is an error, then throw again...
  if (lastError) {
    lastError.count = count
    throw lastError
  }
  // ... or return with the last response
  lastResponse!.count = count
  return lastResponse
}

type Config = { retries?: number; sleepTime?: number; debug?: boolean }

/**
 * Retry fetch.
 * @param config
 * @param config.retries number of retries
 * @param config.sleepTime sleep time between retry calls; increase delay with sleep time and start delay after the last call
 * @param config.debug true, writes log with console.debug(...)
 * @returns
 */
export default function (
  config: Config = {}
): (fn: RetryFunctionType) => Promise<Response | undefined> {
  MAX_RETRY = config?.retries || 3
  SLEEP_TIME = config?.sleepTime || 1000
  DEBUG = config?.debug ?? false
  return retryHandler
}
