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
    zoomLevel: { type: Number }
  };

  constructor() {
    super();
    // Future properties like zoomLevel, mapData etc. will go here
    this.zoomLevel = 1;
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
