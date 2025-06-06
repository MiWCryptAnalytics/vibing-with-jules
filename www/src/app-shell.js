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
import './placeholder-puzzle-overlay.js'; // Import the puzzle overlay

class AppShell extends LitElement {
  static styles = css`
  :host {
    display: block;
    /* font-family is now inherited from body global style */
  }

  .top-nav {
    background-color: #3C2F2F; /* dark brown fallback */
    background-image: url('assets/images/theme/wood_texture.png'); /* Placeholder */
    padding: 10px 0;
    display: flex;
    justify-content: center; /* Center links horizontally */
    position: sticky; /* Make it sticky to the top */
    top: 0;
    z-index: 1000; /* Ensure it's above other content */
    box-shadow: 0 2px 5px rgba(0,0,0,0.2); /* Keep shadow for depth */
    border-bottom: 2px solid #2F1E1E; /* Darker brown plank edge */
  }

  .top-nav a {
    color: #FDF5E6; /* cream */
    font-family: 'PirateFont', cursive; /* Thematic display font */
    padding: 10px 20px; /* Adjusted padding */
    text-decoration: none;
    margin: 0; /* Remove margin if using borders as dividers */
    border-right: 1px solid #2F1E1E; /* Darkest brown divider */
    text-shadow: 1px 1px 1px rgba(0,0,0,0.7); /* Subtle depth */
    transition: background-color 0.3s, text-shadow 0.3s;
  }

  .top-nav a:last-child {
    border-right: none; /* Remove divider from last item */
  }

  .top-nav a:hover,
  .top-nav a.active {
    background-color: #7A5C5C; /* medium brown */
    color: #FDF5E6; /* Ensure text color remains cream for contrast */
    text-shadow: 1px 1px 2px rgba(255,255,255,0.3); /* Pop text on hover/active */
  }

  .app-header {
    background-color: transparent; /* Let global body background show */
    padding: 15px;
    text-align: center;
    /* border-bottom: 1px solid #ddd; */ /* Removed, can be thematic border later */
  }

  .app-header h1 {
    margin: 0;
    font-size: 1.8em;
    /* font-family and color will be inherited from global h1 styles */
  }

  .app-header p { /* For the 'Current View' debug message */
    font-size: 0.8em; /* Keep or adjust as needed */
    color: #7A5C5C; /* medium brown, less obtrusive */
    margin: 5px 0 0;
  }

  .main-content {
    padding: 16px; /* Add padding around the view container */
  }

  .view-container {
    border: 2px solid #7A5C5C; /* medium brown, thicker */
    /* border-image-source: url('assets/images/theme/ornate_frame.png'); */ /* Conceptual for future */
    /* border-image-slice: 10; */
    /* border-image-width: 10px; */
    /* border-image-repeat: round; */
    padding: 16px;
    background-color: rgba(253, 245, 230, 0.8); /* semi-transparent cream */
  }

  .app-footer {
    text-align: center;
    padding: 15px;
    background-color: transparent; /* Let global body background show */
    /* border-top: 1px solid #ddd; */ /* Removed */
    font-size: 0.9em; /* Keep or adjust as needed */
    color: #3C2F2F; /* dark brown */
  }
`;

  static properties = {
    currentView: { type: String },
    currentLocationData: { type: Object }, // To store data for the 'game' view
    playerInventory: { type: Array },     // To store player's collected items
    playerResources: { type: Object },    // Added for monetary system
    allPois: { type: Array, state: true }, // To store all POIs for navigation
    allItems: { type: Object, state: true }, // To store all item definitions
    allNpcs: { type: Object, state: true }, // To store all NPC definitions
    allDialogues: { type: Object, state: true }, // To store all dialogues
    allPuzzles: { type: Object, state: true }, // To store all puzzle definitions
    activePuzzleId: { type: String },
    isPuzzleOverlayOpen: { type: Boolean }
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
    this.playerResources = { gold: 0, silver: 0, rum: 0 }; // Initialize playerResources
    this.allPois = [];
    this.allItems = new Map(); // Initialize allItems as a Map
    this.allNpcs = new Map(); // Initialize allNpcs as a Map
    this.allDialogues = {}; // Initialize allDialogues as an Object
    this.allPuzzles = new Map(); // Initialize allPuzzles as a Map
    this.activePuzzleId = null;
    this.isPuzzleOverlayOpen = false;
    this.playerAlignment = "neutral"; // Initialize player alignment
    this._isResetting = false; // Flag to indicate if a reset operation is in progress

    this._boundHandleHashChange = this._handleHashChange.bind(this);
    this._boundSaveGameState = this._saveGameState.bind(this); // For beforeunload

    this._initializeGame().catch(error => {
      console.error("AppShell: Critical error during game initialization:", error);
      // You could set a specific error view here if you have one: this.currentView = 'error-view';
    });
  }

