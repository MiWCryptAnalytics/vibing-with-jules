import { LitElement, html, css } from 'lit';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/icon/icon.js';
import { msg, updateWhenLocaleChanges } from '@lit/localize';


class InventoryView extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    h2 { /* Main Title for the View */
      text-align: center;
      color: var(--app-primary-text-color, #333);
      margin-bottom: 20px;
    }
    h3 { /* Section Titles (Resources, Items) */
      margin-top: 16px;
      margin-bottom: 8px;
      color: var(--app-primary-text-color, #333);
      border-bottom: 1px solid var(--app-border-color, #eee);
      padding-bottom: 4px;
      font-size: 1.3em;
    }
    .section-container {
      margin-bottom: 24px;
    }
    md-list {
      border: 1px solid var(--app-border-color, #ddd);
      border-radius: 8px;
      background-color: var(--app-surface-color, #fff);
      max-width: 600px;
      margin: 0 auto; /* Center the lists */
    }
    md-list-item { /* General item styling */
      --md-list-item-label-text-color: var(--app-secondary-text-color, #555);
      --md-list-item-supporting-text-color: var(--app-accent-text-color, #777);
    }
    .resources-display md-list-item [slot="trailing-supporting-text"] {
      font-weight: bold;
      font-size: 1.1em;
      color: var(--app-primary-color, #007bff); /* Use a theme color for emphasis */
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
    items: { type: Array },
    playerResources: { type: Object } // Added to hold player's resources
  };

  constructor() {
    super();
    this.items = [];
    this.playerResources = { gold: 0, silver: 0, rum: 0 }; // Initialize
    updateWhenLocaleChanges(this);
  }

  render() {
    return html`
      <h2>${msg('Treasures & Supplies', {id: 'inventory-main-title'})}</h2>

      <div class="resources-display section-container">
        <h3>${msg('Resources', {id: 'resources-section-title'})}</h3>
        <md-list>
          <md-list-item>
            <md-icon slot="start">paid</md-icon>
            <div slot="headline">${msg('Gold Doubloons', {id: 'resources-gold'})}</div>
            <div slot="trailing-supporting-text">${this.playerResources?.gold !== undefined ? this.playerResources.gold : 0}</div>
          </md-list-item>
          <md-list-item>
            <md-icon slot="start">savings</md-icon>
            <div slot="headline">${msg('Silver Pieces', {id: 'resources-silver'})}</div>
            <div slot="trailing-supporting-text">${this.playerResources?.silver !== undefined ? this.playerResources.silver : 0}</div>
          </md-list-item>
          <md-list-item>
            <md-icon slot="start">sports_bar</md-icon>
            <div slot="headline">${msg('Bottles of Rum', {id: 'resources-rum'})}</div>
            <div slot="trailing-supporting-text">${this.playerResources?.rum !== undefined ? this.playerResources.rum : 0}</div>
          </md-list-item>
        </md-list>
      </div>

      <div class="items-display section-container">
        <h3>${msg('Carried Items', {id: 'items-section-title'})}</h3>
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
                <div slot="supporting-text">${item.description || msg('An interesting item.', {id: 'item-default-desc'})}</div>
              </md-list-item>
            `)}
          </md-list>
        ` : html`
          <p class="empty-inventory">${msg('Your inventory is empty.', {id: 'inventory-empty'})}</p>
        `}
      </div>
    `;
  }
}
customElements.define('inventory-view', InventoryView);
