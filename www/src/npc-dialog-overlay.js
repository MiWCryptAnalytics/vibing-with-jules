import { LitElement, html, css } from 'lit';
import '@material/web/dialog/dialog.js';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js'; // For potential future use or fallback portrait

class NpcDialogOverlay extends LitElement {
  static properties = {
    npcDetails: { type: Object },
    dialogueNode: { type: Object },
    open: { type: Boolean, reflect: true }, // reflect: true to keep attribute in sync
    playerStats: { type: Object }, // Added for conditional dialogs
    gameState: { type: Object }, // Added for conditional dialogs & effects
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

      width: calc(100vw - 48px); /* Mobile first, full width with some margin */
      max-width: 560px; /* Desktop max width */
      max-height: 85vh; /* Max height for viewport */
      border-radius: 12px; /* Softer, larger corners */
      padding: 18px; /* Overall padding for the dialog container */
    }

    /* Headline area: custom wrapper for portrait and name if needed, or style slot directly */
    /* For simplicity, we'll style elements within the slots directly */
    [slot="headline"] {
        font-family: 'PirateFont', cursive; /* Assuming PirateFont is globally available */
        font-size: 1.8em; /* Larger headline text */
        line-height: 1.2;
        padding-bottom: 10px; /* Space below headline */
        /* If portrait were to be inline with headline text:
           display: flex; align-items: center; gap: 15px; */
    }

    .portrait {
      display: flex;
      justify-content: center; /* Center image */
      margin-bottom: 16px; /* Space below portrait */
    }
    .portrait img {
      width: 100px; /* Fixed size for portrait */
      height: 100px;
      border-radius: 50%; /* Circular portrait */
      object-fit: cover; /* Ensure image covers the area well */
      border: 3px solid #7A5C5C; /* Medium brown border */
      box-shadow: 0 3px 6px rgba(0,0,0,0.25); /* Slightly deeper shadow */
    }

    .npc-text {
      font-family: 'MainTextFont', serif; /* Assuming MainTextFont is globally available */
      font-size: 1em; /* Standard text size */
      line-height: 1.6;
      white-space: pre-wrap; /* Preserve line breaks */
      margin-top: 8px; /* Space above text if portrait is present */
      margin-bottom: 24px; /* Space below text before actions */
      max-height: calc(85vh - 250px); /* Adjust based on other elements' heights */
      overflow-y: auto; /* Scroll for long text */
      padding-right: 6px; /* Space for scrollbar to not overlap text */
    }

    /* Custom scrollbar for npc-text (optional, webkit only) */
    .npc-text::-webkit-scrollbar {
      width: 8px;
    }
    .npc-text::-webkit-scrollbar-track {
      background: #E0D8C9; /* Lighter parchment for track */
      border-radius: 4px;
    }
    .npc-text::-webkit-scrollbar-thumb {
      background: #7A5C5C; /* Medium brown for thumb */
      border-radius: 4px;
    }
    .npc-text::-webkit-scrollbar-thumb:hover {
      background: #5C3D3D; /* Darker brown on hover */
    }

    [slot="actions"] {
      display: flex;
      flex-direction: column; /* Mobile: stack buttons */
      gap: 10px; /* Increased gap for touch targets */
      padding-top: 10px;
      width: 100%; /* Ensure actions area takes full width for button stacking */
    }

    /* Individual button styling */
    [slot="actions"] md-text-button {
      --md-text-button-label-text-color: #3C2F2F; /* Dark brown */
      --md-text-button-hover-label-text-color: #7A5C5C; /* Medium brown */
      --md-text-button-pressed-label-text-color: #2F1E1E; /* Darker brown */
      --md-text-button-label-text-font: 'MainTextFont', serif;
      --md-text-button-label-text-size: 1.05em;
      width: 100%; /* Make buttons full width of their container */
      border: 1px solid #7A5C5C; /* Add a border to buttons */
      border-radius: 6px; /* Rounded corners for buttons */
      padding: 10px 0; /* Vertical padding for buttons */
      background-color: rgba(122, 92, 92, 0.1); /* Very subtle background for buttons */
    }
    [slot="actions"] md-text-button:hover {
        background-color: rgba(122, 92, 92, 0.2); /* Slightly darker on hover */
    }


