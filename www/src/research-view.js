import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';

class ResearchView extends LitElement {
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
      <h2>${msg('Research & Upgrades', {id: 'research-title'})}</h2>
      <p>${msg('Tech tree and upgrades will be managed here.', {id: 'research-description'})}</p>
    `;
  }
}
customElements.define('research-view', ResearchView);
