/* globals mure */
import ModalMenuOption from '../Common/ModalMenuOption.js';

class UploadOption extends ModalMenuOption {
  constructor (parentMenu, d3el) {
    super(parentMenu, d3el);
    this.icon = 'img/upload.svg';
    this.label = 'Upload Data...';
    this.lastFiles = [];
    this.loadedFiles = {};

    this.nodeTours = {
      'csv': window.WORKSPACES.csvNodeTour
    };
    this.edgeTours = {};
  }
  setup () {
    super.setup();
    this.uploadInput = this.contentDiv.append('input')
      .attr('type', 'file')
      .property('multiple', true)
      .style('display', 'none')
      .on('change', () => { this.uploadFiles(); });
    this.uploadButton = this.contentDiv.append('div')
      .classed('button', true)
      .on('click', () => this.uploadInput.node().click());
    this.uploadButton.append('a');
    this.uploadButton.append('span')
      .text('Choose Files');

    this.contentDiv.append('div')
      .classed('lastFiles', true);
  }
  draw () {
    super.draw();
    const lastFileContainer = this.contentDiv.select('.lastFiles')
      .style('display', this.lastFiles.length === 0 ? 'none' : null);

    if (this.lastFiles.length > 0) {
      let lastFiles = lastFileContainer.selectAll('.file')
        .data(this.lastFiles, d => d.name);
      lastFiles.exit().remove();
      let lastFilesEnter = lastFiles.enter().append('div')
        .classed('file', true);
      lastFiles = lastFiles.merge(lastFilesEnter);

      lastFilesEnter.append('span')
        .classed('filename', true);
      lastFiles.select('.filename').text(d => d.name);

      lastFilesEnter.append('img')
        .classed('spinner', true);
      lastFiles.select('.spinner')
        .attr('src', d => this.loadedFiles[d.name] ? 'img/check.svg' : 'img/spinner.gif');

      this.drawTourButton(lastFiles, lastFilesEnter, 'node', this.nodeTours);
      this.drawTourButton(lastFiles, lastFilesEnter, 'edge', this.edgeTours);
    }
  }
  drawTourButton (lastFiles, lastFilesEnter, className, tourDict) {
    let tourButton = lastFilesEnter.append('div')
      .classed(className, true)
      .classed('button', true);
    tourButton.append('a')
      .append('img')
      .attr('src', `img/${className}.svg`);
    lastFiles.select(`.${className}.button`)
      .classed('disabled', d => !this.loadedFiles[d.name])
      .style('display', d => tourDict[mure.mime.extension(d.type)] ? null : 'none')
      .on('click', async d => {
        let tourWorkspace = tourDict[mure.mime.extension(d.type)];
        let fileSelection = this.loadedFiles[d.name];
        if (tourWorkspace && fileSelection) {
          tourWorkspace = tourWorkspace.copy();
          // TODO: Hard-coding the table state assignment... need to generalize this...
          tourWorkspace.goldenLayoutConfig.content[0].content[1].content[0]
            .componentState.selectorList = (await fileSelection
              .subSelect('.contents[*]')).selectorList;
          tourWorkspace.assignModes(window.mainView.currentWorkspace);
          window.mainView.loadWorkspace(tourWorkspace);
        }
      })
      .on('mouseover', function () {
        window.mainView.showTooltip({
          content: `Start guided ${className} tour`,
          targetBounds: this.getBoundingClientRect(),
          anchor: { y: -1 }
        });
      })
      .on('mouseout', () => {
        window.mainView.hideTooltip();
      });
  }
  async uploadFiles () {
    this.loadedFiles = {};
    this.lastFiles = Array.from(this.uploadInput.node().files);
    this.render();

    const fileSelections = await Promise.all(this.lastFiles.map(async fileObj => {
      const selection = await mure.uploadFileObj(fileObj);
      this.loadedFiles[fileObj.name] = selection;
      this.render();
      if (fileObj.type === 'text/csv') {
        // Auto-assign file name as class to CSV rows
        await (await (await selection
          .selectAll({ context: 'Children' }))
          .convert({ context: 'Taggable' }))
          .assignClass({ className: fileObj.name });
      }
      return selection;
    }));
    const unifiedSelection = await fileSelections.reduce(async (agg, selection) => {
      if (!agg) {
        return selection;
      } else {
        return (await agg).mergeSelection(selection);
      }
    }, null);
    await window.mainView.setUserSelection(unifiedSelection);
  }
}
export default UploadOption;
