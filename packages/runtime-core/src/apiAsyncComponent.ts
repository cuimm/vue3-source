import { isFunction } from '@vue/shared';
import { ref } from '@vue/reactivity';
import { h } from './h';

export function defineAsyncComponent(options) {
  if (isFunction(options)) {
    options = { loader: options };
  }
  const {
    loader,
    delay,
    loadingComponent,
    timeout,
    errorComponent,
    onError,
  } = options;

  return {
    setup() {
      const loaded = ref(false);
      const loading = ref(false);
      const error = ref(false);
      let resolvedComp = null;

      // 延迟delay之后再展示loading效果
      let delayTimer = null;
      if (delay > 0) {
        delayTimer = setTimeout(() => {
          loading.value = true;
        }, delay);
      }

      // 超时
      if (timeout) {
        setTimeout(() => {
          error.value = true;
          console.error(new Error(`async component is timed out after ${ timeout }ms`));
        }, timeout);
      }

      // 重试
      let attempts = 0;
      function loadFunc() {
        return loader()
          .catch(error => {
            if (onError) {
              return new Promise((resolve, reject) => {
                const retry = () => resolve(loadFunc()); // 构建Promise链（递归）。loadFunc()返回promise，resolve的结果需要等待该promise的执行。
                const fail = () => reject(error);
                onError(error, retry, fail, ++attempts);
              });
            } else {
              throw error;
            }
          });
      }

      loadFunc()
        .then(result => {
          loaded.value = true;
          resolvedComp = result;
        })
        .catch(error => {
          error.value = true;
        })
        .finally(() => {
          loading.value = false;
          clearTimeout(delayTimer);
        });

      // 默认占位符
      const placeHolderComp = h('div');

      return () => {
        if (loaded.value) {
          return h(resolvedComp);
        } else if (error.value && errorComponent) {
          return h(errorComponent);
        } else if (loading.value && loadingComponent) {
          return h(loadingComponent);
        } else {
          return placeHolderComp;
        }
      };
    }
  };
}
