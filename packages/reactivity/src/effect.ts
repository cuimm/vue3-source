/**
 * 清理dep不需要再收集的effect
 * @param dep
 * @param effect
 */
function cleanDepEffect(dep, effect) {
  dep.delete(effect);

  // 如果当前属性的map为空，则删除掉这个属性
  if (dep.size === 0) {
    dep.clearup();
  }
}

/**
 * effect每次重新执行前处理逻辑
 * @param effect
 */
function preClearEffect(effect) {
  // effect每次重新执行时，将收集到的依赖表length重置为0。（上次收集到的deps数组不清空，后续按照deps数组下标进行diff更新）
  effect._depsLength = 0;
  // effect每次重新执行，_trackId+1。（如果同一个effect执行，_trackId是相同的）
  effect._trackId++;
}

/**
 * effect每次执行后的依赖清理逻辑
 * 例：上一次的依赖: [flag, name, aaa, bbb, ...]，本次更新后的依赖：[flag, age]。effect执行后需要多余的依赖删除掉
 * @param effect
 */
function postClearEffect(effect) {
  if (effect.deps.length > effect._depsLength) {
    for (let index = effect._depsLength; index < effect.deps.length; index++) {
      cleanDepEffect(effect.deps[index], effect);
    }
    effect.deps.length = effect._depsLength; // 更新依赖列表长度
  }
}

/**
 * 当前【激活的/正被执行的】effect
 */
export let activeEffect;

export class ReactiveEffect {
  // 记录当前effect执行的次数（防止一个属性在当前effect中多次依赖收集）
  _trackId = 0;

  // 收集当前effect的deps个数
  _depsLength = 0;

  // 收集当前effect的deps数组（哪些个属性被当前effect依赖）
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

      preClearEffect(this); // 每次effect重新执行前，需要将上一次收集的依赖清空

      return this.fn(); // 执行fn会触发依赖收集
    } finally {
      postClearEffect(this); // // 每次effect执行后，需要将上一次不需要的依赖清理掉
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
  // 判断当前dep内有没有收集到effect，且_trackId与effect的_trackId相同。
  // _trackId相同代表已经收集过effect，不再进行多次收集。不相同时才进行相互收集。
  if (dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId); // dep收集effect

    const oldDep = effect.deps[effect._depsLength]; // 获取之前deps内存放的当前下标的dep
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect); // 如果老的dep存在，且和当前dep不相同，则需要将当前effect从原dep内移除（[flag, name] => [flag, age]）
      }
      effect.deps[effect._depsLength++] = dep; // 按照最新的dep进行更新
    } else {
      effect._depsLength++; // 如果上次存放的dep和本次要更新的dep相同，则不需要更新dep，只需要下标往后移动
    }
  }
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
