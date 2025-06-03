import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';

class MenuView extends LitElement {
  static styles = css`
    ul {
      list-style: none; /* Keep */
      padding: 0; /* Keep */
    }
    li {
      /* margin-bottom: 10px; */ /* Removed, margin now on 'a' */
    }
    a {
      display: block; /* Keep */
      padding: 12px 20px; /* Updated */
      margin-bottom: 15px; /* Added */
      background-color: #7A5C5C; /* medium brown */
      color: #FDF5E6 !important; /* cream text */
      border: 2px solid #2F1E1E; /* darker brown border */
      text-align: center; /* Added */
      font-family: 'PirateFont', cursive; /* Placeholder */
      font-size: 1.5em; /* Added */
      box-shadow: 3px 3px 5px rgba(0,0,0,0.3); /* Added */
      border-radius: 0; /* Ensure no rounded corners */
      text-decoration: none; /* Ensure no underline by default */
      transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, transform 0.1s ease-in-out, box-shadow 0.2s ease-in-out;
    }
    a:hover {
      background-color: #2F1E1E; /* darker brown */
      color: #FDF5E6 !important; /* cream text */
      border-color: #000; /* black border */
      text-decoration: none; /* Ensure no underline on hover */
      transform: translateY(-2px);
      box-shadow: 5px 5px 7px rgba(0,0,0,0.4);
    }
    a:active {
      transform: translateY(1px);
      box-shadow: 2px 2px 3px rgba(0,0,0,0.3);
    }
    .developer-note {
        font-size: 0.8em; /* Keep */
        color: #7A5C5C; /* medium brown */
        margin-top: 30px; /* Keep */
    }
    hr {
      /* Will inherit global hr styles */
      /* margin-top: 20px; */ /* Remove if global provides enough */
      /* margin-bottom: 20px; */ /* Remove if global provides enough */
      /* border: 0; */
      /* border-top: 1px solid #ccc; */
    }
    button {
      padding: 10px 20px; /* Updated */
      background-color: #7A5C5C; /* medium brown */
      color: #FDF5E6; /* cream */
      border: 2px solid #2F1E1E; /* darker brown */
      font-family: 'MainTextFont', serif; /* Placeholder */
      border-radius: 0; /* Ensure no rounded corners */
      /* cursor: pointer; */ /* Default for button */
      transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, transform 0.1s ease-in-out, box-shadow 0.2s ease-in-out;
    }
    button:hover {
      background-color: #2F1E1E; /* darker brown */
      color: #FDF5E6; /* cream */
      border-color: #000; /* black border */
      transform: translateY(-2px);
      box-shadow: 4px 4px 6px rgba(0,0,0,0.3);
    }
    button:active {
      transform: translateY(1px);
      box-shadow: 1px 1px 2px rgba(0,0,0,0.2);
    }
  `;

  static properties = {
    message: { type: String }
  };

  constructor() {
    super();
    updateWhenLocaleChanges(this);
    this.message = msg('Click the button below!', {id: 'initial-message'});
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
      msg('Lit is working!', {id: 'lit-working'}),
      msg('Interactivity achieved!', {id: 'interactivity-achieved'}),
      msg('You clicked the button!', {id: 'button-clicked'}),
      msg("Isn't this cool?", {id: 'cool-isnt-it'}),
      msg('Hello from Lit component!', {id: 'hello-lit'})
    ];
    this.message = messages[Math.floor(Math.random() * messages.length)];
  }

  render() {
    return html`
      <h2>${msg('Game Menu', {id: 'menu-title'})}</h2>
      <ul>
        <li><a href="#" @click=${(e) => this._handleNavigation(e, 'game')}>${msg('Start Game', {id: 'menu-start-game'})}</a></li>
      </ul>
      <p class="developer-note">
        (Developer Note: To switch themes, you would later add JavaScript to change the class on the &lt;body&gt; tag from 'theme-light' to 'theme-dark' or vice-versa. For now, a default theme is applied.)
      </p>

      <hr>
      <h3>${msg('Simple Interactivity Test', {id: 'menu-interactivity-title'})}</h3>
      <p>${this.message}</p>
      <button @click=${this._changeMessage}>${msg('Change Message', {id: 'menu-change-message-button'})}</button>
    `;
  }
}

customElements.define('menu-view', MenuView);
