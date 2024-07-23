// packages/runtime-dom/src/nodeOps.ts
var nodeOps = {
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null);
  },
  remove: (child) => {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },
  createElement: (type) => {
    return document.createElement(type);
  },
  createText: (text) => {
    return document.createTextNode(text);
  },
  setText: (node, text) => {
    node.nodeValue = text;
  },
  setElementText: (el, text) => {
    el.textContent = text;
  },
  parentNode: (node) => {
    return node.parentNode;
  },
  nextSibling: (node) => {
    return node.nextSibling;
  }
};

// packages/shared/src/index.ts
var isArray = Array.isArray;
var isOn = (key) => {
  return key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110 && (key.charCodeAt(2) > 122 || key.charCodeAt(2) < 97);
};

// packages/runtime-dom/src/modules/class.ts
function patchClass(el, value) {
  if (value === null) {
    el.className = null;
    el.removeAttribute("class");
  } else {
    el.className = value;
  }
}

// packages/runtime-dom/src/modules/style.ts
function patchStyle(el, prevValue, nextValue) {
  const style = el.style;
  for (let key in nextValue) {
    style[key] = nextValue[key];
  }
  for (const key in prevValue) {
    if (nextValue[key] === null) {
      style[key] = null;
    }
  }
}

// packages/runtime-dom/src/modules/events.ts
function createInvoker(value) {
  const invoker = (e) => invoker.value(e);
  invoker.value = value;
  return invoker;
}
function patchEvent(el, name, nextValue) {
  const invokers = el._evi || (el._evi = {});
  const existingInvoker = invokers[name];
  const eventName = name.slice(2).toLowerCase();
  if (nextValue && !existingInvoker) {
    const invoker = invokers[name] = createInvoker(nextValue);
    el.addEventListener(eventName, invoker);
    return;
  }
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue;
    return;
  }
  if (existingInvoker) {
    el.removeEventListener(eventName, existingInvoker);
    invokers[name] = void 0;
  }
}

// packages/runtime-dom/src/modules/attrs.ts
function patchAttr(el, key, value) {
  if (value === null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}

// packages/runtime-dom/src/patchProp.ts
function patchProp(el, key, prevValue, nextValue) {
  if (key === "class") {
    patchClass(el, nextValue);
  } else if (key === "style") {
    patchStyle(el, prevValue, nextValue);
  } else if (isOn(key)) {
    patchEvent(el, key, nextValue);
  } else {
    patchAttr(el, key, nextValue);
  }
}

// packages/runtime-dom/src/index.ts
var renderOptions = Object.assign({ patchProp }, nodeOps);
export {
  renderOptions
};
//# sourceMappingURL=runtime-dom.js.map
