/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts. 
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options)    // parse 将 html 模板解析成抽象语法树(AST)
  if (options.optimize !== false) {
    optimize(ast, options)  // optimize 对 AST 做优化处理
  }
  const code = generate(ast, options)  // generate 根据 AST 生成 render 函数。
  // console.log(code, '生成render函数')
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
