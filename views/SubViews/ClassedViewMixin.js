/* globals mure */
export default (superclass) => class extends superclass {
  constructor (options) {
    super(options);
    this.classSelector = (options.state && options.state.classSelector) || 'root.values()';
  }
  get id () {
    return this.constructor.name + this.classSelector;
  }
  get classObj () {
    return mure.classes[this.classSelector];
  }
};
