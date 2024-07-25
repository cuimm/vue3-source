/**
 * 更新style
 * @param el 目标元素节点
 * @param prevValue 更新前的值
 * @param nextValue 更新后的值
 */
export default function patchStyle(el, prevValue, nextValue) {
  const style = el.style;

  // 新的样式全部生效
  for (let key in nextValue) {
    style[key] = nextValue[key];
  }

  // diff之前的样式
  for (const key in prevValue) {
    if (nextValue && (nextValue[key] === null || nextValue[key] === undefined)) {
      style[key] = null;
    }
  }
}