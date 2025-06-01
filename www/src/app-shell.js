import { LitElement, html, css } from 'lit';
import './menu-view.js'; // Import the menu view
import './splash-view.js'; // Import the splash view
import './map-view.js'; // Import the map view

class AppShell extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
      background-color: var(--app-shell-background-color, #f9f9f9); /* Example theming hook */
    }
    .view-container {
      border: 1px solid #ccc;
      padding: 16px;
      margin-top: 16px;
    }
  `;

  static properties = {
    currentView: { type: String },
  };

  constructor() {
    super();
    // Will be changed back to 'splash' once splash-view is created.
    this.currentView = 'splash'; // Set back to default
  }

  _handleNavigate(event) {
    const requestedView = event.detail.view;
    console.log(`AppShell: Navigate event to view: ${requestedView}`);
    // Later, we'll have a proper router or state machine here.
    // For now, we just update the currentView. If the view component exists, it'll render.
    this.currentView = requestedView;
  }

  render() {
    return html`
      <header>
        <h1>My Lit Game</h1>
      </header>
      <main>
        <div class="view-container">
          ${this._renderCurrentView()}
        </div>
      </main>
      <footer>
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
      case 'map': // New case
        return html`<map-view @navigate=${this._handleNavigate}></map-view>`;
      // Add more cases for other views (map, game, inventory, research) later
      default:
        return html`<p>Unknown view: ${this.currentView}. Implement ${this.currentView}-view.js and update AppShell.</p>`;
    }
  }
}

customElements.define('app-shell', AppShell);
