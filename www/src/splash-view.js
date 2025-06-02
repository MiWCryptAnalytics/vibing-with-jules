import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';

class SplashView extends LitElement {
  static styles = css`
    :host {
      text-align: center;
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 0.5em;
    }
    p {
      font-size: 1.2em;
    }
    a {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      /* Style inherited from global style.css but can be specific here */
      text-decoration: none;
      font-weight: bold;
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
