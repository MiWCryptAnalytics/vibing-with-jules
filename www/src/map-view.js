import { LitElement, html, css } from 'lit';

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
      background-color: #e0e0e0; /* Light grey background for the container */
      position: relative; /* For potential future absolute positioning of map elements */
      cursor: grab; /* Add this line */
    }
    .map-content {
      width: 1000px; /* Larger than container to demonstrate scrolling */
      height: 800px; /* Larger than container */
      background-color: #8fbc8f; /* DarkSeaGreen for the map itself */
      /* Simple grid pattern using gradients */
      background-image:
        linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px);
      background-size: 20px 20px;
      position: relative; /* For positioning elements on the map or transform origin */
    }
  `;

  static properties = {
    zoomLevel: { type: Number },
    isDragging: { type: Boolean, state: true }, // 'state: true' indicates internal state that triggers re-render
    startX: { type: Number, state: true },
    startY: { type: Number, state: true },
    initialScrollLeft: { type: Number, state: true },
    initialScrollTop: { type: Number, state: true },
    pointsOfInterest: { type: Array, state: true }, // New
    selectedPoi: { type: Object, state: true }    // New
  };

  constructor() {
    super();
    // Future properties like zoomLevel, mapData etc. will go here
    this.zoomLevel = 1;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialScrollLeft = 0;
    this.initialScrollTop = 0;
    this.pointsOfInterest = []; // New
    this.selectedPoi = null;    // New

    // Bind event handlers to ensure 'this' context
    this._handleDragStart = this._handleDragStart.bind(this);
    this._handleDragMove = this._handleDragMove.bind(this); // Will be created later
    this._handleDragEnd = this._handleDragEnd.bind(this);   // Will be created later
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
      this.zoomLevel += 0.1;
    }
  }

  _zoomOut() {
    if (this.zoomLevel > 0.5) { // Min zoom limit
      this.zoomLevel -= 0.1;
    }
  }

  render() {
    return html`
      <h2>Game Map</h2>
      <div class="map-container">
        <div class="map-content" style="transform: scale(${this.zoomLevel}); transform-origin: top left;">
          <!-- Content inside the map, e.g., player icon, points of interest, could go here later -->
          <p style="text-align:center; padding-top: 20px; color: white;">Scrollable Map Area</p>
        </div>
      </div>
      <div class="zoom-controls">
        <button @click=${this._zoomOut}>Zoom Out</button>
        <button @click=${this._zoomIn}>Zoom In</button>
        <span>Current Zoom: ${this.zoomLevel.toFixed(1)}x</span>
      </div>
    `;
  }
}

customElements.define('map-view', MapView);
