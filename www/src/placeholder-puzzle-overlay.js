import { LitElement, html, css } from 'lit';

class PlaceholderPuzzleOverlay extends LitElement {
  static properties = {
    puzzleId: { type: String },
    description: { type: String },
    open: { type: Boolean, reflect: true },
  };

  static styles = css`
    :host {
      display: none; /* Hidden by default, shown when 'open' is true */
    }

    :host([open]) {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      align-items: center;
      justify-content: center;
      z-index: 1000; /* Ensure it's on top */
    }

    .overlay-content {
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      text-align: center;
      max-width: 500px;
      width: 90%;
      border: 3px dashed #ccc; /* Placeholder indication */
    }

    .description {
      margin-bottom: 25px;
      font-size: 1.1em;
      line-height: 1.6;
    }

    .buttons button {
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      padding: 12px 18px;
      margin: 8px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1em;
      transition: background-color 0.2s;
    }

    .buttons button:hover {
      background-color: #e0e0e0;
    }

    .buttons button.succeed {
      border-color: #4CAF50; /* Greenish */
    }
    .buttons button.succeed:hover {
      background-color: #d0f0d0;
    }

    .buttons button.fail {
      border-color: #F44336; /* Reddish */
    }
    .buttons button.fail:hover {
      background-color: #f0d0d0;
    }
     .buttons button.skip {
      border-color: #FFC107; /* Amber/Yellow */
    }
    .buttons button.skip:hover {
      background-color: #ffe0b2;
    }
  `;

  constructor() {
    super();
    this.puzzleId = '';
    this.description = 'No puzzle description loaded.';
    this.open = false;
  }

  _handleAttempt(outcome) {
    if (!this.puzzleId) {
      console.warn('PlaceholderPuzzleOverlay: puzzleId is not set. Cannot dispatch event.');
      return;
    }
    this.dispatchEvent(
      new CustomEvent('puzzle-attempted', {
        detail: { outcome: outcome, puzzleId: this.puzzleId },
        bubbles: true,
        composed: true,
      })
    );
    this.open = false;
  }

  render() {
    if (!this.open) {
      return html``;
    }

    return html`
      <div class="overlay-content" role="dialog" aria-modal="true" aria-labelledby="puzzle-description">
        <p id="puzzle-description" class="description">${this.description}</p>
        <div class="buttons">
          <button class="succeed" @click=${() => this._handleAttempt('success')}>
            Succeed (Simulated)
          </button>
          <button class="fail" @click=${() => this._handleAttempt('failure')}>
            Fail (Simulated)
          </button>
          <button class="skip" @click=${() => this._handleAttempt('skipped')}>
            Skip Puzzle
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('placeholder-puzzle-overlay', PlaceholderPuzzleOverlay);
