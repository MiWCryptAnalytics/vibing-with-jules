import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';
import '@material/web/icon/icon.js';

class MapView extends LitElement {
  static styles = css`
    :host {
      display: block;
      text-align: center; /* Center the map container if it's narrower than host */
    }
    h2 {
      margin-bottom: 16px;
    }
    .zoom-controls {
      margin-top: 10px;
      text-align: center;
    }
    .zoom-controls button {
      padding: 5px 10px;
      margin: 0 5px;
      /* Styles inherited or can be specific */
    }
    .zoom-controls span {
      margin-left: 10px;
    }
    .map-container {
      width: 90%; /* Or a fixed width like 500px */
      max-width: 600px;
      height: 400px;
      border: 2px solid #555;
      overflow: auto; /* Important for scrolling */
      margin: 0 auto; /* Center the container */
      overscroll-behavior: none; /* Prevent bounce/rubber-band scrolling */
      background-color: #e0e0e0; /* Light grey background for the container */
      position: relative; /* For potential future absolute positioning of map elements */
      cursor: grab;

      /* Hide scrollbars */
      scrollbar-width: none; /* For Firefox */

      /* Vignette effect */
      box-shadow: inset 0 0 25px 15px rgba(0,0,0,0.35); /* Adjust spread, blur, and color for desired intensity */
                                                        /* (Horizontal offset, vertical offset, blur radius, spread radius, color) */
    }

    /* For WebKit browsers (Chrome, Safari, Edge, Opera) */
    /* It's important this selector is specific enough and correctly processed. */
    /* Applying to the class directly is standard. */
    .map-container::-webkit-scrollbar {
      display: none; /* Hide scrollbar */
    }
    .map-content {
      width: 1280px;
      height: 896px;
      background-image: url(../www/assets/images/mapv1.jpg);
      background-repeat: no-repeat;
      /* background-color: transparent; (no longer needed if image covers) */
      position: relative; /* Keep for positioning elements on the map or transform origin */
      /* The old CSS grid background-image rule should be removed */
    }

    @keyframes pulseAnimation {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.15);
      }
      100% {
        transform: scale(1);
      }
    }

    .poi-marker {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      background-color: rgba(255, 255, 255, 0.8);
      border: 1px solid #555;
      border-radius: 16px;
      cursor: pointer;
      font-size: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      /* No transform: translate initially - assuming x,y is top left */
      transform-origin: center; /* Make scaling originate from the center of the marker */
      animation: pulseAnimation 2.5s infinite ease-in-out; /* Apply the animation */
    }

    .poi-marker:hover {
      background-color: rgba(255, 255, 255, 1); /* Opaque on hover */
      border-color: #000;
    }

    .poi-marker md-icon {
      margin-right: 5px;
      font-size: 18px; /* Adjust icon size if needed */
      color: #333; /* Default icon color */
    }

    .poi-marker .poi-name {
      white-space: nowrap; /* Prevent name from wrapping */
    }
    .poi-info-display {
      position: absolute; /* Or 'fixed' */
      bottom: 20px;
      left: 50%;
      /* transform: translateX(-50%); /* Initial horizontal centering */
      /* Combined transform for initial state: */
      transform: translate(-50%, 20px); /* Start centered horizontally, and 20px down */

      width: 80%;
      max-width: 400px;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      z-index: 10;
      text-align: left;

      opacity: 0; /* Initially hidden */
      transition: opacity 0.3s ease-out, transform 0.3s ease-out;
      pointer-events: none; /* Ignore clicks when hidden */
    }

    .poi-info-display.visible {
      opacity: 1;
      transform: translate(-50%, 0); /* Slide to final position (centered, no Y offset) */
      pointer-events: auto; /* Allow clicks when visible */
    }

    .poi-info-display h3 {
      margin-top: 0;
      font-size: 1.2em;
      display: flex;
      align-items: center;
    }

    .poi-info-display h3 md-icon {
      margin-right: 8px;
      font-size: 24px; /* Match h3 font size better */
    }

    .poi-info-display p {
      font-size: 0.9em;
      margin-bottom: 10px;
    }

    .poi-info-display button {
      display: block;
      margin-top: 10px;
      padding: 8px 15px;
      background-color: #007bff; /* Standard button color */
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .poi-info-display button:hover {
      background-color: #0056b3;
    }
  `;