  async _initializeGame() {
    const dataLoadPromises = [
      this._loadAllPois(),
      this._loadAllItems(),
      this._loadAllNpcs(),
      this._loadAllDialogues(),
      this._loadAllPuzzles() // Add puzzle loading
    ];
    
    // Attempt to load game state while data files are being fetched.
    const loadedFromStorage = await this._loadGameState(); 

    if (!loadedFromStorage) {
      // THIS IS THE "NEW GAME" or "RESET" PATH
      console.log('AppShell: No valid game state loaded or game reset. Initializing new game state.');
      
      // Explicitly set all core game state properties to their initial new-game values
      this.playerInventory = []; // Ensure inventory is empty
      // Grant initial resources for a new game
      this.playerResources = { gold: 100, silver: 50, rum: 5 };
      this.currentLocationData = null; // No specific location initially
      this.playerAlignment = "neutral"; // Default alignment

      console.log('AppShell: New game started. Initial state set:', {
        inventory: this.playerInventory,
        resources: this.playerResources,
        location: this.currentLocationData,
        alignment: this.playerAlignment
      });

      // Determine initial view
      const validViews = ['map', 'game', 'inventory', 'research', 'menu', 'splash'];
      const hash = window.location.hash.substring(1); // Should be empty after reset
      if (hash && validViews.includes(hash)) {
        this.currentView = hash;
      } else {
        this.currentView = 'splash'; // Default if no valid hash or no saved state
      }
    }

    // Ensure all static data (POIs, Items) is loaded before proceeding
    await Promise.all(dataLoadPromises);

    // Resolve pending location ID if it was set during _loadGameState and POIs/Items are now ready
    if (this._pendingLocationId && this.allPois.length > 0) { // allItems check might also be relevant if locations depend on item data
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
      const response = await fetch('data/pois.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.allPois = await response.json();
      console.log('AppShell: All POIs loaded:', this.allPois);
      // If _loadGameState set a _pendingLocationId, try to resolve it now that POIs are loaded.
      // This is also handled in _initializeGame after awaiting this promise, which is cleaner.
    } catch (error) {
      console.error("AppShell: Could not load Points of Interest:", error);
      this.allPois = []; // Ensure it's an empty array on error
    }
  }

  async _loadAllItems() {
    try {
      const response = await fetch('data/items.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const itemsArray = await response.json();
      itemsArray.forEach(item => this.allItems.set(item.id, item));
      console.log('AppShell: All Items loaded:', this.allItems);
    } catch (error) {
      console.error("AppShell: Could not load Items:", error);
      this.allItems = new Map(); // Ensure it's an empty map on error
    }
  }

  getItemDetails(itemId) {
    return this.allItems.get(itemId);
  }

  async _loadAllNpcs() {
    try {
      const response = await fetch('data/npcs.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const npcsArray = await response.json();
      npcsArray.forEach(npc => this.allNpcs.set(npc.id, npc));
      console.log('AppShell: All NPCs loaded:', this.allNpcs);
    } catch (error) {
      console.error("AppShell: Could not load NPCs:", error);
      this.allNpcs = new Map();
    }
  }

  getNpcDetails(npcId) {
    return this.allNpcs.get(npcId);
  }

  async _loadAllDialogues() {
    try {
      const response = await fetch('data/dialogues.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.allDialogues = await response.json();
      console.log('AppShell: All Dialogues loaded:', this.allDialogues);
    } catch (error) {
      console.error("AppShell: Could not load Dialogues:", error);
      this.allDialogues = {};
    }
  }

  getDialogueForNpc(npcId) {
    return this.allDialogues[npcId];
  }

  async _loadAllPuzzles() {
    try {
      const response = await fetch('data/puzzles.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const puzzlesArray = await response.json();
      puzzlesArray.forEach(puzzle => this.allPuzzles.set(puzzle.id, puzzle));
      console.log('AppShell: All Puzzles loaded:', this.allPuzzles);
    } catch (error) {
      console.error("AppShell: Could not load Puzzles:", error);
      this.allPuzzles = new Map();
    }
  }

  showPuzzle(puzzleId) {
    if (this.allPuzzles.has(puzzleId)) {
      this.activePuzzleId = puzzleId;
      this.isPuzzleOverlayOpen = true;
      console.log(`AppShell: Showing puzzle ${puzzleId}`);
    } else {
      console.error(`AppShell: Puzzle with ID "${puzzleId}" not found.`);
    }
  }

  _handlePuzzleAttempted(event) {
    this.isPuzzleOverlayOpen = false;
    const { outcome, puzzleId } = event.detail;
    const puzzleData = this.allPuzzles.get(puzzleId);

    if (puzzleData) {
      this.dispatchEvent(
        new CustomEvent('puzzle-resolved', {
          detail: { puzzle: puzzleData, outcome: outcome },
          bubbles: true,
          composed: true,
        })
      );
      console.log(`AppShell: Puzzle ${puzzleId} attempted with outcome: ${outcome}. 'puzzle-resolved' event dispatched.`);
    } else {
      console.error(`AppShell: Puzzle data not found for ID ${puzzleId} after attempt.`);
    }
    this.activePuzzleId = null; // Clear active puzzle
  }

  _handleTriggerPuzzle(event) {
    const puzzleId = event.detail.puzzleId;
    if (puzzleId) {
      this.showPuzzle(puzzleId);
    } else {
      console.warn('AppShell: trigger-puzzle event received without puzzleId in detail.');
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
          // Restore playerResources, defaulting if not found in saved state
          this.playerResources = savedState.playerResources || { gold: 0, silver: 0, rum: 0 };
          this.playerAlignment = savedState.playerAlignment || "neutral"; // Load player alignment

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
    if (this._isResetting) {
      console.log('AppShell: Game save skipped during reset process.');
      return;
    }

    const gameState = {
      currentView: this.currentView,
      currentLocationId: this.currentLocationData ? this.currentLocationData.id : null,
      playerInventory: this.playerInventory,
      playerResources: this.playerResources, // Include playerResources in saved state
      playerAlignment: this.playerAlignment, // Include playerAlignment in saved state
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
    this.addEventListener('trigger-puzzle', this._handleTriggerPuzzle); // Listen for puzzle triggers
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this._boundHandleHashChange);
    window.removeEventListener('beforeunload', this._boundSaveGameState);
    this.removeEventListener('trigger-puzzle', this._handleTriggerPuzzle); // Clean up listener
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

  _handleRemoveFromInventory(event) {
    const itemIdToRemove = event.detail.itemId;
    const initialInventoryLength = this.playerInventory.length;
    this.playerInventory = this.playerInventory.filter(item => item.id !== itemIdToRemove);

    if (this.playerInventory.length < initialInventoryLength) {
      console.log('AppShell: Item removed from inventory:', itemIdToRemove, 'New Inventory:', this.playerInventory);
      this._saveGameState(); // Save after inventory change
      this.requestUpdate(); // Ensure UI (like inventory view) updates
    } else {
      console.log('AppShell: Item to remove not found in inventory:', itemIdToRemove);
    }
  }

  _updatePlayerResources(resourceChanges) {
    if (!this.playerResources) {
      // Should have been initialized, but as a safeguard
      this.playerResources = { gold: 0, silver: 0, rum: 0 };
    }
    for (const resource in resourceChanges) {
      if (this.playerResources.hasOwnProperty(resource)) {
        this.playerResources[resource] += resourceChanges[resource];
        if (this.playerResources[resource] < 0) {
          this.playerResources[resource] = 0; // Prevent negative resources
        }
      } else {
        // If the resource doesn't exist on playerResources, initialize it if positive change
        if (resourceChanges[resource] > 0) {
            this.playerResources[resource] = resourceChanges[resource];
        } else {
            // Trying to subtract from a non-existent resource, effectively 0
            this.playerResources[resource] = 0;
        }
        console.warn(`AppShell: Resource "${resource}" was not pre-defined in playerResources. It has been initialized.`);
      }
    }
    console.log('AppShell: Player resources updated:', this.playerResources);
    this._saveGameState(); // Save state after updating resources
    this.requestUpdate();  // Ensure UI reflects the changes
  }

  _handleUpdateResources(event) {
    console.log('AppShell: update-resources event received with detail:', event.detail);
    this._updatePlayerResources(event.detail);
  }

  _handleResetGameState() {
    this._isResetting = true; // Set the flag at the beginning of the reset process
    console.warn('AppShell: DEBUG - Resetting game state as requested by menu-view.');
    this._clearSavedGameState();

    // Optional: Verify clearance (for debugging during development)
    if (localStorage.getItem(this._localStorageKey) || localStorage.getItem(this._localStorageKey + '_checksum')) {
        console.error("AppShell: DEBUG - Game state NOT fully cleared from localStorage immediately after _clearSavedGameState(). This is unexpected.");
    } else {
        console.log("AppShell: DEBUG - Game state confirmed cleared from localStorage.");
    }

    // Clear the URL hash to ensure a fresh start to the splash screen
    window.location.hash = ''; 
    console.log("AppShell: DEBUG - URL hash cleared.");

    // Temporarily remove the beforeunload listener to prevent saving state during reset-reload
    window.removeEventListener('beforeunload', this._boundSaveGameState);
    console.log("AppShell: DEBUG - Temporarily removed beforeunload listener for reset.");

    // Reload the application to ensure a completely fresh start.
    console.log("AppShell: DEBUG - Initiating page reload for reset.");
    window.location.reload(true); // Force reload from server, bypassing cache for assets
    // Note: _isResetting will be false in the new AppShell instance after reload.
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

      <placeholder-puzzle-overlay
        .puzzleId=${this.activePuzzleId}
        .description=${this.activePuzzleId && this.allPuzzles.has(this.activePuzzleId) ? this.allPuzzles.get(this.activePuzzleId).description : 'Loading puzzle...'}
        ?open=${this.isPuzzleOverlayOpen}
        @puzzle-attempted=${this._handlePuzzleAttempted}
      ></placeholder-puzzle-overlay>
    `;
  }

  _renderCurrentView() {
    switch (this.currentView) {
      case 'splash':
        return html`<splash-view @navigate=${this._handleNavigate}></splash-view>`;
      case 'menu':
        return html`<menu-view 
                      @navigate=${this._handleNavigate}
                      @reset-game-state=${this._handleResetGameState}
                    ></menu-view>`;
      case 'map':
        return html`<map-view 
                    .playerInventory=${this.playerInventory} 
                    @navigate=${this._handleNavigate}
                  ></map-view>`;
      case 'game': // New case
        return html`<game-interface-view
                      .locationData=${this.currentLocationData}
                      .playerInventory=${this.playerInventory}
                      .playerResources=${this.playerResources} /* Pass playerResources */
                      .allItems=${this.allItems} /* Pass allItems */
                      .allNpcs=${this.allNpcs} /* Pass allNpcs */
                      .allDialogues=${this.allDialogues} /* Pass allDialogues */
                      .playerAlignment=${this.playerAlignment} /* Pass playerAlignment */
                      @navigate=${this._handleNavigate}
                      @add-to-inventory=${this._handleAddToInventory}
                      @remove-from-inventory=${this._handleRemoveFromInventory}
                      @update-resources=${this._handleUpdateResources}
                    ></game-interface-view>`;
      case 'inventory': // New case
        return html`<inventory-view
                      .items=${this.playerInventory}
                      .playerResources=${this.playerResources}
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
