import { LitElement, html, css } from 'lit';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/icon/icon.js';

class InventoryView extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    h2 {
      text-align: center;
      color: var(--app-primary-text-color, #333);
    }
    md-list {
      border: 1px solid var(--app-border-color, #ddd);
      border-radius: 8px;
      background-color: var(--app-surface-color, #fff);
      max-width: 600px;
      margin: 0 auto;
    }
    md-list-item {
      --md-list-item-label-text-color: var(--app-secondary-text-color, #555);
      --md-list-item-supporting-text-color: var(--app-accent-text-color, #777);
    }
    .item-icon {
      width: 40px; /* Fixed width for icon container */
      height: 40px; /* Fixed height for icon container */
      margin-right: 16px;
      overflow: hidden; /* Clip if image is too large */
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px; /* Optional: rounded corners for image container */
      background-color: #f0f0f0; /* Placeholder background */
    }
    .item-icon img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain; /* Scale image nicely within the container */
    }
    .empty-inventory {
      text-align: center;
      color: #777;
      margin-top: 20px;
    }
  `;

  static properties = {
    items: { type: Array }
  };

  constructor() {
    super();
    this.items = [];
  }

  render() {
    return html`
      <h2>Inventory</h2>
      ${this.items && this.items.length > 0 ? html`
        <md-list>
          ${this.items.map(item => html`
            <md-list-item>
              <div slot="start" class="item-icon">
                ${item.itemImage ? html`
                  <img src="${item.itemImage}" alt="${item.name}" />
                ` : html`
                  <md-icon>${item.icon || 'inventory_2'}</md-icon>
                `}
              </div>
              <div slot="headline">${item.name}</div>
              <div slot="supporting-text">${item.description || 'An interesting item.'}</div>
            </md-list-item>
          `)}
        </md-list>
      ` : html`
        <p class="empty-inventory">Your inventory is empty.</p>
      `}
    `;
  }
}
customElements.define('inventory-view', InventoryView);
