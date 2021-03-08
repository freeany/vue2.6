import { initMixin } from "./init";
import { stateMixin } from "./state";
import { renderMixin } from "./render";
import { eventsMixin } from "./events";
import { lifecycleMixin } from "./lifecycle";

function Vue(options) {
  this._init(options);
}

initMixin(Vue); // 初始化this._init方法
stateMixin(Vue); // 初始化实例上的$set $delete, $watch $watch的返回函数可以取消该watch
eventsMixin(Vue); // 将$on $once $emit $off 挂载到实例上
lifecycleMixin(Vue); // 将_update $forceUpdate  $destroy 挂载到实例上
renderMixin(Vue); // 将$nextTick(批量异步渲染) 与 _render(生成vdom)  挂载到实例上

export default Vue;
