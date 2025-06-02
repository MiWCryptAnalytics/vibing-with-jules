import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges, configureLocalization } from '@lit/localize';
// import { localeCodes } from './generated/locale-codes.js'; // File not generated as of last check
import { templates as enMessages } from './generated/locales/en.js';

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
    // --- Game State Persistence ---
    this._xorKey = 'v!B1ngW1thJul3sS3cr3tK3y#2023'; // Keep this consistent
    this._localStorageKey = 'vibingWithJulesGameState';
    this._pendingLocationId = null; // Used if locationId is loaded before POIs
    // --- End Game State Persistence ---
    this._initializeLocalization(); // Call localization setup
    updateWhenLocaleChanges(this);

    // Initialize properties
    this.currentView = 'splash'; // Default, will be overridden by _initializeGame
    this.currentLocationData = null;
    this.playerInventory = [];
    this.allPois = [];

    this._boundHandleHashChange = this._handleHashChange.bind(this);
    this._boundSaveGameState = this._saveGameState.bind(this); // For beforeunload

    this._initializeGame().catch(error => {
      console.error("AppShell: Critical error during game initialization:", error);
      // You could set a specific error view here if you have one: this.currentView = 'error-view';
    });
  }

  async _initializeGame() {
    const poiLoadPromise = this._loadAllPois(); // Start loading POIs
    const loadedFromStorage = await this._loadGameState(); // Attempt to load game state

    if (!loadedFromStorage) {
      // No valid game state loaded, determine initial view from URL hash or default
      const validViews = ['map', 'game', 'inventory', 'research', 'menu', 'splash'];
      const hash = window.location.hash.substring(1);
      if (hash && validViews.includes(hash)) {
        this.currentView = hash;
      } else {
        this.currentView = 'splash'; // Default if no valid hash or no saved state
      }
    }

    await poiLoadPromise; // Ensure POIs are fully loaded before proceeding

    // Resolve pending location ID if it was set during _loadGameState and POIs are now ready
    if (this._pendingLocationId && this.allPois.length > 0) {
      this.currentLocationData = this.allPois.find(poi => poi.id === this._pendingLocationId) || null;
      if (this.currentLocationData) {
        console.log('AppShell: Resolved pendingLocationId to:', this.currentLocationData.name);
      } else {
        console.warn('AppShell: Could not resolve pendingLocationId after POI load:', this._pendingLocationId);
        if (this.currentView === 'game') {
          console.warn("AppShell: Current view is 'game' but location data is invalid. Navigating to map.");
          this.currentView = 'map';
        }
      }
      this._pendingLocationId = null;
    } else if (this.currentView === 'game' && !this.currentLocationData && this.allPois.length > 0) {
      // If currentView is 'game' (e.g., from hash or loaded state) but no specific location, default to first POI
      this.currentLocationData = this.allPois[0];
      console.log("AppShell: Defaulting to first POI for 'game' view:", this.currentLocationData?.name);
    } else if (this.currentView === 'game' && !this.currentLocationData) {
      // Game view, no location, and POIs are not available or empty. This is problematic.
      console.warn("AppShell: Current view is 'game' but no location data and POIs unavailable. Navigating to map.");
      this.currentView = 'map';
    }

    // Synchronize URL hash with the determined/loaded currentView
    if (window.location.hash.substring(1) !== this.currentView) {
      window.location.hash = this.currentView;
    }

    this.requestUpdate(); // Ensure UI reflects the fully initialized state
  }

  _calculateChecksum(str) {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      sum += str.charCodeAt(i);
    }
    return sum;
  }

  _encrypt(plainText) {
    let xorOutput = '';
    for (let i = 0; i < plainText.length; i++) {
      xorOutput += String.fromCharCode(plainText.charCodeAt(i) ^ this._xorKey.charCodeAt(i % this._xorKey.length));
    }
    return btoa(xorOutput);
  }

  _decrypt(cipherText) {
    try {
      const base64Decoded = atob(cipherText);
      let plainText = '';
      for (let i = 0; i < base64Decoded.length; i++) {
        plainText += String.fromCharCode(base64Decoded.charCodeAt(i) ^ this._xorKey.charCodeAt(i % this._xorKey.length));
      }
      return plainText;
    } catch (e) {
      console.error("AppShell: Decryption failed (likely invalid Base64 string).", e);
      return null;
    }
  }

  async _loadAllPois() {
    try {
      // Corrected path: If www is server root, from /src/app-shell.js, ../data/ goes to /data/
      const response = await fetch('../data/pois.json'); // Or '/data/pois.json'
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.allPois = await response.json();
      console.log('AppShell: All POIs loaded:', this.allPois);
      // If _loadGameState set a _pendingLocationId, try to resolve it now that POIs are loaded.
      // This is also handled in _initializeGame after awaiting this promise, which is cleaner.
    } catch (error) {
      console.error("AppShell: Could not load Points of Interest:", error);
      this.allPois = [];
    }
  }

  _clearSavedGameState() {
    localStorage.removeItem(this._localStorageKey);
    localStorage.removeItem(this._localStorageKey + '_checksum');
    console.log('AppShell: Cleared saved game state from localStorage.');
  }

  async _loadGameState() {
    const encryptedData = localStorage.getItem(this._localStorageKey);
    const storedChecksum = localStorage.getItem(this._localStorageKey + '_checksum');

    if (encryptedData && storedChecksum) {
      try {
        const jsonString = this._decrypt(encryptedData);
        if (!jsonString) { // Decryption failed
          console.warn('AppShell: Decryption failed. Save data might be corrupted. Starting fresh.');
          this._clearSavedGameState();
          return false;
        }

        const calculatedChecksum = this._calculateChecksum(jsonString);

        if (calculatedChecksum.toString() === storedChecksum) {
          const savedState = JSON.parse(jsonString);

          this.currentView = savedState.currentView || 'splash';
          this.playerInventory = savedState.playerInventory || [];

          if (savedState.currentLocationId) {
            // POIs might not be loaded yet. If so, store ID to resolve later.
            if (this.allPois && this.allPois.length > 0) {
              this.currentLocationData = this.allPois.find(poi => poi.id === savedState.currentLocationId) || null;
            } else {
              this._pendingLocationId = savedState.currentLocationId;
              this.currentLocationData = null; // Explicitly null until resolved
              console.log('AppShell: POIs not ready during load, stored pendingLocationId:', this._pendingLocationId);
            }
          } else {
            this.currentLocationData = null;
          }

          console.log('AppShell: Game state loaded and restored:', savedState);
          return true; // Indicate success
        } else {
          console.warn('AppShell: Checksum mismatch. Save data might be corrupted. Starting fresh.');
          this._clearSavedGameState();
        }
      } catch (error) {
        console.error('AppShell: Error loading or parsing game state:', error, 'Starting fresh.');
        this._clearSavedGameState();
      }
    } else {
      console.log('AppShell: No saved game state found.');
    }
    return false; // Indicate no load or failure
  }

  _saveGameState() {
    const gameState = {
      currentView: this.currentView,
      currentLocationId: this.currentLocationData ? this.currentLocationData.id : null,
      playerInventory: this.playerInventory,
      timestamp: Date.now()
    };
    try {
      const jsonString = JSON.stringify(gameState);
      const checksum = this._calculateChecksum(jsonString);
      const encryptedData = this._encrypt(jsonString);

      localStorage.setItem(this._localStorageKey, encryptedData);
      localStorage.setItem(this._localStorageKey + '_checksum', checksum.toString());
      console.log('AppShell: Game state saved.');
    } catch (error) {
      console.error('AppShell: Error saving game state:', error);
    }
  }

  async _initializeLocalization() {
    // Using hardcoded 'en' as localeCodes module was not generated.
    // const locale = 'en'; // Could be dynamic based on user pref / browser settings
    // const targetLocales = localeCodes || ['en']; // Fallback if localeCodes is undefined
    const targetLocales = ['en']; // Hardcoded as locale-codes.js was not generated

    configureLocalization({
      sourceLocale: 'en',
      targetLocales: targetLocales,
      loadLocale: async (localeCode) => {
        if (localeCode === 'en') {
          return enMessages;
        }
        // In a real app, you might dynamically import other locales here:
        // const langModule = await import(`./generated/locales/${localeCode}.js`);
        // return langModule.messages;
        console.warn(`Locale ${localeCode} not implemented or messages not found, defaulting to English.`);
        return enMessages; // Fallback to English messages
      },
    });
    // Initial locale is set to sourceLocale ('en') by configureLocalization by default.
    // If we needed to set it explicitly to another *configured* target locale:
    // await setLocale(locale);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this._boundHandleHashChange);
    window.addEventListener('beforeunload', this._boundSaveGameState);
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this._boundHandleHashChange);
    window.removeEventListener('beforeunload', this._boundSaveGameState);
    super.disconnectedCallback();
  }

  _handleHashChange() {
    const validViews = ['map', 'game', 'inventory', 'research', 'menu', 'splash'];
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashView = hash.substring(1); // Remove '#'
      if (this.currentView === hashView) {
        return; // No change needed, already in sync
      }

      if (validViews.includes(hashView)) {
        console.log(`AppShell: Hash changed externally to #${hashView}, updating view.`);
        this.currentView = hashView;
        if (hashView === 'game') {
          if (!this.currentLocationData && this.allPois.length > 0) {
            this.currentLocationData = this.allPois[0]; // Default to first POI
          } else if (!this.currentLocationData) { // No POIs loaded or empty
            console.warn("AppShell: Hash changed to 'game' but no location data. Reverting to map.");
            this.currentView = 'map';
            window.location.hash = 'map'; // Correct the hash immediately
          }
        }
        this._saveGameState(); // Save after view change from hash
      }
    } else if (!hash && this.currentView !== 'splash') { // Hash is empty (e.g. user cleared it from URL)
      if (this.currentView === '') return; // Already reflects empty hash effectively
      console.log(`AppShell: Hash cleared externally, navigating to splash.`);
      this.currentView = 'splash';
      // Do not set window.location.hash here if user explicitly cleared it.
      this._saveGameState();
    }
  }

  _handleNavClick(event, viewName) {
    event.preventDefault(); // Prevent default anchor tag behavior
    let stateChanged = false;

    if (viewName === 'game' && !this.currentLocationData && this.allPois.length > 0) {
      this.currentLocationData = this.allPois[0];
      stateChanged = true;
    }

    if (this.currentView !== viewName) {
      this.currentView = viewName;
      stateChanged = true;
    }

    if (stateChanged) {
      window.location.hash = this.currentView; // Update hash first
      this._saveGameState(); // Then save
      console.log(`AppShell: Top nav click to view: ${viewName}. State saved.`);
    } else if (window.location.hash.substring(1) !== this.currentView) {
      // View didn't change, but hash might be out of sync
      window.location.hash = this.currentView;
    }
  }

  _handleNavigate(event) {
    const requestedView = event.detail.view;
    const locationData = event.detail.locationData;
    const targetLocationId = event.detail.targetLocationId;
    let stateChanged = false;

    console.log(`AppShell: Navigate event to view: ${requestedView}`, event.detail);

    if (requestedView === 'game') {
      let newLocation = null;
      if (locationData) { // Navigating from map with full data
        newLocation = locationData;
      } else if (targetLocationId && this.allPois.length > 0) { // Navigating from game action with ID
        newLocation = this.allPois.find(poi => poi.id === targetLocationId);
        if (!newLocation) {
          console.error(`AppShell: Location ID "${targetLocationId}" not found.`);
          this.currentView = 'map';
          window.location.hash = 'map';
          this._saveGameState();
          return;
        }
      } else if (!this.currentLocationData && this.allPois.length > 0) {
        newLocation = this.allPois[0]; // Default to first POI
      }

      if (newLocation && (!this.currentLocationData || this.currentLocationData.id !== newLocation.id)) {
        this.currentLocationData = newLocation;
        stateChanged = true;
      } else if (!newLocation && requestedView === 'game') {
        console.warn("AppShell: Cannot navigate to 'game' view without valid location. Going to map.");
        if (this.currentView !== 'map') {
          this.currentView = 'map';
          stateChanged = true;
        }
        window.location.hash = this.currentView;
        if (stateChanged) this._saveGameState();
        return;
      }
    }

    if (this.currentView !== requestedView) {
      this.currentView = requestedView;
      stateChanged = true;
    }

    if (stateChanged) {
      window.location.hash = this.currentView; // Update hash first
      this._saveGameState(); // Then save
    } else if (window.location.hash.substring(1) !== this.currentView) {
      // View didn't change, but hash might be out of sync
      window.location.hash = this.currentView;
    }
  }

  _handleAddToInventory(event) {
    const item = event.detail.item;
    // Avoid duplicates if item already exists (based on ID)
    if (!this.playerInventory.some(invItem => invItem.id === item.id)) {
      this.playerInventory = [...this.playerInventory, item];
      console.log('AppShell: Item added to inventory:', item, 'New Inventory:', this.playerInventory);
      this._saveGameState(); // Save after inventory change
    } else {
      console.log('AppShell: Item already in inventory:', item);
    }
  }

  render() {
    return html`
      ${this.currentView !== 'splash' ? html`
        <nav class="top-nav">
          <a href="#" @click=${(e) => this._handleNavClick(e, 'map')}>${msg('Map', {id: 'nav-map'})}</a>
          <a href="#" @click=${(e) => this._handleNavClick(e, 'game')}>${msg('Game', {id: 'nav-game'})}</a>
          <a href="#" @click=${(e) => this._handleNavClick(e, 'inventory')}>${msg('Inventory', {id: 'nav-inventory'})}</a>
          <a href="#" @click=${(e) => this._handleNavClick(e, 'research')}>${msg('Research', {id: 'nav-research'})}</a>
          <a href="#" @click=${(e) => this._handleNavClick(e, 'menu')}>${msg('Main Menu', {id: 'nav-main-menu'})}</a>
        </nav>
      ` : ''}

      <header class="app-header">
        <h1>${msg('My Lit Game', {id: 'game-title'})}</h1>
        <p>${msg('Current View:', {id: 'current-view'})} ${this.currentView}</p> <!-- Useful for debugging -->
      </header>

      <main class="main-content">
        <div class="view-container">
          ${this._renderCurrentView()}
        </div>
      </main>

      <footer class="app-footer">
        <p>${msg('(c) 2023 My Game Inc.', {id: 'footer-copyright'})}</p>
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
        return html`<p>${msg('Unknown view:', {id: 'unknown-view-prefix'})} ${this.currentView}. ${msg('Implement corresponding -view.js and update AppShell.', {id: 'unknown-view-suffix'})}</p>`;
    }
  }
}

customElements.define('app-shell', AppShell);
