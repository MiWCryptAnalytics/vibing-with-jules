import { LitElement, html, css } from 'lit';
import '@material/web/dialog/dialog.js';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js'; // For potential future use or fallback portrait

class NpcDialogOverlay extends LitElement {
  static properties = {
    npcDetails: { type: Object },
    dialogueNode: { type: Object },
    open: { type: Boolean, reflect: true },
    playerStats: { type: Object },
    gameState: { type: Object },
    onChoiceMade: { type: Function },      // New
    onDialogDismissed: { type: Function },  // New
  };

  static styles = css`
    :host {
      display: contents;
    }
    md-dialog {
      --md-dialog-container-color: #FDF5E6; /* Parchment-like */
      --md-dialog-headline-color: #3C2F2F; /* Dark brown */
      --md-dialog-supporting-text-color: #3C2F2F; /* Dark brown */
      --md-sys-color-outline: #7A5C5C; /* Medium brown for borders if used by dialog */
      --md-dialog-headline-font-weight: bold;

      width: calc(100vw - 48px);
      max-width: 560px;
      max-height: 85vh;
      border-radius: 12px;
      padding: 18px;
    }
    [slot="headline"] {
        font-family: 'PirateFont', cursive;
        font-size: 1.8em;
        line-height: 1.2;
        padding-bottom: 10px;
    }
    .portrait {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .portrait img {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #7A5C5C;
      box-shadow: 0 3px 6px rgba(0,0,0,0.25);
    }
    .npc-text {
      font-family: 'MainTextFont', serif;
      font-size: 1em;
      line-height: 1.6;
      white-space: pre-wrap;
      margin-top: 8px;
      margin-bottom: 24px;
      max-height: calc(85vh - 250px);
      overflow-y: auto;
      padding-right: 6px;
    }
    .npc-text::-webkit-scrollbar { width: 8px; }
    .npc-text::-webkit-scrollbar-track { background: #E0D8C9; border-radius: 4px; }
    .npc-text::-webkit-scrollbar-thumb { background: #7A5C5C; border-radius: 4px; }
    .npc-text::-webkit-scrollbar-thumb:hover { background: #5C3D3D; }
    [slot="actions"] {
      display: flex;
      /* !important is needed to override md-dialog's
         potential default styles for its action slot,
         ensuring choices stack vertically on narrow views
         for proper layout and scrolling. */
      flex-direction: column !important;
      gap: 10px;
      /* padding-top: 10px; // Replaced by padding: 10px; below */
      width: 100%;
      max-height: 160px;
      overflow-y: auto;
      padding-right: 6px; /* This will be overridden by padding: 10px if it comes after, so adjust or combine. */
      /* New/Updated styles: */
      padding: 10px; /* Overrides padding-top and padding-right if placed after them. */
      border-top: 1px solid var(--md-sys-color-outline, #7A5C5C);
      margin-top: 10px;
    }
    [slot="actions"]::-webkit-scrollbar { width: 8px; }
    [slot="actions"]::-webkit-scrollbar-track { background: #E0D8C9; border-radius: 4px; }
    [slot="actions"]::-webkit-scrollbar-thumb { background: #7A5C5C; border-radius: 4px; }
    [slot="actions"]::-webkit-scrollbar-thumb:hover { background: #5C3D3D; }
    [slot="actions"] md-text-button {
      --md-text-button-label-text-color: #3C2F2F;
      --md-text-button-hover-label-text-color: #7A5C5C; /* This will be overridden by direct hover styles below */
      --md-text-button-pressed-label-text-color: #2F1E1E;
      --md-text-button-label-text-font: 'MainTextFont', serif;
      --md-text-button-label-text-size: 1.05em;
      width: 100%;
      border: 1px solid #5C3D3D; /* Darker brown border */
      border-radius: 6px;
      padding: 12px 0; /* Adjusted padding */
      background-color: #EFE5D8; /* Light parchment/off-white */
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      transition: background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, transform 0.1s ease-in-out;
    }
    [slot="actions"] md-text-button:hover {
        background-color: #DCD0B8; /* Slightly darker parchment for hover */
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        transform: translateY(-1px);
        /* --md-text-button-hover-label-text-color will still apply unless overridden here too */
    }
    @media (min-width: 600px) {
      md-dialog { padding: 24px; }
      .npc-text { max-height: calc(80vh - 280px); }
      [slot="actions"] {
        flex-direction: row; /* Attempt to override base */
        justify-content: flex-end;
        gap: 12px;
        max-height: none;     /* Override base style for row layout */
        overflow-y: visible;  /* Override base style for row layout */
        /* padding: 10px; /* Retain padding for consistency or remove if not needed for row layout */
        /* border-top: 1px solid var(--md-sys-color-outline, #7A5C5C); /* Retain or remove for row */
        /* margin-top: 10px; /* Retain or remove for row */
      }
      /* Ensure desktop buttons also have adjusted padding if base changed */
      [slot="actions"] md-text-button {
        width: auto;
        padding: 12px 16px; /* Adjusted padding */
        background-color: transparent; /* Kept transparent for desktop as per previous logic */
        /* Hover effect for desktop buttons might need its own definition if different from mobile */
      }
      [slot="actions"] md-text-button:hover {
        background-color: rgba(122, 92, 92, 0.1); /* Existing desktop hover, consider if it matches new style */
        /* transform: translateY(-1px); /* Optionally add transform for desktop too */
        /* box-shadow: 0 2px 4px rgba(0,0,0,0.15); /* Optionally add shadow for desktop too */
      }
    }
  `;