    /* Desktop and larger screen adjustments */
    @media (min-width: 600px) {
      md-dialog {
        /* Max-width is already set, dialog should center by default */
        padding: 24px; /* Slightly more padding on desktop */
      }

      .npc-text {
        max-height: calc(80vh - 280px); /* Adjust max-height for desktop if needed */
      }

      [slot="actions"] {
        flex-direction: row; /* Desktop: buttons in a row */
        justify-content: flex-end; /* Align buttons to the right */
        gap: 12px; /* Gap between buttons in a row */
      }

      [slot="actions"] md-text-button {
        width: auto; /* Allow buttons to size based on content on desktop */
        padding: 10px 16px; /* Adjust padding for row layout */
        border: 1px solid #7A5C5C; /* Keep border */
        background-color: transparent; /* Remove subtle background for desktop if preferred */
      }
       [slot="actions"] md-text-button:hover {
        background-color: rgba(122, 92, 92, 0.1); /* Re-add subtle background on hover */
    }
    }
  `;

  constructor() {
    super();
    this.npcDetails = null;
    this.dialogueNode = null;
    this.open = false;
    this.playerStats = {}; // Initialize
    this.gameState = {}; // Initialize
    this._selectedChoiceValue = null; // To temporarily store the value for closed event
  }

  // Helper function to check if a choice should be available based on conditions
  _isChoiceAvailable(choice) {
    if (!choice.condition) {
      return true; // No condition, always available
    }

    const { type, stat, variable, value, operator = '===' } = choice.condition;

    let conditionMet = false;
    switch (type) {
      case 'playerStat':
        if (this.playerStats && typeof this.playerStats[stat] !== 'undefined') {
          const statValue = this.playerStats[stat];
          switch (operator) {
            case '===': conditionMet = statValue === value; break;
            case '>=': conditionMet = statValue >= value; break;
            case '<=': conditionMet = statValue <= value; break;
            case '>': conditionMet = statValue > value; break;
            case '<': conditionMet = statValue < value; break;
            case '!==': conditionMet = statValue !== value; break;
            default: console.warn(`Unsupported operator: ${operator}`);
          }
        }
        break;
      case 'gameState':
        if (this.gameState && typeof this.gameState[variable] !== 'undefined') {
          const stateValue = this.gameState[variable];
           switch (operator) {
            case '===': conditionMet = stateValue === value; break;
            case '!==': conditionMet = stateValue !== value; break;
            // Add other operators if needed for game state variables
            default: console.warn(`Unsupported operator for gameState: ${operator}`);
          }
        }
        break;
      // TODO: Add 'npcAlignment' or other condition types if needed
      default:
        console.warn(`Unknown condition type: ${type}`);
        return false;
    }
    return conditionMet;
  }

  updated(changedProperties) {
    if (changedProperties.has('open')) {
      const dialog = this.shadowRoot.querySelector('md-dialog');
      if (dialog) {
        if (this.open && !dialog.open) {
          dialog.show();
        } else if (!this.open && dialog.open) {
          // This case should be handled by the dialog's own close mechanism
          // or if we need to force close it: dialog.close('manual-close');
        }
      }
    }
  }

  _handleChoiceClick(choice) {
    const dialog = this.shadowRoot.querySelector('md-dialog');

    if (choice.effects) {
      for (const effect of choice.effects) { // Changed to for...of for early exit
        if (effect.type === 'TRIGGER_PUZZLE' && effect.puzzleId) {
          this.dispatchEvent(new CustomEvent('trigger-puzzle', {
            detail: { puzzleId: effect.puzzleId },
            bubbles: true, composed: true
          }));
          this._selectedChoiceValue = 'puzzle_triggered'; // Special value
          if (dialog) {
            dialog.close(this._selectedChoiceValue);
          }
          return; // Exit after triggering puzzle
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

    // If no TRIGGER_PUZZLE effect caused an early exit, proceed as normal
    this._selectedChoiceValue = choice.nextNodeId || 'END';
    if (dialog) {
      dialog.close(this._selectedChoiceValue);
    }
  }

  _handleDialogClosed(event) {
    // The dialog is now closed. Reset open state.
    // The event.target.returnValue should be what we passed to dialog.close()
    const returnValue = event.target.returnValue;
    let foundChoice = null;

    if (this.dialogueNode && this.dialogueNode.playerChoices) {
      foundChoice = this.dialogueNode.playerChoices.find(
        (c) => (c.nextNodeId || 'END') === returnValue
      );
    }

    // If returnValue is 'scrim' or 'escape', it means dialog was dismissed by user action
    // not by clicking a choice button. In that case, foundChoice will be null.
    // We should still signal that the dialog is closed, but maybe without a choice.
    // For now, we only dispatch if a valid choice was found.
    // Or, we could dispatch an event indicating dismissal if foundChoice is null and returnValue is not one of our choice values

    if (returnValue === 'puzzle_triggered') {
      // Puzzle was triggered, specific handling already done by app-shell via 'trigger-puzzle' event.
      // GameInterfaceView will await 'puzzle-resolved'.
      // Just ensure overlay is closed.
      console.log('NpcDialogOverlay: Closed because a puzzle was triggered.');
    } else if (foundChoice) {
      this.dispatchEvent(
        new CustomEvent('player-choice-selected', {
          detail: { choice: foundChoice },
          bubbles: true,
          composed: true,
        })
      );
    } else if (returnValue && returnValue !== 'scrim' && returnValue !== 'escape') {
        // This case might happen if close() was called with something not matching a choice
        // and it wasn't 'puzzle_triggered'
        console.warn('NpcDialogOverlay: Dialog closed with unexpected returnValue:', returnValue);
    }

    // Ensure 'open' property is false, which might trigger another update if not already set.
    // This is important if the dialog was closed by user interaction (scrim/escape)
    // or by 'puzzle_triggered' without explicitly setting this.open = false in _handleChoiceClick.
    if (this.open) {
        this.open = false;
    }
    this._selectedChoiceValue = null; // Clear temporary value
  }

  render() {
    if (!this.dialogueNode) { // Don't render if there's no dialogue node
      return html``;
    }

    return html`
      <md-dialog
        id="npc-dialog"
        ?open=${this.open}
        @closed=${this._handleDialogClosed}
        aria-labelledby="dialog-title"
        aria-describedby="dialog-content"
      >
        <div slot="headline" id="dialog-title">${this.npcDetails?.name || 'Mysterious Figure'}</div>
        <form id="dialog-form" slot="content" method="dialog">
          <div id="dialog-content">
            ${this.npcDetails?.portraitImage
              ? html`<div class="portrait"><img src="${this.npcDetails.portraitImage}" alt="Portrait of ${this.npcDetails.name}"></div>`
              : ''}
            <div class="npc-text">${this.dialogueNode.npcText}</div>
          </div>
        </form>
        <div slot="actions">
          ${this.dialogueNode.playerChoices
            ?.filter(choice => this._isChoiceAvailable(choice))
            .map(
            (choice) => html`
              <md-text-button
                form="dialog-form"
                value="${choice.nextNodeId || 'END'}"
                @click=${() => this._handleChoiceClick(choice)}
              >
                ${choice.text}
              </md-text-button>
            `
          )}
        </div>
      </md-dialog>
    `;
  }
}

customElements.define('npc-dialog-overlay', NpcDialogOverlay);
