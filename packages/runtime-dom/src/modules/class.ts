/**
 * 更新class
 * @param el 目标元素节点
 * @param value 要更新的值
 */
export default function patchClass(el, value) {
  if (value === null) {
    el.className = null;
    el.removeAttribute('class');
  } else {
    el.className = value;
  }
}