import { LitElement, html, css } from 'lit';

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
      <h1>Welcome to My Lit Game!</h1>
      <p>The adventure begins here.</p>
      <p><a href="#" @click=${this._continueToMenu}>Continue to Menu</a></p>
    `;
  }
}

customElements.define('splash-view', SplashView);
