export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

export enum DirtyLevels {
  NoDirty = 0, // 非脏值。取计算属性值时复用上一次的返回结果
  Dirty = 4, // 脏值。取计算属性值时需要执行getter
}