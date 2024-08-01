import { hasOwn } from '@vue/shared';
import { currentInstance } from './component';

/**
 * provide和inject是成对出现的，用于向子孙组件传递数据。
 * provide在父组件中返回要传给下级的数据，inject在需要使用这个数据的子辈组件或者孙辈等下级组件中注入数据。
 * 子组件可以新增provide数据，新增的数据不可影响父级组件的provides。
 * @param key
 * @param value
 */
export function provide(key, value) {
  if (!currentInstance) {
    return; // provide必须建立在组件基础上
  }

  const parentProvides = currentInstance.parent?.provides; // 父组件的provides
  let provides = currentInstance.provides; // 当前组件的provides

  // 子组件如果没有单独提供provides，那么子组件向下传递的数据和父组件是一致的。
  if (parentProvides === provides) {
    provides = currentInstance.provides = Object.create(provides); // 如果在子组件上新增了provides，需要拷贝一份全新的。
  }

  provides[key] = value;
}

/**
 * 注入数据
 * @param key
 * @param defaultValue 默认值
 */
export function inject(key, defaultValue) {
  if (!currentInstance) {
    return;
  }
  const provides = currentInstance.parent?.provides; // 获取的是父组件提供的数据
  if (provides && (key in provides)) {
    return provides[key];
  } else {
    return defaultValue;
  }
}