  _isReady = false;

  constructor() {
    super();
    this.npcDetails = null;
    this.dialogueNode = null;
    this.open = false;
    this.playerStats = {};
    this.gameState = {};
    this._selectedChoiceValue = null;
    this._isReady = false;
  }

  _isChoiceAvailable(choice) {
    if (!choice.condition || Object.keys(choice.condition).length === 0) {
      return true;
    }
    for (const type in choice.condition) {
      const conditionDetails = choice.condition[type];
      let conditionMet = false;
      switch (type) {
        case 'playerStat': {
          const { stat, value, operator = '===' } = conditionDetails;
          if (this.playerStats && typeof this.playerStats[stat] !== 'undefined') {
            const statValue = this.playerStats[stat];
            switch (operator) {
              case '===': conditionMet = statValue === value; break;
              case '>=': conditionMet = statValue >= value; break;
              case '<=': conditionMet = statValue <= value; break;
              case '>': conditionMet = statValue > value; break;
              case '<': conditionMet = statValue < value; break;
              case '!==': conditionMet = statValue !== value; break;
              default: console.warn(`Unsupported operator: ${operator} for playerStat`); conditionMet = false;
            }
          } else { console.warn(`Player stat ${stat} not found.`); conditionMet = false; }
          break;
        }
        case 'gameState': {
          const { variable, value, operator = '===' } = conditionDetails;
          if (this.gameState && typeof this.gameState[variable] !== 'undefined') {
            const stateValue = this.gameState[variable];
            switch (operator) {
              case '===': conditionMet = stateValue === value; break;
              case '!==': conditionMet = stateValue !== value; break;
              default: console.warn(`Unsupported operator: ${operator} for gameState`); conditionMet = false;
            }
          } else { console.warn(`Game state variable ${variable} not found.`); conditionMet = false; }
          break;
        }
        case 'hasItem': {
          if (this.gameState && this.gameState.playerInventory) {
            conditionMet = this.gameState.playerInventory.includes(conditionDetails);
          } else { console.warn('Player inventory not available in gameState.'); conditionMet = false; }
          break;
        }
        case 'questStatus': {
          const { questId, status } = conditionDetails;
          if (this.gameState && this.gameState.playerQuests) {
            conditionMet = this.gameState.playerQuests[questId]?.status === status;
          } else { console.warn('Player quests not available in gameState.'); conditionMet = false; }
          break;
        }
        default: console.warn(`Unknown condition type: ${type}`); return false;
      }
      if (!conditionMet) return false;
    }
    return true;
  }

