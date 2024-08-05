import { isUndefined, ShapeFlags } from '@vue/shared';
import { getCurrentInstance, onMounted, onUpdated } from '@vue/runtime-core';

export const KeepAlive = {
  __isKeepAlive: true,
  props: {
    max: Number
  },
  setup(props, { slots }) {
    const { max } = props;

    const keys = new Set(); // 用来记录哪些组件被缓存过
    const cache = new Map(); // 缓存表 { 组件key/组件type: subTree }

    const instance = getCurrentInstance();
    const { createElement, unmount: _unmount, move } = instance.ctx.renderer;

    // 缓存组件激活逻辑：直接将之前渲染好的dom元素移动到容器内
    instance.ctx.activate = (vnode, container, anchor) => {
      move(vnode, container, anchor);
    };

    // 缓存组件失活逻辑：将dom元素移动到div中，不销毁
    const storageContent = createElement('div');
    instance.ctx.deactivate = vnode => {
      move(vnode, storageContent, null);
    };

    let pendingCacheKey = null;
    function cacheSubTree() {
      cache.set(pendingCacheKey, instance.subTree);
    }

    // 等待组件加载完毕之后会再缓存
    onMounted(cacheSubTree);
    onUpdated(cacheSubTree);

    /**
     * 重置shapeFlag
     */
    function resetShapeFlag(vnode) {
      let shapeFlag = vnode.shapeFlag;
      if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE;
      }
      if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
      }
      vnode.shapeFlag = shapeFlag;
    }

    /**
     * 真实的dom卸载
     */
    function unmount(vnode) {
      resetShapeFlag(vnode);
      _unmount(vnode);
    }

    /**
     * 缓存超过最大个数时，将最早缓存的dom卸载（LRU缓存淘汰算法。保留最近使用的放在队列尾部，最早使用的删除）
     */
    function pruneCacheEntry(key) {
      const cached = cache.get(key);
      unmount(cached);
      keys.delete(key);
      cache.delete(key);
    }

    return () => {
      if (!slots.default) {
        return null;
      }
      const vnode = slots.default(); // KeepAlive缓存的组件，KeepAlive下只能有一个子组件
      const comp = vnode.type; // 缓存的组件
      const key = vnode.key === null ? comp : vnode.key; // 缓存的组件key
      const cachedVNode = cache.get(key); // 从缓存里获取缓存的vnode
      pendingCacheKey = key;

      if (cachedVNode) {
        vnode.component = cachedVNode.component; // 复用组件实例
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE; // 插槽内的组件不需要再做组件初始化操作
        keys.delete(key);
        keys.add(key); // 刷新缓存key。最近使用的放在队列尾部
      } else {
        keys.add(key);

        if (!isUndefined(max) && (keys.size > max)) {
          pruneCacheEntry(keys.values().next().value); // 获取Set里的第一个，需要通过values().next()获取。
        }
      }
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE; // 当前被缓存的组件（slot下的组件）不做真实的dom卸载，卸载dom时将当前dom节点存放到临时存储空间内。
      return vnode;
    };
  }
};

export const isKeepAlive = vnode => {
  return vnode.type.__isKeepAlive === true;
};