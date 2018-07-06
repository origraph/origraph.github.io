/* globals mure */
import GuidedTourView from './GuidedTourView.js';

class CsvNodeTourView extends GuidedTourView {
  constructor ({ container, state }) {
    super({
      container,
      state,
      operationList: [
        mure.OPERATIONS.Pivot.subOperations.PivotToContents,
        mure.OPERATIONS.Convert.subOperations.ConvertContainerToNode,
        mure.OPERATIONS.AssignClass,
        mure.OPERATIONS.Connect.subOperations.ConnectSetsOnAttribute,
        mure.OPERATIONS.AssignClass
      ]
    });
  }
}
export default CsvNodeTourView;
