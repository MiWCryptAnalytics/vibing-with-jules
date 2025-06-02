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
    playerResources: { type: Object }, 
    allItems: { type: Object }, 
    allNpcs: { type: Object },      // Added for NPC data
    allDialogues: { type: Object }, // Added for dialogue data
    _lastFoundMessage: { type: String, state: true },
    _activeDialogueNpcId: { type: String, state: true },
    _currentDialogueNodeId: { type: String, state: true },
    _currentDialogueNode: { type: Object, state: true }
  };

  constructor() {
    super();
    this.locationData = null;
    this.playerInventory = [];
    this.playerResources = { gold: 0, silver: 0, rum: 0 };
    this.allItems = new Map(); 
    this.allNpcs = new Map();      // Initialize allNpcs
    this.allDialogues = {};    // Initialize allDialogues
    this._lastFoundMessage = '';
    this._activeDialogueNpcId = null;
    this._currentDialogueNodeId = null;
    this._currentDialogueNode = null;
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

  _handleNpcClick(npcId) {
    if (!this.allDialogues || !this.allNpcs) {
      console.error("Dialogue or NPC data not loaded!");
      return;
    }
    const npcDetails = this.allNpcs.get(npcId);
    const dialogueTree = this.allDialogues[npcId];

    if (npcDetails && dialogueTree) {
      this._activeDialogueNpcId = npcId;
      // Determine start node: often npcId_start or first key.
      const startNodeId = Object.keys(dialogueTree)[0]; // Simple assumption: first node is start
      
      if (dialogueTree[startNodeId]) {
        this._currentDialogueNodeId = startNodeId;
        this._currentDialogueNode = dialogueTree[startNodeId];
        this.requestUpdate();
      } else {
        console.error(`No start node found for NPC ${npcId} (tried ${startNodeId})`);
        this._lastFoundMessage = `Hmm, ${npcDetails.name} doesn't seem to want to talk.`;
        setTimeout(() => { this._lastFoundMessage = '';}, 3000);
      }
    } else {
      console.error(`NPC details or dialogue tree not found for NPC ID: ${npcId}`);
      this._lastFoundMessage = "They have nothing to say.";
       setTimeout(() => { this._lastFoundMessage = '';}, 3000);
    }
  }

  _handlePlayerChoice(choice) {
    if (!this._activeDialogueNpcId || !this.allDialogues) return;

    if (choice.nextNodeId === "END") {
      this._endDialogue();
    } else {
      const dialogueTree = this.allDialogues[this._activeDialogueNpcId];
      const nextNode = dialogueTree ? dialogueTree[choice.nextNodeId] : null;
      if (nextNode) {
        this._currentDialogueNodeId = choice.nextNodeId;
        this._currentDialogueNode = nextNode;
      } else {
        console.error(`Dialogue node "${choice.nextNodeId}" not found for NPC "${this._activeDialogueNpcId}". Ending dialogue.`);
        this._endDialogue();
      }
    }
    this.requestUpdate();
  }

  _endDialogue() {
    this._activeDialogueNpcId = null;
    this._currentDialogueNodeId = null;
    this._currentDialogueNode = null;
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

        if (interaction.revealsItemId) { // Changed from revealedItem (object) to revealsItemId (string)
          const revealedItemDetails = this.allItems.get(interaction.revealsItemId);
          if (revealedItemDetails) {
            this.dispatchEvent(new CustomEvent('add-to-inventory', {
              // revealedItemDetails itself contains its own foundMessage if defined in items.json
              detail: { item: { ...revealedItemDetails } }, 
              bubbles: true,
              composed: true,
            }));
          } else {
            console.warn(`GameInterfaceView: Revealed item ID "${interaction.revealsItemId}" not found in allItems.`);
            messageToDisplay = "An error occurred revealing an item."; // Fallback message
          }
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
      // Standard hidden object (referenced by itemId or a fully defined special object not yet handled)
      if (clickedObject.itemId) {
        const itemDetails = this.allItems.get(clickedObject.itemId);
        if (itemDetails) {
          const itemToAdd = { 
            ...itemDetails, 
            // Override with location-specific foundMessage if present
            foundMessage: clickedObject.foundMessage || itemDetails.foundMessage || `You found: ${itemDetails.name}!` 
          };
          this.dispatchEvent(new CustomEvent('add-to-inventory', {
            detail: { item: itemToAdd },
            bubbles: true,
            composed: true,
          }));
          messageToDisplay = itemToAdd.foundMessage;
          
          // Mark this itemId instance as "found" by effectively making it isHandledInteractable
          // This assumes the render logic will hide it based on playerInventory containing itemDetails.id
          // For non-inventory items or items that should visually change but remain, this needs adjustment.
          // The current render logic hides based on playerInventory.some(invItem => invItem.id === obj.itemId)
          // so no explicit change to clickedObject here is needed if it's purely an item pickup.
        } else {
          console.warn(`GameInterfaceView: Item ID "${clickedObject.itemId}" not found in allItems.`);
          messageToDisplay = "You see something, but can't identify it.";
        }
      } else {
        // This case should ideally not be hit if all standard items use itemId.
        // It might be a special object not covered by other conditions.
        console.warn('GameInterfaceView: Clicked object is not a standard item reference and not handled by other types:', clickedObject);
        messageToDisplay = `You examine ${clickedObject.name || 'an object'}.`;
      }
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
    let npcListHtml = html``;

    // Render NPCs if present
    if (this.locationData && this.locationData.npcIds && this.locationData.npcIds.length > 0 && this.allNpcs.size > 0) {
      npcListHtml = html`
        <div class="npc-list">
          <h4>${msg('People Here', {id: 'npc-list-header'})}:</h4>
          ${this.locationData.npcIds.map(npcId => {
            const npc = this.allNpcs.get(npcId);
            return npc ? html`
              <div class="npc-presence" @click=${() => this._handleNpcClick(npcId)}>
                <md-icon>${npc.icon || 'person'}</md-icon>
                <span>${npc.name}</span>
              </div>
            ` : '';
          })}
        </div>
      `;
    }

    if (this.locationData.isMarket) {
      contentHtml = html`
        <div class="market-interface">
          ${npcListHtml} {/* Display NPCs in market too */}
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
    } else { // Not a market, render hidden objects and NPCs
      contentHtml = html`
        ${npcListHtml}
        ${this.locationData.hiddenObjects?.map(objInLocation => {
          let itemDetails = null;
          let displayId = objInLocation.id; 
          let displayName = objInLocation.name;
          let displayIcon = objInLocation.icon;
          let displayDescription = objInLocation.description;
          let isInteractable = objInLocation.isInteractableFeature;

          if (objInLocation.itemId) { // It's an item reference
            itemDetails = this.allItems.get(objInLocation.itemId);
            if (!itemDetails) {
              console.warn(`Render: Item ID ${objInLocation.itemId} not found in allItems.`);
              return ''; // Don't render if item definition is missing
            }
            displayId = itemDetails.id; // Use the actual item ID for isFound check
            displayName = itemDetails.name;
            displayIcon = itemDetails.icon;
            // Description for title could be item's or from objInLocation if overridden
            displayDescription = objInLocation.description || itemDetails.description; 
            isInteractable = false; // Standard items are not interactable features themselves
          }
          
          // An item/object is considered "found" or "handled" for rendering purposes if:
          // 1. It's an item and its ID is in playerInventory.
          // 2. It's a special object (chest, resource grant) and marked as isHandledInteractable.
          const isEffectivelyHandled = objInLocation.isHandledInteractable || 
                                     (itemDetails && this.playerInventory.some(invItem => invItem.id === itemDetails.id));

          if (isEffectivelyHandled && !objInLocation.isInteractableFeature && !objInLocation.grantsResources) { // Only hide if it was a simple pickup
             if(itemDetails && this.playerInventory.some(invItem => invItem.id === itemDetails.id)) return ''; // Already in inventory, render nothing
          }
          
          if (objInLocation.isHandledInteractable) { // Persists visually but non-interactive (opened chest, collected cache)
            return html`
              <div class="hidden-object" style="left: ${objInLocation.position.x}; top: ${objInLocation.position.y}; cursor: default;" title="${displayName} - ${objInLocation.description || displayDescription}">
                <md-icon>${objInLocation.icon || displayIcon || 'check_circle'}</md-icon>
              </div>`;
          }
          
          if (itemDetails || objInLocation.id) { 
            return html`
              <div class="hidden-object" style="left: ${objInLocation.position.x}; top: ${objInLocation.position.y};"
                title="${isInteractable ? displayDescription : `Investigate ${displayName}`}"
                @click=${() => this._handleObjectClick(objInLocation)}>
                <md-icon>${displayIcon || 'search'}</md-icon>
              </div>`;
          }
          return ''; 
        })}
      `;
    }

    // Dialogue Panel UI (rendered as an overlay)
    const dialoguePanelHtml = this._currentDialogueNode ? html`
      <div class="dialogue-overlay">
        <div class="dialogue-panel">
          <div class="npc-name-dialogue">${this.allNpcs.get(this._activeDialogueNpcId)?.name || 'Someone'} says:</div>
          <p class="npc-text">${this._currentDialogueNode.npcText}</p>
          <div class="player-choices">
            ${this._currentDialogueNode.playerChoices.map(choice => html`
              <md-filled-button class="player-choice-button" @click=${() => this._handlePlayerChoice(choice)}>
                ${choice.text}
              </md-filled-button>
            `)}
          </div>
        </div>
      </div>
    ` : '';

    return html`
      <div class="viewport" style="background-image: ${backgroundImage};">
        <div class="location-title">${this.locationData.name}</div>
        ${contentHtml}
        ${dialoguePanelHtml}
        ${this._lastFoundMessage ? html`<div class="found-message">${this._lastFoundMessage}</div>` : ''}
        ${this.locationData.actions && this.locationData.actions.length > 0 && !this._currentDialogueNode ? html`
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

/* Styles for Market, NPCs, and Dialogue */
GameInterfaceView.styles = [GameInterfaceView.styles, css`
  .market-interface {
    padding-top: 10px; /* Adjusted padding */
    height: calc(100% - 100px); /* Adjust based on title and action panel */
    overflow-y: auto;
  }
  .market-list {
    max-width: 700px;
    margin: 0 auto;
    background-color: rgba(255, 255, 255, 0.9); 
    border-radius: 8px;
  }
  .tradable-good .trade-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
  .tradable-good .price-tag {
    font-size: 0.9em;
    color: #333;
  }
  .tradable-good md-filled-button {
    --md-filled-button-container-height: 36px;
  }

  .npc-list {
    background-color: rgba(0,0,0,0.1);
    padding: 8px;
    margin: 50px auto 10px auto; /* Below title, before other content */
    max-width: 700px;
    border-radius: 4px;
  }
  .npc-list h4 {
    margin: 0 0 5px 0;
    color: white;
    font-size: 0.9em;
  }
  .npc-presence {
    display: inline-flex; /* Changed to inline-flex */
    align-items: center;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 5px 10px;
    margin: 5px; /* Added margin for spacing between NPCs */
    border-radius: 16px;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }
  .npc-presence:hover {
    background-color: white;
  }
  .npc-presence md-icon {
    margin-right: 8px;
  }

  .dialogue-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100; /* Ensure it's above other UI elements */
  }
  .dialogue-panel {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    width: 80%;
    max-width: 500px;
    text-align: left;
  }
  .npc-name-dialogue {
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 1.1em;
    color: #333;
  }
  .npc-text {
    margin-bottom: 15px;
    line-height: 1.6;
    color: #555;
  }
  .player-choices {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .player-choice-button {
    width: 100%; /* Make buttons full width of panel */
     --md-filled-button-container-color: #4a5568; /* A darker, more neutral color */
  }
`];
