class Table {
  constructor (selector, { oldTable, container }) {
    this.selector = selector;
    if (oldTable) {
      this.container = oldTable.container;
      // TODO: transition from what the old table was showing
    } else {
      this.container = container;
      // Just init a new table inside the given group
    }
  }
}
export default Table;
