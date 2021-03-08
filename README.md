# vue源码调试 

## 搭建调试环境 

1. 获取地址 git clone 

2. 安装依赖 npm i

3. 安装rollup  npm i -g rollup

4. 修改script => dev脚本: 添加 --sourcemap,  在.js文件后加

5. 执行dev脚本: npm run dev

## 调试技巧 

1. 浏览器调试打开指定文件: ctrl+p 
2. 查看调试栈 call stack 
3. 右击显示更多功能

_data 是响应式的数据， $data非响应式数据

# vue1.0 2.0

- 在all_star_of_vue这个仓库中，我们就是1.0的写法，那是vue的确做不了大型项目，每一个动态数据对应一个watcher，每一个要被拦截的属性对应一个dep。如果项目过大，那么内存会被这些闭包产生的变量占用过多的空间。而在2.0中 将一个组件用一个watcher。  那么一个组件中好多动态数据，难道更新一个数据就要重新渲染整个组件吗？那么vue是如何知道哪个数据发生变化了呢？这时候就要使用vdom和diff算法了。
- Vue2.0 中一个组件对应一个watcher，如果watcher发生了变化，那么会调用render函数得到当前组件的vdom， 将render之前的vdom与render之后的vdom通过dom diff算法进行比对，只渲染改变过的。 vue的更新是组件级别的。

## dep和watcher的关系

1. 在vue1.0中一个dep(属性)多个watcher(可以对应多个页面上的数据)，在vue2.0中，一个组件一个渲染watcher，按理来说是n个dep(属性)对应一个wathcer(组件)，但是如果我们在页面中写了this.$watch(key, cb)，那么这个关系就成了多对多。
2. dep与watcher是相互保存的关系，你保存了我，我也要保存你， dep保存了wathcer是因为如果这个属性变了，那么要让该dep保存的watcher全部进行update。wathcer为什么需要dep呢？是因为也许以后可能需要一些清理工作，比如取消$watch， 需要清理该dep中的指定watcher。

```js
//  问：如下代码new了几个Observe， Dep， Watcher  2 4 1
   // 一个obj就会有一个Observe，所以有2个Observe 每个属性都有一个Dep，但是
      /**
       *  observer/index.js export class Observer  这个代码中，标注了每一个Object都有一个Dep为了set和delete后更新watcher
       * 所以有4个Dep
       * 一个组件只有一个渲染watcher， 如下代码没有watch xxx属性，所以只有一个Watcher
       */
new Vue({
  el: "#app",
  data: {
    obj: {
      aa: {
        c: 1,
      },
    },
  },
});
```

```js
export class Observer {
  value;
  dep;
  vmCount; // number of vms that have this object as root $data

  constructor(value) {
    this.value = value;
    // 为什么这里需要一个dep
    // 当我们使用$set/$delete时， 这个dep负责通知更新。
    this.dep = new Dep(); // 这是大管家
    this.vmCount = 0;
    // 给每一个对象设置一个__ob__属性。这个__ob__用来在很多情况下去通知更新，也就是那个大管家，每一个Obj都有一个dep
    def(value, "__ob__", this);
    if (Array.isArray(value)) {
    } else {
      this.walk(value);
    }
  }
}
```



以上解释： data中的每一个对象都会伴随着一个Observer对象，而每一个Observer对象都会伴随着一个new Dep， 这就是大管家。Observer与大管家是一对一的关系。未来如果这个复杂类型的值又可能发生动态的新增和删除，这时候的变更通知只有当前Dep(这个大管家)才能完成通知更新。这个def(value, "__ob__", this);会在很多地方去通知更新，比如数组的7个方法，$set/$del等方法。

每个小管家也就是单独的key，只负责他们自身单个属性的更新。

```js
get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;
      if (Dep.target) {
        dep.depend(); // 将watcher添加到该dep的deps数组中。小管家
        if (childOb) { // childOb是Observe的实例
          childOb.dep.depend(); // 将该watcher添加到大管家中，如果大管家发生更新，这样也会把下面小管家对应的watcher全都更新了。
        }
      }
      return value;
    },
```

那么产生了问题，如果大管家的值发生了变换，可以理解，但是如果大管家动态新增了一个属性，那么会让下面所有的数据都发生了变化？应该也是会的，但是有dom diff在那里把控。 个人感觉Observe对应的Dep实属无奈之举，因为动态的新增/删除没有办法去通知更新，从组件更新机制角度来将，至少现在看到的是单独属性的dep与Observe对应的dep更新从更新角度来讲没有性能上的此长彼短



# 挂载

根组件第一次挂载new Vue().$mount()时， 创建渲染函数updateComponent，然后new Wathcer(这是一个最大的渲染wathcer)，执行完这个watcher的构造函数会执行updateComponent

# dom diff

在两棵vdom树的对比上来看，同层比较只要两层for循环就可以解决了，但是这样时间复杂度过多，所以在设计diff算法的过程中，采用了""猜想"的策略， 在web端，更新数据通常是做一些首位插入、末位插入、排序这样的操作，所以产生了diff算法四种比较的情况，然后通过移动的方式优化算法，减少比较次数。

lifecycle.js中在vue的实例上挂载了_update方法。 在$mount--> watcher--> mountComponent中执行了 _update方法

_update方法

​	作用：对比vdom，将真实dom渲染到页面上。

​      vm.$el = vm.\_\_patch__(prevVnode, *vnode*); // 对比新旧两个节点

runtime/index.js中将\__path__函数挂载到了vue实例上。core/vdom/patch.js中进行了dom diff。 createPatchFunction工厂模式。	

