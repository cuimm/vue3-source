const queue = [];
const resolvePromise = Promise.resolve();
let isFlushing = false;

/**
 * 异步队列
 * 通过事件环机制，延迟更新操作。组件更新时，先执行宏任务，再执行微任务。
 *
 * 同时在一个组件中更新多个状态，job是同一个
 * @param job
 */
export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job); // 去重【同时在一个组件中更新多个状态，job是同一个】
  }

  if (!isFlushing) {
    isFlushing = true;

    resolvePromise.then(() => {
      isFlushing = false;

      const copyQueue = queue.slice(0); // 拷贝任务队列，因为在执行过程中可能会有新的Job加入
      queue.length = 0; // 清空任务队列
      copyQueue.forEach(job =>job()); // 队列中的Job依次执行
      copyQueue.length = 0;
    });
  }

}