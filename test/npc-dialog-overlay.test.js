// --- npc-dialog-overlay.test.js ---
import '../www/src/npc-dialog-overlay.js'; // Ensure the component is defined

let testsPassed = 0;
let testsFailed = 0;
const results = [];

// --- Assertion Helpers (copied from other test files) ---
function assertEqual(actual, expected, message) {
    if (actual === expected || (Number.isNaN(actual) && Number.isNaN(expected))) { testsPassed++; }
    else if (typeof actual === 'object' && typeof expected === 'object' && actual !== null && expected !== null) {
        if (JSON.stringify(actual) === JSON.stringify(expected)) { testsPassed++; }
        else { testsFailed++; results.push(`FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`); }
    } else { testsFailed++; results.push(`FAIL: ${message} (Expected: ${expected}, Got: ${actual})`); }
}
function assertDeepEqual(actual, expected, message) { // Alias for object comparison
    if (JSON.stringify(actual) === JSON.stringify(expected)) { testsPassed++; }
    else { testsFailed++; results.push(`FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`); }
}
function assertTrue(condition, message) {
    if (condition) { testsPassed++; }
    else { testsFailed++; results.push(`FAIL: ${message} (Expected true, Got false)`); }
}
function assertFalse(condition, message) {
    if (!condition) { testsPassed++; }
    else { testsFailed++; results.push(`FAIL: ${message} (Expected false, Got true)`); }
}
function assertNotNull(value, message) {
    if (value !== null && value !== undefined) { testsPassed++; }
    else { testsFailed++; results.push(`FAIL: ${message} (Expected not null/undefined, Got ${value})`); }
}
function assertNull(value, message) {
    if (value === null || value === undefined) { testsPassed++; }
    else { testsFailed++; results.push(`FAIL: ${message} (Expected null/undefined, Got ${value})`); }
}
function assertMatch(actual, expectedPattern, message) {
    if (typeof actual === 'string' && actual.includes(expectedPattern)) { testsPassed++; }
    else { testsFailed++; results.push(`FAIL: ${message} (Expected string containing: "${expectedPattern}", Got: "${actual}")`); }
}
function assertGreaterThan(actual, expected, message) {
    if (actual > expected) { testsPassed++; }
    else { testsFailed++; results.push(`FAIL: ${message} (Expected > ${expected}, Got ${actual})`); }
}

// --- Test Setup ---
const mockNpcDetails = {
  name: "Captain Testy",
  portraitImage: "../www/assets/images/portraits/one_eyed_jack_portrait.png", // A known image path
};

const mockDialogueNode = {
  npcText: "Arr, this be a test dialogue!",
  playerChoices: [
    { text: "Choice 1: Proceed", nextNodeId: "node2" },
    { text: "Choice 2: End It", nextNodeId: "END" },
    { text: "Choice 3: No Next ID", action: "some_action" } // No nextNodeId, implies END
  ],
};

const mockNpcDetailsNoPortrait = {
  name: "Plain Pete",
};

async function setupElement(properties = {}) {
  const element = document.createElement('npc-dialog-overlay');
  element.npcDetails = properties.npcDetails || mockNpcDetails;
  element.dialogueNode = properties.dialogueNode || mockDialogueNode;
  element.open = properties.open || false;
  document.body.appendChild(element);
  await element.updateComplete; // Wait for LitElement to render
  return element;
}

function teardownElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

// Helper to wait for next update cycle
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));


