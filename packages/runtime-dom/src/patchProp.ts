import { isOn } from '@vue/shared';
import patchClass from './modules/class';
import patchStyle from './modules/style';
import patchEvent from './modules/events';
import patchAttr from './modules/attrs';

/**
 * 针对元素节点的属性操作（style、class、事件、其他属性等）
 * @param el 目标元素节点
 * @param key 属性key
 * @param prevValue 更新前的值
 * @param nextValue 更新后的值
 */
export default function patchProp(el, key, prevValue, nextValue) {
  if (key === 'class') {
    patchClass(el, nextValue);
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue);
  } else if (isOn(key)) {
    patchEvent(el, key, nextValue);
  } else {
    patchAttr(el, key, nextValue);
  }
}