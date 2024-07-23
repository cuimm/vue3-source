import { ShapeFlags } from '@vue/shared';

export function createRenderer(renderOptions) {

  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = renderOptions;

  /**
   * 渲染子节点
   * @param children
   * @param container
   */
  const mountChildren = (children, container) => {
    for (let index = 0; index < children.length; index++) {
      patch(null, children[index], container);
    }
  };

  /**
   * 渲染元素节点
   * @param vnode
   * @param container
   */
  const mountElement = (vnode, container) => {
    const { type, props, shapeFlag, children } = vnode;

    const el = hostCreateElement(type);

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el);
    }

    hostInsert(el, container);
  };

  const patch = (n1, n2, container) => {
    // 前后两次渲染同一个虚拟元素
    if (n1 === n2) {
      return;
    }

    // 老的虚拟节点为null，则说明是初始化操作，创建新的元素节点并插入到容器内
    if (n1 === null) {
      mountElement(n2, container);
    }
  };

  /**
   * 渲染
   * 将虚拟节点转换成真实节点进行渲染
   *
   * 创建元素节点：n1===null
   * 更新元素节点：n1!==null（容器上有_vnode）
   *
   * @param vnode 虚拟节点
   * @param container 要挂载的容器
   */
  const render = (vnode, container) => {

    patch(container._vnode || null, vnode, container);

    container._vnode = vnode; // 渲染时保存上一次的虚拟节点
  };


  return {
    render,
  };
}