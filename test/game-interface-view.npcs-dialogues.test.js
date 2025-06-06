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
    this.playerStats = {}; // Added for conditional dialogs
    this.gameState = {}; // Added for conditional dialogs & effects
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

  clearDispatchedEvents() { // Added this method
    this.dispatchedEvents = [];
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
        let rawNode = { ...dialogueTree[startNodeId] }; // Clone to avoid modifying original mock

        // Simulate the filtering that npc-dialog-overlay would do
        if (rawNode.playerChoices) {
            rawNode.playerChoices = rawNode.playerChoices.filter(choice => this._isChoiceAvailable(choice));
        }
        this._currentDialogueNode = rawNode;

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

  // Duplicating _isChoiceAvailable from npc-dialog-overlay for mock simulation
  _isChoiceAvailable(choice) {
    if (!choice.condition) {
      return true;
    }
    const { type, stat, variable, value, operator = '===' } = choice.condition;
    let conditionMet = false;
    switch (type) {
      case 'playerStat':
        if (this.playerStats && typeof this.playerStats[stat] !== 'undefined') {
          const statValue = this.playerStats[stat];
          switch (operator) {
            case '===': conditionMet = statValue === value; break;
            case '>=': conditionMet = statValue >= value; break;
            case '<=': conditionMet = statValue <= value; break;
            case '>': conditionMet = statValue > value; break;
            case '<': conditionMet = statValue < value; break;
            case '!==': conditionMet = statValue !== value; break;
            default: console.warn(`Unsupported operator: ${operator}`);
          }
        }
        break;
      case 'gameState':
        if (this.gameState && typeof this.gameState[variable] !== 'undefined') {
          const stateValue = this.gameState[variable];
           switch (operator) {
            case '===': conditionMet = stateValue === value; break;
            case '!==': conditionMet = stateValue !== value; break;
            default: console.warn(`Unsupported operator for gameState: ${operator}`);
          }
        }
        break;
      default:
        console.warn(`Unknown condition type: ${type}`);
        return false;
    }
    return conditionMet;
  }

  _handlePlayerChoice(choice) { // This method processes the choice object
    if (!this._activeDialogueNpcId || !this.allDialogues) { console.error("Dialogue not active or data missing."); return; }

    // Simulate effect dispatching (from npc-dialog-overlay's _handleChoiceClick)
    if (choice.effects) {
      choice.effects.forEach(effect => {
        if (effect.type === 'updatePlayerStat') {
          this.dispatchEvent(new CustomEvent('update-player-stat', {
            detail: { stat: effect.stat, change: effect.change, value: effect.value },
            bubbles: true, composed: true
          }));
        } else if (effect.type === 'setGameState') {
          this.dispatchEvent(new CustomEvent('set-game-state', {
            detail: { variable: effect.variable, value: effect.value },
            bubbles: true, composed: true
          }));
        } else if (effect.type === 'gameEvent') {
          this.dispatchEvent(new CustomEvent('game-event', {
            detail: { eventName: effect.eventName, detail: effect.detail },
            bubbles: true, composed: true
          }));
        }
      });
    }

    if (choice.nextNodeId === "END") {
      this._endDialogue();
    } else {
      const dialogueTree = this.allDialogues[this._activeDialogueNpcId];
      const nextNodeRaw = dialogueTree ? dialogueTree[choice.nextNodeId] : null;
      if (nextNodeRaw) {
        this._currentDialogueNodeId = choice.nextNodeId;
        let rawNode = { ...nextNodeRaw }; // Clone
        if (rawNode.playerChoices) {
            rawNode.playerChoices = rawNode.playerChoices.filter(c => this._isChoiceAvailable(c));
        }
        this._currentDialogueNode = rawNode;

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
  // This part tests that _handleNpcClick sets up the state correctly for the dialog overlay to appear.
  view.setLocationData({ id: "loc_for_npc1_dialogue", name: "Pirate Cove", npcIds: ["npc1"] });
  view._handleNpcClick("npc1"); // This could be from a text list click or an in-scene NPC click
  assertEqual(view._activeDialogueNpcId, "npc1", "Test 2.1: Active NPC ID set (condition for overlay)");
  assertEqual(view._currentDialogueNodeId, "start", "Test 2.2: Current node ID set (condition for overlay)");
  assertNotNull(view._currentDialogueNode, "Test 2.3: Current dialogue node set (condition for overlay)");
  if (view._currentDialogueNode) {
    assertEqual(view._currentDialogueNode.npcText, "Arr, matey!", "Test 2.4: Correct NPC text for start node");
  }

  // --- Test dialogue progression (via _handlePlayerChoiceEvent) ---
  assertTrue(view._currentDialogueNode && view._currentDialogueNode.playerChoices.length > 0, "Test 3.1: Start node has choices");
  if (view._currentDialogueNode && view._currentDialogueNode.playerChoices.length > 0) {
    const choice1 = view._currentDialogueNode.playerChoices[0];
    view._handlePlayerChoiceEvent({ detail: { choice: choice1 } });

    assertEqual(view._currentDialogueNodeId, "greet_reply", "Test 3.2: Dialogue advances to next node ID via event");
    assertNotNull(view._currentDialogueNode, "Test 3.3: Current node updated via event");
    if(view._currentDialogueNode) {
      assertEqual(view._currentDialogueNode.npcText, "Ahoy!", "Test 3.4: Correct NPC text for new node via event");
    }

    assertTrue(view._currentDialogueNode && view._currentDialogueNode.playerChoices.length > 0, "Test 3.5: greet_reply node has choices");
     if (view._currentDialogueNode && view._currentDialogueNode.playerChoices.length > 0) { // Guarding access
        const choice2 = view._currentDialogueNode.playerChoices[0];
        view._handlePlayerChoiceEvent({ detail: { choice: choice2 } }); // Simulate event for 'END' choice

        assertNull(view._activeDialogueNpcId, "Test 3.6: Active NPC ID null after END choice via event");
        assertNull(view._currentDialogueNodeId, "Test 3.7: Current node ID null after END choice via event");
        assertNull(view._currentDialogueNode, "Test 3.8: Current node null after END choice via event");
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

  // Test 7: Clicking Non-Existent/Non-Rendered In-Scene NPC (These tests are about _simulateInSceneNpcClick, not dialogue progression)
  // These remain valid as they test the conditions for *initiating* a dialogue via in-scene click.
  view.setLocationData({ id: "loc_scene_for_bad_click", name: "Bad Click Test Scene", npcIds: ["npc2"] });
  view.setAllNpcs(new Map([["npc2", npc2], ["npc3NoPos", npc3NoPos]]));
  view._endDialogue(); // Reset dialogue state

  let clickHandled = view._simulateInSceneNpcClick("npc3NoPos");
  assertTrue(!clickHandled, "Test 7.1: _simulateInSceneNpcClick returns false for NPC not rendered (no position)");
  assertNull(view._activeDialogueNpcId, "Test 7.2: Dialogue not initiated for non-rendered NPC (no position)");

  clickHandled = view._simulateInSceneNpcClick("non_existent_npc_id");
  assertTrue(!clickHandled, "Test 7.3: _simulateInSceneNpcClick returns false for NPC not in allNpcs");
  assertNull(view._activeDialogueNpcId, "Test 7.4: Dialogue not initiated for non-existent NPC ID");

  view.setLocationData({ id: "loc_market_for_click_test", name: "Market Click Test", npcIds: ["npc1"], isMarket: true });
  view.setAllNpcs(new Map([["npc1", npc1]]));
  view._endDialogue(); // Reset dialogue state
  clickHandled = view._simulateInSceneNpcClick("npc1");
  assertTrue(!clickHandled, "Test 7.5: _simulateInSceneNpcClick returns false for NPC in market location");
  assertNull(view._activeDialogueNpcId, "Test 7.6: Dialogue not initiated for NPC in market location via in-scene click");

  // Test 8: Dialogue dismissal (simulating event with no choice from overlay)
  console.log("--- Starting Test 8: Dialogue Dismissal ---");
  view.setLocationData({ id: "loc_for_dismiss_test", name: "Dismiss Test Location", npcIds: ["npc1"] });
  view.setAllNpcs(new Map([["npc1", npc1]]));
  view.setAllDialogues({ "npc1": dialogueNpc1 });
  view._handleNpcClick("npc1"); // Start a dialogue
  assertNotNull(view._currentDialogueNode, "Test 8.1: Dialogue should be active before dismissal");

  view._handlePlayerChoiceEvent({ detail: { choice: {} } }); // Simulate event with empty choice (dismissal)

  assertNull(view._activeDialogueNpcId, "Test 8.2: Active NPC ID null after dismissal event");
  assertNull(view._currentDialogueNodeId, "Test 8.3: Current node ID null after dismissal event");
  assertNull(view._currentDialogueNode, "Test 8.4: Current node null after dismissal event");

  // --- Test 9: NPC Re-engagement ---
  console.log("--- Starting Test 9: NPC Re-engagement ---");
  view = new MockGameInterfaceViewForDialogues(); // Fresh view for re-engagement tests
  view.setAllNpcs(new Map([["npc1", npc1]]));
  view.setAllDialogues({ "npc1": dialogueNpc1 });
  view.setLocationData({ id: "loc_re_engage", name: "Re-engagement Place", npcIds: ["npc1"] });

  // Scenario 9.1: Re-engage after completing a dialogue
  console.log("--- Scenario 9.1: Re-engage after completion ---");
  view._handleNpcClick("npc1"); // First interaction
  assertNotNull(view._currentDialogueNode, "Test 9.1.1: Dialogue active after first click");

  // Complete the dialogue
  let choiceToGreet = view._currentDialogueNode.playerChoices[0];
  view._handlePlayerChoiceEvent({ detail: { choice: choiceToGreet } }); // Hello
  let choiceToEnd = view._currentDialogueNode.playerChoices[0];
  view._handlePlayerChoiceEvent({ detail: { choice: choiceToEnd } }); // Bye (END)

  assertNull(view._currentDialogueNode, "Test 9.1.2: Dialogue ended after completion");

  // Re-engage the same NPC
  view._handleNpcClick("npc1"); // Second interaction with npc1
  assertNotNull(view._currentDialogueNode, "Test 9.1.3: Dialogue re-activated after second click");
  assertEqual(view._activeDialogueNpcId, "npc1", "Test 9.1.4: Active NPC is npc1 on re-engagement");
  assertEqual(view._currentDialogueNodeId, "start", "Test 9.1.5: Dialogue restarts from 'start' node on re-engagement");
  if (view._currentDialogueNode) {
    assertEqual(view._currentDialogueNode.npcText, dialogueNpc1.start.npcText, "Test 9.1.6: Dialogue shows initial text on re-engagement");
  }
  view._endDialogue(); // Clean up

  // Scenario 9.2: Re-engage after dismissing a dialogue mid-way
  console.log("--- Scenario 9.2: Re-engage after dismissal ---");
  view._handleNpcClick("npc1"); // First interaction
  assertNotNull(view._currentDialogueNode, "Test 9.2.1: Dialogue active after first click");

  // Make one choice (not to END)
  if(view._currentDialogueNode && view._currentDialogueNode.playerChoices.length > 0) { // Guarding access
    choiceToGreet = view._currentDialogueNode.playerChoices[0];
    view._handlePlayerChoiceEvent({ detail: { choice: choiceToGreet } }); // Hello
    assertNotNull(view._currentDialogueNode, "Test 9.2.2: Dialogue still active mid-way");
    assertEqual(view._currentDialogueNodeId, "greet_reply", "Test 9.2.3: Dialogue is at 'greet_reply' node");
  } else {
    testsFailed++; results.push("FAIL: Test 9.2 setup error - no choices found on first node for dismissal test.");
  }

  // Simulate dismissal
  view._handlePlayerChoiceEvent({ detail: { choice: {} } }); // Dismiss event with empty choice object
  assertNull(view._currentDialogueNode, "Test 9.2.4: Dialogue ended after dismissal");

  // Re-engage the same NPC
  view._handleNpcClick("npc1"); // Second interaction with npc1
  assertNotNull(view._currentDialogueNode, "Test 9.2.5: Dialogue re-activated after dismissal and re-click");
  assertEqual(view._activeDialogueNpcId, "npc1", "Test 9.2.6: Active NPC is npc1 on re-engagement post-dismissal");
  assertEqual(view._currentDialogueNodeId, "start", "Test 9.2.7: Dialogue restarts from 'start' node post-dismissal");
  if (view._currentDialogueNode) {
    assertEqual(view._currentDialogueNode.npcText, dialogueNpc1.start.npcText, "Test 9.2.8: Dialogue shows initial text post-dismissal");
  }
  view._endDialogue(); // Clean up

  // --- Test 10: Conditional Choices ---
  console.log("--- Starting Test 10: Conditional Choices ---");
  const npcCond = { id: "npc_cond", name: "Conditional Carl", icon: "person", position: { x: "10%", y: "10%" }};
  const dialogueCond = {
    "start": { id: "start", npcText: "State your condition.", playerChoices: [
      { text: "Strong (Str >= 10)", nextNodeId: "s_path", condition: { type: "playerStat", stat: "strength", operator: ">=", value: 10 } },
      { text: "Lucky (isLuckyDay === true)", nextNodeId: "l_path", condition: { type: "gameState", variable: "isLuckyDay", operator: "===", value: true } },
      { text: "Normal", nextNodeId: "n_path" }
    ]},
    "s_path": {id: "s_path", npcText: "You are strong!", playerChoices:[]},
    "l_path": {id: "l_path", npcText: "You are lucky!", playerChoices:[]},
    "n_path": {id: "n_path", npcText: "You are normal.", playerChoices:[]}
  };
  view = new MockGameInterfaceViewForDialogues();
  view.setAllNpcs(new Map([["npc_cond", npcCond]]));
  view.setAllDialogues({ "npc_cond": dialogueCond });
  view.setLocationData({ id: "loc_cond", name: "Conditional Place", npcIds: ["npc_cond"] });

  // Scenario 10.1: Strength condition met
  view.playerStats = { strength: 12 };
  view.gameState = { isLuckyDay: false };
  view._handleNpcClick("npc_cond");
  assertNotNull(view._currentDialogueNode, "Test 10.1.1: Dialogue node loaded for conditional test");
  assertEqual(view._currentDialogueNode.playerChoices.length, 2, "Test 10.1.2: Correct number of choices (Strong, Normal)");
  assertTrue(view._currentDialogueNode.playerChoices.some(c => c.nextNodeId === "s_path"), "Test 10.1.3: 'Strong' choice available");
  assertTrue(view._currentDialogueNode.playerChoices.some(c => c.nextNodeId === "n_path"), "Test 10.1.4: 'Normal' choice available");
  assertTrue(!view._currentDialogueNode.playerChoices.some(c => c.nextNodeId === "l_path"), "Test 10.1.5: 'Lucky' choice NOT available");

  // Scenario 10.2: Lucky condition met
  view.playerStats = { strength: 5 };
  view.gameState = { isLuckyDay: true };
  view._handleNpcClick("npc_cond");
  assertEqual(view._currentDialogueNode.playerChoices.length, 2, "Test 10.2.1: Correct number of choices (Lucky, Normal)");
  assertTrue(view._currentDialogueNode.playerChoices.some(c => c.nextNodeId === "l_path"), "Test 10.2.2: 'Lucky' choice available");
  assertTrue(!view._currentDialogueNode.playerChoices.some(c => c.nextNodeId === "s_path"), "Test 10.2.3: 'Strong' choice NOT available");

  // Scenario 10.3: No conditions met (only normal)
  view.playerStats = { strength: 5 };
  view.gameState = { isLuckyDay: false };
  view._handleNpcClick("npc_cond");
  assertEqual(view._currentDialogueNode.playerChoices.length, 1, "Test 10.3.1: Correct number of choices (Normal only)");
  assertTrue(view._currentDialogueNode.playerChoices.some(c => c.nextNodeId === "n_path"), "Test 10.3.2: Only 'Normal' choice available");

  // --- Test 11: Event Triggering Effects ---
  console.log("--- Starting Test 11: Event Triggering Effects ---");
  const npcEffect = { id: "npc_effect", name: "Effect Eddie", icon: "person", position: { x: "10%", y: "10%" }};
  const dialogueEffect = {
    "start": { id: "start", npcText: "Push the button.", playerChoices: [
      { text: "Push Me", nextNodeId: "END", effects: [
        { type: "updatePlayerStat", stat: "karma", change: 1 },
        { type: "updatePlayerStat", stat: "xp", value: 100 }, // Test direct set
        { type: "setGameState", variable: "buttonPressed", value: true },
        { type: "gameEvent", eventName: "special_button", detail: { power: "extreme" } }
      ]}
    ]}
  };
  view = new MockGameInterfaceViewForDialogues();
  view.setAllNpcs(new Map([["npc_effect", npcEffect]]));
  view.setAllDialogues({ "npc_effect": dialogueEffect });
  view.setLocationData({ id: "loc_effect", name: "Effect Place", npcIds: ["npc_effect"] });
  view.dispatchedEvents = []; // Clear any previous events

  view._handleNpcClick("npc_effect");
  assertNotNull(view._currentDialogueNode, "Test 11.1: Dialogue node loaded for effect test");
  if (view._currentDialogueNode && view._currentDialogueNode.playerChoices && view._currentDialogueNode.playerChoices.length > 0) {
    const effectChoice = view._currentDialogueNode.playerChoices[0];
    view._handlePlayerChoiceEvent({ detail: { choice: effectChoice } }); // Simulate click

    assertEqual(view.dispatchedEvents.length, 4, "Test 11.2: Correct number of events dispatched");

    const updateStatEvent1 = view.dispatchedEvents.find(e => e.type === 'update-player-stat' && e.detail.stat === 'karma');
    assertNotNull(updateStatEvent1, "Test 11.3: 'update-player-stat' for karma dispatched");
    assertDeepEqual(updateStatEvent1.detail, { stat: "karma", change: 1, value: undefined }, "Test 11.4: Correct detail for karma update");

    const updateStatEvent2 = view.dispatchedEvents.find(e => e.type === 'update-player-stat' && e.detail.stat === 'xp');
    assertNotNull(updateStatEvent2, "Test 11.5: 'update-player-stat' for xp dispatched");
    assertDeepEqual(updateStatEvent2.detail, { stat: "xp", value: 100, change: undefined }, "Test 11.6: Correct detail for xp set");

    const setStateEvent = view.dispatchedEvents.find(e => e.type === 'set-game-state');
    assertNotNull(setStateEvent, "Test 11.7: 'set-game-state' event dispatched");
    assertDeepEqual(setStateEvent.detail, { variable: "buttonPressed", value: true }, "Test 11.8: Correct detail for set-game-state");

    const gameEvent = view.dispatchedEvents.find(e => e.type === 'game-event');
    assertNotNull(gameEvent, "Test 11.9: 'game-event' dispatched");
    assertDeepEqual(gameEvent.detail, { eventName: "special_button", detail: { power: "extreme" } }, "Test 11.10: Correct detail for game-event");
  } else {
    testsFailed++; results.push("FAIL: Test 11 setup error - no choices found for effectChoice.");
  }

  // --- Test 12: _handlePuzzleResolved() ---
  console.log("--- Starting Test 12: _handlePuzzleResolved ---");
  view = new MockGameInterfaceViewForDialogues(); // Fresh view
  const mockNpcId = "npc_puzzle_giver";
  view.allDialogues = {
    [mockNpcId]: {
      "puzzle_success_node": { id: "puzzle_success_node", npcText: "You solved it!", playerChoices: [] },
      "puzzle_failure_node": { id: "puzzle_failure_node", npcText: "You failed!", playerChoices: [] },
      "puzzle_skip_node": { id: "puzzle_skip_node", npcText: "Skipped.", playerChoices: [] }
    }
  };

  // Add _handlePuzzleResolved to the mock (based on the real implementation from game-interface-view.js)
  view._handlePuzzleResolved = function(event) {
      const { puzzle, outcome } = event.detail;
      let nextNodeId = null;
      let effectsToApply = null;
      switch (outcome) {
          case 'success': nextNodeId = puzzle.successDialogNodeId; effectsToApply = puzzle.successEffects; break;
          case 'failure': nextNodeId = puzzle.failureDialogNodeId; effectsToApply = puzzle.failureEffects; break;
          case 'skipped': nextNodeId = puzzle.skipDialogNodeId || puzzle.failureDialogNodeId; break;
      }
      if (effectsToApply) {
          effectsToApply.forEach(effect => {
              if (effect.type === 'SET_GAME_STATE') this.dispatchEvent(new CustomEvent('set-game-state', { detail: { variable: effect.variable, value: effect.value }, bubbles:true, composed:true }));
              else if (effect.type === 'UPDATE_PLAYER_STAT') this.dispatchEvent(new CustomEvent('update-resources', { detail: { [effect.stat]: effect.change || effect.value }, bubbles:true, composed:true }));
              else if (effect.type === 'ADD_ITEM') this.dispatchEvent(new CustomEvent('add-to-inventory', { detail: { item: { id: effect.itemId } }, bubbles:true, composed:true})); // Simulating item object for app-shell
              else if (effect.type === 'REMOVE_ITEM') this.dispatchEvent(new CustomEvent('remove-from-inventory', { detail: { itemId: effect.itemId }, bubbles:true, composed:true}));
          });
      }
      if (nextNodeId && this._activeDialogueNpcId) this._handlePlayerChoice({ nextNodeId: nextNodeId });
      else if (!nextNodeId) this._endDialogue();
      this.requestUpdate();
  };

  view._activeDialogueNpcId = mockNpcId;

  const mockPuzzleData = {
    id: "TEST_PUZZLE_001",
    description: "A test puzzle for game-interface-view.",
    successDialogNodeId: "puzzle_success_node",
    failureDialogNodeId: "puzzle_failure_node",
    skipDialogNodeId: "puzzle_skip_node",
    successEffects: [{ type: "SET_GAME_STATE", variable: "testPuzzleSolved", value: true }],
    failureEffects: [{ type: "UPDATE_PLAYER_STAT", stat: "karma", change: -1 }]
  };

  // Test 12.1: Success outcome
  view.clearDispatchedEvents();
  view._handlePuzzleResolved({ detail: { puzzle: mockPuzzleData, outcome: 'success' } });
  assertEqual(view._currentDialogueNodeId, "puzzle_success_node", "Test 12.1.1: Dialog advances to successDialogNodeId.");
  let dispatchedSetStateEvent = view.dispatchedEvents.find(e => e.type === 'set-game-state');
  assertNotNull(dispatchedSetStateEvent, "Test 12.1.2: SET_GAME_STATE effect processed for success.");
  if(dispatchedSetStateEvent) {
    assertDeepEqual(dispatchedSetStateEvent.detail, { variable: "testPuzzleSolved", value: true }, "Test 12.1.3: Correct detail for SET_GAME_STATE.");
  }
  view._endDialogue();

  // Test 12.2: Failure outcome
  view._activeDialogueNpcId = mockNpcId;
  view.clearDispatchedEvents();
  view._handlePuzzleResolved({ detail: { puzzle: mockPuzzleData, outcome: 'failure' } });
  assertEqual(view._currentDialogueNodeId, "puzzle_failure_node", "Test 12.2.1: Dialog advances to failureDialogNodeId.");
  let dispatchedUpdateStatEvent = view.dispatchedEvents.find(e => e.type === 'update-resources');
  assertNotNull(dispatchedUpdateStatEvent, "Test 12.2.2: UPDATE_PLAYER_STAT effect processed for failure (via update-resources).");
   if(dispatchedUpdateStatEvent) {
    assertDeepEqual(dispatchedUpdateStatEvent.detail, { "karma": -1 }, "Test 12.2.3: Correct detail for UPDATE_PLAYER_STAT.");
  }
  view._endDialogue();

  // Test 12.3: Skipped outcome
  view._activeDialogueNpcId = mockNpcId;
  view.clearDispatchedEvents();
  view._handlePuzzleResolved({ detail: { puzzle: mockPuzzleData, outcome: 'skipped' } });
  assertEqual(view._currentDialogueNodeId, "puzzle_skip_node", "Test 12.3.1: Dialog advances to skipDialogNodeId.");
  assertEqual(view.dispatchedEvents.length, 0, "Test 12.3.2: No effects processed for skip (as per mockPuzzleData).");
  view._endDialogue();

  // --- Test 13: Dialog Choice Triggering Puzzle ---
  // This test verifies that _handlePlayerChoice (which simulates part of npc-dialog-overlay's effect processing)
  // correctly dispatches 'trigger-puzzle' if such an effect is present.
  console.log("--- Starting Test 13: Dialog Choice Triggering Puzzle ---");
  view = new MockGameInterfaceViewForDialogues();
  const puzzleTriggerNpcId = "npc_puzzle_triggerer";
  const puzzleIdToTrigger = "PUZZLE_XYZ";
  view.allDialogues = {
    [puzzleTriggerNpcId]: {
      "start_node": {
        id: "start_node",
        npcText: "Want to try a puzzle?",
        playerChoices: [
          { text: "Yes!", nextNodeId: null, effects: [{ type: "TRIGGER_PUZZLE", puzzleId: puzzleIdToTrigger }] },
          { text: "No.", nextNodeId: "END" }
        ]
      }
    }
  };
  view._activeDialogueNpcId = puzzleTriggerNpcId;
  view._currentDialogueNodeId = "start_node";
  view._currentDialogueNode = view.allDialogues[puzzleTriggerNpcId]["start_node"];
  view.playerStats = {};
  view.gameState = {};

  view.clearDispatchedEvents();

  const puzzleTriggerChoice = view._currentDialogueNode.playerChoices[0];
  view._handlePlayerChoice(puzzleTriggerChoice);

  const triggerPuzzleEvent = view.dispatchedEvents.find(e => e.type === 'trigger-puzzle');
  assertNotNull(triggerPuzzleEvent, "Test 13.1: 'trigger-puzzle' event dispatched by mock effect handler.");
  if (triggerPuzzleEvent) {
    assertEqual(triggerPuzzleEvent.detail.puzzleId, puzzleIdToTrigger, "Test 13.2: Correct puzzleId in 'trigger-puzzle' event.");
  }
  // Check that the dialog state is ended/paused because the choice was a puzzle trigger
  // In the mock, _handlePlayerChoice calls _endDialogue if nextNodeId is null.
  assertNull(view._currentDialogueNodeId, "Test 13.3: Dialogue node ID should be null as dialog ends/pauses for puzzle trigger.");
  view._endDialogue();

  console.log(`--- ${testSuiteName} ---`);
  if (results.length > 0) { results.forEach(r => console.log(r)); }
  console.log(`Total Tests: ${testsPassed + testsFailed}, Passed: ${testsPassed}, Failed: ${testsFailed}`);
  
  if (typeof window !== 'undefined') {
    window.allTestsPassed = (window.allTestsPassed === undefined ? true : window.allTestsPassed) && (testsFailed === 0);
  }
  return testsFailed === 0;
}

// Method inside MockGameInterfaceViewForDialogues to handle player choice events
MockGameInterfaceViewForDialogues.prototype._handlePlayerChoiceEvent = function({ detail: { choice } }) {
  // If no choice is provided (e.g., dialog dismissed by scrim click or escape), end dialogue.
  // Also check if choice is an empty object, as that's how we're simulating dismissal now.
  if (!choice || Object.keys(choice).length === 0) {
    this._endDialogue();
    return;
  }
  this._handlePlayerChoice(choice); // Call the internal processing method
};


if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testNpcDialogueInteractions, MockGameInterfaceViewForDialogues };
} else if (typeof window !== 'undefined') {
  window.testNpcDialogueInteractions = testNpcDialogueInteractions;
  window.MockGameInterfaceViewForDialogues = MockGameInterfaceViewForDialogues;
}
// --- Test 10: Conditional Choices ---
// (This section will be added by the replace operation below the existing function)
// --- Test 11: Event Triggering Effects ---
// (This section will be added by the replace operation below the existing function)
