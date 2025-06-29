import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';
import {keyed} from 'lit/directives/keyed.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import '@material/web/button/filled-button.js';
import './npc-dialog-overlay.js'; // Import the new component

class GameInterfaceView extends LitElement {
  static styles = css`
    :host {
      display: flex; /* Changed from block */
      flex-direction: column; /* To allow viewport to grow */
      flex-grow: 1; /* Allow this view to take available space in its parent */
      padding: 0;
      width: 100%;
      /* height: calc(100vh - 150px); */ /* REMOVE this line */
      box-sizing: border-box;
      position: relative; /* For absolute positioning of UI elements */
    }
    .viewport {
      flex-grow: 1; /* Allow viewport to take available space within the host */
      width: 100%;
      /* height: 100%; */ /* No longer needed if flex-grow is used */
      background-size: cover;
      background-position: center;
      position: relative; /* For positioning hidden objects */
      overflow: hidden;
      border: 3px solid #3C2F2F; /* dark brown */
      box-shadow: inset 0 0 30px rgba(0,0,0,0.5); /* Inner shadow for depth - Keep */
    }
    .location-title {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #3C2F2F; /* dark brown */
      color: #FDF5E6; /* cream text */
      padding: 10px 20px; /* Adjusted */
      border-radius: 0px; /* Removed radius */
      font-family: 'PirateFont', cursive; /* Placeholder */
      font-size: 1.4em; /* Adjusted */
      z-index: 10;
    }
    .hidden-object {
      position: absolute;
      width: 50px; /* Adjust size as needed */
      height: 50px; /* Adjust size as needed */
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease-out;
    }
    .hidden-object:hover {
      transform: scale(1.1);
    }
    .hidden-object:active {
      transform: scale(1); /* Slight press feedback */
    }
    .hidden-object md-icon {
      font-size: 36px; /* Keep */
      color: #FDF5E6; /* cream */
      text-shadow: 1px 1px 2px #3C2F2F; /* dark brown shadow */
    }
    .in-scene-npc {
      position: absolute;
      width: 256px;
      height: 256px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
      border: 2px dashed #FFD700; /* Dashed gold border */
      border-radius: 50%; /* Circular shape */
      background-color: rgba(0, 0, 0, 0.15); /* Subtle dark background */
      overflow: hidden; /* To clip the image to the circle */
    }
    .in-scene-npc:hover {
      transform: scale(1.15);
      box-shadow: 0 0 12px #FFD700; /* Gold glow */
    }
    .in-scene-npc md-icon {
      font-size: 38px;
      color: #FDF5E6; /* Cream icon color */
      text-shadow: 1px 1px 2px #3C2F2F; /* Dark brown shadow */
    }
    .in-scene-npc .npc-portrait-image {
      width: 100%;
      height: 100%;
      object-fit: cover; /* Ensures the image covers the area, might crop */
      /* border-radius: 50%; // Not strictly needed due to parent's overflow:hidden and border-radius */
    }
    .actions-panel {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(60, 47, 47, 0.85); /* slightly transparent dark brown */
      padding: 15px; /* Adjusted */
      border-radius: 3px; /* Slight curve */
      display: flex;
      gap: 10px;
      z-index: 10;
    }
    /* General md-filled-button styling for this view */
    md-filled-button {
      --md-filled-button-container-color: #7A5C5C; /* medium brown */
      --md-filled-button-label-text-color: #FDF5E6; /* cream */
      --md-filled-button-hover-container-color: #2F1E1E; /* darker brown */
      --md-filled-button-pressed-container-color: #1A1111; /* even darker */
      --md-filled-button-container-shape: 0px; /* no rounded corners */
      --md-filled-button-label-text-font: 'MainTextFont', serif; /* Placeholder */
    }
    .found-message {
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #7A5C5C; /* medium brown */
      color: #FDF5E6; /* cream text */
      padding: 15px 25px;
      border-radius: 0px; /* Removed radius */
      border: 1px solid #2F1E1E; /* darker brown border */
      font-size: 1.1em;
      z-index: 20;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }

    .active-companion-display {
      position: absolute;
      top: 70px; /* Adjust based on location-title height + some padding */
      right: 10px;
      background-color: rgba(60, 47, 47, 0.85); /* dark brown, semi-transparent */
      border: 2px solid #7A5C5C; /* medium brown */
      border-radius: 5px;
      padding: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 15;
      color: #FDF5E6;
      font-family: 'MainTextFont', serif;
    }
    .active-companion-display img.companion-portrait {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid #FDF5E6;
      object-fit: cover;
    }
    .active-companion-display .companion-name {
      font-size: 0.9em;
      font-weight: bold;
    }
    .active-companion-display md-icon { /* Fallback icon for companion */
      font-size: 30px;
      color: #FDF5E6;
    }
  `;

