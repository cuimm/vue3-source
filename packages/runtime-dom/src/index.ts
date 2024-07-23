import { nodeOps } from './nodeOps';
import patchProp from './patchProp';
import { createRenderer } from '@vue/runtime-core';

const renderOptions = Object.assign({ patchProp }, nodeOps);

export const render = function (vnode, container) {
  return createRenderer(renderOptions).render(vnode, container);
};

export * from '@vue/runtime-core';