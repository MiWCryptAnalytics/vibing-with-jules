import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';

class GameInterfaceView extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; }
    h2 { text-align: center; }
  `;

  constructor() {
    super();
    updateWhenLocaleChanges(this);
  }

  render() {
    return html`
      <h2>${msg('Game Interface', {id: 'game-interface-title'})}</h2>
      <p>${msg('Main game actions and display will be here.', {id: 'game-interface-description'})}</p>
    `;
  }
}
customElements.define('game-interface-view', GameInterfaceView);
