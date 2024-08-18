const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let MAX_RETRY = 3;
let SLEEP_TIME = 1000;
async function retryHandler(fn) {
    let _fn = fn;
    let sleepTime = 100;
    let lastError;
    let lastResponse;
    let count = 0;
    /**
     * Delay retry call.
     * It will be called when error occurs or status code is 500 and above.
     * Since retry results can be mixed e.g. [error, HTTP500, error, HTTP500],
     * the same waiting time generator should be applied in both cases.
     */
    async function delay() {
        sleepTime = sleepTime + SLEEP_TIME;
        console.debug(_fn.name + ' - ' + count + '. retry after: ' + sleepTime + ' ms');
        await sleep(sleepTime);
    }
    /**
     * Retry async function call, if result is an error.
     */
    async function* retry() {
        while (count < MAX_RETRY) {
            count++;
            lastError = undefined;
            try {
                yield _fn();
            }
            catch (error) {
                // FIXME: az AbortError-t ki kellene dobni innen, de nem jelenik meg...
                lastError = error;
                console.debug(_fn.name + ' - ' + count + '. retry error:', lastError.name);
                // do not wait after last call
                if (count < MAX_RETRY - 1) {
                    console.debug(_fn.name + ' - ' + count + '. start sleep:', sleepTime);
                    await delay();
                }
            }
        }
    }
    for await (const response of retry()) {
        lastResponse = response;
        const status = response?.status;
        console.log(_fn.name + ' - ' + count + '. status:', status);
        if (status && status < 500) {
            // processing is successful if status code is less than 500
            console.log(_fn.name + ' - ' + count + '. success fetch', status);
            break;
        }
        else {
            // retry
            // processing is unsuccessful if status code is 500 and above
            await delay();
        }
    }
    console.debug(_fn.name + ' - ' + count + '. done');
    // if last call is an error, then throw again...
    if (lastError)
        throw lastError;
    // ... or return with the last response
    return lastResponse;
}
/**
 * Retry fetch.
 * @param config
 * @param config.retries number of retries
 * @param config.sleepTime sleep time between retry calls; increase delay with sleep time and start delay after the last call
 * @returns
 */
export default function ({ retries = 3, sleepTime = 1000 }) {
    MAX_RETRY = retries;
    SLEEP_TIME = sleepTime;
    return retryHandler;
}
//# sourceMappingURL=index.js.map