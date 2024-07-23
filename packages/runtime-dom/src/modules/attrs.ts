/**
 * 更新元素节点指定属性值
 * @param el 元素节点
 * @param key 属性key
 * @param value 属性值
 */
export default function patchAttr(el, key, value) {
  if (value === null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}