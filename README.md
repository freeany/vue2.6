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

      