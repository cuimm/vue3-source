import { isArray } from '@vue/shared';
import { h } from '@vue/runtime-core';

/**
 * 下一帧执行。
 * 利用浏览器的重绘机制，‌在浏览器下一次重绘之前执行指定的回调函数。‌它的执行时间与浏览器的刷新频率（‌通常是60Hz）‌相关。
 * 下一帧在不同设备上机制不同，有的是把当前的回调延迟到当前帧的尾部执行，依旧是在当前帧执行。所以再嵌套一层requestAnimationFrame，保证再当前帧的下帧执行。
 * @param fn
 */
export function nextFrame(fn) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

/**
 * synchronously force layout to put elements into a certain state
 * 重绘
 */
export function forceReflow() {
  return document.body.offsetHeight;
}

function callHook(hook: Function | Function[] | undefined, args: any[] = []) {
  if (isArray(hook)) {
    hook.forEach(h => h(...args));
  } else if (hook) {
    hook(...args);
  }
}

function resolveTransitionProps(props) {
  const {
    name = 'v-',
    enterFromClass = `${ name }-enter-from`,
    enterActiveClass = `${ name }-enter-active`,
    enterToClass = `${ name }-enter-to`,
    leaveFromClass = `${ name }-leave-from`,
    leaveActiveClass = `${ name }-leave-active`,
    leaveToClass = `${ name }-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave,
  } = props;

  return {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter(el); // 调用用户传入的onBeforeEnter
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
    },
    onEnter(el, done) {
      const finishEnter = () => {
        el.classList.remove(enterToClass);
        el.classList.remove(enterActiveClass);
        done && done();
      };

      // onEnter && onEnter(el, finishEnter);
      callHook(onEnter, [ el, finishEnter ]); // 调用用户传入的onEnter

      // 保证<过渡动画>在下一帧执行，保证动画的产生。
      nextFrame(() => {
        el.classList.remove(enterFromClass);
        el.classList.add(enterToClass);

        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener('transitionend', finishEnter); // CSS transition动画结束会触发事件。
        }
      });
    },
    onLeave(el, done) {
      const finishLeave = () => {
        el.classList.remove(leaveActiveClass);
        el.classList.remove(leaveToClass);
        done && done();
      };

      // onLeave && onLeave(el, finishLeave);
      callHook(onLeave, [ el, finishLeave ]); // 调用用户传入的onLeave

      el.classList.add(leaveFromClass);
      forceReflow(); // 重绘。保证leaveFromClass生效之后，再绘制leaveActiveClass。
      el.classList.add(leaveActiveClass);

      nextFrame(() => {
        el.classList.remove(leaveFromClass);
        el.classList.add(leaveToClass);

        if (!onLeave || onLeave.length <= 1) {
          el.addEventListener('transitionend', finishLeave);
        }
      });
    },
  };
}

const BaseTransitionImpl = {
  props: {
    onBeforeEnter: Function,
    onEnter: Function,
    onLeave: Function,
  },
  setup(props, { slots }) {
    return () => {
      const vnode = slots.default && slots.default();
      if (!vnode) {
        return;
      }
      vnode.transition = {
        beforeEnter: props.onBeforeEnter,
        enter: props.onEnter,
        leave: props.onLeave,
      };
      return vnode;
    };
  }
};

/**
 * Transition组件
 * Transition组件是函数式组件，函数式组件功能比较少，所以将处理完后的属性传递给<状态组件>进行渲染。
 * @param props
 * @param slots
 * @constructor
 */
export function Transition(props, { slots }) {
  return h(BaseTransitionImpl, resolveTransitionProps(props), slots);
}
