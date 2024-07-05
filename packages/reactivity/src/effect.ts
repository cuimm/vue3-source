/**
 * 当前【激活的/正被执行的】effect
 */
export let activeEffect;


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


export class ReactiveEffect {
  /**
   * 当前effect是否为响应式的
   */
  public active = true;

  /**
   * 构造函数
   * @param fn 用户自定义回调函数
   * @param scheduler
   */
  constructor(public fn, public scheduler) { }

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