export let isUsingMicroTask = false
const callbacks = []
let pending = false

// 清洗回调队列
function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}
let timerFunc
if (typeof Promise !== 'undefined') {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
  }
  isUsingMicroTask = true
} else {
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}
/* 
  nextTick实现思路： 
   1. 每次set的时候会调用  该属性dep的notify方法， 通知依赖进行更新
   2. 对该属性所对应dep中所有的watcher进行循环执行 每个watcher的update方法， 
   3. update方法调用queueWatcher 方法将该watcher 放到全局的queue队列中 (  因为i会有重复的watcher 所以会对watcher进行清洗， 清洗之后进行push到queue数组)。
   4. 将flushCallbacks函数放入nexttick，等到主线程执行完毕会执行flushCallbacks函数。  即在nexttick中将queue数组中的每一项使用run方法执行，  nextTick方法中使用微任务(fallback到setTimeout)去执行。
   5. 如果用户使用了nexttick方法，将用户传入的回调放到queue数组中的最后一项，当 所有的watcher.run全都执行完毕之后， 开始执行用户传入的回调
   6. 如何保证回调函数没有传入， 转换为promise执行的：
      6.1 判断是否有callback，如果有执行callback。如果没有callback， 则将定义的promise 进行resolve。 
*/


export function nextTick (cb, ctx) {
  let _resolve
  callbacks.push(() => {
    if (cb) {
      cb.call(ctx)
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) {
    pending = true
    timerFunc()
  }
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve  //  将resovle函数赋值给_resolve，当 callbacks 回调队列中的函数全都执行完毕的时候，resolve。
    })
  }
}