__后续会录个视频专门说说虚拟dom。bilibli

# 组件化

- 将template转化为render函数，在render函数中_c即\_createElement, 
  - patch.js/createElm函数 --> createComponent自定义组件 ==》vdom => 获取组件实例 => 执行挂载。 

# 梳理vue源码流程

1. 入口文件如果引入了带complier版本的走`vue-2.6.12\src\platforms\web\entry-runtime-with-compiler.js`    不带compiler runtime版本的走 `vue-2.6.12\src\platforms\web\entry-runtime.js`。

2. 分析哪个版本的：分析带compiler版本的

3. 先从 new Vue开始，当new Vue时，执行`this._init(options方法)`

   代码：

   ```js
   function Vue (options) {
     this._init(options) // 这个方法实在initMixin方法中定义的。
   }
   ```

   3.1 _init方法中主要做了

   ```js
   initLifecycle(vm) 
   initEvents(vm)
   initRender(vm)
   callHook(vm, 'beforeCreate')
   initInjections(vm) // resolve injections before data/props
   initState(vm)
   initProvide(vm) // resolve provide after data/props
   callHook(vm, 'created')
   if (vm.$options.el) {
   	vm.$mount(vm.$options.el)
   }
   ```

   ​	   3.1.1 initLifecycle(vm) 

   ​			主要是给当前组件创建当前组件的$parent (vue会对组件构建父子关系) $children $refs等变量。

   ​	   3.1.2  initEvents  子组件$on父组件传递过来的事件

   ​			如果给一个组件传递了方法，那么在创建该组件的时候会在该组件$options的_parentListeners属性上添加传递的方法。

   ​			这个组件的_events对象中会存放这些传递过来的方法。

   ​			处理逻辑: 

      1. 如果该组件的$options的_parentListeners属性有方法，则进行循环，对每个方法进行`normalizeEvent` 处理。抽象为这种数据结构：`event = {name: "click", once: false, capture: false, passive: false}`

      2. 该组件将$on(监听)该事件  ($on/$emit/$off...在eventMixins中)

         3.1.3  initRender

         1.  挂载render方法中的_c方法，  给当前组件创建$attrs/$listeners属性，其值对应`parentVnode.data.attrs / options._parentListeners`

         3.1.4 callHook(vm, 'beforeCreate')

         ​	callhook方法使用了 beforeCreate方法， 所有的生命周期方法都需要使用mergeOptions进行合并的。

         ​    当执行完当前组件的beforeCreate的集合。开始查看当前组件是否_hasHookEvent(当前组件被传递了hook:xxx方法)，如果有，则`vm.$emit('hook:' + hook)`

         3.1.4   initState

         对options中的props， methods， data， computed，watch 进行处理

         initProps:  

         1. 对每个属性进行校验，
         2.  对每个prop进行defineReactive， 放到 `const props = *vm*._props = {}` props上，并没有递归处理，所以props是传递的props数据的浅拷贝。
         3. 如果对props进行修改，会被set方法劫持到，调用回调方法。而prop中每个属性的回调都是一个warn，提示不可进行修改。 对_props进行proxy代理到当前组件的vm上。

         3.1.5 callHook(vm, 'created')

         1. 对data和prop进行defineReactive后，执行created钩子

         接着执行：

         ```js
         if (vm.$options.el) {
         	vm.$mount(vm.$options.el)  // 此时的 $mount是被compiler版本重写过的。
         }
         // 可以传入el属性， 也可以直接调用$mount方法。如果都没有，则不会进行挂载。
         ```

4. 执行$mount, $mount是在入口文件entry-runtime-with-compiler.js中定义的，进入入口文件，入口文件主要做了什么：将最初的`Vue.prototype.$mount` 使用变量保存。然后重写$mount方法。前者是用来挂载到真实dom上的方法。后者是做模板编译，将模板处理成render函数，然后再调用前者的$mount方法进行挂载到真实dom。

   4.1 分析重写的$mount， 进行执行。

         1. 如果el的是body/html报错， 因为后面要替换掉整个模板所以不能使用body/html。
            2. 将模板转换 --> ast语法树 --> render函数。
                        1. 优先级：render > template > el
                                    1. template中可以写id选择器，如果template中写了id选择器， 会使用document.querySelect找到元素。
                     2. 如果没写template写了el，则获取到el的outerHtml。 将值赋值给template。
                              1. 使用compileToFunctions将template转换为render函数。
                              2. 还有一个staticRenderFns为静态节点的render方法。
                     3. 解析为render函数后，调用最初的`Vue.prototype.$mount` 进行挂载。

   4.2 分析compileToFunctions函数

   ​	compileToFunctions函数分了三个部分

   1. parse 将 html 模板解析成抽象语法树(AST)
   2. optimize 对 AST 做优化处理,  （对节点标准为静态节点或静态根节点[做成静态树进行缓存]）
   3. generate 根据 AST 生成 render 函数(render,   staticRenderFns)

5. 调用最初的$mount方法挂在组件， 即调用lifeCycle中的mountComponent方法挂在组件

   1. callHook(*vm*, 'beforeMount')

   2. 定义updateComponent方法 (第一次是渲染组件，下面都是更新组件)

      ```js
      updateComponent = () => {
          // vm._render方法是执行转换后的render函数，返回虚拟dom
          // _update执行了vm.__patch__方法 将虚拟dom转换为真实dom
          // 将 处理好的真实dom放到组件的$options.$el上
          vm._update(vm._render()) 
      }
      ```

      