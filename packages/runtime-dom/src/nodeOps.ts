/**
 * dom api
 */
export const nodeOps = {
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null); // anchor 为null时，insertBefore === appendChild；anchor不为null时，插入到anchor之前
  },
  remove: (child) => {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },
  createElement: type => {
    return document.createElement(type);
  },
  createText: text => {
    return document.createTextNode(text);
  },
  createComment: text => {
    return document.createComment(text);
  },
  setText: (node, text) => {
    node.nodeValue = text; // 给文本节点设置文本
  },
  setElementText: (el, text) => {
    el.textContent = text; // 给dom元素设置文本
  },
  parentNode: node => {
    return node.parentNode;
  },
  nextSibling: node => {
    return node.nextSibling;
  },
};