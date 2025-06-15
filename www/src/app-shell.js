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

    @keyframes fadeInView {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .view-container-fade-in {
      animation: fadeInView 0.35s ease-out forwards;
    }
    /* Add a class for fade-out to be used later if full transition is implemented */

  :host {
    display: flex; /* Changed from block */
    flex-direction: column;
    min-height: 100vh; /* Ensure app-shell takes at least full viewport height */
    /* font-family is now inherited from body global style */
   }
    .top-nav {
      background-color: #3C2F2F;
      background-image: url('assets/images/theme/wood_texture.png');
      padding: 10px 0;
      display: flex;
      justify-content: center;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      border-bottom: 2px solid #2F1E1E;
    }

    .top-nav a {
      color: #FDF5E6;
      font-family: 'PirateFont', cursive;
      padding: 10px 20px;
      text-decoration: none;
      margin: 0;
      border-right: 1px solid #2F1E1E;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
      transition: background-color 0.3s, text-shadow 0.3s;
    }

    .top-nav a:last-child {
      border-right: none;
    }

    .top-nav a:hover,
    .top-nav a.active {
      background-color: #7A5C5C;
      color: #FDF5E6;
      text-shadow: 1px 1px 2px rgba(255,255,255,0.3);
    }

    .app-header {
      background-color: transparent;
      padding: 15px;
      text-align: center;
    }

    .app-header h1 {
      margin: 0;
      font-size: 1.8em;
    }

    .app-header p {
      font-size: 0.8em;
      color: #7A5C5C;
      margin: 5px 0 0;
    }

    .main-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      padding: 16px;
    }

    .view-container {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      border: 2px solid #7A5C5C;
      padding: 16px;
      background-color: rgba(253, 245, 230, 0.8);
    }

    .app-footer {
      text-align: center;
      padding: 15px;
      background-color: transparent;
      font-size: 0.9em;
      color: #3C2F2F;
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
    activePuzzleHint: { type: String, state: true }, // For companion hints
    isPuzzleOverlayOpen: { type: Boolean },
    playerQuests: { type: Object }, // To store player's quest states
    activeCompanionId: { type: String, state: true }, // To store active companion ID
    _isViewChanging: { type: Boolean, state: true }
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
    this.activePuzzleHint = null; // Initialize hint
    this.isPuzzleOverlayOpen = false;
    this.playerQuests = {}; // Initialize playerQuests
    this.activeCompanionId = null; // Initialize activeCompanionId
    this.playerAlignment = "neutral"; // Initialize player alignment
    this._isResetting = false; // Flag to indicate if a reset operation is in progress
    this._isViewChanging = false;

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
      this.playerQuests = {}; // Ensure quests are empty for a new game
      this.activeCompanionId = null; // Ensure no active companion for a new game
      this.currentLocationData = null; // No specific location initially
      this.playerAlignment = "neutral"; // Default alignment

      console.log('AppShell: New game started. Initial state set:', {
        inventory: this.playerInventory,
        resources: this.playerResources,
        quests: this.playerQuests,
        activeCompanionId: this.activeCompanionId,
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

  // --- Quest Management ---
  _initializeQuest(questId, questData) {
    if (!this.playerQuests[questId]) {
      this.playerQuests[questId] = {
        id: questId,
        name: questData.displayName || "Unnamed Quest", // Get name from npc.json quest definition
        status: questData.status || "not_started", // Initial status from npc.json
        description: questData.description || "No description.", // Get description
        // progress: 0, // Optional: initialize progress if your quests use it
        // objectives: questData.objectives || [], // Optional: if quests have structured objectives
      };
      console.log(`AppShell: Quest '${questId}' initialized with status '${this.playerQuests[questId].status}'.`);
      this._saveGameState(); // Save state after initializing a quest
    }
  }

  _updateQuestStatus(questId, newStatus, progressValue = null) {
    if (this.playerQuests[questId]) {
      const oldStatus = this.playerQuests[questId].status;
      this.playerQuests[questId].status = newStatus;
      if (progressValue !== null) {
        this.playerQuests[questId].progress = progressValue;
      }
      console.log(`AppShell: Quest '${questId}' status updated from '${oldStatus}' to '${newStatus}'. Progress: ${progressValue}`);
      this.dispatchEvent(new CustomEvent('quest-status-updated', {
        detail: { questId, status: newStatus, progress: progressValue },
        bubbles: true,
        composed: true
      }));
      this._saveGameState(); // Save state after updating a quest
      this.requestUpdate(); // Ensure UI reflects quest changes
    } else {
      console.warn(`AppShell: Attempted to update status for uninitialized quest '${questId}'.`);
    }
  }
  // --- End Quest Management ---

  // --- Companion Management ---
  _setCompanion(npcId) {
    const companionData = this.allNpcs.get(npcId)?.companionData;
    if (companionData) { // Check if the NPC has companionData defined
      this.activeCompanionId = npcId;
      console.log(`AppShell: Companion set to ${npcId}.`);
      this.dispatchEvent(new CustomEvent('companion-changed', {
        detail: { activeCompanionId: this.activeCompanionId, companionData: companionData },
        bubbles: true,
        composed: true
      }));
      this._saveGameState();
      this.requestUpdate();
    } else {
      console.warn(`AppShell: Attempted to set NPC ${npcId} as companion, but they have no companionData.`);
    }
  }

  _removeCompanion() {
    if (this.activeCompanionId) {
      console.log(`AppShell: Companion ${this.activeCompanionId} removed.`);
      this.activeCompanionId = null;
      this.dispatchEvent(new CustomEvent('companion-changed', {
        detail: { activeCompanionId: null, companionData: null },
        bubbles: true,
        composed: true
      }));
      this._saveGameState();
      this.requestUpdate();
    }
  }
  // --- End Companion Management ---

  async _loadAllNpcs() {
    try {
      const response = await fetch('data/npcs.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const npcsArray = await response.json();
      npcsArray.forEach(npc => {
        this.allNpcs.set(npc.id, npc);
        // Initialize quests defined for this NPC
        if (npc.quests && Array.isArray(npc.quests)) {
          npc.quests.forEach(quest => {
            // Pass the whole quest object from npcs.json as questData
            this._initializeQuest(quest.id, quest);
          });
        }
      });
      console.log('AppShell: All NPCs loaded and their quests initialized:', this.allNpcs, this.playerQuests);
    } catch (error) {
      console.error("AppShell: Could not load NPCs or initialize their quests:", error);
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

  showPuzzle(puzzleId, hint = null) { // Added hint parameter
    if (this.allPuzzles.has(puzzleId)) {
      this.activePuzzleId = puzzleId;
      this.activePuzzleHint = hint; // Store the hint
      this.isPuzzleOverlayOpen = true;
      console.log(`AppShell: Showing puzzle ${puzzleId}${hint ? ` with hint: ${hint}` : ''}`);
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
    this.activePuzzleHint = null; // Clear active hint
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
          this.playerQuests = savedState.playerQuests || {}; // Load player quests
          this.activeCompanionId = savedState.activeCompanionId || null; // Load active companion
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
      playerQuests: this.playerQuests, // Include playerQuests in saved state
      activeCompanionId: this.activeCompanionId, // Include activeCompanionId in saved state
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
    this.addEventListener('dialogue-choice', this._handleDialogueChoice); // Listen for dialogue choices
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this._boundHandleHashChange);
    window.removeEventListener('beforeunload', this._boundSaveGameState);
    this.removeEventListener('trigger-puzzle', this._handleTriggerPuzzle); // Clean up listener
    this.removeEventListener('dialogue-choice', this._handleDialogueChoice); // Clean up dialogue choice listener
    super.disconnectedCallback();
  }

  // --- Dialogue and Effect Handling ---
  _applyEffects(effects) {
    if (!effects || !Array.isArray(effects)) {
      return;
    }

    effects.forEach(effect => {
      console.log('AppShell: Applying effect:', effect);
      switch (effect.type) {
        case 'ADD_ITEM':
          if (effect.itemId) {
            const itemToAdd = this.allItems.get(effect.itemId);
            if (itemToAdd) {
              this._handleAddToInventory({ detail: { item: itemToAdd } });
            } else {
              console.warn(`AppShell: Effect ADD_ITEM: Item ID "${effect.itemId}" not found.`);
            }
          } else {
            console.warn('AppShell: Effect ADD_ITEM is missing itemId.');
          }
          break;
        case 'REMOVE_ITEM':
          if (effect.itemId) {
            this._handleRemoveFromInventory({ detail: { itemId: effect.itemId } });
          } else {
            console.warn('AppShell: Effect REMOVE_ITEM is missing itemId.');
          }
          break;
        case 'UPDATE_PLAYER_STAT': // Could be for XP, standing, etc.
          // This is conceptual. Actual stats update logic would be needed.
          console.log(`AppShell: Effect UPDATE_PLAYER_STAT: ${effect.stat} by ${effect.change}.`);
          if (effect.stat === 'xp' && typeof effect.amount === 'number') { // Assuming ADD_XP is like this
            // this.playerXP = (this.playerXP || 0) + effect.amount; // Example
            console.log(`AppShell: Player XP changed by ${effect.amount}`);
          } else if (effect.stat && typeof effect.change === 'number') {
             // Generic stat update, could be standing.
             // e.g., this.playerStats[effect.stat] = (this.playerStats[effect.stat] || 0) + effect.change;
             console.log(`AppShell: Player stat '${effect.stat}' changed by ${effect.change}`);
          } else if (effect.npcId && effect.stat === 'standing' && typeof effect.amount === 'number') { // From quest rewards
            // Conceptual: this.updateNpcStanding(effect.npcId, effect.amount);
             console.log(`AppShell: Player standing with '${effect.npcId}' changed by ${effect.amount}`);
          }
          this.requestUpdate();
          break;
        case 'ADD_XP': // Specific XP addition
          if (typeof effect.amount === 'number') {
            // this.playerXP = (this.playerXP || 0) + effect.amount; // Example
            console.log(`AppShell: Player XP increased by ${effect.amount}`);
            this.requestUpdate();
          }
          break;
        case 'ADD_RESOURCE':
             if (effect.resource && typeof effect.amount === 'number') {
                const resourceChange = {};
                resourceChange[effect.resource] = effect.amount;
                this._updatePlayerResources(resourceChange);
             } else {
                console.warn('AppShell: Effect ADD_RESOURCE missing resource or amount.', effect);
             }
             break;
        case 'ALIGNMENT_SHIFT':
          // Conceptual: this.updateAlignment(effect.direction, effect.magnitude);
          console.log(`AppShell: Alignment shift: ${effect.direction}, ${effect.magnitude}`);
          break;
        case 'TRIGGER_PUZZLE':
          if (effect.puzzleId) {
            let hint = null;
            if (this.activeCompanionId && this.allNpcs.has(this.activeCompanionId)) {
              const companion = this.allNpcs.get(this.activeCompanionId);
              if (companion.companionData && companion.companionData.puzzleInteraction) {
                const pInteraction = companion.companionData.puzzleInteraction;
                if (pInteraction.puzzleId === effect.puzzleId && pInteraction.type === 'PROVIDES_HINT') {
                  hint = pInteraction.hintText;
                }
              }
            }
            this.showPuzzle(effect.puzzleId, hint);
          }
          break;
        // Quest Effects
        case 'START_QUEST':
          if (effect.questId) {
            this._updateQuestStatus(effect.questId, "in_progress");
          }
          break;
        case 'COMPLETE_QUEST':
          if (effect.questId) {
            this._updateQuestStatus(effect.questId, "completed");
            // Rewards associated with completing this quest should be in the same effects block
            // and will be processed by other cases (ADD_ITEM, ADD_XP, etc.)
          }
          break;
        case 'FAIL_QUEST':
          if (effect.questId) {
            this._updateQuestStatus(effect.questId, "failed");
          }
          break;
        case 'UPDATE_QUEST_PROGRESS':
          if (effect.questId && effect.progress !== undefined) {
            this._updateQuestStatus(effect.questId, "in_progress", effect.progress);
          }
          break;
        case 'SET_QUEST_STATUS':
             if (effect.questId && effect.status) {
                this._updateQuestStatus(effect.questId, effect.status, effect.progress);
             }
             break;
        case 'RECRUIT_COMPANION':
            if (effect.npcId) { // Ensure npcId is provided in the effect
              this._setCompanion(effect.npcId);
            } else {
              console.warn('AppShell: Effect RECRUIT_COMPANION missing npcId.');
            }
            break;
        case 'DISMISS_COMPANION':
            this._removeCompanion();
            break;
        default:
          console.warn(`AppShell: Unknown effect type: ${effect.type}`);
      }
    });
    this._saveGameState(); // Save after applying effects
  }

  _handleDialogueChoice(event) {
    const { npcId, choice } = event.detail;
    // Assuming 'choice' object has 'effects' and 'nextNodeId'
    if (choice.effects) {
      this._applyEffects(choice.effects);
    }

    // The game-interface-view would then use the nextNodeId to continue dialogue
    // This app-shell part is primarily for handling global state changes from effects.
    console.log(`AppShell: Dialogue choice made for NPC ${npcId}. Effects applied. Next node: ${choice.nextNodeId}`);
  }
  // --- End Dialogue and Effect Handling ---

  async _handleHashChange() {
    const validViews = ['map', 'game', 'inventory', 'research', 'menu', 'splash'];
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashView = hash.substring(1); // Remove '#'
      if (this.currentView === hashView) {
        return; // No change needed, already in sync
      }

      if (validViews.includes(hashView)) {
        console.log(`AppShell: Hash changed externally to #${hashView}, updating view.`);

        this._isViewChanging = true;
        this.requestUpdate();
        await this.updateComplete;

        this.currentView = hashView;
        if (hashView === 'game') {
          if (!this.currentLocationData && this.allPois.length > 0) {
            this.currentLocationData = this.allPois[0]; // Default to first POI
          } else if (!this.currentLocationData) { // No POIs loaded or empty
            console.warn("AppShell: Hash changed to 'game' but no location data. Reverting to map.");
            this.currentView = 'map'; // This will be the effective currentView
            window.location.hash = 'map'; // Correct the hash immediately
          }
        }
        this._isViewChanging = false;
        // currentView change will trigger requestUpdate, no need to call _saveGameState or requestUpdate here
        // However, if the hash was corrected (e.g. to 'map'), that needs to be reflected.
        // And game state should be saved regardless.
        if (window.location.hash.substring(1) !== this.currentView) {
             window.location.hash = this.currentView; // Ensure hash matches final view decision
        }
        this._saveGameState();
      }
    } else if (!hash && this.currentView !== 'splash') { // Hash is empty
      if (this.currentView === '') return;
      console.log(`AppShell: Hash cleared externally, navigating to splash.`);

      this._isViewChanging = true;
      this.requestUpdate();
      await this.updateComplete;

      this.currentView = 'splash';
      this._isViewChanging = false;
      // window.location.hash is already empty or just '#'
      this._saveGameState();
    }
  }

  async _handleNavClick(event, viewName) {
    event.preventDefault(); // Prevent default anchor tag behavior

    if (this.currentView === viewName && viewName !== 'game') { // Allow re-nav to 'game' if location might change
      // If already on the view and it's not 'game', or if it is 'game' but no location change logic applies here, do nothing.
      // This simplified check assumes that if it's 'game', and location might change, it's handled below.
      // If we are on the same view and hash is out of sync, fix hash.
      if (window.location.hash.substring(1) !== this.currentView) {
          window.location.hash = this.currentView;
      }
      return;
    }

    let newLocationData = this.currentLocationData;
    let intendedView = viewName;
    let stateActuallyChanged = false; // Tracks if view or critical data for view (like location) changes

    if (viewName === 'game') {
      if (!this.currentLocationData && this.allPois.length > 0) {
        newLocationData = this.allPois[0];
        if (this.currentLocationData?.id !== newLocationData?.id) {
            stateActuallyChanged = true;
        }
      } else if (!this.currentLocationData) {
        // Cannot navigate to 'game' without a location, and no default available.
        // This case should ideally not happen if nav guards are correct.
        console.warn("AppShell: Nav to 'game' but no location and no default POI. Staying or going to map.");
        // Optionally, redirect to 'map' if not already there
        // intendedView = 'map';
        return; // Or simply do nothing
      }
    }

    if (this.currentView !== intendedView || stateActuallyChanged) {
        this._isViewChanging = true;
        this.requestUpdate();
        await this.updateComplete;

        this.currentView = intendedView;
        this.currentLocationData = newLocationData; // Update if it changed
        this._isViewChanging = false;

        window.location.hash = this.currentView; // Update hash first
        this._saveGameState(); // Then save
        console.log(`AppShell: Top nav click to view: ${viewName}. State saved.`);
    } else if (window.location.hash.substring(1) !== this.currentView) {
      // View didn't change, but hash might be out of sync
      window.location.hash = this.currentView;
    }
  }

  async _handleNavigate(event) {
    const requestedView = event.detail.view;
    const locationData = event.detail.locationData; // Full POI object from map
    const targetLocationId = event.detail.targetLocationId; // ID string from game actions

    let newCurrentView = this.currentView;
    let newLocationData = this.currentLocationData;
    let changeOccurred = false;

    if (requestedView === 'game') {
      let prospectiveLocation = null;
      if (locationData) { // Navigating from map with full data
        prospectiveLocation = locationData;
      } else if (targetLocationId && this.allPois.length > 0) { // Navigating from game action with ID
        prospectiveLocation = this.allPois.find(poi => poi.id === targetLocationId);
        if (!prospectiveLocation) {
          console.error(`AppShell: Location ID "${targetLocationId}" not found. Navigating to map.`);
          newCurrentView = 'map'; // Fallback to map
          // newLocationData remains unchanged or could be cleared
        }
      } else if (!this.currentLocationData && this.allPois.length > 0) { // No current location, default to first POI
        prospectiveLocation = this.allPois[0];
      } else if (!this.currentLocationData) { // No current location and no POIs loaded/available
         console.warn("AppShell: Cannot navigate to 'game' view without valid location. Going to map.");
         newCurrentView = 'map'; // Fallback to map
      }

      if (prospectiveLocation && newLocationData?.id !== prospectiveLocation.id) {
        newLocationData = prospectiveLocation;
        changeOccurred = true;
      }
      // If, after all that, we still don't have location data for a 'game' view, redirect to 'map'
      if (!newLocationData && requestedView === 'game') {
        newCurrentView = 'map';
      }
    }

    if (newCurrentView !== requestedView && requestedView !== 'game') { // If not game, view change is simpler
        newCurrentView = requestedView;
        changeOccurred = true;
    } else if (newCurrentView !== requestedView && requestedView === 'game' && newLocationData) {
        // If it's a game view, and we have new location data, the view should be 'game'
        newCurrentView = 'game';
        changeOccurred = true;
    }


    if (changeOccurred || this.currentView !== newCurrentView || this.currentLocationData?.id !== newLocationData?.id) {
        this._isViewChanging = true;
        this.requestUpdate();
        await this.updateComplete;

        this.currentView = newCurrentView;
        this.currentLocationData = newLocationData;
        this._isViewChanging = false;

        if (window.location.hash.substring(1) !== this.currentView) {
            window.location.hash = this.currentView;
        }
        this._saveGameState();
        console.log(`AppShell: Navigate event to view: ${this.currentView}. Location: ${this.currentLocationData?.name || 'N/A'}`);
    } else if (window.location.hash.substring(1) !== this.currentView) {
      // Only hash is out of sync
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
        <div class="view-container ${!this._isViewChanging ? 'view-container-fade-in' : ''}">
          ${!this._isViewChanging ? this._renderCurrentView() : html``}
        </div>
      </main>

      <footer class="app-footer">
        <p>${msg('(c) 2023 My Game Inc.', {id: 'footer-copyright'})}</p>
      </footer>

      <placeholder-puzzle-overlay
        .puzzleId=${this.activePuzzleId}
        .description=${this.activePuzzleId && this.allPuzzles.has(this.activePuzzleId) ? this.allPuzzles.get(this.activePuzzleId).description : 'Loading puzzle...'}
        .companionHint=${this.activePuzzleHint}
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
                    /* .playerQuests=${this.playerQuests} /* Pass playerQuests Already applied in previous diff */
                    @navigate=${this._handleNavigate}
                  ></map-view>`;
      case 'game': // New case
        return html`<game-interface-view
                      .locationData=${this.currentLocationData}
                      .playerInventory=${this.playerInventory}
                      .playerResources=${this.playerResources} /* Pass playerResources */
                      /* .playerQuests=${this.playerQuests} /* Pass playerQuests Already applied in previous diff */
                      .activeCompanionId=${this.activeCompanionId} /* Pass active companion ID */
                      .activeCompanionData=${this.activeCompanionId ? this.allNpcs.get(this.activeCompanionId)?.companionData : null} /* Pass active companion data */
                      .allItems=${this.allItems} /* Pass allItems */
                      .allNpcs=${this.allNpcs} /* Pass allNpcs */
                      .allDialogues=${this.allDialogues} /* Pass allDialogues */
                      .playerAlignment=${this.playerAlignment} /* Pass playerAlignment */
                      @navigate=${this._handleNavigate}
                      @add-to-inventory=${this._handleAddToInventory}
                      @remove-from-inventory=${this._handleRemoveFromInventory}
                      @update-resources=${this._handleUpdateResources}
                      /* @dialogue-choice=${this._handleDialogueChoice} /* Assume this event is fired by game-interface-view Already applied in previous diff */
                    ></game-interface-view>`;
      case 'inventory': // New case
        return html`<inventory-view
                      .items=${this.playerInventory}
                      .playerResources=${this.playerResources}
                      /* .playerQuests=${this.playerQuests} /* Pass playerQuests Already applied in previous diff */
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
