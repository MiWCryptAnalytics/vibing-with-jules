import { LitElement, html, css } from 'lit';

class GameInterfaceView extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; }
    h2 { text-align: center; }
  `;
  render() {
    return html`<h2>Game Interface</h2><p>Main game actions and display will be here.</p>`;
  }
}
customElements.define('game-interface-view', GameInterfaceView);
