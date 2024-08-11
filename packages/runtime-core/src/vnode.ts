import { isArray, isFunction, isObject, isString, ShapeFlags } from '@vue/shared';
import { isTeleport } from './components/Teleport';

export const Text = Symbol('Text');

export const Comment = Symbol('Comment');

export const Fragment = Symbol('Fragment');

/**
 * 是否为虚拟节点
 * @param value
 */
export function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}

/**
 * 是否是相同的虚拟节点
 * @param n1
 * @param n2
 */
export function isSameVNode(n1 , n2) {
  return (n1.type === n2.type) && (n1.key === n2.key);
}

/**
 * 创建虚拟节点
 * @param type
 * @param props
 * @param children
 * @param patchFlag
 * @param dynamicProps
 */
export function createVNode(type, props, children?, patchFlag?, dynamicProps?) {

  const shapeFlag: any = isString(type)
    ? ShapeFlags.ELEMENT // 元素
    : isTeleport(type)
      ? ShapeFlags.TELEPORT
      : isObject(type)
        ? ShapeFlags.STATEFUL_COMPONENT // 组件
        : isFunction(type)
          ? ShapeFlags.FUNCTIONAL_COMPONENT // 函数式组件
          : 0;

  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    shapeFlag: shapeFlag,
    key: props?.key, // 用于diff算法比对
    el: null, // 虚拟节点对应的真实节点
    ref: props?.ref, // 元素：dom元素  组件：实例/exposed
    patchFlag: patchFlag, // 用于dom diff靶向更新
    dynamicChildren: null,
    dynamicProps: dynamicProps,
  };

  // currentBlock收集有patchFlag的子节点
  if (currentBlock && (patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT)) {
    currentBlock.push(vnode);
  }

  if (children) {
    if (isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    } else if (isObject(children)) {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    } else {
      vnode.children = String(children); // 文本统一转成字符串
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }
  }

  return vnode;
}


/**************************** DOM DIFF优化 <靶向更新> ****************************/
/**
 * 用于收集动态虚拟子节点。
 * v-if和v-for是节点结构动态变化的两种可能方式，
 * 针对v-if分支和每个v-for片段，我们就可以将模板划分为<嵌套块>，在每个块内，节点结构将是稳定的。
 * 这允许我们跳过大多数子节点的差异，只担心动态节点（由补丁标志表示）。
 */
let currentBlock = null;
const blockStack = [];

export function openBlock() {
  currentBlock = [];
  blockStack.push(currentBlock);
}

export function closeBlock() {
  blockStack.pop();
  currentBlock = blockStack[blockStack.length - 1] || null;
}

export function setupBlock(vnode) {
  vnode.dynamicChildren = currentBlock;
  closeBlock();

  // block嵌套时，收集blockTree
  if (currentBlock) {
    currentBlock.push(vnode);
  }

  return vnode;
}

/**
 * 收集动态节点。
 * @param type
 * @param props
 * @param children
 * @param patchFlag
 * @param dynamicProps
 */
export function createElementBlock(type, props, children, patchFlag, dynamicProps) {
  const vnode = createVNode(type, props, children, patchFlag, dynamicProps);
  return setupBlock(vnode);
}
export { createVNode as createElementVNode };
