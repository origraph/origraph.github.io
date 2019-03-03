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
    this._eventHandlers = {};
    this._stickyTriggers = {};
  }

  on(eventName, callback) {
    let [event, namespace] = eventName.split('.');
    this._eventHandlers[event] = this._eventHandlers[event] || {
      '': []
    };

    if (!namespace) {
      this._eventHandlers[event][''].push(callback);
    } else {
      this._eventHandlers[event][namespace] = callback;
    }
  }

  off(eventName, callback) {
    let [event, namespace] = eventName.split('.');

    if (this._eventHandlers[event]) {
      if (!namespace) {
        if (!callback) {
          this._eventHandlers[event][''] = [];
        } else {
          let index = this._eventHandlers[event][''].indexOf(callback);

          if (index >= 0) {
            this._eventHandlers[event][''].splice(index, 1);
          }
        }
      } else {
        delete this._eventHandlers[event][namespace];
      }
    }
  }

  trigger(event, ...args) {
    const handleCallback = callback => {
      window.setTimeout(() => {
        // Add timeout to prevent blocking
        callback.apply(this, args);
      }, 0);
    };

    if (this._eventHandlers[event]) {
      for (const namespace of Object.keys(this._eventHandlers[event])) {
        if (namespace === '') {
          this._eventHandlers[event][''].forEach(handleCallback);
        } else {
          handleCallback(this._eventHandlers[event][namespace]);
        }
      }
    }
  }

  stickyTrigger(eventName, argObj, delay = 10) {
    this._stickyTriggers[eventName] = this._stickyTriggers[eventName] || {
      argObj: {}
    };
    Object.assign(this._stickyTriggers[eventName].argObj, argObj);
    clearTimeout(this._stickyTriggers.timeout);
    this._stickyTriggers.timeout = setTimeout(() => {
      let argObj = this._stickyTriggers[eventName].argObj;
      delete this._stickyTriggers[eventName];
      this.trigger(eventName, argObj);
    }, delay);
  }

}

/* globals d3 */

class View extends Model {
  constructor(d3el = null, resources) {
    super();
    this.requireProperties(['setup', 'draw']);
    this.d3el = d3el;
    this.dirty = true;
    this.drawTimeout = null;
    this.debounceWait = 100;

    if (resources) {
      this.readyToRender = false;
      this.loadResources(resources);
    } else {
      this.readyToRender = true;
    }
  }

  loadCSS(url) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.type = 'text/css';
    style.media = 'screen';
    style.href = url;
    document.getElementsByTagName('head')[0].appendChild(style);
    return style;
  }

  async loadLESS(url) {
    // We assume that less is globally available
    const result = await less.render(`@import '${url}';`); // eslint-disable-line no-undef

    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = result.css;
    document.getElementsByTagName('head')[0].appendChild(style);
    return style;
  }

  async loadResources(paths = []) {
    const resourcePromises = [];

    for (const spec of paths) {
      if (spec.type === 'css') {
        // Load pure css directly
        resourcePromises.push(this.loadCSS(spec.url));
      } else if (spec.type === 'less') {
        // We assume less is available globally
        resourcePromises.push((await this.loadLESS(spec.url)));
      } else if (d3[spec.type]) {
        resourcePromises.push(d3[spec.type](spec.url));
      } else {
        throw new Error(`Can't load resource ${spec.url} of type ${spec.type}`);
      }
    }

    this.resources = await Promise.all(resourcePromises);
    this.readyToRender = true;
    this.render();
  }

  render(d3el = this.d3el) {
    let needsFreshRender = this.dirty || d3el.node() !== this.d3el.node();
    this.d3el = d3el;

    if (!this.readyToRender || !this.d3el) {
      // Don't execute any render calls until all resources are loaded,
      // and we've actually been given a d3 element to work with
      return;
    }

    if (needsFreshRender) {
      // Call setup immediately
      this.updateContainerCharacteristics(d3el);
      this.setup(d3el);
      this.dirty = false;
    } // Debounce the actual draw call


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
    var widthNoScroll = outer.offsetWidth; // force scrollbars

    outer.style.overflow = 'scroll'; // add innerdiv

    var inner = document.createElement('div');
    inner.style.width = '100%';
    outer.appendChild(inner);
    var widthWithScroll = inner.offsetWidth; // remove divs

    outer.parentNode.removeChild(outer);
    return widthNoScroll - widthWithScroll;
  }

}

export { AbstractClass, Model, View, queueAsync };
