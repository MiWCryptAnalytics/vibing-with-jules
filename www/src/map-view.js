import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';
import '@material/web/icon/icon.js';

class MapView extends LitElement {
  static styles = css`
    :host {
      display: flex; /* Added */
      flex-direction: column; /* Added */
      flex-grow: 1; /* Added */
      text-align: center;
    }
    h2 {
      /* Inherits global styles */
      margin-bottom: 16px; /* Keep */
    }
    .zoom-controls {
      margin-top: 10px;
      text-align: center;
    }
    .zoom-controls button {
      padding: 5px 10px; /* Keep */
      margin: 0 5px; /* Keep */
      background-color: #7A5C5C; /* medium brown */
      color: #FDF5E6; /* cream */
      border: 1px solid #2F1E1E; /* darker brown */
      border-radius: 0; /* Rustic look */
      font-family: 'MainTextFont', serif; /* Placeholder */
      transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
    }
    .zoom-controls button:hover {
      background-color: #2F1E1E; /* darker brown */
      color: #FDF5E6; /* Keep cream */
      transform: scale(1.1);
    }
    .zoom-controls button:active {
      transform: scale(0.95);
    }
    .zoom-controls span {
      margin-left: 10px;
      color: #3C2F2F; /* dark brown */
      font-family: 'MainTextFont', serif; /* Placeholder */
    }
    .map-container {
      /* width: 90%; */ /* REMOVE */
      /* max-width: 600px; */ /* REMOVE */
      /* height: 400px; */ /* REMOVE */
      /* margin: 0 auto; */ /* REMOVE */
      width: 100%; /* ADDED */
      flex-grow: 1; /* ADDED, to fill :host */
      display: flex; /* ADDED, to help center map-content if it's smaller */
      justify-content: center; /* ADDED, to center map-content horizontally */
      align-items: center; /* ADDED, to center map-content vertically */
      border: 5px solid #3C2F2F;
      overflow: auto;
      /* overscroll-behavior: none; */ /* This is fine */
      background-color: #5C8D9C;
      position: relative;
      cursor: grab;
      box-shadow: inset 0 0 25px 15px rgba(0,0,0,0.35);
      scrollbar-width: none; /* For Firefox */
    }
    .map-container::-webkit-scrollbar {
      display: none; /* Hide scrollbar */
    }
    .map-content {
      /* width: 1280px; */ /* REMOVE */
      /* height: 896px; */ /* REMOVE */

      /* New approach to maintain aspect ratio of the map image (1280x896) */
      /* while fitting within the container. The map image itself will be the background. */
      width: 100%; /* Fill the width of map-container */
      /* Calculate aspect ratio: (896 / 1280) * 100% = 70% */
      /* This means height is 70% of the width. */
      /* We achieve this by setting height to 0 and using padding-bottom. */
      height: 0;
      padding-bottom: 70%; /* This sets the height relative to the width */

      background-image: url(../www/assets/images/mapv1.jpg);
      background-repeat: no-repeat;
      background-size: 100% 100%; /* Stretch background image to fill the div */
      position: relative; /* Keep for POI markers */
      /* transform: scale() is applied via inline style by Lit, keep that */
    }

    @keyframes pulseAnimation {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }

    .poi-marker {
      display: flex;
      align-items: center;
      padding: 2px 4px; /* Adjusted */
      background-color: #FDF5E6; /* cream/parchment placeholder */
      /* Conceptual: background-image: url('assets/images/theme/poi_marker_bg.png'); */
      border: 1px solid #3C2F2F; /* dark brown */
      border-radius: 2px; /* slight rounding */
      cursor: pointer;
      font-family: 'MainTextFont', serif; /* Placeholder */
      font-size: 10px; /* Keep */
       font-weight: bold; /* Keep */
      box-shadow: 0 1px 3px rgba(0,0,0,0.3); /* Keep */
      transform-origin: center;
      animation: pulseAnimation 5.0s infinite ease-in-out; /* Keep */
      transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, transform 0.2s ease-out;
    }

    .poi-marker:hover {
      background-color: #E0D8C9; /* Slightly darker parchment for hover */
      border-color: #000; /* Black border on hover */
      /* transform: scale(1.1); */ /* Pulse animation is likely sufficient, avoid over-animating */
    }

    .poi-marker md-icon {
      margin-right: 5px; /* Keep */
      font-size: 18px; /* Keep */
      color: #3C2F2F; /* dark brown */
    }

    .poi-marker .poi-name {
      white-space: nowrap; /* Prevent name from wrapping */
    }
    .poi-info-display {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translate(-50%, 20px);
      width: 80%;
      max-width: 400px;
      background-color: #FDF5E6; /* parchment */
      /* Conceptual: background-image: url('assets/images/theme/parchment_texture_popup.png'); */
      border: 2px solid #3C2F2F; /* dark brown */
      /* Conceptual: border-image-source: url('assets/images/theme/popup_border.png'); */
      /* border-image-slice: 10; */
      /* border-image-width: 10px; */
      border-radius: 3px; /* slight rounding */
      padding: 15px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2); /* Keep */
      z-index: 10; /* Keep */
      text-align: left; /* Keep */
      opacity: 0;
      transition: opacity 0.3s ease-out, transform 0.3s ease-out; /* Keep */
      pointer-events: none;
    }

    .poi-info-display.visible {
      opacity: 1;
      transform: translate(-50%, 0);
      pointer-events: auto;
    }

    .poi-info-display h3 {
      /* Inherits 'PirateFont' from global h3 */
      margin-top: 0;
      font-size: 1.2em; /* Ensure harmonious with icon */
      display: flex;
      align-items: center;
    }

    .poi-info-display h3 md-icon {
      margin-right: 8px;
      font-size: 24px; /* Match h3 font size better */
      color: #3C2F2F; /* dark brown, ensure it's themed */
    }

    .poi-info-display p {
      /* Inherits 'MainTextFont' from global p */
      font-size: 0.9em;
      margin-bottom: 10px;
    }

    .poi-info-display button { /* Close button */
      display: block;
      margin-top: 10px;
      padding: 8px 15px; /* Updated */
      background-color: #7A5C5C; /* medium brown */
      color: #FDF5E6; /* cream */
      border: 1px solid #2F1E1E; /* darker brown */
      border-radius: 0; /* Rustic */
      font-family: 'MainTextFont', serif; /* Placeholder */
      cursor: pointer; /* Keep for button */
    }
    .poi-info-display button:hover {
      background-color: #2F1E1E; /* darker brown */
      color: #FDF5E6; /* Keep cream */
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
