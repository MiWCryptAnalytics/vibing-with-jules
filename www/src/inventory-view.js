import { LitElement, html, css } from 'lit';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/icon/icon.js';
import { msg, updateWhenLocaleChanges } from '@lit/localize';


class InventoryView extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px; /* Keep */
    }
    h2 { /* Main Title for the View */
      /* Inherits 'PirateFont' from global h2 */
      text-align: center; /* Keep */
      /* color: var(--app-primary-text-color, #333); */ /* Replaced by global */
      margin-bottom: 20px; /* Keep */
    }
    h3 { /* Section Titles (Resources, Items) */
      /* Inherits 'PirateFont' and color from global h3 */
      margin-top: 16px; /* Keep */
      margin-bottom: 8px; /* Keep */
      /* color: var(--app-primary-text-color, #333); */ /* Replaced by global */
      border-bottom: 2px dashed #7A5C5C; /* medium brown dashed line */
      padding-bottom: 4px; /* Keep */
      font-size: 1.3em; /* Keep */
    }
    .section-container {
      margin-bottom: 24px; /* Keep */
    }
    md-list {
      border: 2px solid #7A5C5C; /* medium brown */
      border-radius: 3px; /* Updated */
      background-color: rgba(224, 216, 201, 0.5); /* semi-transparent darker parchment */
      max-width: 600px; /* Keep */
      margin: 0 auto; /* Center the lists - Keep */
    }
    md-list-item { /* General item styling */
      --md-list-item-label-text-font: 'MainTextFont', serif; /* Placeholder */
      --md-list-item-supporting-text-font: 'MainTextFont', serif; /* Placeholder */
      --md-list-item-label-text-color: #3C2F2F; /* dark brown */
      --md-list-item-supporting-text-color: #7A5C5C; /* medium brown */
      --md-list-item-leading-icon-color: #3C2F2F; /* dark brown for resource icons */
    }
    .resources-display md-list-item [slot="trailing-supporting-text"] {
      font-weight: bold; /* Keep */
      font-size: 1.1em; /* Keep */
      color: #0A2F51; /* dark blue for emphasis */
    }
    .item-icon {
      width: 40px; /* Keep */
      height: 40px; /* Keep */
      margin-right: 16px; /* Keep */
      overflow: hidden; /* Keep */
      display: flex; /* Keep */
      align-items: center; /* Keep */
      justify-content: center; /* Keep */
      border-radius: 0; /* Updated */
      background-color: transparent; /* Updated */
    }
    .item-icon img {
      max-width: 100%; /* Keep */
      max-height: 100%; /* Keep */
      object-fit: contain; /* Keep */
    }
    .empty-inventory {
      text-align: center; /* Keep */
      color: #7A5C5C; /* medium brown */
      font-family: 'MainTextFont', serif; /* Placeholder */
      margin-top: 20px; /* Keep */
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
