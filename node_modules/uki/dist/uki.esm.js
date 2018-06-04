var queueAsync = (func => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(func());
    });
  });
});

class AbstractClass {
  requireProperties(properties) {
    queueAsync(() => {
      properties.forEach(m => {
        if (this[m] === undefined) {
          throw new TypeError(m + ' is undefined for class ' + this.constructor.name);
        }
      });
    });
  }
}

class Model extends AbstractClass {
  constructor() {
    super();
    this.eventHandlers = {};
    this.stickyTriggers = {};
  }
  on(eventName, callback, allowDuplicateListeners) {
    if (!this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = [];
    }
    if (!allowDuplicateListeners) {
      if (this.eventHandlers[eventName].indexOf(callback) !== -1) {
        return;
      }
    }
    this.eventHandlers[eventName].push(callback);
  }
  off(eventName, callback) {
    if (this.eventHandlers[eventName]) {
      if (!callback) {
        delete this.eventHandlers[eventName];
      } else {
        let index = this.eventHandlers[eventName].indexOf(callback);
        if (index >= 0) {
          this.eventHandlers[eventName].splice(index, 1);
        }
      }
    }
  }
  trigger(eventName, ...args) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName].forEach(callback => {
        window.setTimeout(() => {
          // Add timeout to prevent blocking
          callback.apply(this, args);
        }, 0);
      });
    }
  }
  stickyTrigger(eventName, argObj, delay = 10) {
    this.stickyTriggers[eventName] = this.stickyTriggers[eventName] || { argObj: {} };
    Object.assign(this.stickyTriggers[eventName].argObj, argObj);
    clearTimeout(this.stickyTriggers.timeout);
    this.stickyTriggers.timeout = setTimeout(() => {
      let argObj = this.stickyTriggers[eventName].argObj;
      delete this.stickyTriggers[eventName];
      this.trigger(eventName, argObj);
    }, delay);
  }
}

/* globals d3 */

class View extends Model {
  constructor(d3el = null, resources = {}) {
    super();
    this.requireProperties(['setup', 'draw']);
    this.d3el = d3el;
    this.dirty = true;
    this.drawTimeout = null;
    this.debounceWait = 100;
    this.readyToRender = false;
    this.loadResources(resources);
  }
  loadStylesheet(path) {
    let style = document.createElement('link');
    style.rel = 'stylesheet';
    style.type = 'text/css';
    style.media = 'screen';
    style.href = path;
    document.getElementsByTagName('head')[0].appendChild(style);
    return style;
  }
  async loadResources(paths) {
    this.resources = {};
    if (paths.style) {
      // Load stylesheets immediately
      this.resources.style = this.loadStylesheet(paths.style);
      delete paths.style;
    }
    // load all d3-fetchable resources in parallel
    try {
      await Promise.all(Object.keys(paths).reduce((agg, key) => {
        if (d3[key]) {
          agg.push((async () => {
            this.resources[key] = await d3[key](paths[key]);
          })());
        } else {
          throw new Error('d3 has no function for fetching resource of type ' + key);
        }
        return agg;
      }, []));
    } catch (err) {
      throw err;
    }
    this.readyToRender = true;
    this.render();
  }
  render(d3el = this.d3el) {
    let needsFreshRender = this.dirty || d3el.node() !== this.d3el.node();
    this.d3el = d3el;
    if (!this.readyToRender || !this.d3el) {
      // Don't execute any render calls until the promise in the constructor
      // has been resolved, or until we've actually been given a d3 element
      // to work with
      return;
    }
    if (needsFreshRender) {
      // Call setup immediately
      this.updateContainerCharacteristics(d3el);
      this.setup(d3el);
      this.dirty = false;
    }
    // Debounce the actual draw call
    clearTimeout(this.drawTimeout);
    this.drawTimeout = setTimeout(() => {
      this.drawTimeout = null;
      this.draw(d3el);
    }, this.debounceWait);
  }
  updateContainerCharacteristics(d3el) {
    if (d3el !== null) {
      this.bounds = d3el.node().getBoundingClientRect();
      this.emSize = parseFloat(d3el.style('font-size'));
      this.scrollBarSize = this.computeScrollBarSize(d3el);
    }
  }
  computeScrollBarSize(d3el) {
    // blatantly adapted from SO thread:
    // http://stackoverflow.com/questions/13382516/getting-scroll-bar-width-using-javascript
    var outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.width = '100px';
    outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps

    d3el.node().appendChild(outer);

    var widthNoScroll = outer.offsetWidth;
    // force scrollbars
    outer.style.overflow = 'scroll';

    // add innerdiv
    var inner = document.createElement('div');
    inner.style.width = '100%';
    outer.appendChild(inner);

    var widthWithScroll = inner.offsetWidth;

    // remove divs
    outer.parentNode.removeChild(outer);

    return widthNoScroll - widthWithScroll;
  }
}

export { AbstractClass, Model, View, queueAsync };