// --- Test Cases ---
async function testNpcDialogOverlay() {
  testsPassed = 0;
  testsFailed = 0;
  results.length = 0;
  const testSuiteName = "NpcDialogOverlay Component Tests";
  let element;

  // Test 1: Basic Rendering
  try {
    element = await setupElement();
    const dialog = element.shadowRoot.querySelector('md-dialog');
    assertNotNull(dialog, "Test 1.1: md-dialog element should exist in shadow DOM");

    const headline = dialog.querySelector('[slot="headline"]');
    assertNotNull(headline, "Test 1.2: Headline slot should be present");
    if(headline) assertMatch(headline.textContent, mockNpcDetails.name, "Test 1.3: NPC name should be in headline");

    const portraitImg = element.shadowRoot.querySelector('.portrait img');
    assertNotNull(portraitImg, "Test 1.4: Portrait image should render when URL provided");
    if(portraitImg) assertTrue(portraitImg.src.includes(mockNpcDetails.portraitImage), "Test 1.5: Portrait src should match");

    const npcTextDiv = element.shadowRoot.querySelector('.npc-text');
    assertNotNull(npcTextDiv, "Test 1.6: NPC text container should exist");
    if(npcTextDiv) assertMatch(npcTextDiv.textContent, mockDialogueNode.npcText, "Test 1.7: NPC text should be rendered");

    const choiceButtons = element.shadowRoot.querySelectorAll('[slot="actions"] md-text-button');
    assertEqual(choiceButtons.length, mockDialogueNode.playerChoices.length, "Test 1.8: Correct number of player choice buttons rendered");
    if (choiceButtons.length > 0) {
      assertMatch(choiceButtons[0].textContent, mockDialogueNode.playerChoices[0].text, "Test 1.9: First choice button text is correct");
    }
  } catch (e) {
    testsFailed++; results.push(`FAIL: Test 1.x Basic Rendering - Unexpected error: ${e.message}`);
    console.error(e);
  } finally {
    teardownElement(element);
  }

  // Test 2: Rendering without portrait
  try {
    element = await setupElement({ npcDetails: mockNpcDetailsNoPortrait });
    const portraitImgNo = element.shadowRoot.querySelector('.portrait img');
    assertNull(portraitImgNo, "Test 2.1: Portrait image should NOT render if URL not provided");
  } catch (e) {
    testsFailed++; results.push(`FAIL: Test 2.1 No Portrait - Unexpected error: ${e.message}`);
  } finally {
    teardownElement(element);
  }

  // Test 3: Open/Close behavior (programmatic)
  try {
    element = await setupElement({ open: false });
    const dialog = element.shadowRoot.querySelector('md-dialog');

    // Spy on dialog methods
    let showCalled = false;
    let closeCalled = false;
    dialog.show = () => { showCalled = true; dialog.open = true; }; // Mock show
    dialog.close = (val) => { closeCalled = true; dialog.returnValue = val; dialog.open = false; dialog.dispatchEvent(new Event('closed')); }; // Mock close

    element.open = true;
    await element.updateComplete;
    await nextFrame(); // allow microtasks for show() call in updated()

    assertTrue(showCalled, "Test 3.1: md-dialog.show() should be called when 'open' property becomes true");
    assertTrue(dialog.open, "Test 3.2: md-dialog's open state should be true after show()");

    element.open = false;
    await element.updateComplete;
    await nextFrame();
    // Note: Programmatic change of `open` to `false` in `npc-dialog-overlay` doesn't directly call `dialog.close()`.
    // The `md-dialog` itself might close, or it relies on not being rendered.
    // The important part is that the component's `open` state is false.
    assertFalse(element.open, "Test 3.3: Component's 'open' property is false");
    // We are not testing here if dialog.close() is called when element.open is set to false,
    // because the element might just be removed from DOM by its parent.
    // The dialog.close() is tested via button clicks.

  } catch (e) {
    testsFailed++; results.push(`FAIL: Test 3.x Open/Close - Unexpected error: ${e.message}`);
    console.error(e);
  } finally {
    teardownElement(element);
  }

  // Test 4: Event Dispatching on player choice
  try {
    element = await setupElement({ open: true }); // Start with dialog open
    const dialog = element.shadowRoot.querySelector('md-dialog');

    // Mock dialog.close to simulate its behavior accurately for the event test
    let capturedCloseValue;
    dialog.close = (value) => {
        dialog.returnValue = value; // Set returnValue before dispatching 'closed'
        dialog.open = false; // Simulate it closing
        // Dispatch 'closed' event on the next microtask to mimic real behavior
        Promise.resolve().then(() => {
            dialog.dispatchEvent(new Event('closed'));
        });
    };

    let eventDetail = null;
    element.addEventListener('player-choice-selected', (e) => {
      eventDetail = e.detail;
    });

    const firstChoiceButton = element.shadowRoot.querySelectorAll('[slot="actions"] md-text-button')[0];
    assertNotNull(firstChoiceButton, "Test 4.1: First choice button must exist for click simulation");

    firstChoiceButton.click(); // Simulate click

    // Wait for the 'closed' event to be processed and 'player-choice-selected' to be dispatched
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for microtasks & setTimeout queue

    assertNotNull(eventDetail, "Test 4.2: player-choice-selected event should be dispatched");
    if (eventDetail) {
      assertDeepEqual(eventDetail.choice, mockDialogueNode.playerChoices[0], "Test 4.3: Event detail should contain correct choice object");
    }
    assertFalse(element.open, "Test 4.4: Component 'open' property should be false after choice and dialog closes");

    // Test choice without nextNodeId (should default to 'END')
    element.dialogueNode = { ...mockDialogueNode, playerChoices: [mockDialogueNode.playerChoices[2]] };
    element.open = true; // Reopen
    await element.updateComplete;
    eventDetail = null; // Reset

    const thirdChoiceButton = element.shadowRoot.querySelector('[slot="actions"] md-text-button');
    assertNotNull(thirdChoiceButton, "Test 4.5: Third choice button must exist");
    thirdChoiceButton.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    assertNotNull(eventDetail, "Test 4.6: player-choice-selected event dispatched for choice with no nextNodeId");
    if (eventDetail) {
      assertDeepEqual(eventDetail.choice, mockDialogueNode.playerChoices[2], "Test 4.7: Event detail correct for choice with no nextNodeId");
    }

  } catch (e) {
    testsFailed++; results.push(`FAIL: Test 4.x Event Dispatching - Unexpected error: ${e.message} ${e.stack}`);
    console.error(e);
  } finally {
    teardownElement(element);
  }


  console.log(`--- ${testSuiteName} ---`);
  if (results.length > 0) { results.forEach(r => console.log(r)); }
  console.log(`Total Tests: ${testsPassed + testsFailed}, Passed: ${testsPassed}, Failed: ${testsFailed}`);

  if (typeof window !== 'undefined') {
    window.allTestsPassed = (window.allTestsPassed === undefined ? true : window.allTestsPassed) && (testsFailed === 0);
  }
  return testsFailed === 0;
}

// Run tests if in browser-like environment
if (typeof window !== 'undefined') {
  // Call the test function
  // testNpcDialogOverlay(); // This will be called by the main test runner
}

// Export for potential runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testNpcDialogOverlay };
} else if (typeof window !== 'undefined') {
  window.testNpcDialogOverlay = testNpcDialogOverlay;
}
