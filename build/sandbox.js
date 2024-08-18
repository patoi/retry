import retry from './index.js';
const controller = new AbortController();
const signal = controller.signal;
let simCount = 0;
async function apiCall1() {
    if (simCount++ < 3) {
        throw new Error('test error');
    }
    //controller.abort()
    if (signal.aborted) {
        Promise.reject(signal.reason);
    }
    // Perform the main purpose of the API
    // Call resolve(result) when done.
    // Watch for 'abort' signals
    signal.addEventListener("abort", () => {
        // Stop the main operation
        // Reject the promise with the abort reason.
        Promise.reject(signal.reason);
    });
    return fetch('https://httpstat.us/401', { signal });
    //return fetch('https://jsonplaceholder.typicode.com/todos/1')
}
async function apiCall2() {
    if (simCount++ < 0) {
        throw new Error('test error');
    }
    //controller.abort()
    if (signal.aborted) {
        Promise.reject(signal.reason);
    }
    // Perform the main purpose of the API
    // Call resolve(result) when done.
    // Watch for 'abort' signals
    signal.addEventListener("abort", () => {
        // Stop the main operation
        // Reject the promise with the abort reason.
        Promise.reject(signal.reason);
    });
    return fetch('https://httpstat.us/500', { signal });
    //return fetch('https://jsonplaceholder.typicode.com/todos/1')
}
const HttpRetry = retry({ retries: 5, sleepTime: 1000 });
try {
    const results = await Promise.all([HttpRetry(apiCall1), HttpRetry(apiCall2)]);
    console.log(results);
    //results.forEach((result) => console.log(result))
}
catch (error) {
    console.log('request failed');
    console.log(error);
}
//# sourceMappingURL=sandbox.js.map