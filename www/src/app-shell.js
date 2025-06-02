import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges, configureLocalization } from '@lit/localize';
// import { localeCodes } from './generated/locale-codes.js'; // File not generated as of last check
import { messages as enMessages } from './generated/locales/en.js';

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
    this._initializeLocalization(); // Call localization setup
    updateWhenLocaleChanges(this);
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
    this._boundHandleHashChange = this._handleHashChange.bind(this);
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
    } else if (this.currentView !== 'splash') {
      // See previous comments on this logic block
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
        return html`<game-interface-view @navigate=${this._handleNavigate}></game-interface-view>`;
      case 'inventory': // New case
        return html`<inventory-view @navigate=${this._handleNavigate}></inventory-view>`;
      case 'research': // New case
        return html`<research-view @navigate=${this._handleNavigate}></research-view>`;
      default:
        return html`<p>${msg('Unknown view:', {id: 'unknown-view-prefix'})} ${this.currentView}. ${msg('Implement corresponding -view.js and update AppShell.', {id: 'unknown-view-suffix'})}</p>`;
    }
  }
}

customElements.define('app-shell', AppShell);
