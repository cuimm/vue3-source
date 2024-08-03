import { ShapeFlags } from '@vue/shared';

export const isTeleport = type => {
  return type && type.__isTeleport;
};

/**
 * <Teleport> 是一个内置组件，它可以将一个组件内部的一部分模板“传送”到该组件的 DOM 结构外层的位置去。
 *
 * 适用场景：一个组件模板的一部分在逻辑上从属于该组件，但从整个应用视图的角度来看，它在 DOM 中应该被渲染在整个 Vue 应用外部的其他地方。
 * 这类场景最常见的例子就是全屏的模态框。理想情况下，我们希望触发模态框的按钮和模态框本身是在同一个组件中，因为它们都与组件的开关状态有关。但这意味着该模态框将与按钮一起渲染在应用 DOM 结构里很深的地方。这会导致该模态框的 CSS 布局代码很难写。
 */
export const Teleport = {
  __isTeleport: true,

  process(n1, n2, container, anchor, parentComponent, internals) {
    const { mountChildren, patchChildren, move } = internals;

    if (n1 === null) { // 组件挂载
      const { to } = n2.props;
      const target = (n2.target = document.querySelector(to));
      if (target) {
        mountChildren(n2.children, target, anchor, parentComponent);
      }
    } else { // 组件更新
      patchChildren(n1, n2, n2.target, anchor, parentComponent);

      if (n1.props.to != n2.props.to) {
        const nextTarget = document.querySelector(n2.props.to);
        n2.children.forEach(child => move(child, nextTarget, anchor));
      }
    }
  },

  remove(vnode, unmountChildren) {
    const { shapeFlag } = vnode;
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(vnode.children);
    }
  },
};
