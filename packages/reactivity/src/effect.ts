/**
 * 当前【激活的/正被执行的】effect
 */
export let activeEffect;


export class ReactiveEffect {
  // 记录当前effect执行的次数
  _trackId = 0;

  // 收集当前effect的deps个数
  _depsLength = 0;

  // 收集当前effect的deps数组
  deps = [];

  // 当前effect是否为响应式的
  public active = true;

  /**
   * 构造函数
   * @param fn 用户自定义回调函数
   * @param scheduler
   */
  constructor(public fn, public scheduler) {
    // noop
  }

  run() {
    if (!this.active) {
      return this.fn();
    }

    // 记录上次执行的effect，解决effect父子嵌套问题
    const lastActiveEffect = activeEffect;

    try {
      activeEffect = this;
      return this.fn(); // 执行fn会触发依赖收集
    } finally {
      activeEffect = lastActiveEffect;
    }
  }

}


/**
 * 创建响应式的effect，数据变化时可以重新执行
 * @param fn
 * @param options
 */
export function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });

  // effect实例创建完毕之后，会立刻执行一次
  _effect.run();
}


/**
 * effect 和 dep 相互记忆
 * @param effect
 * @param dep
 */
export function trackEffect(effect, dep) {
  // dep收集effect
  dep.set(effect, effect._trackId);

  // effect 和 dep 双向记忆
  effect.deps[effect._depsLength++] = dep;
}


/**
 * 触发依赖更新
 * @param dep
 */
export function triggerEffects(dep) {
  for (const effect of dep.keys()) {
    if (effect.scheduler) {
      effect.scheduler();
    }
  }
}
