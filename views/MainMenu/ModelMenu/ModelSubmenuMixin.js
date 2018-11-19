const ModelSubmenuMixin = function (superclass) {
  return class extends superclass {
    constructor (options) {
      super(options);
      this._instanceOfModelSubmenuMixin = true;
    }
    get model () {
      return this.parentMenu.model;
    }
    draw () {
      super.draw();
      return !!this.model;
    }
  };
};
Object.defineProperty(ModelSubmenuMixin, Symbol.hasInstance, {
  value: i => !!i._instanceOfModelSubmenuMixin
});
export default ModelSubmenuMixin;
