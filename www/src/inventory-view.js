import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';

class InventoryView extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; }
    h2 { text-align: center; }
  `;

  constructor() {
    super();
    updateWhenLocaleChanges(this);
  }

  render() {
    return html`
      <h2>${msg('Inventory', {id: 'inventory-title'})}</h2>
      <p>${msg("Player's items will be displayed here.", {id: 'inventory-description'})}</p>
    `;
  }
}
customElements.define('inventory-view', InventoryView);
