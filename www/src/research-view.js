import { LitElement, html, css } from 'lit';

class ResearchView extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; }
    h2 { text-align: center; }
  `;
  render() {
    return html`<h2>Research & Upgrades</h2><p>Tech tree and upgrades will be managed here.</p>`;
  }
}
customElements.define('research-view', ResearchView);
