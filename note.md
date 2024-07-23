
设计思想
1. 声明式和命令式
    1. vue3依旧支持声明式，用起来简单
2. 采用虚拟dom
3. 区分编译时和运行时
4. vue3新增设计
    1. 拆分模块：更加注重模块上的拆分，模块间耦合度更低
    2. 重写api：按需导入、tree shaking、减少打包体积
    3. 扩展更方便：支持自定义渲染器，扩展能力强
    4. 采用RFC（征求意见稿、请求评价）


Composition Api
1. vue2 采用的是options api，用户提供的data、props、computed、watch、methods等属性（用户编写复杂逻辑会出现反复横跳问题）
2. Vue2中的所有属性都是通过this访问，this存在指向明确问题
3. Vue2中很多未使用的方法和属性依旧会被打包，并且所有全局API都在Vue对象上公开。Composition Api对tree-shaking更加友好，代码也更容易压缩
4. 组件逻辑共享问题。vue2采用mixin实现组件之间的逻辑共享，但是会有数据来源不明确，命名冲突等问题。Vue3采用CompositionAPI提取公共逻辑非常方便。
5. 简单逻辑仍然可以使用OptionsAPI进行编写，CompositionApi在复杂逻辑中有着明显的优势。


Vue3 架构
1. Monorepo管理
2. 采用 Typescript


项目初始化
- 安装pnpm：npm install pnpm -g
- 初始化package.json：pnpm init
  - package.json 中配置 type:module 时，可以在node环境中使用import和export语法引入和导出模块。
  - 否则报错：Cannot use import statement outside a module。
- .nprmrc
  - pnpm安装的模块，不会默认散落在node_modules下（npm安装的依赖会被拍平安装在node_modules下）。
  - 设置shamefully-hoist=true可以将pnpm安装的模块拍平在node_modules下。
- 搭建Monorepo环境：
  - 指定管理目录：新建 pnpm-workspace.yaml 及 packages目录。
- 安装TypeScript
  - pnpm install typescript esbuild minimist -D -w
  - 公共目录依赖安装需要增加 -w 配置参数，将依赖安装到根目录下。否则会安装到各自项目下。
  - 初始化 tsconfig
    - "baseUrl": ".", "paths": { "@vue/*": ["packages/*/src"] }：表示当前项目下引入的 @vue/* 模块实际位置是 packages/*/src
- 新建 scripts 文件夹搭建运行脚本
  - dev.js 根据package.json配置按需打包
- 各个子项目下需配置package.json
  - "module": "dist/reactivity.esm-bundler.js"：表示该项目按照es6模式引入时的入口文件
  - "unpkg": "dist/reactivity.global.js"：在浏览器中引入时的入口文件
  - @vue/reactivity 依赖 @vue/shared，可在当前项目下执行命令：   
  ```pnpm install @vue/shared --workspace --filter @vue/reactivity```，   
  执行完毕之后，@vue/reactivity 项目下的package.json会自动增加配置：   
    ```
    "dependencies": {
       "@vue/shared": "workspace:^"
    }
    ```


Vue3 响应式数据核心
Vue3 中使用 Proxy来实现响应式数据变化。

CompositionAPI    
- 简单的组件仍然可以采用 OptionsAPI	(但是在Vue3 中基本不在使用)， compositionAPI在复杂的逻辑中有着明显的优势~
- CompositionAPI在用户编写复杂业务逻辑不会出现反复横跳问题.CompositionAPI不存在this指向不明确问题
- Composition API对tree-shaking更加友好，代码也更容易压缩。·CompositionAPI提取公共逻辑非常方便
- reactivity 模块中就包含了很多我们经常使用到的API例如:computed、 reactive.ref、effect等

打包后文件   
cjs是commonjs版本的vue，都是完整版的vue，包含运行时和编译器，prod版是压缩版是生产版本
vue.cjs.js
vue.cjs.prod.js


global全局，可以直接通过script标签来导入，导入js后会增加一个全局的vue对象，vue.global是完整版的vue，包含编译器和运行时。vue.runtime.global是只包含运行时的构建版本
vue.global.js
vue.global.prod.js
vue.runtime.global.js
vue.runtime.global.prod.js


browser版本是浏览器的原生模块化的方式,在浏览器中可以直接使用type="module"的方式直接导入这些模块。vue.esm-browser是完整版包括运行时和编译器，vue.runtime.esm-browser只包含运行时
vue.esm-browser.js
vue.esm-browser.prod.js
vue.runtime.esm-browser.js
vue.runtime.esm-browser.prod.js


bundler没有打包所有代码，配合打包工具来使用，都是用esm模块化方式，内部通过import导入了runtime-core。vue.esm-bundler是完整版的，内部导入了runtime-compiler，使用脚手架创建的项目默认导入的是vue.runtime.esm-bundler，只导入了运行时，是vue的最小版本，在项目开发完毕后只会打包使用到的代码，可以让vue的体积更小
vue.esm-bundler.js
vue.runtime.esm-bundler.js


runtime-dom
1. 新建 runtime-dom 子项目
2. 在该项目下执行`pnpm init`初始化该子项目
3. 修改工作目录下的`package.json`文件，将`dev`命令的目标打包项目更改为`runtime-dom`
4. 安装依赖：`pnpm install @vue/shared @vue/runtime-core --workspace --filter @vue/runtime-dom`



