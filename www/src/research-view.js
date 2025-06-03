import { LitElement, html, css } from 'lit';
import { msg, updateWhenLocaleChanges } from '@lit/localize';

class ResearchView extends LitElement {
  static styles = css`
    :host { 
      display: block; 
      padding: 16px; /* Keep */
    }
    h2 { 
      /* Inherits 'PirateFont' and color from global h2 */
      text-align: center; /* Keep */
    }
    p {
      /* Inherits 'MainTextFont' and color from global p */
      background-color: rgba(224, 216, 201, 0.7); /* semi-transparent darker parchment */
      padding: 20px; /* Added */
      border: 1px dashed #7A5C5C; /* medium brown dashed border */
      text-align: center; /* Added */
      /* box-shadow: 0 0 10px rgba(0,0,0,0.1) inset; */ /* Conceptual */
    }
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
