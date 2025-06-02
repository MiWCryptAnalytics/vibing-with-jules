import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import '@material/web/button/filled-button.js';

class GameInterfaceView extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 0; /* Remove padding if viewport takes full space */
      width: 100%;
      height: calc(100vh - 150px); /* Adjust based on header/footer/nav height */
      box-sizing: border-box;
      position: relative; /* For absolute positioning of UI elements */
    }
    .viewport {
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      position: relative; /* For positioning hidden objects */
      overflow: hidden;
      border: 1px solid #444; /* Optional border for the viewport */
      box-shadow: inset 0 0 30px rgba(0,0,0,0.5); /* Inner shadow for depth */
    }
    .location-title {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 15px;
      border-radius: 4px;
      font-size: 1.2em;
      z-index: 10;
    }
    .hidden-object {
      position: absolute;
      width: 50px; /* Adjust size as needed */
      height: 50px; /* Adjust size as needed */
      /* background-color: rgba(255, 255, 0, 0.3); Semi-transparent highlight */
      /* border: 1px dashed yellow; */
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease-out;
    }
    .hidden-object:hover {
      transform: scale(1.1);
    }
    .hidden-object md-icon {
      font-size: 36px; /* Make icon larger */
      color: rgba(255, 255, 255, 0.7); /* Make it slightly transparent */
      text-shadow: 0 0 5px black; /* Add shadow for visibility */
    }
    .actions-panel {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.75);
      padding: 10px;
      border-radius: 8px;
      display: flex;
      gap: 10px;
      z-index: 10;
    }
    .actions-panel md-filled-button {
      /* Custom styles for buttons if needed */
    }
    .found-message {
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(30, 150, 30, 0.9);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 1.1em;
      z-index: 20;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }
  `;

  static properties = {
    locationData: { type: Object },
    playerInventory: { type: Array },
    playerResources: { type: Object }, // Added for market interactions
    _lastFoundMessage: { type: String, state: true }
  };

  constructor() {
    super();
    this.locationData = null;
    this.playerInventory = [];
    this.playerResources = { gold: 0, silver: 0, rum: 0 }; // Initialize
    this._lastFoundMessage = '';
  }

  // Helper to format price object (e.g., { gold: 10 }) into "10 Gold"
  _formatPrice(priceObject) {
    if (!priceObject) return '';
    const currency = Object.keys(priceObject)[0];
    const amount = priceObject[currency];
    // Simple pluralization for "Silver Pieces" vs "Gold Doubloon" can be more complex
    // For now, just capitalize. msg() can handle full localized names if needed.
    const currencyName = currency.charAt(0).toUpperCase() + currency.slice(1);
    return `${amount} ${currencyName}`;
  }

  _handleBuyGood(good) {
    let message = '';
    const price = good.marketSellsToPlayerPrice;
    if (!price) {
      console.error("Buy error: good has no selling price", good);
      return;
    }
    const currency = Object.keys(price)[0];
    const cost = price[currency];

    if (this.playerResources && this.playerResources[currency] >= cost) {
      // Deduct cost
      const costUpdate = { [currency]: -cost };
      this.dispatchEvent(new CustomEvent('update-resources', { detail: costUpdate, bubbles: true, composed: true }));

      if (good.type === 'resource') {
        const resourceGain = { [good.resourceType]: good.quantity };
        this.dispatchEvent(new CustomEvent('update-resources', { detail: resourceGain, bubbles: true, composed: true }));
        message = `${msg('Bought', {id: 'notify-bought'})} ${good.quantity} ${good.name}.`;
      } else if (good.type === 'item') {
        // For this to work, 'good' needs enough details to form an inventory item
        // or itemIdToTrade should point to a globally defined item template.
        // The current POI definition for tradableGoods includes name, desc, icon, itemImage.
        this.dispatchEvent(new CustomEvent('add-to-inventory', {
          detail: { item: {
            id: good.itemIdToTrade, // This is crucial
            name: good.name,
            description: good.description,
            icon: good.icon,
            itemImage: good.itemImage
          } },
          bubbles: true, composed: true
        }));
        message = `${msg('Bought', {id: 'notify-bought'})} ${good.name}.`;
      }
      // TODO: Update stock (good.stock--), needs server or more complex state.
      console.log(`Bought ${good.name} for ${cost} ${currency}. Stock: ${good.stock}`);
    } else {
      message = `${msg('Not enough', {id: 'notify-not-enough'})} ${currency} ${msg('for', {id: 'notify-for'})} ${good.name}.`;
    }
    this._lastFoundMessage = message;
    setTimeout(() => { this._lastFoundMessage = ''; this.requestUpdate(); }, 3000);
    this.requestUpdate();
  }

  _handleSellGood(good) {
    let message = '';
    const payment = good.marketBuysFromPlayerPrice;
     if (!payment) {
      console.error("Sell error: good has no buying price", good);
      return;
    }
    const currency = Object.keys(payment)[0];
    const income = payment[currency];

    if (good.type === 'item') {
      const itemInInventory = this.playerInventory.find(item => item.id === good.itemIdToTrade);
      if (itemInInventory) {
        this.dispatchEvent(new CustomEvent('remove-from-inventory', { detail: { itemId: good.itemIdToTrade }, bubbles: true, composed: true }));

        const incomeUpdate = { [currency]: income };
        this.dispatchEvent(new CustomEvent('update-resources', { detail: incomeUpdate, bubbles: true, composed: true }));
        message = `${msg('Sold', {id: 'notify-sold'})} ${good.name} ${msg('for', {id: 'notify-for'})} ${this._formatPrice(payment)}.`;
        // TODO: Update demand (good.demand--), needs server or more complex state.
        console.log(`Sold ${good.name} for ${income} ${currency}. Demand: ${good.demand}`);
      } else {
        message = `${msg("You don't have", {id: 'notify-dont-have'})} ${good.name} ${msg('to sell.', {id: 'notify-to-sell'})}`;
      }
    } else if (good.type === 'resource') {
      // Example: Selling rum from playerResources. 'good.resourceType' and 'good.quantity' would be used.
      if (this.playerResources && this.playerResources[good.resourceType] >= good.quantity) {
        const resourceDeduction = { [good.resourceType]: -good.quantity };
        this.dispatchEvent(new CustomEvent('update-resources', { detail: resourceDeduction, bubbles: true, composed: true }));

        const incomeUpdate = { [currency]: income };
        this.dispatchEvent(new CustomEvent('update-resources', { detail: incomeUpdate, bubbles: true, composed: true }));
        message = `${msg('Sold', {id: 'notify-sold'})} ${good.quantity} ${good.name} ${msg('for', {id: 'notify-for'})} ${this._formatPrice(payment)}.`;
      } else {
        message = `${msg("You don't have enough", {id: 'notify-dont-have-enough'})} ${good.name} ${msg('to sell.', {id: 'notify-to-sell'})}`;
      }
    }
    this._lastFoundMessage = message;
    setTimeout(() => { this._lastFoundMessage = ''; this.requestUpdate(); }, 3000);
    this.requestUpdate();
  }

  _handleObjectClick(clickedObject) {
    console.log('GameInterface: Hidden object clicked:', clickedObject);
    let messageToDisplay = '';

    // Check if it's an interactable feature AND it hasn't been handled yet
    if (clickedObject.isInteractableFeature && clickedObject.interaction && !clickedObject.isHandledInteractable) {
      const interaction = clickedObject.interaction;
      const requiredItem = this.playerInventory.find(invItem => invItem.id === interaction.requiredItemId);

      if (requiredItem) {
        messageToDisplay = interaction.successMessage;
        console.log(`Interaction success: ${interaction.successMessage}`);

        if (interaction.revealedItem) {
          this.dispatchEvent(new CustomEvent('add-to-inventory', {
            detail: { item: { ...interaction.revealedItem } }, // Dispatch a copy
            bubbles: true,
            composed: true,
          }));
        }

        // Modify the state of the interacted object in locationData
        const objectInScene = this.locationData.hiddenObjects.find(obj => obj.id === clickedObject.id);
        if (objectInScene) {
          objectInScene.name = `Opened ${clickedObject.name}`;
          objectInScene.description = interaction.revealedItem ? "It's now empty." : "You've interacted with this.";
          objectInScene.icon = 'lock_open'; // Change icon to reflect opened state
          delete objectInScene.isInteractableFeature; // Remove further interaction capability
          delete objectInScene.interaction;
          objectInScene.isHandledInteractable = true; // Mark as handled
        }

        if (interaction.consumesRequiredItem) {
          this.dispatchEvent(new CustomEvent('remove-from-inventory', {
            detail: { itemId: interaction.requiredItemId },
            bubbles: true,
            composed: true,
          }));
        }
      } else {
        // Player does not have the required item
        let requiredItemName = interaction.requiredItemId;
        // Basic formatting for item name, can be improved if name is in JSON
        requiredItemName = interaction.requiredItemId.replace('item_', '').replace(/_/g, ' ');
        messageToDisplay = `You need a ${requiredItemName} to use the ${clickedObject.name}.`;
        console.log(`Interaction failed: Required item ${interaction.requiredItemId} not found.`);
      }
    } else if (clickedObject.isHandledInteractable) {
      // Object is an interactable that has already been successfully handled
      messageToDisplay = `${clickedObject.name}: ${clickedObject.description}`;
      // No further action needed, it's just a visual element.
    }
    // Check if the object grants resources (and isn't an interactable feature already handled by above block)
    else if (clickedObject.grantsResources && !clickedObject.isHandledInteractable) {
      this.dispatchEvent(new CustomEvent('update-resources', {
        detail: clickedObject.grantsResources,
        bubbles: true,
        composed: true,
      }));
      messageToDisplay = clickedObject.foundMessage || `You found: ${clickedObject.name}!`;

      // Mark as handled to make it non-interactive and update its appearance via render logic
      const objectInScene = this.locationData.hiddenObjects.find(obj => obj.id === clickedObject.id);
      if (objectInScene) {
        // Update properties to reflect it's been collected
        // The name could be changed, or just rely on isHandledInteractable for rendering
        objectInScene.description = "The resources have been gathered."; // Example description change
        objectInScene.isHandledInteractable = true;
      }
    }
    else {
      // Standard hidden object: add to inventory
      // This assumes that if it's clickable and not an unhandled interactable or resource cache, it's a collectible item.
      // The rendering logic should prevent already found items from being clickable.
      this.dispatchEvent(new CustomEvent('add-to-inventory', {
        detail: { item: { ...clickedObject } }, // Dispatch a copy
        bubbles: true,
        composed: true,
      }));
      messageToDisplay = clickedObject.foundMessage || `You found: ${clickedObject.name}!`;
    }

    if (messageToDisplay) {
      this._lastFoundMessage = messageToDisplay;
      // Clear message and request update after timeout
      setTimeout(() => {
        this._lastFoundMessage = '';
        this.requestUpdate();
      }, 3000);
    }
    this.requestUpdate(); // Request update to reflect changes immediately
  }

  _handleActionClick(action) {
    console.log('GameInterface: Action clicked:', action);
    this.dispatchEvent(new CustomEvent('navigate', {
      detail: { view: action.targetView, targetLocationId: action.targetLocationId },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (!this.locationData) {
      return html`<div class="viewport"><p style="text-align:center; color:white; padding-top: 50px;">Loading location...</p></div>`;
    }

    const backgroundImage = this.locationData.gameViewImage ? `url(${this.locationData.gameViewImage})` : 'none';

    let contentHtml;
    if (this.locationData.isMarket) {
      contentHtml = html`
        <div class="market-interface">
          <md-list class="market-list">
            ${this.locationData.tradableGoods?.map(good => html`
              <md-list-item class="tradable-good" id="${good.goodId}">
                <md-icon slot="start">${good.icon || 'store'}</md-icon>
                <div slot="headline">${good.name}</div>
                <div slot="supporting-text">${good.description} (Stock: ${good.stock !== undefined ? good.stock : 'N/A'}, Demand: ${good.demand !== undefined ? good.demand : 'N/A'})</div>
                <div slot="end" class="trade-actions">
                  ${good.marketSellsToPlayerPrice ? html`
                    <div class="price-tag">${msg('Price:', {id: 'market-price'})} ${this._formatPrice(good.marketSellsToPlayerPrice)}</div>
                    <md-filled-button class="buy-button" @click=${() => this._handleBuyGood(good)}
                      ?disabled=${good.stock === 0}>
                      ${msg('Buy', {id: 'market-buy'})}
                    </md-filled-button>
                  ` : ''}
                  ${good.marketBuysFromPlayerPrice ? html`
                    <div class="price-tag">${msg('Offer:', {id: 'market-offer'})} ${this._formatPrice(good.marketBuysFromPlayerPrice)}</div>
                    <md-filled-button class="sell-button" @click=${() => this._handleSellGood(good)}
                      ?disabled=${good.demand === 0}>
                      ${msg('Sell', {id: 'market-sell'})}
                    </md-filled-button>
                  ` : ''}
                </div>
              </md-list-item>
            `)}
          </md-list>
        </div>
      `;
    } else {
      contentHtml = html`
        ${this.locationData.hiddenObjects?.map(obj => {
          const isFound = this.playerInventory.some(invItem => invItem.id === obj.id);
          if (obj.isHandledInteractable) {
            return html`
              <div class="hidden-object" style="left: ${obj.position.x}; top: ${obj.position.y}; cursor: default;" title="${obj.name} - ${obj.description}">
                <md-icon>${obj.icon || 'check_circle'}</md-icon>
              </div>`;
          }
          if (!isFound) {
            return html`
              <div class="hidden-object" style="left: ${obj.position.x}; top: ${obj.position.y};"
                title="${obj.isInteractableFeature ? obj.description : `Investigate ${obj.name}`}"
                @click=${() => this._handleObjectClick(obj)}>
                <md-icon>${obj.icon || 'search'}</md-icon>
              </div>`;
          }
          return '';
        })}
      `;
    }

    return html`
      <div class="viewport" style="background-image: ${backgroundImage};">
        <div class="location-title">${this.locationData.name}</div>
        ${contentHtml}
        ${this._lastFoundMessage ? html`<div class="found-message">${this._lastFoundMessage}</div>` : ''}
        ${this.locationData.actions && this.locationData.actions.length > 0 ? html`
          <div class="actions-panel">
            ${this.locationData.actions.map(action => html`
              <md-filled-button @click=${() => this._handleActionClick(action)}>
                ${action.label}
              </md-filled-button>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }
}
customElements.define('game-interface-view', GameInterfaceView);

/* Basic CSS for market (can be expanded) */
GameInterfaceView.styles = [GameInterfaceView.styles, css`
  .market-interface {
    padding-top: 50px; /* Space below location title */
    height: calc(100% - 100px); /* Adjust based on title and action panel */
    overflow-y: auto;
  }
  .market-list {
    max-width: 700px;
    margin: 0 auto;
    background-color: rgba(255, 255, 255, 0.9); /* Semi-transparent white background */
    border-radius: 8px;
  }
  .tradable-good .trade-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px; /* Space between price and button */
  }
  .tradable-good .price-tag {
    font-size: 0.9em;
    color: #333;
  }
  .tradable-good md-filled-button {
    --md-filled-button-container-height: 36px; /* Smaller buttons */
  }
`];