  firstUpdated() { // Note: This is not async as per provided final code.
    // firstUpdated runs once after the first render. It checks the initial
    // state of the md-dialog (which diagnostics showed should be closed),
    // sets the _isReady flag to true, and if 'this.open' is already true
    // (set by parent before this method completed), it requests an update
    // to ensure updated() correctly processes the show() logic now that _isReady is true.
    const dialog = this.shadowRoot.querySelector('md-dialog');
    if (dialog) {
      console.log(`NpcDialogOverlay (firstUpdated): Initial native dialog.open state: ${dialog.open}`);
    } else {
      console.error('NpcDialogOverlay (firstUpdated): md-dialog NOT FOUND.');
    }
    this._isReady = true;
    console.log('NpcDialogOverlay (firstUpdated): _isReady set to true.');
    if (this.open) {
      console.log('NpcDialogOverlay (firstUpdated): this.open is true, requesting update for "open" property to trigger show via updated().');
      this.requestUpdate('open');
    }
  }

  updated(changedProperties) {
    // When 'open' property changes:
    // If this.open is true, we only attempt to show the dialog if _isReady is true
    // (signalling firstUpdated has completed its setup).
    // Using requestAnimationFrame for dialog.show() defers the call slightly,
    // which can help with stability and allow the browser to complete
    // any pending rendering or state updates for the md-dialog component,
    // especially after its properties or content might have just changed or if firstUpdated
    // just triggered this update.
    if (changedProperties.has('open')) {
      const dialog = this.shadowRoot.querySelector('md-dialog');
      if (!dialog) {
        console.error('NpcDialogOverlay (updated): md-dialog element not found.');
        return;
      }

      console.log(`NpcDialogOverlay (updated): 'open' prop changed to ${this.open}. _isReady: ${this._isReady}. md-dialog.open state (before action): ${dialog.open}`);

      if (this.open) {
        if (this._isReady) {
          console.log('NpcDialogOverlay (updated): Ready to show. Scheduling dialog.show() via requestAnimationFrame.');
          requestAnimationFrame(() => {
            if (this.open && this.shadowRoot.contains(dialog)) {
              console.log(`NpcDialogOverlay (rAF): Calling dialog.show(). md-dialog.open state before show: ${dialog.open}`);
              console.log(`NpcDialogOverlay (rAF): Clearing dialog.returnValue. Was: ${dialog.returnValue}`);
              dialog.returnValue = undefined;
              dialog.show();
              console.log(`NpcDialogOverlay (rAF): Called dialog.show(). md-dialog.open state after show: ${dialog.open}`);
            } else {
               console.log('NpcDialogOverlay (rAF): Conditions not met for show() inside rAF (this.open false or dialog not in DOM).');
            }
          });
        } else {
          console.log('NpcDialogOverlay (updated): this.open is true, but component is not ready yet (waiting for firstUpdated). Show will be triggered by firstUpdated via requestUpdate.');
        }
      } else { // this.open is false
        if (dialog.open) {
          console.log(`NpcDialogOverlay (updated): Component closing. Calling dialog.close(). md-dialog.open: ${dialog.open}`);
          dialog.close('host-controlled-close');
        } else {
          console.log('NpcDialogOverlay (updated): Component closing, md-dialog already reported closed.');
        }
      }
    }
  }

  _handleChoiceClick(choice) {
    const dialog = this.shadowRoot.querySelector('md-dialog');
    if (choice.effects) {
      for (const effect of choice.effects) {
        if (effect.type === 'TRIGGER_PUZZLE' && effect.puzzleId) {
          this.dispatchEvent(new CustomEvent('trigger-puzzle', {
            detail: { puzzleId: effect.puzzleId },
            bubbles: true, composed: true
          }));
          this._selectedChoiceValue = 'puzzle_triggered';
          if (dialog) dialog.close(this._selectedChoiceValue);
          return;
        } else if (effect.type === 'updatePlayerStat') {
          this.dispatchEvent(new CustomEvent('update-player-stat', {
            detail: { stat: effect.stat, change: effect.change, value: effect.value },
            bubbles: true, composed: true
          }));
        } else if (effect.type === 'setGameState') {
          this.dispatchEvent(new CustomEvent('set-game-state', {
            detail: { variable: effect.variable, value: effect.value },
            bubbles: true, composed: true
          }));
        } else if (effect.type === 'gameEvent') {
          this.dispatchEvent(new CustomEvent('game-event', {
            detail: { eventName: effect.eventName, detail: effect.detail },
            bubbles: true, composed: true
          }));
        } else {
          console.warn(`Unknown effect type: ${effect.type}`);
        }
      }
    }
    this._selectedChoiceValue = choice.nextNodeId || 'END';
    if (dialog) dialog.close(this._selectedChoiceValue);
  }

