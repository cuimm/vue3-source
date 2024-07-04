
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
