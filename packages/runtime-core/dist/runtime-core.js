// packages/runtime-core/src/renderer.ts
function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp
  } = renderOptions;
  const mountElement = (vnode, container) => {
    console.log("mountElement");
    const { type, props, children } = vnode;
    const el = hostCreateElement(type);
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, props[key]);
      }
    }
    hostSetElementText(el, children);
    hostInsert(el, container);
  };
  const patch = (n1, n2, container) => {
    if (n1 === n2) {
      return;
    }
    if (n1 === null) {
      mountElement(n2, container);
    }
  };
  const render = (vnode, container) => {
    console.log("render");
    patch(container._vnode || null, vnode, container);
    container._vnode = vnode;
  };
  return {
    render
  };
}
export {
  createRenderer
};
//# sourceMappingURL=runtime-core.js.map
