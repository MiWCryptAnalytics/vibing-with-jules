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
    // Will be changed back to 'splash' once splash-view is created.
    // this.currentView = 'splash'; // Set back to default
    this._boundHandleHashChange = this._handleHashChange.bind(this);
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
    this.currentView = viewName;
    window.location.hash = viewName;
    console.log(`AppShell: Top nav click to view: ${viewName}`);
  }

  _handleNavigate(event) { // This is for events from child components
    const requestedView = event.detail.view;
    console.log(`AppShell: Navigate event to view: ${requestedView}`);
    this.currentView = requestedView;
    window.location.hash = requestedView;
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
        return html`<game-interface-view @navigate=${this._handleNavigate}></game-interface-view>`;
      case 'inventory': // New case
        return html`<inventory-view @navigate=${this._handleNavigate}></inventory-view>`;
      case 'research': // New case
        return html`<research-view @navigate=${this._handleNavigate}></research-view>`;
      default:
        return html`<p>Unknown view: ${this.currentView}. Implement ${this.currentView}-view.js and update AppShell.</p>`;
    }
  }
}

customElements.define('app-shell', AppShell);
