/**
 * 创建虚拟节点的时候，会将元素节点的形状和儿子节点的形状进行<或运算>。
 * 如：当前元素节点是div(1)，有2个span子节点，那么当前元素节点的 shapeFlag= 1|16 = 00000001 | 00010000 = 00010001 = 17。
 * 反过来，判断当前元素是否为元素节点，使用<与运算>。
 * 如上述元素节点shapeFlag=17：
 *  17 & 1 = 00010001 & 00000001 = 00000001 = 1，是元素节点。
 *  17 & 16 = 00010001 & 00010000 = 00010000 = 16，子节点是数组。
 *  17 & 2 = 00010001 & 00000010 = 00000000 = 0，不是函数式组件。
 *
 *
 * 或运算：有一个是1就是1
 * 与运算：两个都是1才是1
 *
 *
 * 2进制转10进制：parseInt('00010001', 2)=17
 * 10进制转2进制：17.toString(2)=10001
 *
 */
export enum ShapeFlags {
  ELEMENT = 1, // 元素 00000001  =1
  FUNCTIONAL_COMPONENT = 1 << 1, // 函数式组件 00000010  =2
  STATEFUL_COMPONENT = 1 << 2, // 普通组件 00000100  =4
  TEXT_CHILDREN = 1 << 3, // 子节点是文本 00001000  =8
  ARRAY_CHILDREN = 1 << 4, // 子节点是数组 00010000  =16
  SLOTS_CHILDREN = 1 << 5, // 子节点是插槽 000100000  =32
  TELEPORT = 1 << 6, // Teleport 001000000  =64
  SUSPENSE = 1 << 7, // 010000000  =128
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // 当前组件不做真实的dom卸载，卸载的dom放到临时存储容器内 =256
  COMPONENT_KEPT_ALIVE = 1 << 9, // 无法做组件初始化操作 =512
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT, // 00000100 ｜ 00000010 => 00000110  标识位为1的就表示是什么组件（函数式和普通组件）
}
