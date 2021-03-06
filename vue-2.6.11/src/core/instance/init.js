/* @flow */

import config from "../config";
import { initProxy } from "./proxy";
import { initState } from "./state";
import { initRender } from "./render";
import { initEvents } from "./events";
import { mark, measure } from "../util/perf";
import { initLifecycle, callHook } from "./lifecycle";
import { initProvide, initInjections } from "./inject";
import { extend, mergeOptions, formatComponentName } from "../util/index";

// 组件的id ，这个是根Vue实例， id = 0
let uid = 0;

export function initMixin(Vue) {
  Vue.prototype._init = function (options) {
    const vm = this; // 将当前this保存起来。
    // a uid
    vm._uid = uid++; // uid

    let startTag, endTag;
    /* istanbul ignore if */
    // mark 是window.performance.mark  是最性能埋点相关的，不必理会
    // if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    //   startTag = `vue-perf-start:${vm._uid}`
    //   endTag = `vue-perf-end:${vm._uid}`
    //   mark(startTag)
    // }

    // a flag to avoid this being observed // 设置一个标记，避免被观察。
    vm._isVue = true;
    // merge options
    // 选项合并
    //  这个代表内部组件_isComponent， 我们平常写的就不是内部组件。
    if (options && options._isComponent) {
      // 如果options 有 _isComponent属性
      // optimize internal component instantiation   优化内部组件实例化
      // since dynamic options merging is pretty slow, and none of the  因为动态选项合并是相当慢的，而且没有
      // internal component options needs special treatment.  内部组件选项需要特殊处理。
      initInternalComponent(vm, options); // 初始化内部组件
    } else {
      // 有意思
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      );
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== "production") {
      initProxy(vm);
    } else {
      vm._renderProxy = vm;
    }
    // expose real self
    vm._self = vm;
    // vm的生命周期相关变量初始化
    // 初始化$children/$parent/$root/$refs
    initLifecycle(vm);
    initEvents(vm);
    initRender(vm);
    callHook(vm, "beforeCreate");

    // 状态数据相关
    // 把inject的成员注入到vm上
    initInjections(vm); // resolve injections before data/props
    // 初始化vm的_props/methods/_data/computed/watch
    initState(vm);
    initProvide(vm); // resolve provide after data/props
    callHook(vm, "created");

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== "production" && config.performance && mark) {
      vm._name = formatComponentName(vm, false);
      mark(endTag);
      measure(`vue ${vm._name} init`, startTag, endTag);
    }

    // 太巧妙了  这里刚好调用的是被重写过的Vue.prototype.$mount方法。 如果没有$el,那么就需要手动.$mount。如果这俩都没有，还可以写render，如果这仨都没有，那无法渲染。
    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
  };
}

// 对内部组件进行处理，处理父子关系
export function initInternalComponent(vm, options) {
  const opts = (vm.$options = Object.create(vm.constructor.options));
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode;
  opts.parent = options.parent;
  opts._parentVnode = parentVnode;

  const vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }

  /* 
    
  */
}

export function resolveConstructorOptions(Ctor) {
  let options = Ctor.options;
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super);
    const cachedSuperOptions = Ctor.superOptions;
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions;
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor);
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions);
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        options.components[options.name] = Ctor;
      }
    }
  }
  return options;
}

function resolveModifiedOptions(Ctor) {
  let modified;
  const latest = Ctor.options;
  const sealed = Ctor.sealedOptions;
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {};
      modified[key] = latest[key];
    }
  }
  return modified;
}
