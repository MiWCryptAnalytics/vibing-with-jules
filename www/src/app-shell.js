import { LitElement, html, css } from 'lit';
import './menu-view.js'; // Import the menu view
import './splash-view.js'; // Import the splash view
import './map-view.js'; // Import the map view
import './game-interface-view.js';
import './inventory-view.js';
import './research-view.js';

class AppShell extends LitElement {
  static styles = css`
  :host {
    display: block;
    font-family: sans-serif; /* Moved from body style.css for component encapsulation */
  }

  .top-nav {
    background-color: #333;
    padding: 10px 0;
    display: flex;
    justify-content: center; /* Center links horizontally */
    position: sticky; /* Make it sticky to the top */
    top: 0;
    z-index: 1000; /* Ensure it's above other content */
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }

  .top-nav a {
    color: white;
    padding: 10px 15px;
    text-decoration: none;
    margin: 0 5px;
    border-radius: 4px;
    transition: background-color 0.3s;
  }

  .top-nav a:hover,
  .top-nav a.active { /* We can add 'active' class later if needed */
    background-color: #555;
  }

  .app-header {
    background-color: #f0f0f0; /* Light background for header */
    padding: 15px;
    text-align: center;
    border-bottom: 1px solid #ddd;
  }

  .app-header h1 {
    margin: 0;
    font-size: 1.8em;
  }

  .app-header p { /* For the 'Current View' debug message */
    font-size: 0.8em;
    color: #666;
    margin: 5px 0 0;
  }

  .main-content {
    padding: 16px; /* Add padding around the view container */
  }

  .view-container {
    /* Original styles from app-shell were:
    border: 1px solid #ccc;
    padding: 16px;
    margin-top: 16px;
    We can keep these or adjust them. Let's remove margin-top as main-content has padding.
    */
    border: 1px solid #ccc;
    padding: 16px;
    background-color: #fff; /* Ensure view container has a background */
  }

  .app-footer {
    text-align: center;
    padding: 15px;
    background-color: #f0f0f0; /* Match header */
    border-top: 1px solid #ddd;
    font-size: 0.9em;
    color: #555;
  }
`;

  static properties = {
    currentView: { type: String },
    currentLocationData: { type: Object }, // To store data for the 'game' view
    playerInventory: { type: Array },     // To store player's collected items
    allPois: { type: Array, state: true } // To store all POIs for navigation
  };

  constructor() {
    super();
    const validViews = ['map', 'game', 'inventory', 'research', 'menu'];
    const hash = window.location.hash;
    let initialView = 'splash'; // Default view

    if (hash && hash.length > 1) {
      const potentialView = hash.substring(1); // Remove '#'
      if (validViews.includes(potentialView)) {
        initialView = potentialView;
      }
    }
    this.currentView = initialView;
    this.currentView = 'splash';
    this.currentLocationData = null;
    this.playerInventory = [];
    this.allPois = [];
    this._loadAllPois(); // Load POI data when the app shell is created
    this._boundHandleHashChange = this._handleHashChange.bind(this);
  }

  async _loadAllPois() {
    try {
      // Assuming pois.json is in www/data/ and app-shell.js is in www/src/
      // The path ../www/data/pois.json implies 'www' is a sibling to 'src's parent.
      // If your webroot is 'www' and 'data' is a direct child, 'data/pois.json' or '/data/pois.json' might be more typical.
      // Using the path convention from map-view.js for consistency.
      const response = await fetch('../www/data/pois.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.allPois = await response.json();
      console.log('AppShell: All POIs loaded:', this.allPois);
    } catch (error) {
      console.error("AppShell: Could not load Points of Interest:", error);
      this.allPois = [];
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this._boundHandleHashChange);
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this._boundHandleHashChange);
    super.disconnectedCallback();
  }