  static properties = {
    zoomLevel: { type: Number },
    isDragging: { type: Boolean, state: true }, // 'state: true' indicates internal state that triggers re-render
    startX: { type: Number, state: true },
    startY: { type: Number, state: true },
    initialScrollLeft: { type: Number, state: true },
    initialScrollTop: { type: Number, state: true },
    pointsOfInterest: { type: Array, state: true },
    selectedPoi: { type: Object, state: true },
    playerInventory: { type: Array } // Added for item restrictions
  };

  constructor() {
    super();
    updateWhenLocaleChanges(this);
    // Future properties like zoomLevel, mapData etc. will go here
    this.zoomLevel = 1;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialScrollLeft = 0;
    this.initialScrollTop = 0;
    this.pointsOfInterest = [];
    this.selectedPoi = null;
    this.playerInventory = []; // Initialize playerInventory

    // Bind event handlers to ensure 'this' context
    this._handleDragStart = this._handleDragStart.bind(this);
    this._handleDragMove = this._handleDragMove.bind(this);
    this._handleDragEnd = this._handleDragEnd.bind(this);
    this._handlePoiClick = this._handlePoiClick.bind(this);
    this._closePoiInfo = this._closePoiInfo.bind(this);
    this._handleMapClick = this._handleMapClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback(); // Always call super
    if (this.pointsOfInterest.length === 0) { // Only load if not already populated
      this._loadPois();
    }
    // Bind other event handlers if not done in constructor, or for listeners added here
  }

  async _loadPois() {
    try {
      const response = await fetch('../www/data/pois.json'); // Path relative to the application root (www)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.pointsOfInterest = data;
      console.log('POIs loaded:', this.pointsOfInterest); // For debugging
    } catch (error) {
      console.error("Could not load Points of Interest:", error);
      this.pointsOfInterest = []; // Ensure it's an empty array on error
    }
  }

  firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties); // Call super if overriding
    this.mapContainer = this.shadowRoot.querySelector('.map-container');
    if (this.mapContainer) {
      this.mapContainer.addEventListener('mousedown', this._handleDragStart);
      this.mapContainer.addEventListener('touchstart', this._handleDragStart, { passive: true });
      // { passive: true } for touchstart can improve scroll performance on some browsers
    } else {
      console.error("Map container not found in firstUpdated");
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback(); // Call super if overriding
    if (this.mapContainer) {
      this.mapContainer.removeEventListener('mousedown', this._handleDragStart);
      this.mapContainer.removeEventListener('touchstart', this._handleDragStart);
    }
    // Important: We will also need to remove window/document event listeners here later
    // that get added in _handleDragStart.
    // Remove window event listeners
    window.removeEventListener('mousemove', this._handleDragMove);
    window.removeEventListener('mouseup', this._handleDragEnd);
    window.removeEventListener('touchmove', this._handleDragMove);
    window.removeEventListener('touchend', this._handleDragEnd);
    window.removeEventListener('mouseleave', this._handleDragEnd);
    if (this.mapContainer) { // Reset cursor if mapContainer still exists
        this.mapContainer.style.cursor = '';
    }
  }

  _handleDragStart(event) {
    // Prevent text selection or other default browser actions during drag
    if (event.type === 'mousedown') {
      event.preventDefault();
    }

    this.isDragging = true;

    // Determine if it's a touch event or mouse event
    const pointer = event.touches ? event.touches[0] : event;
    this.startX = pointer.pageX;
    this.startY = pointer.pageY;

    if (this.mapContainer) {
      this.initialScrollLeft = this.mapContainer.scrollLeft;
      this.initialScrollTop = this.mapContainer.scrollTop;

      // Change cursor style
      this.mapContainer.style.cursor = 'grabbing';
      // If you have a specific map content div that should show grabbing, target that
      // e.g., this.shadowRoot.querySelector('.map-content').style.cursor = 'grabbing';
    } else {
      console.error("Map container not found in _handleDragStart");
      return; // Can't proceed without mapContainer
    }

    // Add move and end listeners to the window for broader event capture
    // This ensures dragging continues even if the mouse leaves the mapContainer
    window.addEventListener('mousemove', this._handleDragMove);
    window.addEventListener('mouseup', this._handleDragEnd);
    window.addEventListener('touchmove', this._handleDragMove, { passive: false }); // passive:false if we call preventDefault in move
    window.addEventListener('touchend', this._handleDragEnd);
    window.addEventListener('mouseleave', this._handleDragEnd); // Also end drag if mouse leaves window
  }

  _handleDragMove(event) {
    if (!this.isDragging) {
      return;
    }

    // For touchmove, we might want to prevent default page scrolling
    // if (event.type === 'touchmove') {
    //   event.preventDefault(); // Uncomment if map scroll interferes with page scroll
    // }

    const pointer = event.touches ? event.touches[0] : event;
    const deltaX = pointer.pageX - this.startX;
    const deltaY = pointer.pageY - this.startY;

    if (this.mapContainer) {
      // Scroll by the difference from the initial position
      this.mapContainer.scrollLeft = this.initialScrollLeft - deltaX;
      this.mapContainer.scrollTop = this.initialScrollTop - deltaY;
    } else {
      console.error("Map container not found in _handleDragMove");
    }
  }

  _handleMapClick(event) {
    // Make sure the click is directly on the map-content, not on a POI marker that might be a child.
    // Or, if POI markers have pointer-events: none, this check isn't strictly needed for that.
    // However, good to be specific if possible. For now, let's assume clicks on POIs are handled by their own listeners.
    // We might need to check event.target if POIs don't stop propagation.
    // A simple way: if (event.target !== this.shadowRoot.querySelector('.map-content')) return;

    //offsetX/Y are relative to the target element (map-content)
    const rect = event.target.getBoundingClientRect(); // or this.mapContainer.getBoundingClientRect() if map-content is the direct target

    // If event.target is the map-content div itself:
    const clickedX = event.offsetX / this.zoomLevel;
    const clickedY = event.offsetY / this.zoomLevel;

    console.log(`Map clicked. Displayed coordinates (offsetX, offsetY): ${event.offsetX}, ${event.offsetY}. Image coordinates (adjusted for zoom ${this.zoomLevel.toFixed(1)}x): ${clickedX.toFixed(0)}, ${clickedY.toFixed(0)}`);

    // If you wanted coordinates relative to the map container, not the map content itself (e.g. if map content is smaller)
    // you would need to adjust based on scrollLeft/scrollTop of mapContainer and position of mapContent.
    // But since mapContent is where the image is, offsetX/Y on it is what we want.
  }

  _handlePoiClick(poi) {
    // Check for required items before navigating
    if (poi.requiredItems && poi.requiredItems.length > 0) {
      const missingItems = [];
      for (const itemId of poi.requiredItems) {
        if (!this.playerInventory.some(invItem => invItem.id === itemId)) {
          // Create a user-friendly name from the item ID
          const itemName = itemId.replace('item_', '').replace(/_/g, ' ');
          missingItems.push(itemName);
        }
      }

      if (missingItems.length > 0) {
        // Player does not have all required items
        const message = `You need: ${missingItems.join(', ')} to access ${poi.name}.`;
        console.log(`MapView: Access to ${poi.name} denied. Missing: ${missingItems.join(', ')}`);

        this.selectedPoi = {
          ...poi,
          customMessage: message,
          isAccessible: false
        };
        this.requestUpdate(); // Ensure the info display updates
        return; // Stop further processing
      }
    }

    // If all checks pass or no required items, proceed to navigate
    console.log('MapView: POI Clicked, navigating to game view:', poi.name);
    const navigateEvent = new CustomEvent('navigate', {
      detail: {
        view: 'game',
        locationData: poi
      },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(navigateEvent);
    this.selectedPoi = null; // Clear selection after successful navigation attempt
    this.requestUpdate();
  }

  _closePoiInfo() {
    this.selectedPoi = null;
  }

  _handleDragEnd(event) {
    if (!this.isDragging) {
      // Avoid redundant operations if drag already ended somehow
      // or if it's a mouseleave event not related to an active drag.
      // However, it's generally safe to always try to remove listeners if this is called.
    }

    this.isDragging = false;

    if (this.mapContainer) {
      // Revert cursor style
      this.mapContainer.style.cursor = 'grab';
      // If you set it on map-content:
      // this.shadowRoot.querySelector('.map-content').style.cursor = 'default'; // or 'grab'
    }

    // Remove global event listeners
    // These were added to 'window' in _handleDragStart
    window.removeEventListener('mousemove', this._handleDragMove);
    window.removeEventListener('mouseup', this._handleDragEnd);
    window.removeEventListener('touchmove', this._handleDragMove);
    window.removeEventListener('touchend', this._handleDragEnd);
    window.removeEventListener('mouseleave', this._handleDragEnd); // Also remove this one
  }

  _zoomIn() {
    if (this.zoomLevel < 2) { // Max zoom limit
      const newZoomLevel = Math.min(2.0, this.zoomLevel + 0.1);
      this.zoomLevel = parseFloat(newZoomLevel.toFixed(2));
    }
  }

  _zoomOut() {
    // Min zoom limit (1.0x)
    const newZoomLevel = Math.max(1.0, this.zoomLevel - 0.1);
    this.zoomLevel = parseFloat(newZoomLevel.toFixed(2));
  }

  render() {
    return html`
      <h2>${msg('Game Map', {id: 'map-title'})}</h2>
      <div class="map-container">
        <div
          class="map-content"
          style="transform: scale(${this.zoomLevel}); transform-origin: top left;"
          @click=${this._handleMapClick}
        >
          <p style="text-align:center; padding-top: 20px; color: white; margin-top: 0;"></p>
          ${this.pointsOfInterest.map(poi => html`
            <div
              class="poi-marker"
              style="position: absolute; left: ${poi.x}px; top: ${poi.y}px;"
              @click=${() => this._handlePoiClick(poi)}
              title="${poi.name}"
            >
              <md-icon>${poi.icon}</md-icon>
              <span class="poi-name">${poi.name}</span>
            </div>
          `)}
        </div>
      </div>
      <div class="zoom-controls">
        <button @click=${this._zoomOut}>${msg('Zoom Out', {id: 'map-zoom-out'})}</button>
        <button @click=${this._zoomIn}>${msg('Zoom In', {id: 'map-zoom-in'})}</button>
        <span>${msg('Current Zoom:', {id: 'map-current-zoom'})} ${this.zoomLevel.toFixed(1)}x</span>
      </div>

      <div class="poi-info-display ${this.selectedPoi ? 'visible' : ''}">
        ${this.selectedPoi ? html`
          <h3><md-icon>${this.selectedPoi.icon}</md-icon> ${this.selectedPoi.name}</h3>
          ${this.selectedPoi.customMessage ? html`
            <p class="restriction-message" style="color: red;">${this.selectedPoi.customMessage}</p>
          ` : html`
            <p>${this.selectedPoi.description}</p>
          `}
          <button @click=${this._closePoiInfo}>${msg('Close', {id: 'map-poi-close'})}</button>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('map-view', MapView);
