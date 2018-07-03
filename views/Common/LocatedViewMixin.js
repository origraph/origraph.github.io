export default (superclass) => class extends superclass {
  constructor ({ container, icon, label, resources, location }) {
    super({ container, icon, label, resources });
    this.location = location;
  }
  async getEmptyState () {
    const temp = await super.getEmptyState();
    if (temp) { return temp; }
    const items = await this.location.items();
    if (Object.keys(items).length === 0) {
      return emptyStateDiv => {
        emptyStateDiv.html('<img class="emptyState" src="img/emptyStates/nothingSelected.svg"/>');
      };
    }
  }
};
