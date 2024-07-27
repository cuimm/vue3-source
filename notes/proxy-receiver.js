const person = {
  name: 'cuimm',
  get aliceName() {
    console.log('get aliceName');
    return 'Miss ' + this.name;
  }
};


/**
 * 1. 返回 target[key]
 * vue在getter中进行依赖收集。当获取aliceName属性时，依赖收集只能收集到aliceName，无法收集到name，name变动时无法触发更新
 */
const proxyPerson1 = new Proxy(person,{
  get(target, key, receiver) {
    console.log('此处进行依赖收集，收集的prop key：', key);
    return target[key];
  }
});

// console.log(proxyPerson1.aliceName);



/**
 * 2. 直接返回receiver[key]
 * 死循环（会一直触发proxy的getter）
 */
const proxyPerson2 = new Proxy(person, {
  get(target, key, receiver) {
    return receiver[key];
  }
});

// console.log(proxyPerson2.aliceName);


/**
 * 3. Reflect.get 方式取值
 * 可以修改代码执行时候的行为，通过 Reflect 取值时，可以更改 代理对象 内部的this为代理对象
 */
const proxyPerson = new Proxy(person, {
  get(target, key, receiver) {
    console.log('此处进行依赖收集，收集的prop key：', key);
    return Reflect.get(target, key, receiver);
  }
});

console.log(proxyPerson.aliceName);
/**
 * 此处进行依赖收集，收集的prop key： aliceName
 * get aliceName
 * 此处进行依赖收集，收集的prop key： name
 * Miss cuimm
 */