  static properties = {
    locationData: { type: Object },
    playerInventory: { type: Array },
    playerResources: { type: Object },
    playerQuests: { type: Object }, // From AppShell
    activeCompanionId: { type: String }, // From AppShell
    activeCompanionData: { type: Object }, // From AppShell
    allItems: { type: Object }, 
    allNpcs: { type: Object },      // Added for NPC data
    allDialogues: { type: Object }, // Added for dialogue data
    playerAlignment: { type: String }, // Added for player alignment
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
    this.playerQuests = {};
    this.activeCompanionId = null;
    this.activeCompanionData = null;
    this.allItems = new Map();
    this.allNpcs = new Map();      // Initialize allNpcs
    this.allDialogues = {};    // Initialize allDialogues
    this.playerAlignment = "neutral"; // Initialize player alignment
    this._lastFoundMessage = '';
    this._activeDialogueNpcId = null;
    this._currentDialogueNodeId = null;
    this._currentDialogueNode = null;
    this._boundHandlePuzzleResolved = this._handlePuzzleResolved.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    // Assuming app-shell or a parent dispatches 'puzzle-resolved'
    // If game-interface-view is a direct child of app-shell, this might be window or this.shadowRoot.host
    // For simplicity, let's assume it bubbles up to window or a common ancestor.
    window.addEventListener('puzzle-resolved', this._boundHandlePuzzleResolved);
  }

  disconnectedCallback() {
    window.removeEventListener('puzzle-resolved', this._boundHandlePuzzleResolved);
    super.disconnectedCallback();
  }

