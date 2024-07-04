/**
 * 当前文件会打包 packages 下的模块，最终打包出编译后的JS文件
 */

import esbuild from 'esbuild';
import minimist from 'minimist'; // 在node环境中使用esm语法导入导出，需要在package.json内配置 type:module。否则报错：SyntaxError: Cannot use import statement outside a module
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const args = minimist(process.argv.slice(2)); // 打包参数。node中的命令参数通过process来获取，参数为 process.argv
const target = args._[0] || 'reactivity'; // 打包的项目
const format = args.f || 'iife'; // 打包后的模块规范

// esm 使用 commonjs 变量
const __filename = fileURLToPath(import.meta.url); // 获取文件的绝对路径（/Users/mmcui/Documents/cuimm/code/mine/vue3/vue3-source/scripts/dev.js）
const __dirname = dirname(__filename); // 直接使用__dirname会报错：ReferenceError: __dirname is not defined in ES module scope
const require = createRequire(import.meta.url); // 创建require

const entry = resolve(__dirname, `../packages/${target}/src/index.ts`); // 打包入口（/Users/mmcui/Documents/cuimm/code/mine/vue3/vue3-source/packages/reactivity/src/index.ts）
const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.js`); // /Users/mmcui/Documents/cuimm/code/mine/vue3/vue3-source/packages/reactivity/dist/reactivity.js
const packageJson = require(`../packages/${target}/package.json`); // package.json

// 构建
esbuild
  .context({
    entryPoints: [entry], // 打包入口
    outfile: outfile, // 输出文件位置
    bundle: true, // 默认情况下，esbuild不会打包输入文件。bundle参数为true时会将依赖的模块打包到一起。
    platform: 'browser', // 打包环境（打包后给浏览器使用）
    sourcemap: true, // 生成sourcemap文件，用于调试代码
    format: format, // esm、cjs、iife
    globalName: packageJson.buildOptions?.name, // iife自执行函数的全局变量名
  })
  .then(context => {
    console.log('build watch...');
    return context.watch(); // 监控入口文件持续进行打包
  });


/**
 * note：
 * console.log(import.meta.url); // file:///Users/mmcui/Documents/cuimm/code/mine/vue3/vue3-source/scripts/dev.js
 * console.log(fileURLToPath(import.meta.url)); // /Users/mmcui/Documents/cuimm/code/mine/vue3/vue3-source/scripts/dev.js
 */

