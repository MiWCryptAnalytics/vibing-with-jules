import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';

class SplashView extends LitElement {
  static styles = css`
    :host {
      text-align: center;
      /* Conceptual: background-image: url('assets/images/theme/splash_bg.png'); */
    }
    h1 {
      /* Inherits 'PirateFont', cursive and color: #2F1E1E from global */
      font-size: 3.5em; /* Larger */
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      margin-bottom: 0.5em; /* Keep */
    }
    p {
      /* Inherits 'MainTextFont', serif and color: #3C2F2F from global */
      font-size: 1.2em; /* Keep */
    }
    a {
      display: inline-block; /* Keep */
      margin-top: 20px; /* Keep */
      padding: 15px 30px; /* Updated */
      /* Inherits font-weight: bold and text-decoration: none from global 'a' */
      background-color: #7A5C5C; /* medium brown */
      color: #FDF5E6 !important; /* cream text, important to override global link color */
      border: 2px solid #2F1E1E; /* darker brown border */
      box-shadow: 3px 3px 5px rgba(0,0,0,0.3);
      border-radius: 0; /* Ensure no rounded corners if any were inherited */
      transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, transform 0.1s ease-in-out, box-shadow 0.2s ease-in-out;
    }
    a:hover {
      background-color: #2F1E1E; /* darker brown */
      color: #FDF5E6 !important; /* cream text */
      border-color: #000; /* black border on hover */
      text-decoration: none; /* Keep no underline for button feel */
      transform: translateY(-2px); /* Lifts the button slightly */
      box-shadow: 5px 5px 7px rgba(0,0,0,0.4); /* Slightly larger shadow */
    }
    a:active {
      transform: translateY(1px); /* Simulates being pressed down */
      box-shadow: 2px 2px 3px rgba(0,0,0,0.3); /* Smaller shadow */
    }
  `;

  constructor() {
    super();
    updateWhenLocaleChanges(this);
  }

  _continueToMenu(event) {
    event.preventDefault();
    const navigateEvent = new CustomEvent('navigate', {
      detail: { view: 'menu' }, // Specifies that we want to navigate to the menu
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(navigateEvent);
  }

  render() {
    return html`
      <h1>${msg('Welcome to My Lit Game!', {id: 'splash-welcome'})}</h1>
      <p>${msg('The adventure begins here.', {id: 'splash-adventure'})}</p>
      <p><a href="#" @click=${this._continueToMenu}>${msg('Continue to Menu', {id: 'splash-continue'})}</a></p>
    `;
  }
}

customElements.define('splash-view', SplashView);
