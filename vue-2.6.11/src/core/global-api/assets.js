/* @flow */

import { ASSET_TYPES } from "shared/constants";
import { isPlainObject, validateComponentName } from "../util/index";

export function initAssetRegisters(Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach((type) => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + "s"][id];
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== "production" && type === "component") {
          validateComponentName(id);
        }
        // component方法注册
        if (type === "component" && isPlainObject(definition)) {
          // 组件name的定义， 如果第二个参数(组件的配置对象)中有name则以name为准，否则以第一个参数为准
          definition.name = definition.name || id;
          /// Vue.extends(组件的配置对象)
          //   .vue文件就是在定义组件的配置对象，
          definition = this.options._base.extend(definition); // 返回组件的构造函数
          // 那么这个构造函数是Vue扩展出的VueComponent类。
        }
        if (type === "directive" && typeof definition === "function") {
          definition = { bind: definition, update: definition };
        }
        this.options[type + "s"][id] = definition;
        return definition;
      }
    };
  });
}
