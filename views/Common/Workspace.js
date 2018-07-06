class Workspace {
  constructor ({
    sliceMode = window.SLICE_MODES.union,
    sliceSettings = {
      // if not in union mode, there should be a key for every intersection
      union: {
        scrollIndex: 0
        // no sortAttr means to sort on item labels
      }
    },
    hierarchyExpansion = {},
    goldenLayoutConfig = {
      content: [
        {
          type: 'component',
          componentName: 'HelpView',
          componentState: {}
        }
      ]
    }
  } = {}) {
    this.sliceMode = sliceMode;
    this.sliceSettings = sliceSettings;
    this.hierarchyExpansion = hierarchyExpansion;
    this.goldenLayoutConfig = goldenLayoutConfig;
  }
  toFlatObject () {
    return {
      sliceMode: this.sliceMode,
      sliceSettings: this.sliceSettings,
      hierarchyExpansion: this.hierarchyExpansion,
      goldenLayoutConfig: this.goldenLayoutConfig
    };
  }
  copy () {
    return new Workspace(JSON.parse(JSON.stringify(this.toFlatObject())));
  }
  assignModes (otherWorkspace) {
    this.sliceMode = otherWorkspace.sliceMode;
    this.sliceSettings = otherWorkspace.sliceSettings;
    this.hierarchyExpansion = otherWorkspace.hierarchyExpansion;
  }
  assignLocation (selection) {
    const helper = layoutSpec => {
      if (layoutSpec instanceof Array) {
        layoutSpec.forEach(temp => helper(temp));
      } else {
        if (layoutSpec.type === 'component') {
          const ViewClass = window.VIEW_CLASSES[layoutSpec.componentName];
          if (ViewClass.prototype.setLocation) {
            layoutSpec.componentState.selectorList = selection.selectorList;
          }
        } else if (layoutSpec.content) {
          helper(layoutSpec.content);
        }
      }
    };
    helper(this.goldenLayoutConfig);
  }
}
export default Workspace;
