/* @flow */
// 优化的好处是 减少dom对比，加速更新
import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  isPlatformReservedTag = options.isReservedTag || no
  // first pass: mark all non-static nodes.
  // 第一次处理root，标注静态节点
  markStatic(root)
  // second pass: mark static roots.
  // 第二次处理root， 标注静态根节点
  markStaticRoots(root, false)
}

function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

// 标注静态节点
function markStatic (node: ASTNode) {
  // 判断是否是静态节点： 标签上没有动态的v-bind/if/for && 标签不是slot componment标签(内置标签)/ 不是平台保留标签 / 没有v-pre 指令
  node.static = isStatic(node)
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      markStatic(child)
      if (!child.static) {
        node.static = false
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

/* 
  优化器的目标
  遍历生成的模板AST树，检测纯静态的子树，即永远不需要更改的DOM。
  一旦我们检测到这些子树，
  我们可以: 
    1、把它们变成常数，这样我们就不需要了在每次重新渲染时为它们创建新的节点
    2、在修补过程中完全跳过它们。
*/

// 标记静态根节点，主要是 对这个静态根节点做成一颗树然后进行缓存， 下次render的时候直接从缓存中拿。避免再次render
function markStaticRoots (node: ASTNode, isInFor: boolean) {
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    // <p>hello world</p> 这样的不会去作为静态根节点的，性能没有重新渲染高。评测的主要指标：//// 1. 需要去维护静态模板存储对象
    // 2. render函数中需要去调用_m函数获取静态模板
    // 3. 只有子节点一个，而且该节点为纯文本节点的时候，不会作为静态根节点， 比较这两个的时候只需要进行纯文本字符串比较即可，不用去维护模板对象和调用函数。
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true
      return
    } else {
      node.staticRoot = false
    }

    // 检测当前节点的子节点中是否有静态的Root
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

function isStatic (node: ASTNode): boolean {
  if (node.type === 2) { // expression
    return false
  }
  if (node.type === 3) { // text
    return true
  }
  return !!(node.pre || (  // 是否有v-pre，如果添加则直接置为true。
    !node.hasBindings && // 节点不能绑定动态数据和事件
    !node.if && !node.for && // 节点不能有if/for
    !isBuiltInTag(node.tag) && //  节点不能是内置对象 slot/component
    isPlatformReservedTag(node.tag) && // 节点必须是 常用html节点
    !isDirectChildOfTemplateFor(node) &&  // 节点的所有父辈不能有for循环
    Object.keys(node).every(isStaticKey)
  ))
}

function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
