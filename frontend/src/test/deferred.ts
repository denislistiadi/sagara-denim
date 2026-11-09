/**
 * Promise yang dapat diselesaikan manual dari test.
 *
 * Dipakai untuk memastikan state `isPending` terlihat sebelum request
 * diselesaikan, tanpa memakai `sleep` yang membuat test flaky.
 */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
