function createInvoker(value) {
  const invoker = e => invoker.value(e);
  invoker.value = value; // invoker上扩展value属性，保存要执行的目标方法。更新时只需更新对应的调用函数
  return invoker;
}

/**
 * dom事件处理
 * @param el
 * @param name
 * @param nextValue
 */
export default function patchEvent(el, name, nextValue) {
  const invokers = el._evi || (el._evi = {}); // 用于缓存绑定的事件 vue event invoker
  const existingInvoker = invokers[name]; // 获取缓存的事件定义

  const eventName = name.slice(2).toLowerCase(); // 事件名

  // 绑定新的事件
  if (nextValue && !existingInvoker) {
    const invoker = (invokers[name] = createInvoker(nextValue));
    el.addEventListener(eventName, invoker);
    return;
  }

  // 更新事件
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue;
    return;
  }

  // 移除事件
  if (existingInvoker) {
    el.removeEventListener(eventName, existingInvoker);
    invokers[name] = undefined;
  }

}
