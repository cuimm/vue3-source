import { currentInstance, setCurrentInstance, unsetCurrentInstance } from './component';

export const enum LifecycleHooks {
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u'
}

/**
 * 创建声明周期钩子函数
 * @param lifecycle
 */
function createHook(lifecycle) {
  return (hook, instance = currentInstance) => {
    if (instance) { // 保证当前的钩子是在组件中运行的
      const hooks = instance[lifecycle] || (instance[lifecycle] = []);

      // 包裹当前要执行的钩子，通过闭包将当前instance和钩子函数进行绑定。
      const wrapHook = () => {
        setCurrentInstance(instance);
        hook.call(instance);
        unsetCurrentInstance();
      };

      hooks.push(wrapHook);
    }
  };
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);

export const invokeArrayFns = (hooks) => {
  for (let index = 0; index < hooks.length; index++) {
    hooks[index]();
  }
};