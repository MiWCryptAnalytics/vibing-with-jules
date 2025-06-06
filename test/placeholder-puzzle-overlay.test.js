// --- placeholder-puzzle-overlay.test.js ---
import '../www/src/placeholder-puzzle-overlay.js';

let testsPassed = 0;
let testsFailed = 0;
const results = [];

// --- Basic Test Assertions (can be expanded or imported from a shared util) ---
function assertEqual(actual, expected, message) {
    if (actual === expected) {
        testsPassed++;
    } else {
        testsFailed++;
        results.push(`FAIL: ${message} (Expected: ${expected}, Got: ${actual})`);
    }
}

function assertTrue(condition, message) {
    if (condition) {
        testsPassed++;
    } else {
        testsFailed++;
        results.push(`FAIL: ${message} (Expected true, Got false)`);
    }
}

function assertNotNull(value, message) {
    if (value !== null && value !== undefined) {
        testsPassed++;
    } else {
        testsFailed++;
        results.push(`FAIL: ${message} (Expected not null/undefined, Got ${value})`);
    }
}

// --- Test Suite ---
async function runPlaceholderPuzzleOverlayTests() {
    console.log("--- Starting PlaceholderPuzzleOverlay Tests ---");
    testsPassed = 0;
    testsFailed = 0;
    results.length = 0;

    const container = document.createElement('div');
    document.body.appendChild(container);

    // Test 1: Instantiation and Default Properties
    let puzzleOverlay = document.createElement('placeholder-puzzle-overlay');
    container.appendChild(puzzleOverlay);
    assertNotNull(puzzleOverlay, "Test 1.1: Component should be created.");
    assertEqual(puzzleOverlay.puzzleId, '', "Test 1.2: Default puzzleId should be empty string.");
    assertEqual(puzzleOverlay.description, 'No puzzle description loaded.', "Test 1.3: Default description should be set.");
    assertEqual(puzzleOverlay.open, false, "Test 1.4: Default open state should be false.");
    container.removeChild(puzzleOverlay);

    // Test 2: Property Reflection and Assignment
    puzzleOverlay = document.createElement('placeholder-puzzle-overlay');
    container.appendChild(puzzleOverlay);
    puzzleOverlay.puzzleId = 'RIDDLE_01';
    puzzleOverlay.description = 'A tricky riddle.';
    puzzleOverlay.open = true;
    await puzzleOverlay.updateComplete; // Wait for LitElement to update

    assertEqual(puzzleOverlay.puzzleId, 'RIDDLE_01', "Test 2.1: puzzleId should be set.");
    assertEqual(puzzleOverlay.description, 'A tricky riddle.', "Test 2.2: description should be set.");
    assertEqual(puzzleOverlay.open, true, "Test 2.3: open state should be true.");
    assertTrue(puzzleOverlay.hasAttribute('open'), "Test 2.4: 'open' attribute should be reflected.");

    puzzleOverlay.open = false;
    await puzzleOverlay.updateComplete;
    assertEqual(puzzleOverlay.hasAttribute('open'), false, "Test 2.5: 'open' attribute should be removed when open is false.");
    container.removeChild(puzzleOverlay);

    // Test 3: Button Clicks and Event Dispatching
    const testCases = [
        { buttonClass: '.succeed', expectedOutcome: 'success' },
        { buttonClass: '.fail', expectedOutcome: 'failure' },
        { buttonClass: '.skip', expectedOutcome: 'skipped' }
    ];

    for (const tc of testCases) {
        puzzleOverlay = document.createElement('placeholder-puzzle-overlay');
        container.appendChild(puzzleOverlay);

        const testPuzzleId = 'EVENT_TEST_PUZZLE';
        puzzleOverlay.puzzleId = testPuzzleId;
        puzzleOverlay.description = 'Event dispatch test.';
        puzzleOverlay.open = true;
        await puzzleOverlay.updateComplete;

        let eventDetail = null;
        puzzleOverlay.addEventListener('puzzle-attempted', (e) => {
            eventDetail = e.detail;
        });

        const button = puzzleOverlay.shadowRoot.querySelector(tc.buttonClass);
        assertNotNull(button, `Test 3.x (${tc.expectedOutcome}): Button ${tc.buttonClass} should exist.`);
        if (button) {
            button.click();
            await puzzleOverlay.updateComplete; // Allow event and property changes to process

            assertNotNull(eventDetail, `Test 3.x (${tc.expectedOutcome}): 'puzzle-attempted' event should be dispatched.`);
            if (eventDetail) {
                assertEqual(eventDetail.outcome, tc.expectedOutcome, `Test 3.x (${tc.expectedOutcome}): Event outcome should be correct.`);
                assertEqual(eventDetail.puzzleId, testPuzzleId, `Test 3.x (${tc.expectedOutcome}): Event puzzleId should be correct.`);
            }
            assertEqual(puzzleOverlay.open, false, `Test 3.x (${tc.expectedOutcome}): open state should be false after click.`);
        }
        container.removeChild(puzzleOverlay);
    }

    // --- Final Report ---
    console.log("--- PlaceholderPuzzleOverlay Test Results ---");
    if (results.length > 0) {
        results.forEach(r => console.error(r));
    }
    console.log(`Total Tests: ${testsPassed + testsFailed}, Passed: ${testsPassed}, Failed: ${testsFailed}`);
    document.body.removeChild(container);

    // For overall test runner if used in browser
    if (typeof window !== 'undefined') {
      window.allTestsPassed = (window.allTestsPassed === undefined ? true : window.allTestsPassed) && (testsFailed === 0);
    }
    return testsFailed === 0;
}

// Self-invoking if loaded directly in a browser for testing
// (async () => {
//   if (document.readyState === 'complete' || document.readyState === 'interactive') {
//     await runPlaceholderPuzzleOverlayTests();
//   } else {
//     document.addEventListener('DOMContentLoaded', async () => {
//       await runPlaceholderPuzzleOverlayTests();
//     });
//   }
// })();

// Export for potential test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runPlaceholderPuzzleOverlayTests };
} else if (typeof window !== 'undefined') {
    window.runPlaceholderPuzzleOverlayTests = runPlaceholderPuzzleOverlayTests;
}
