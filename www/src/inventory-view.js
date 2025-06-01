import { LitElement, html, css } from 'lit';

class InventoryView extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; }
    h2 { text-align: center; }
  `;
  render() {
    return html`<h2>Inventory</h2><p>Player's items will be displayed here.</p>`;
  }
}
customElements.define('inventory-view', InventoryView);