  _handlePuzzleResolved(event) {
    const { puzzle, outcome } = event.detail;
    console.log(`GameInterfaceView: Received puzzle-resolved event for puzzle ${puzzle.id} with outcome: ${outcome}`);

    let nextNodeId = null;
    let effectsToApply = null;

    switch (outcome) {
      case 'success':
        nextNodeId = puzzle.successDialogNodeId;
        effectsToApply = puzzle.successEffects;
        break;
      case 'failure':
        nextNodeId = puzzle.failureDialogNodeId;
        effectsToApply = puzzle.failureEffects;
        break;
      case 'skipped':
        nextNodeId = puzzle.skipDialogNodeId || puzzle.failureDialogNodeId; // Fallback to failure if no specific skip node
        // Typically, skip might not have specific effects, or they could be defined in puzzles.json if needed
        break;
      default:
        console.warn(`GameInterfaceView: Unknown puzzle outcome: ${outcome}`);
        nextNodeId = puzzle.failureDialogNodeId; // Default to failure node
    }

    // Apply effects
    if (effectsToApply && Array.isArray(effectsToApply)) {
      effectsToApply.forEach(effect => {
        switch (effect.type) {
          case 'SET_GAME_STATE':
            this.dispatchEvent(new CustomEvent('set-game-state', { // Assuming app-shell listens for this
              detail: { variable: effect.variable, value: effect.value },
              bubbles: true, composed: true
            }));
            break;
          case 'UPDATE_PLAYER_STAT': // Or 'CHANGE_PLAYER_STAT'
             this.dispatchEvent(new CustomEvent('update-resources', { // app-shell listens to 'update-resources'
              detail: { [effect.stat]: effect.change || effect.value }, // Convert to {statName: value}
              bubbles: true, composed: true
            }));
            break;
          case 'ADD_ITEM':
            this.dispatchEvent(new CustomEvent('add-to-inventory', {
              detail: { item: { id: effect.itemId } }, // Simplistic, app-shell might need full item details
              bubbles: true, composed: true
            }));
            break;
          case 'REMOVE_ITEM':
             this.dispatchEvent(new CustomEvent('remove-from-inventory', {
              detail: { itemId: effect.itemId },
              bubbles: true, composed: true
            }));
            break;
          // Add more effect types as needed
          default:
            console.warn(`GameInterfaceView: Unknown effect type in puzzle: ${effect.type}`);
        }
      });
    }

    if (nextNodeId) {
      // If there's a nextNodeId, we attempt to show it.
      // If _activeDialogueNpcId is null (e.g., puzzle triggered from environment),
      // _handlePlayerChoice might need to gracefully handle this.
      // For now, we'll proceed. The dialogue nodes for such puzzles should be simple informational messages.
      // A future enhancement could be to assign a 'narrator' NPC to the puzzle outcome if needed.

      // If puzzle.dialogOwnerNpcId is defined in puzzles.json, use it.
      // This is a hypothetical property we might add later.
      // if (puzzle.dialogOwnerNpcId && !this._activeDialogueNpcId) {
      //   this._activeDialogueNpcId = puzzle.dialogOwnerNpcId;
      //   // We also need to ensure allDialogues has this NPC's tree loaded, which might not be the case
      //   // if the player isn't at the same location as the dialogOwnerNpcId.
      //   // This implies a need for global access to all dialogues if this pattern is used.
      // }

      if (!this._activeDialogueNpcId) {
        console.warn(`GameInterfaceView: Puzzle resolved with nextNodeId "${nextNodeId}", but no _activeDialogueNpcId. The dialogue node might not display correctly if it expects an NPC context (e.g. speaker name).`);
        // For now, we will attempt to show the dialogue anyway.
        // npc-dialog-overlay.js should ideally handle a null npcDetails gracefully (e.g. show "System Message").
        // We'll proceed to call _handlePlayerChoice. It will try to find the dialogue node
        // using this._activeDialogueNpcId. If it's null, it might fail to find a dialogue tree.
        // A more robust solution might involve a generic "SYSTEM" dialogue tree for such cases,
        // or the puzzle definition could specify the NPC ID for the dialogue.
        // For the current task, let's assume _handlePlayerChoice will be called, and if _activeDialogueNpcId is null,
        // the npc-dialog-overlay will show the text without an NPC name.
        // This relies on the dialogue node ID being globally unique or accessible in a general pool if no NPC is active.
        // This is a simplification. A better way would be for nextNodeId to be part of a specific NPC's dialogue tree,
        // and that NPC's ID should be set as _activeDialogueNpcId here.
        // For ROSTOVA_FIND_SPYGLASS_PUZZLE, success node is 'rostova_spyglass_puzzle_success_dialogue'.
        // This node should be part of Rostova's dialogue tree.
        // So, we should try to set _activeDialogueNpcId to the puzzle's associated NPC if available.

        if (puzzle.npcId && this.allDialogues[puzzle.npcId] && this.allDialogues[puzzle.npcId][nextNodeId]) {
            this._activeDialogueNpcId = puzzle.npcId;
            console.log(`GameInterfaceView: Set _activeDialogueNpcId to puzzle.npcId: ${puzzle.npcId} for dialogue node ${nextNodeId}`);
        } else {
            console.warn(`GameInterfaceView: Cannot determine active NPC for puzzle dialogue node ${nextNodeId}. Dialogue may not display as expected.`);
            // If we cannot determine an NPC, and the node is generic, we might need a way to display it without an NPC.
            // For now, _handlePlayerChoice will proceed with _activeDialogueNpcId as null if not set.
        }
      }
      // Now, _activeDialogueNpcId might be set if puzzle.npcId was valid.
      this._handlePlayerChoice({ nextNodeId: nextNodeId });

    } else {
      // If no nextNodeId (e.g. puzzle ends interaction), ensure dialogue is closed if one was active.
      if (this._activeDialogueNpcId) {
        this._endDialogue();
      }
    }
  }

  _handleDialogChoice(nextNodeId) { // Renamed and logic updated
      console.log(`GameInterfaceView (_handleDialogChoice): nextNodeId: ${nextNodeId}`);
      if (typeof nextNodeId !== 'undefined') { // Check for nextNodeId existence
          // const nextNodeId = event.detail.nextNodeId; // No longer from event.detail
          if (nextNodeId === "END") {
              this._endDialogue();
          } else {
              const dialogueTree = this.allDialogues[this._activeDialogueNpcId];
              const nextNode = dialogueTree ? dialogueTree[nextNodeId] : null;
              if (nextNode) {
                  this._currentDialogueNodeId = nextNodeId;
                  this._currentDialogueNode = nextNode;
              } else {
                  console.error(`Dialogue node "${nextNodeId}" not found for NPC "${this._activeDialogueNpcId}". Ending dialogue.`);
                  this._endDialogue();
              }
          }
          this.requestUpdate();
      } else {
          console.warn('GameInterfaceView (_handleDialogChoice): nextNodeId was undefined. Ending dialogue.');
          this._endDialogue(); // Fallback
      }
  }

