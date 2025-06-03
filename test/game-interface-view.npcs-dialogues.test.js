// --- game-interface-view.npcs-dialogues.test.js (Conceptual) ---

let testsPassed = 0;
let testsFailed = 0;
const results = [];

function assertEqual(actual, expected, message) {
    if (actual === expected || (Number.isNaN(actual) && Number.isNaN(expected))) { testsPassed++; }
    else if (typeof actual === 'object' && typeof expected === 'object' && actual !== null && expected !== null) {
        if (JSON.stringify(actual) === JSON.stringify(expected)) { testsPassed++; }
        else { testsFailed++; results.push(`FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`); }
    } else { testsFailed++; results.push(`FAIL: ${message} (Expected: ${expected}, Got: ${actual})`); }
}
function assertDeepEqual(actual, expected, message) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) { testsPassed++; }
    else { testsFailed++; results.push(`FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`); }
}
function assertTrue(condition, message) {
    if (condition) { testsPassed++; }
    else { testsFailed++; results.push(`FAIL: ${message} (Expected true, Got false)`); }
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


class MockGameInterfaceViewForDialogues {
  constructor() {
    this.locationData = null;
    this.playerInventory = [];
    this.playerResources = { gold: 0, silver: 0, rum: 0 };
    this.allItems = new Map();
    this.allNpcs = new Map();
    this.allDialogues = {};
    this._lastFoundMessage = '';
    this.dispatchedEvents = [];

    this._activeDialogueNpcId = null;
    this._currentDialogueNodeId = null;
    this._currentDialogueNode = null;
    this._renderedInSceneNpcs = []; // For tracking NPCs that would be rendered in scene

    this.dispatchEvent = (event) => { this.dispatchedEvents.push({ type: event.type, detail: event.detail }); };
    this.requestUpdate = () => { /* console.log("MockGameInterfaceView: requestUpdate called for dialogue test"); */ };
  }

  setLocationData(locationData) {
    this.locationData = locationData;
    this._updateRenderedInSceneNpcs();
  }

  setAllNpcs(allNpcsMap) {
    this.allNpcs = allNpcsMap;
    this._updateRenderedInSceneNpcs();
  }
  
  setAllDialogues(allDialogues) {
    this.allDialogues = allDialogues;
    // No need to update in-scene NPCs for dialogue changes
  }

  _updateRenderedInSceneNpcs() {
    this._renderedInSceneNpcs = [];
    if (this.locationData && !this.locationData.isMarket && this.locationData.npcIds && this.allNpcs) {
      this.locationData.npcIds.forEach(npcId => {
        const npc = this.allNpcs.get(npcId);
        if (npc && npc.position && typeof npc.position.x === 'string' && typeof npc.position.y === 'string') {
          this._renderedInSceneNpcs.push(npc.id);
        }
      });
    }
  }

  _simulateInSceneNpcClick(npcId) {
    if (this._renderedInSceneNpcs.includes(npcId)) {
      this._handleNpcClick(npcId);
      return true; // Click was processed
    }
    // console.log(`Simulated click on NPC ${npcId} ignored as it's not in _renderedInSceneNpcs.`);
    return false; // Click was ignored
  }

  _handleNpcClick(npcId) {
    if (!this.allDialogues || !this.allNpcs) { console.error("Dialogue or NPC data not loaded!"); this._lastFoundMessage = "Data error."; return; }
    const npcDetails = this.allNpcs.get(npcId);
    const dialogueTree = this.allDialogues[npcId];

    if (npcDetails && dialogueTree) {
      this._activeDialogueNpcId = npcId;
      const startNodeId = Object.keys(dialogueTree)[0]; 
      if (dialogueTree[startNodeId]) {
        this._currentDialogueNodeId = startNodeId;
        this._currentDialogueNode = dialogueTree[startNodeId];
      } else { 
        console.error(`No start node found for NPC ${npcId} (tried ${startNodeId})`);
        this._lastFoundMessage = `${npcDetails.name} doesn't seem to want to talk.`;
      }
    } else { 
      console.error(`NPC details or dialogue tree not found for NPC ID: ${npcId}`);
      this._lastFoundMessage = "They have nothing to say.";
    }
    this.requestUpdate();
  }

  _handlePlayerChoice(choice) {
    if (!this._activeDialogueNpcId || !this.allDialogues) { console.error("Dialogue not active or data missing."); return; }
    if (choice.nextNodeId === "END") {
      this._endDialogue();
    } else {
      const dialogueTree = this.allDialogues[this._activeDialogueNpcId];
      const nextNode = dialogueTree ? dialogueTree[choice.nextNodeId] : null;
      if (nextNode) {
        this._currentDialogueNodeId = choice.nextNodeId;
        this._currentDialogueNode = nextNode;
      } else { 
        console.error(`Dialogue node "${choice.nextNodeId}" not found for NPC "${this._activeDialogueNpcId}". Ending dialogue.`);
        this._endDialogue(); 
      }
    }
    this.requestUpdate();
  }

  _endDialogue() {
    this._activeDialogueNpcId = null;
    this._currentDialogueNodeId = null;
    this._currentDialogueNode = null;
    this.requestUpdate();
  }
  
  // This method is being replaced by _updateRenderedInSceneNpcs and direct access to _renderedInSceneNpcs
  // _getRenderedNpcIds() { 
  //   if (this.locationData && this.locationData.npcIds && this.locationData.npcIds.length > 0 && this.allNpcs && this.allNpcs.size > 0) {
  //     return this.locationData.npcIds.filter(npcId => this.allNpcs.has(npcId));
  //   }
  //   return [];
  // }
}


async function testNpcDialogueInteractions() {
  testsPassed = 0; 
  testsFailed = 0;
  results.length = 0;
  const testSuiteName = "GameInterfaceView NPC & Dialogue Interaction Tests";

  const npc1 = { id: "npc1", name: "Pirate Pete", icon: "person", position: { x: "10%", y: "20%" } };
  const npc2 = { id: "npc2", name: "Mystic Mary", icon: "face_3", position: { x: "50%", y: "50%" } };
  const npc3NoPos = { id: "npc3", name: "No Position Nick", icon: "person_off" };
  const dialogueNpc1 = {
    "start": { id: "start", npcText: "Arr, matey!", playerChoices: [{ text: "Hello", nextNodeId: "greet_reply" }] },
    "greet_reply": { id: "greet_reply", npcText: "Ahoy!", playerChoices: [{ text: "Bye", nextNodeId: "END" }] }
  };

  let view = new MockGameInterfaceViewForDialogues();
  const initialNpcs = new Map([["npc1", npc1], ["npc2", npc2], ["npc3NoPos", npc3NoPos]]);
  view.setAllNpcs(initialNpcs);
  view.setAllDialogues({ "npc1": dialogueNpc1 });


  // --- Original Tests (adapted for setters) ---
  view.setLocationData({ id: "loc1", name: "Test Location", npcIds: ["npc1"] });
  // Test 1.1 & 1.2 are now covered by in-scene NPC tests.
  // For simple presence in allNpcs, that's implicit.

  // This test was about the _getRenderedNpcIds (text list), which is slightly different now.
  // Let's keep its spirit for allNpcs general check.
  view.setLocationData({ id: "loc2", name: "Another Location", npcIds: ["npc2", "non_existent_npc"] });
  const presentNpcIdsInLocation = view.locationData.npcIds.filter(id => view.allNpcs.has(id));
  assertEqual(presentNpcIdsInLocation.length, 1, "Test 1.3: Only existing NPCs considered from locationData.npcIds");
  assertTrue(presentNpcIdsInLocation.includes("npc2"), "Test 1.4: NPC2 is considered from locationData.npcIds");
  
  view.setLocationData({ id: "loc3", name: "Empty Location" });
  assertEqual(view._renderedInSceneNpcs.length, 0, "Test 1.5: No in-scene NPCs if locationData.npcIds missing/empty");

  // --- Test _handleNpcClick (dialogue initiation logic) ---
  // This part is testing the original _handleNpcClick, which is fine.
  // Simulate a click via the old way (e.g. text list) for npc1
  view.setLocationData({ id: "loc_for_npc1_dialogue", name: "Pirate Cove", npcIds: ["npc1"] }); // Ensure npc1 is in this location
  view._handleNpcClick("npc1"); // Simulate click from a text list or similar
  assertEqual(view._activeDialogueNpcId, "npc1", "Test 2.1: Active NPC ID set via _handleNpcClick");
  assertEqual(view._currentDialogueNodeId, "start", "Test 2.2: Current node ID set to start via _handleNpcClick");
  assertNotNull(view._currentDialogueNode, "Test 2.3: Current dialogue node set via _handleNpcClick");
  if (view._currentDialogueNode) {
    assertEqual(view._currentDialogueNode.npcText, "Arr, matey!", "Test 2.4: Correct NPC text for start node (via _handleNpcClick)");
  }

  // --- Test dialogue progression (already good) ---
  assertTrue(view._currentDialogueNode && view._currentDialogueNode.playerChoices.length > 0, "Test 3.1: Start node has choices");
  if (view._currentDialogueNode && view._currentDialogueNode.playerChoices.length > 0) {
    view._handlePlayerChoice(view._currentDialogueNode.playerChoices[0]); 
    assertEqual(view._currentDialogueNodeId, "greet_reply", "Test 3.2: Dialogue advances to next node ID");
    assertNotNull(view._currentDialogueNode, "Test 3.3: Current node updated");
    if(view._currentDialogueNode) {
      assertEqual(view._currentDialogueNode.npcText, "Ahoy!", "Test 3.4: Correct NPC text for new node");
    }

    assertTrue(view._currentDialogueNode && view._currentDialogueNode.playerChoices.length > 0, "Test 3.5: greet_reply node has choices");
     if (view._currentDialogueNode && view._currentDialogueNode.playerChoices.length > 0) {
        view._handlePlayerChoice(view._currentDialogueNode.playerChoices[0]); 
        assertNull(view._activeDialogueNpcId, "Test 3.6: Active NPC ID null after END");
        assertNull(view._currentDialogueNodeId, "Test 3.7: Current node ID null after END");
        assertNull(view._currentDialogueNode, "Test 3.8: Current node null after END");
    }
  }
  
  // --- Test NPC with no dialogue (already good) ---
  view = new MockGameInterfaceViewForDialogues(); // Fresh view
  view.setAllNpcs(new Map([["npc2", npc2]])); // npc2 has no dialogue defined in view.allDialogues
  view.setLocationData({ id: "loc_for_npc2_nodialogue", npcIds: ["npc2"] });
  view._handleNpcClick("npc2"); 
  assertNull(view._currentDialogueNode, "Test 4.1: Dialogue node null for NPC with no dialogue tree");
  assertMatch(view._lastFoundMessage, "nothing to say", "Test 4.2: Message for NPC with no dialogue");

  // --- New Tests for In-Scene NPC Rendering and Interaction ---
  console.log("--- Starting New In-Scene NPC Tests ---");
  view = new MockGameInterfaceViewForDialogues(); // Fresh view
  view.setAllNpcs(initialNpcs); // npc1 (pos), npc2 (pos), npc3NoPos
  view.setAllDialogues({ "npc1": dialogueNpc1, "npc2": { "start": {id: "start", npcText: "Mary speaks...", playerChoices:[]}} });

  // Test 5: In-Scene NPC Presence
  view.setLocationData({ id: "loc_scene1", name: "Scene Location 1", npcIds: ["npc1", "npc3NoPos"] });
  assertEqual(view._renderedInSceneNpcs.length, 1, "Test 5.1: Correct number of in-scene NPCs rendered (1 with pos)");
  assertTrue(view._renderedInSceneNpcs.includes("npc1"), "Test 5.2: NPC1 (with position) is in _renderedInSceneNpcs");
  assertTrue(!view._renderedInSceneNpcs.includes("npc3NoPos"), "Test 5.3: NPC3 (no position) is NOT in _renderedInSceneNpcs");

  view.setLocationData({ id: "loc_scene2", name: "Scene Location 2", npcIds: ["npc1", "npc2", "npc3NoPos", "non_existent_npc"] });
  assertEqual(view._renderedInSceneNpcs.length, 2, "Test 5.4: Correct number of in-scene NPCs rendered (2 with pos)");
  assertTrue(view._renderedInSceneNpcs.includes("npc1"), "Test 5.5: NPC1 (with position) is in _renderedInSceneNpcs for loc_scene2");
  assertTrue(view._renderedInSceneNpcs.includes("npc2"), "Test 5.6: NPC2 (with position) is in _renderedInSceneNpcs for loc_scene2");
  assertTrue(!view._renderedInSceneNpcs.includes("npc3NoPos"), "Test 5.7: NPC3 (no position) is still NOT in _renderedInSceneNpcs");
  
  view.setLocationData({ id: "loc_market", name: "Market Location", npcIds: ["npc1", "npc2"], isMarket: true });
  assertEqual(view._renderedInSceneNpcs.length, 0, "Test 5.8: No in-scene NPCs rendered in a market location");

  view.setLocationData({ id: "loc_scene_empty_npcs", name: "Scene Empty NPCs", npcIds: [] });
  assertEqual(view._renderedInSceneNpcs.length, 0, "Test 5.9: No in-scene NPCs rendered if location.npcIds is empty");
  
  // Test 6: Clicking In-Scene NPC
  view.setLocationData({ id: "loc_scene_for_click", name: "Click Test Scene", npcIds: ["npc1", "npc2"] }); // npc1 has dialogue
  view._endDialogue(); // Ensure no prior dialogue state
  
  let clickHandled = view._simulateInSceneNpcClick("npc1");
  assertTrue(clickHandled, "Test 6.1: _simulateInSceneNpcClick returns true for valid in-scene NPC");
  assertEqual(view._activeDialogueNpcId, "npc1", "Test 6.2: Active NPC ID set after in-scene click");
  assertEqual(view._currentDialogueNodeId, "start", "Test 6.3: Current node ID set to start after in-scene click");
  assertNotNull(view._currentDialogueNode, "Test 6.4: Current dialogue node set after in-scene click");
  if (view._currentDialogueNode) {
    assertEqual(view._currentDialogueNode.npcText, "Arr, matey!", "Test 6.5: Correct NPC text from in-scene click");
  }
  view._endDialogue(); 

  // Test 7: Clicking Non-Existent/Non-Rendered In-Scene NPC
  view.setLocationData({ id: "loc_scene_for_bad_click", name: "Bad Click Test Scene", npcIds: ["npc2"] }); // npc2 is present, npc3NoPos is not rendered
  view.setAllNpcs(new Map([["npc2", npc2], ["npc3NoPos", npc3NoPos]])); // Ensure npc3NoPos is in allNpcs but not rendered
  view._endDialogue();

  clickHandled = view._simulateInSceneNpcClick("npc3NoPos"); // npc3NoPos has no position data
  assertTrue(!clickHandled, "Test 7.1: _simulateInSceneNpcClick returns false for NPC not rendered (no position)");
  assertNull(view._activeDialogueNpcId, "Test 7.2: Dialogue not initiated for non-rendered NPC (no position)");

  clickHandled = view._simulateInSceneNpcClick("non_existent_npc_id");
  assertTrue(!clickHandled, "Test 7.3: _simulateInSceneNpcClick returns false for NPC not in allNpcs");
  assertNull(view._activeDialogueNpcId, "Test 7.4: Dialogue not initiated for non-existent NPC ID");

  view.setLocationData({ id: "loc_market_for_click_test", name: "Market Click Test", npcIds: ["npc1"], isMarket: true });
  view.setAllNpcs(new Map([["npc1", npc1]])); // Ensure npc1 is in allNpcs
  view._endDialogue();
  clickHandled = view._simulateInSceneNpcClick("npc1"); // npc1 is in a market, so not "in-scene" rendered
  assertTrue(!clickHandled, "Test 7.5: _simulateInSceneNpcClick returns false for NPC in market location");
  assertNull(view._activeDialogueNpcId, "Test 7.6: Dialogue not initiated for NPC in market location via in-scene click");


  console.log(`--- ${testSuiteName} ---`);
  if (results.length > 0) { results.forEach(r => console.log(r)); }
  console.log(`Total Tests: ${testsPassed + testsFailed}, Passed: ${testsPassed}, Failed: ${testsFailed}`);
  
  if (typeof window !== 'undefined') {
    window.allTestsPassed = (window.allTestsPassed === undefined ? true : window.allTestsPassed) && (testsFailed === 0);
  }
  return testsFailed === 0;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testNpcDialogueInteractions, MockGameInterfaceViewForDialogues };
} else if (typeof window !== 'undefined') {
  window.testNpcDialogueInteractions = testNpcDialogueInteractions;
  window.MockGameInterfaceViewForDialogues = MockGameInterfaceViewForDialogues;
}
