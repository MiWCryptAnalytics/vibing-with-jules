import { LitElement, html, css } from 'lit';
import { msg } from '@lit/localize';

class FlagCustomizationView extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      font-family: 'PirateFont', cursive; /* Assuming PirateFont is available */
      color: #FDF5E6; /* Cream text */
    }
    .title {
      font-size: 2em;
      margin-bottom: 20px;
      color: #FFD700; /* Gold */
      text-shadow: 2px 2px 2px #000;
    }
    .customization-area {
      display: flex;
      gap: 30px;
      width: 100%;
      max-width: 900px;
      justify-content: space-around;
    }
    .selection-column {
      display: flex;
      flex-direction: column;
      gap: 15px;
      align-items: center;
    }
    .selection-column h3 {
      margin-bottom: 5px;
      color: #FFD700;
    }
    .options-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      max-height: 200px;
      overflow-y: auto;
      padding: 5px;
      background-color: rgba(0,0,0,0.2);
      border: 1px solid #7A5C5C;
    }
    .option-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px solid transparent;
      padding: 5px;
      cursor: pointer;
      min-height: 60px;
      background-color: #3C2F2F; /* Dark Brown */
      border-radius: 3px;
    }
    .option-item.selected {
      border-color: #FFD700; /* Gold */
      box-shadow: 0 0 10px #FFD700;
    }
    .option-item img {
      width: 40px;
      height: 40px;
      object-fit: contain;
    }
    .option-item .color-swatch {
      width: 40px;
      height: 40px;
      border: 1px solid #FDF5E6;
    }
    .option-item span {
      font-size: 0.8em;
      text-align: center;
      margin-top: 5px;
    }
    .preview-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      margin-top: 20px;
      background-color: rgba(0,0,0,0.3);
      padding: 20px;
      border: 2px solid #7A5C5C;
      border-radius: 5px;
    }
    .flag-preview {
      width: 200px;
      height: 120px;
      background-color: var(--preview-bg-color, #708090); /* Default: Storm Grey */
      border: 2px solid #FDF5E6;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative; /* For pattern and symbol */
      overflow: hidden; /* Clip pattern/symbol if they exceed bounds */
    }
    .flag-preview-pattern {
      position: absolute;
      width: 100%;
      height: 100%;
      background-size: cover; /* Or contain, depending on pattern style */
    }
    .flag-preview-symbol {
      width: 80px; /* Adjust as needed */
      height: 80px;
      object-fit: contain;
      z-index: 1; /* Ensure symbol is above pattern */
    }
    .fear-factor-display {
      font-size: 1.2em;
      margin-top: 10px;
    }
    .fear-factor-value {
      color: #FFD700;
      font-weight: bold;
    }
    .actions {
      margin-top: 30px;
      display: flex;
      gap: 20px;
    }
    /* Basic button styling, assuming md-filled-button might not be used here for simplicity */
    button {
      padding: 10px 20px;
      font-family: 'PirateFont', cursive;
      font-size: 1em;
      color: #FDF5E6;
      background-color: #7A5C5C; /* Medium Brown */
      border: 1px solid #2F1E1E; /* Darker Brown */
      border-radius: 3px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    button:hover {
      background-color: #2F1E1E; /* Darker Brown */
    }
  `;

  static properties = {
    allFlagSymbols: { type: Array },
    allFlagColors: { type: Array },
    allFlagPatterns: { type: Array },
    currentPlayerFlagDesign: { type: Object },
    _selectedSymbolId: { type: String, state: true },
    _selectedPrimaryColorId: { type: String, state: true },
    _selectedSecondaryColorId: { type: String, state: true },
    _selectedPatternId: { type: String, state: true },
    _currentFearFactor: { type: Number, state: true },
  };

  constructor() {
    super();
    this.allFlagSymbols = [];
    this.allFlagColors = [];
    this.allFlagPatterns = [];
    this.currentPlayerFlagDesign = {};
    this._currentFearFactor = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this._initializeSelections();
    this._calculatePreviewFearFactor();
  }

  updated(changedProperties) {
    if (changedProperties.has('currentPlayerFlagDesign')) {
      this._initializeSelections();
    }
    if (changedProperties.has('_selectedSymbolId') ||
        changedProperties.has('_selectedPrimaryColorId') ||
        changedProperties.has('_selectedSecondaryColorId') ||
        changedProperties.has('_selectedPatternId') ||
        changedProperties.has('allFlagSymbols') || // Recalculate if base data changes
        changedProperties.has('allFlagColors') ||
        changedProperties.has('allFlagPatterns')) {
      this._calculatePreviewFearFactor();
      this._updateFlagPreview();
    }
  }

  _initializeSelections() {
    this._selectedSymbolId = this.currentPlayerFlagDesign?.symbolId || (this.allFlagSymbols[0]?.id);
    this._selectedPrimaryColorId = this.currentPlayerFlagDesign?.primaryColorId || (this.allFlagColors[0]?.id);
    this._selectedSecondaryColorId = this.currentPlayerFlagDesign?.secondaryColorId || (this.allFlagColors[1]?.id || this.allFlagColors[0]?.id);
    this._selectedPatternId = this.currentPlayerFlagDesign?.patternId || (this.allFlagPatterns[0]?.id);
  }

  _handleSelection(type, id) {
    switch (type) {
      case 'symbol': this._selectedSymbolId = id; break;
      case 'primaryColor': this._selectedPrimaryColorId = id; break;
      case 'secondaryColor': this._selectedSecondaryColorId = id; break;
      case 'pattern': this._selectedPatternId = id; break;
    }
  }

  _calculatePreviewFearFactor() {
    if (!this.allFlagSymbols?.length || !this.allFlagColors?.length || !this.allFlagPatterns?.length) {
      this._currentFearFactor = 0;
      return;
    }
    let fear = 0;
    const symbol = this.allFlagSymbols.find(s => s.id === this._selectedSymbolId);
    const primaryColor = this.allFlagColors.find(c => c.id === this._selectedPrimaryColorId);
    const secondaryColor = this.allFlagColors.find(c => c.id === this._selectedSecondaryColorId);
    const pattern = this.allFlagPatterns.find(p => p.id === this._selectedPatternId);

    if (symbol) fear += (symbol.fearFactorEffect || 0);
    if (primaryColor) fear += (primaryColor.fearFactorEffect || 0);
    if (secondaryColor && this._selectedPrimaryColorId !== this._selectedSecondaryColorId) {
      fear += (secondaryColor.fearFactorEffect || 0);
    }
    if (pattern) fear += (pattern.fearFactorEffect || 0);
    this._currentFearFactor = fear;
  }

  _updateFlagPreview() {
    const previewElement = this.shadowRoot.querySelector('.flag-preview');
    if (!previewElement) return;

    const primaryColor = this.allFlagColors.find(c => c.id === this._selectedPrimaryColorId);
    // For simplicity, primary color sets the background. Pattern and secondary color can be more complex.
    previewElement.style.setProperty('--preview-bg-color', primaryColor ? primaryColor.hexCode : '#708090');

    // In a real scenario, secondary color and pattern would involve more complex rendering,
    // potentially using the imageUrls for patterns or layering colors.
    // This is a simplified representation.
  }


  _saveChanges() {
    const newFlagDesign = {
      symbolId: this._selectedSymbolId,
      primaryColorId: this._selectedPrimaryColorId,
      secondaryColorId: this._selectedSecondaryColorId,
      patternId: this._selectedPatternId,
    };
    this.dispatchEvent(new CustomEvent('update-player-flag', {
      detail: { flagDesign: newFlagDesign },
      bubbles: true,
      composed: true,
    }));
    // Optionally, navigate away after save, e.g., back to menu
    this.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'menu' }, bubbles: true, composed: true }));
  }

  _cancelChanges() {
    // Navigate away without saving, e.g., back to menu
    this.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'menu' }, bubbles: true, composed: true }));
  }

  renderSelectionColumn(title, items, selectedId, type, isColor = false) {
    return html`
      <div class="selection-column">
        <h3>${title}</h3>
        <div class="options-grid">
          ${items.map(item => html`
            <div
              class="option-item ${selectedId === item.id ? 'selected' : ''}"
              @click=${() => this._handleSelection(type, item.id)}
              title=${item.name + (item.fearFactorEffect ? ` (Fear: ${item.fearFactorEffect})` : '')}
            >
              ${isColor
                ? html`<div class="color-swatch" style="background-color: ${item.hexCode};"></div>`
                : html`<img src="${item.imageUrl || 'assets/images/placeholder_icon.png'}" alt="${item.name}">`}
              <span>${item.name}</span>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  render() {
    const selectedSymbol = this.allFlagSymbols.find(s => s.id === this._selectedSymbolId);
    const selectedPattern = this.allFlagPatterns.find(p => p.id === this._selectedPatternId);

    return html`
      <div class="title">${msg('Customize Your Pirate Flag', {id: 'flag-customize-title'})}</div>
      <div class="customization-area">
        ${this.renderSelectionColumn(msg('Symbols', {id: 'flag-symbols-title'}), this.allFlagSymbols, this._selectedSymbolId, 'symbol')}
        ${this.renderSelectionColumn(msg('Primary Colors', {id: 'flag-primary-colors-title'}), this.allFlagColors, this._selectedPrimaryColorId, 'primaryColor', true)}
        ${this.renderSelectionColumn(msg('Secondary Colors', {id: 'flag-secondary-colors-title'}), this.allFlagColors, this._selectedSecondaryColorId, 'secondaryColor', true)}
        ${this.renderSelectionColumn(msg('Patterns', {id: 'flag-patterns-title'}), this.allFlagPatterns, this._selectedPatternId, 'pattern')}
      </div>

      <div class="preview-section">
        <h3>${msg('Flag Preview', {id: 'flag-preview-title'})}</h3>
        <div class="flag-preview">
          ${selectedPattern?.imageUrl ? html`<div class="flag-preview-pattern" style="background-image: url('${selectedPattern.imageUrl}');"></div>` : ''}
          ${selectedSymbol?.imageUrl ? html`<img class="flag-preview-symbol" src="${selectedSymbol.imageUrl}" alt="Selected Symbol">` : ''}
        </div>
        <div class="fear-factor-display">
          ${msg('Calculated Fear Factor:', {id: 'flag-fear-factor-label'})} <span class="fear-factor-value">${this._currentFearFactor}</span>
        </div>
      </div>

      <div class="actions">
        <button @click=${this._saveChanges}>${msg('Hoist the Colors! (Save)', {id: 'flag-save-button'})}</button>
        <button @click=${this._cancelChanges}>${msg('Back to Port (Cancel)', {id: 'flag-cancel-button'})}</button>
      </div>
    `;
  }
}
customElements.define('flag-customization-view', FlagCustomizationView);