  _handleDialogDismiss() { // Renamed
      console.log('GameInterfaceView (_handleDialogDismiss): Dialog dismissed.');
      this._endDialogue();
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
    if (!this.allDialogues || !this.allNpcs || !this.playerAlignment) {
      console.error("Dialogue, NPC data, or Player Alignment not loaded/passed!");
      return;
    }
    const npcDetails = this.allNpcs.get(npcId);

    if (!npcDetails) {
        console.error(`NPC details not found for NPC ID: ${npcId}`);
        this._lastFoundMessage = "Cannot find details for this person.";
        setTimeout(() => { this._lastFoundMessage = ''; this.requestUpdate(); }, 3000);
        return;
    }

    const playerAlignment = this.playerAlignment;
    const npcAlignment = npcDetails.alignment;

    const alignmentsConflict =
        (playerAlignment === "good" && npcAlignment === "evil") ||
        (playerAlignment === "evil" && npcAlignment === "good");

    if (alignmentsConflict) {
        this._activeDialogueNpcId = npcId; // Keep original NPC ID for "NPC Name says:"
        this._currentDialogueNodeId = "ALIGNMENT_CONFLICT_NODE"; // Special ID for conflict
        
        const conflictDialogueTree = this.allDialogues["_ALIGNMENT_CONFLICTS"];
        if (conflictDialogueTree && conflictDialogueTree["ALIGNMENT_CONFLICT_NODE"]) {
            this._currentDialogueNode = conflictDialogueTree["ALIGNMENT_CONFLICT_NODE"];
        } else {
            // Fallback if the new dialogue isn't loaded correctly (should not happen)
            console.error("Alignment conflict dialogue node not found in dialogues.json!");
            this._currentDialogueNode = { 
                npcText: msg(`Error: Alignment conflict dialogue missing. Your ${playerAlignment} vs ${npcAlignment}.`),
                playerChoices: [{ text: msg("Leave"), nextNodeId: "END" }]
            };
        }
        this.requestUpdate();
        return; 
    }

    // Proceed with normal dialogue loading if no conflict
    const dialogueTree = this.allDialogues[npcId];
    if (dialogueTree) { // npcDetails is already confirmed to exist
      this._activeDialogueNpcId = npcId;
      // Determine start node: often npcId_start or first key.
      const startNodeId = Object.keys(dialogueTree)[0]; // Simple assumption: first node is start
      
      if (dialogueTree[startNodeId]) {
        this._currentDialogueNodeId = startNodeId;
        this._currentDialogueNode = dialogueTree[startNodeId];
      } else {
        console.error(`No start node found for NPC ${npcId} (tried ${startNodeId})`);
        this._lastFoundMessage = `Hmm, ${npcDetails.name} doesn't seem to want to talk.`;
        setTimeout(() => { this._lastFoundMessage = ''; this.requestUpdate(); }, 3000);
      }
    } else {
      console.log(`No specific dialogue tree for NPC ID: ${npcId}. They might have nothing to say.`);
      this._lastFoundMessage = `${npcDetails.name} has nothing to say to you.`;
       setTimeout(() => { this._lastFoundMessage = ''; this.requestUpdate(); }, 3000);
    }
    this.requestUpdate();
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

    // New: Check for puzzle triggers first
    if (clickedObject.triggersPuzzleId) {
      let conditionsMet = true;
      let conditionFailureMessage = clickedObject.conditionNotMetMessage || msg("You feel this isn't important right now.", { id: 'condition-not-met-generic' });

      if (clickedObject.condition) {
        const condition = clickedObject.condition;

        // Check quest status
        if (condition.questStatus) {
          const questId = condition.questStatus.questId;
          const requiredStatus = condition.questStatus.status;
          const currentQuest = this.playerQuests[questId];

          if (!currentQuest) {
            conditionsMet = false;
          } else {
            if (Array.isArray(requiredStatus)) {
              if (!requiredStatus.includes(currentQuest.status)) {
                conditionsMet = false;
              }
            } else {
              if (currentQuest.status !== requiredStatus) {
                conditionsMet = false;
              }
            }
          }
          // More specific message if quest condition failed (optional, could be too revealing)
          // if (!conditionsMet) conditionFailureMessage = `You need to advance further in the '${questId}' quest.`;
        }

        // Check for required item
        if (conditionsMet && condition.hasItem) {
          if (!this.playerInventory.some(item => item.id === condition.hasItem)) {
            conditionsMet = false;
            // More specific message (optional)
            // const item = this.allItems.get(condition.hasItem);
            // if (item) conditionFailureMessage = `You are missing a ${item.name}.`;
          }
        }

        // Check for lacking item (player should NOT have this item)
        if (conditionsMet && condition.lacksItem) {
          if (this.playerInventory.some(item => item.id === condition.lacksItem)) {
            conditionsMet = false;
            // More specific message (optional)
            // const item = this.allItems.get(condition.lacksItem);
            // if (item) conditionFailureMessage = `You should not be carrying a ${item.name}.`;
          }
        }
      }

      if (conditionsMet) {
        this.dispatchEvent(new CustomEvent('trigger-puzzle', {
          detail: { puzzleId: clickedObject.triggersPuzzleId },
          bubbles: true,
          composed: true,
        }));
        messageToDisplay = clickedObject.foundMessage || msg("You start investigating...", { id: 'puzzle-trigger-investigate' });
        // Potentially mark the object as "puzzle triggered" if it shouldn't trigger again
        // For now, puzzles can be re-triggered unless their own logic prevents it (e.g., by setting a game state)
      } else {
        messageToDisplay = conditionFailureMessage;
      }

      // Display message and return, preventing further processing for this click
      if (messageToDisplay) {
        this._lastFoundMessage = messageToDisplay;
        setTimeout(() => { this._lastFoundMessage = ''; this.requestUpdate(); }, 3000);
      }
      this.requestUpdate();
      return; // Important: Stop further processing
    }
    // Existing checks continue if not a puzzle trigger or if puzzle conditions not met (though 'return' above handles that)
    else if (clickedObject.isInteractableFeature && clickedObject.interaction && !clickedObject.isHandledInteractable) { // Note the 'else if'
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
    // Check if the object grants resources (and isn't an interactable feature already handled by above block, nor a puzzle)
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
    let inSceneNpcsHtml = html``; // For NPCs rendered directly in the scene

    // Render NPCs if present
    if (this.locationData && this.locationData.npcIds && this.locationData.npcIds.length > 0 && this.allNpcs.size > 0) {

      // New logic for rendering NPCs directly in the scene
      if (!this.locationData.isMarket) { // Only render in-scene if not a market view
        inSceneNpcsHtml = html`
          ${this.locationData.npcIds.map(npcId => {
            const npc = this.allNpcs.get(npcId);
            if (npc && npc.position && npc.position.x && npc.position.y) {
              return html`
                <div class="in-scene-npc"
                     style="left: ${npc.position.x}; top: ${npc.position.y};"
                     title="${npc.name}"
                     @click=${() => this._handleNpcClick(npc.id)}>
                  ${npc.portraitImage ? html`
                    <img src="${npc.portraitImage}" alt="Portrait of ${npc.name}" class="npc-portrait-image">
                  ` : html`
                    <md-icon>${npc.icon || 'person'}</md-icon>
                  `}
                </div>
              `;
            }
            return '';
          })}
        `;
      }
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
        ${inSceneNpcsHtml}
      `;
    }

    // Dialogue Panel UI (rendered as an overlay)
    // const oldDialoguePanelHtml = this._currentDialogueNode ? html` ... ` : ''; // Old logic removed

    // Companion UI Groundwork
    if (this.activeCompanionData) {
      console.log("GameInterfaceView: Active companion:", this.activeCompanionData.name, this.activeCompanionData);
      // UI for companion will go here in a later step
    }

    let dialogOverlayHtml = '';
    if (this._currentDialogueNode && this._activeDialogueNpcId) {
      console.log('GameInterfaceView rendering dialog, this.playerQuests:', this.playerQuests);
      // The 'keyed' directive is used here to ensure that NpcDialogOverlay is
      // completely re-instantiated (destroyed and recreated) whenever the
      // _currentDialogueNodeId changes. This is crucial for resetting the state
      // of the underlying <md-dialog> element, which had persistent state issues
      // (e.g., not reopening correctly, re-emitting old events) when its properties
      // were simply updated on the same instance.
      dialogOverlayHtml = keyed(this._currentDialogueNodeId, html`
        <npc-dialog-overlay
          .npcDetails=${this.allNpcs.get(this._activeDialogueNpcId)}
          .dialogueNode=${this._currentDialogueNode}
          .open=${true}
          .playerStats=${{ strength: this.playerResources?.strength || 0, agility: this.playerResources?.agility || 0, intelligence: this.playerResources?.intelligence || 0, charisma: this.playerResources?.charisma || 0 }}
          .gameState=${{
            playerQuests: this.playerQuests,
            playerInventory: this.playerInventory,
            playerResources: this.playerResources,
            playerAlignment: this.playerAlignment,
            activeCompanionId: this.activeCompanionId
            // Other relevant gameState properties from GameInterfaceView can be added here
            // For example, if there are global flags not part of playerQuests:
            // worldFlags: this.worldFlags, (assuming this.worldFlags exists)
          }}
          .onChoiceMade=${(nextNodeId) => this._handleDialogChoice(nextNodeId)}
          .onDialogDismissed=${() => this._handleDialogDismiss()}
        ></npc-dialog-overlay>
      `);
    } else {
      dialogOverlayHtml = html``; // Render an empty html template if no dialog
    }

    return html`
      <div class="viewport" style="background-image: ${backgroundImage};">
        <div class="location-title">${this.locationData.name}</div>
        ${contentHtml}

        ${this.activeCompanionData ? html`
          <div class="active-companion-display" title="Your current companion: ${this.activeCompanionData.name} - ${this.activeCompanionData.abilityDescription || 'Ready to help!'}">
            ${this.activeCompanionData.portraitImage ? html`
              <img src="${this.activeCompanionData.portraitImage}" alt="Portrait of ${this.activeCompanionData.name}" class="companion-portrait">
            ` : html`
              <md-icon>${this.activeCompanionData.icon || 'sentiment_very_satisfied'}</md-icon> <!-- Fallback icon -->
            `}
            <span class="companion-name">${this.activeCompanionData.name}</span>
          </div>
        ` : ''}

        ${dialogOverlayHtml}

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
    padding-top: 10px; 
    height: calc(100% - 100px); 
    overflow-y: auto;
  }
  .market-list {
    max-width: 700px;
    margin: 0 auto;
    background-color: rgba(253, 245, 230, 0.9); /* semi-transparent cream/parchment */
    border-radius: 3px; /* Slight curve */
  }
  /* Targeting md-list-item within market for theme */
  .market-list md-list-item {
    --md-list-item-label-text-color: #3C2F2F;
    --md-list-item-supporting-text-color: #7A5C5C;
    --md-list-item-leading-icon-color: #3C2F2F;
  }
  .tradable-good .trade-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
  .tradable-good .price-tag {
    font-size: 0.9em;
    color: #2F1E1E; /* darker brown */
    font-family: 'MainTextFont', serif; /* Placeholder */
  }
  .tradable-good md-filled-button {
    /* Should pick up general md-filled-button styles */
    --md-filled-button-container-height: 36px; /* Keep specific height if needed */
  }

  .npc-list {
    background-color: rgba(60, 47, 47, 0.15); /* very transparent dark brown */
    padding: 8px;
    margin: 50px auto 10px auto; 
    max-width: 700px;
    border-radius: 3px; /* Slight curve */
  }
  .npc-list h4 {
    margin: 0 0 5px 0;
    color: #FDF5E6; /* cream text */
    font-family: 'PirateFont', cursive; /* Placeholder */
    font-size: 0.9em;
  }
  .npc-presence {
    display: inline-flex; 
    align-items: center;
    background-color: #E0D8C9; /* darker parchment */
    color: #3C2F2F; /* dark brown text */
    border: 1px solid #7A5C5C; /* medium brown border */
    padding: 5px 10px;
    margin: 5px; 
    border-radius: 16px; /* Keep rounded for 'tag' feel */
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    font-family: 'MainTextFont', serif; /* Placeholder */
    transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  .npc-presence:hover {
    background-color: #FDF5E6; /* lighter parchment */
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 3px 6px rgba(0,0,0,0.2); /* Enhanced shadow */
  }
  .npc-presence:active {
    transform: translateY(0px) scale(1);
    box-shadow: 0 1px 2px rgba(0,0,0,0.2); /* Reset shadow */
  }
  .npc-presence md-icon {
    margin-right: 8px;
    color: #3C2F2F; /* dark brown */
  }

  /* Old dialogue panel CSS removed:
  .dialogue-overlay, .dialogue-panel, .npc-name-dialogue, .npc-text, .player-choices, .player-choice-button
  are no longer used by game-interface-view.js directly.
  Their styling is now handled by npc-dialog-overlay.js. */
`];
