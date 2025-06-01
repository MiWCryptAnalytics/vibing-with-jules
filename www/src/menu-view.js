import { LitElement, html, css } from 'lit';

class MenuView extends LitElement {
  static styles = css`
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      margin-bottom: 10px;
    }
    a {
      display: block;
      padding: 10px 15px;
      /* Styles for links will be inherited from style.css's body.theme-light ul li a or body.theme-dark ul li a */
      /* but we can add specific overrides or additional styles here if needed */
      border: 1px solid transparent; /* Example to show it's a self-contained component */
    }
    a:hover {
      border-color: var(--app-primary-color, blue); /* Example theming hook */
    }
    .developer-note {
        font-size: 0.8em;
        color: #777; /* This color might need adjustment based on theme */
        margin-top: 30px;
    }
    hr {
      margin-top: 20px;
      margin-bottom: 20px;
      border: 0;
      border-top: 1px solid #ccc;
    }
    button {
      padding: 8px 15px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0056b3;
    }
  `;

  static properties = {
    message: { type: String }
  };

  constructor() {
    super();
    this.message = 'Click the button below!';
  }

  _handleNavigation(event, viewName) {
    event.preventDefault();
    const navigateEvent = new CustomEvent('navigate', {
      detail: { view: viewName },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(navigateEvent);
  }

  _changeMessage() {
    const messages = [
      "Lit is working!",
      "Interactivity achieved!",
      "You clicked the button!",
      "Isn't this cool?",
      "Hello from Lit component!"
    ];
    this.message = messages[Math.floor(Math.random() * messages.length)];
  }

  render() {
    return html`
      <h2>Game Menu</h2>
      <ul>
        <li><a href="#" @click=${(e) => this._handleNavigation(e, 'game')}>Start Game</a></li>
        <li><a href="#" @click=${(e) => this._handleNavigation(e, 'inventory')}>Inventory</a></li>
        <li><a href="#" @click=${(e) => this._handleNavigation(e, 'research')}>Research</a></li>
        <li><a href="#" @click=${(e) => this._handleNavigation(e, 'options')}>Options</a></li>
      </ul>
      <p class="developer-note">
        (Developer Note: To switch themes, you would later add JavaScript to change the class on the &lt;body&gt; tag from 'theme-light' to 'theme-dark' or vice-versa. For now, a default theme is applied.)
      </p>

      <hr>
      <h3>Simple Interactivity Test</h3>
      <p>${this.message}</p>
      <button @click=${this._changeMessage}>Change Message</button>
    `;
  }
}

customElements.define('menu-view', MenuView);