  _handleHashChange() {
    const validViews = ['map', 'game', 'inventory', 'research', 'menu', 'splash'];
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const potentialView = hash.substring(1); // Remove '#'
      if (validViews.includes(potentialView) && this.currentView !== potentialView) {
        this.currentView = potentialView;
      }
    } else if (this.currentView !== 'splash') { // Handle case where hash is empty (e.g. user clears it)
      // Optional: navigate to splash or a default view if hash is cleared.
      // For now, let's assume if hash is empty, and current view is not splash,
      // we might want to go to splash. Or do nothing if currentView is already splash.
      // This behavior can be refined based on exact product requirements.
      // this.currentView = 'splash';
      // For now, only update if the hash points to a valid, different view.
      // If hash is empty, and current view is not splash, and splash is a valid default,
      // one might consider setting currentView to 'splash'.
      // However, the constructor already sets initialView to 'splash' if hash is empty/invalid.
      // And _handleNavClick sets the hash.
      // This function's main job is to react to EXTERNAL hash changes (back/forward/manual edit).
      // If hash becomes empty/invalid, and currentView is e.g. 'map', it should probably stay 'map'
      // until a navigation action changes it OR the constructor re-evaluates on a full page load.
      // Let's stick to the primary requirement: update if hash is valid and different.
    }
  }

  _handleNavClick(event, viewName) {
    event.preventDefault(); // Prevent default anchor tag behavior
    if (viewName === 'game' && !this.currentLocationData && this.allPois.length > 0) {
      // If navigating to 'game' from top nav and no specific location, go to the first POI as a default
      // Or, you might want to disable this link or make it go to a "select location" screen
      this.currentLocationData = this.allPois[0];
    } else if (viewName !== 'game') {
      // Clear location data if not navigating to game view, to avoid stale data
      // this.currentLocationData = null; // Or keep it if you want to return to the same spot
    }
    this.currentView = viewName;
    window.location.hash = viewName;
    console.log(`AppShell: Top nav click to view: ${viewName}`);
  }

  _handleNavigate(event) {
    const requestedView = event.detail.view;
    const locationData = event.detail.locationData;
    const targetLocationId = event.detail.targetLocationId;

    console.log(`AppShell: Navigate event to view: ${requestedView}`, event.detail);

    if (requestedView === 'game') {
      if (locationData) { // Navigating from map with full data
        this.currentLocationData = locationData;
      } else if (targetLocationId && this.allPois.length > 0) { // Navigating from game action with ID
        const newLocation = this.allPois.find(poi => poi.id === targetLocationId);
        if (newLocation) {
          this.currentLocationData = newLocation;
        } else {
          console.error(`AppShell: Location ID "${targetLocationId}" not found.`);
          // Optionally, navigate to an error view or back to map
          this.currentView = 'map';
          return;
        }
      } else if (!this.currentLocationData && this.allPois.length > 0) {
        // Fallback if 'game' view is requested without specific location, e.g., from menu "Start Game"
        // and no previous game location was set.
        this.currentLocationData = this.allPois[0]; // Default to first POI
      }
    }
    this.currentView = requestedView;
  }

  _handleAddToInventory(event) {
    const item = event.detail.item;
    // Avoid duplicates if item already exists (based on ID)
    if (!this.playerInventory.some(invItem => invItem.id === item.id)) {
      this.playerInventory = [...this.playerInventory, item];
      console.log('AppShell: Item added to inventory:', item, 'New Inventory:', this.playerInventory);
    } else {
      console.log('AppShell: Item already in inventory:', item);
    }
  }

  render() {
    return html`
      ${this.currentView !== 'splash' ? html`
        <nav class="top-nav">
          <a href="#" @click=${(e) => this._handleNavClick(e, 'map')}>Map</a>
          <a href="#" @click=${(e) => this._handleNavClick(e, 'game')}>Game</a>
          <a href="#" @click=${(e) => this._handleNavClick(e, 'inventory')}>Inventory</a>
          <a href="#" @click=${(e) => this._handleNavClick(e, 'research')}>Research</a>
          <a href="#" @click=${(e) => this._handleNavClick(e, 'menu')}>Main Menu</a>
          <!-- 'Main Menu' link to go back to menu-view -->
        </nav>
      ` : ''}

      <header class="app-header">
        <h1>My Lit Game</h1>
        <p>Current View: ${this.currentView}</p> <!-- Useful for debugging -->
      </header>

      <main class="main-content">
        <div class="view-container">
          ${this._renderCurrentView()}
        </div>
      </main>

      <footer class="app-footer">
        <p>(c) 2023 My Game Inc.</p>
      </footer>
    `;
  }

  _renderCurrentView() {
    switch (this.currentView) {
      case 'splash':
        return html`<splash-view @navigate=${this._handleNavigate}></splash-view>`;
      case 'menu':
        return html`<menu-view @navigate=${this._handleNavigate}></menu-view>`;
      case 'map':
        return html`<map-view @navigate=${this._handleNavigate}></map-view>`;
      case 'game': // New case
        return html`<game-interface-view
                      .locationData=${this.currentLocationData}
                      .playerInventory=${this.playerInventory}
                      @navigate=${this._handleNavigate}
                      @add-to-inventory=${this._handleAddToInventory}
                    ></game-interface-view>`;
      case 'inventory': // New case
        return html`<inventory-view
                      .items=${this.playerInventory}
                      @navigate=${this._handleNavigate}
                    ></inventory-view>`;
      case 'research': // New case
        return html`<research-view @navigate=${this._handleNavigate}></research-view>`;
      default:
        return html`<p>Unknown view: ${this.currentView}.</p>`;
    }
  }
}

customElements.define('app-shell', AppShell);
