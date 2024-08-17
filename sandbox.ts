const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

let simCount = 0
async function apiCall() {
  if (simCount++ < 4) {
    throw new Error('test error')
  }
  return fetch('https://jsonplaceholder.typicode.com/todos/1')
}

const MAX_RETRY = 3
let SLEEP_TIME = 0
async function* retry() {
  for (let index = 0; index < MAX_RETRY; index++) {
    try {
      yield apiCall()
    } catch (error) {
      console.error(index + 1 + '. retry result:', error)
      SLEEP_TIME += 2000
      // do not wait after last call
      if (index < MAX_RETRY - 1) {
        yield sleep(SLEEP_TIME)
      }
    }
  }
}

async function retryHandler() {
  for await (const response of retry()) {
    console.log((response as Response)?.status)
    if (
      (response as Response)?.status &&
      (response as Response).status < 300 &&
      (response as Response).status >= 200
    ) {
      console.log('success fetch')
      break
    } else {
      console.log('retry after ' + SLEEP_TIME + ' ms')
    }
  }
}

await retryHandler()
