/* globals mure */
import GuidedTourView from './GuidedTourView.js';

class CsvNodeTourView extends GuidedTourView {
  constructor ({ container, state }) {
    super({
      container,
      state,
      operationList: [
        mure.OPERATIONS.Navigate.subOperations.NavigateToContents,
        mure.OPERATIONS.Convert.subOperations.ConvertContainerToNode,
        mure.OPERATIONS.AssignClass,
        mure.OPERATIONS.Connect.subOperations.ConnectNodesOnAttribute,
        mure.OPERATIONS.AssignClass
      ]
    });
    this.label = 'CSV Rows to Nodes';
    this.description = `\
This series of operations will convert the rows in the CSV file to nodes, and
optionally:
<ul>
  <li>Assist you in assigning classes to the nodes</li>
  <li>Creating edges between the nodes</li>
  <li>Assigning classes to the new edges</li>
</ul>
You can close this view at any point if you want to do something else.`;
  }
}
export default CsvNodeTourView;
