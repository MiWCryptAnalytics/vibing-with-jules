import { LitElement, html, css } from 'lit';
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
    _lastFoundMessage: { type: String, state: true }
  };

  constructor() {
    super();
    this.locationData = null;
    this.playerInventory = [];
    this._lastFoundMessage = '';
  }

  _handleObjectClick(object) {
    console.log('GameInterface: Hidden object clicked:', object);
    this.dispatchEvent(new CustomEvent('add-to-inventory', {
      detail: { item: { id: object.id, name: object.name, icon: object.icon, itemImage: object.itemImage, description: object.description } },
      bubbles: true,
      composed: true
    }));
    this._lastFoundMessage = object.foundMessage || `You found: ${object.name}!`;
    setTimeout(() => { this._lastFoundMessage = ''; }, 3000); // Message disappears after 3 seconds
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

    return html`
      <div class="viewport" style="background-image: ${backgroundImage};">
        <div class="location-title">${this.locationData.name}</div>

        ${this.locationData.hiddenObjects?.map(obj => {
          const isFound = this.playerInventory.some(invItem => invItem.id === obj.id);
          return !isFound ? html`
            <div
              class="hidden-object"
              style="left: ${obj.position.x}; top: ${obj.position.y};"
              title="Investigate ${obj.name}"
              @click=${() => this._handleObjectClick(obj)}
            >
              <md-icon>${obj.icon || 'search'}</md-icon>
            </div>
          ` : '';
        })}

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