  _handleDialogClosed(event) {
    const returnValue = event.target.returnValue;
    this._selectedChoiceValue = null;

    console.log(`NpcDialogOverlay (_handleDialogClosed): Processing closed event with returnValue: ${returnValue}`);

    if (returnValue === 'scrim' || returnValue === 'escape') {
      console.log('NpcDialogOverlay (_handleDialogClosed): Dialog dismissed by user via scrim/escape. Calling onDialogDismissed.');
      if (this.onDialogDismissed) {
        this.onDialogDismissed();
      }
      return;
    }

    if (returnValue === 'puzzle_triggered') {
      console.log('NpcDialogOverlay (_handleDialogClosed): Closed because a puzzle was triggered.');
      // Puzzle events are handled separately, parent doesn't need a specific callback for dialog closing here.
      // Or, if parent needs to know it closed for this reason:
      // if (this.onDialogDismissed) { this.onDialogDismissed(); }
      return;
    }

    const internalCloseReasons = [
      'host-controlled-close',
      'component-driven-close', // Added from an earlier version
      'initial-async-forced-close',
      'async-reset-before-show',
      'initial-forced-close' // Added from an earlier version
    ];

    if (returnValue && !internalCloseReasons.includes(returnValue)) {
      // Assumed to be a valid nextNodeId or 'END' from a player choice
      console.log(`NpcDialogOverlay (_handleDialogClosed): Calling onChoiceMade with nextNodeId: ${returnValue}`);
      if (this.onChoiceMade) {
        this.onChoiceMade(returnValue);
      }
    } else if (returnValue && internalCloseReasons.includes(returnValue)) {
      console.log(`NpcDialogOverlay (_handleDialogClosed): Dialog closed with internal reason '${returnValue}'. Calling onDialogDismissed.`);
      if (this.onDialogDismissed) {
        this.onDialogDismissed();
      }
    } else {
      // returnValue is null, undefined, empty string, and not scrim/escape/puzzle
      console.warn('NpcDialogOverlay (_handleDialogClosed): Dialog closed with unexpected/empty returnValue. Calling onDialogDismissed.');
      if (this.onDialogDismissed) {
        this.onDialogDismissed();
      }
    }
  }

  render() {
    if (!this.dialogueNode) {
      return html``;
    }
    // Note: Removed ?open=${this.open} from md-dialog tag
    return html`
      <md-dialog
        id="npc-dialog"
        @closed=${this._handleDialogClosed}
        aria-labelledby="dialog-title"
        aria-describedby="dialog-content"
      >
        <div slot="headline" id="dialog-title">${this.npcDetails?.name || 'Mysterious Figure'}</div>
        <form id="dialog-form" slot="content" method="dialog">
          <div id="dialog-content">
            ${this.npcDetails?.portraitImage ? html`<div class="portrait"><img src="${this.npcDetails.portraitImage}" alt="Portrait of ${this.npcDetails.name}"></div>` : ''}
            <div class="npc-text">${this.dialogueNode.npcText}</div>
          </div>
        </form>
        <div slot="actions">
          ${this.dialogueNode.playerChoices?.filter(choice => this._isChoiceAvailable(choice)).map(
            (choice) => html`
              <md-text-button
                form="dialog-form"
                value="${choice.nextNodeId || 'END'}"
                @click=${() => this._handleChoiceClick(choice)}
              >
                ${choice.text}
              </md-text-button>`
          )}
        </div>
      </md-dialog>
    `;
  }
}

customElements.define('npc-dialog-overlay', NpcDialogOverlay);
