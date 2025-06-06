// --- app-shell.npcs-dialogues.test.js (Conceptual) ---

let testsPassed = 0;
let testsFailed = 0;
const results = []; // Ensure this is accessible or passed into assertions


function assertEqual(actual, expected, message) {
    if (actual === expected || (Number.isNaN(actual) && Number.isNaN(expected))) {
        testsPassed++;
    } else if (typeof actual === 'object' && typeof expected === 'object' && actual !== null && expected !== null) {
        // Simple object check for this context, might need deeper for complex objects if not using assertDeepEqual
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
            testsPassed++;
        } else {
            testsFailed++;
            results.push(`FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
        }
    } else {
      testsFailed++;
      results.push(`FAIL: ${message} (Expected: ${expected}, Got: ${actual})`);
    }
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


class MockAppShellForNpcDialogue {
  constructor() {
    this.allNpcs = new Map();
    this.allDialogues = {};
    this.allPuzzles = new Map(); // Added for puzzles
    this.playerResources = { gold: 0, silver: 0, rum: 0 };
    this.playerInventory = [];
    this.currentView = 'splash';
    this.currentLocationData = null;
    this.allPois = [];
    this.allItems = new Map();
     this._saveGameState = () => {/* console.log("MockAppShell: _saveGameState called"); */};
     this.requestUpdate = () => {/* console.log("MockAppShell: requestUpdate called"); */};
  }

  async _loadAllNpcs() {
    try {
      const response = await fetch('../data/npcs.json'); 
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const npcsArray = await response.json();
      npcsArray.forEach(npc => this.allNpcs.set(npc.id, npc));
    } catch (error) { this.allNpcs = new Map(); console.error("MockAppShell: Error loading NPCs", error); }
  }

  getNpcDetails(npcId) { return this.allNpcs.get(npcId); }

  async _loadAllDialogues() {
    try {
      const response = await fetch('../data/dialogues.json'); 
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      this.allDialogues = await response.json();
    } catch (error) { this.allDialogues = {}; console.error("MockAppShell: Error loading dialogues", error); }
  }

  getDialogueForNpc(npcId) { return this.allDialogues[npcId]; }

  async _loadAllPuzzles() { // Added method
    try {
      const response = await fetch('../data/puzzles.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const puzzlesArray = await response.json();
      puzzlesArray.forEach(puzzle => this.allPuzzles.set(puzzle.id, puzzle));
    } catch (error) { this.allPuzzles = new Map(); console.error("MockAppShell: Error loading puzzles", error); }
  }

  getPuzzleDetails(puzzleId) { return this.allPuzzles.get(puzzleId); } // Added method

  async _initializeGame() { // Simplified for testing specific loaders
    const dataLoadPromises = [
      this._loadAllNpcs(),
      this._loadAllDialogues(),
      this._loadAllPuzzles() // Added puzzle loading
      // Assuming _loadAllPois and _loadAllItems are not essential for these specific tests
      // or would be mocked if their data was needed by NPC/Dialogue logic beyond simple loading.
    ];
    await Promise.all(dataLoadPromises);
  }
}


async function testNpcDialogueDataLoading() {
  // Reset counters for this test suite
  testsPassed = 0; 
  testsFailed = 0;
  results.length = 0; // Clear previous results

  const testSuiteName = "AppShell NPC & Dialogue Data Loading Tests";

  const mockNpcsData = [
    { id: "npc1", name: "Pirate Pete", defaultLocationId: "loc1" },
    { id: "npc2", name: "Mystic Mary", defaultLocationId: "loc2" },
    {
      id: "npc_captain_isabella_moreau",
      name: "Captain Isabella 'Izzy' Moreau",
      description: "A seasoned pirate captain with a hidden agenda. She's witty, resourceful, and fiercely independent. Her backstory involves a personal vendetta against 'The Crimson Marauders'.",
      defaultLocationId: "tortuga_town"
    },
    {
      id: "npc_silas_blackwood",
      name: "Silas 'Silver-Tongue' Blackwood",
      description: "A charismatic but untrustworthy merchant who deals in rare artifacts and information.",
      defaultLocationId: "port_royal_market"
    },
    {
      id: "npc_esmeralda_valdez",
      name: "Esmeralda 'The Seer' Valdez",
      description: "A mysterious fortune teller who lives in a secluded cove. She speaks in riddles and offers cryptic clues about the future.",
      defaultLocationId: "hidden_lagoon"
    }
  ];
  const mockDialoguesData = {
    "npc1": { "start": { "id": "start", "npcText": "Arr!", "playerChoices": [] } },
    "npc2": { "greeting": { "id": "greeting", "npcText": "Welcome.", "playerChoices": [] } },
    "npc_captain_isabella_moreau": {
      "moreau_start": { "id": "moreau_start", "npcText": "Well, well, what have we here? Heard any whispers about 'The Crimson Marauders'?", "playerChoices": [] }
    },
    "npc_silas_blackwood": {
      "silas_start": { "id": "silas_start", "npcText": "Welcome, welcome! Silas Blackwood, at your service. Perhaps in the market for something... unique? Or maybe just some valuable information, perhaps about rare artifacts?", "playerChoices": [] }
    },
    "npc_esmeralda_valdez": {
      "esmeralda_start": { "id": "esmeralda_start", "npcText": "The tides have brought you to my shore, seeker. I am a fortune teller; I speak in riddles of the future.", "playerChoices": [] }
    }
  };
  const mockPuzzlesData = [ // Added mock puzzles
    { id: "PUZZLE1", puzzle_type: "RIDDLE", description: "Riddle me this." },
    { id: "PUZZLE2", puzzle_type: "CIPHER", description: "Decode that." }
  ];

  const originalFetch = window.fetch;
  window.fetch = async (url) => {
    if (url.includes('npcs.json')) {
      return { ok: true, json: async () => JSON.parse(JSON.stringify(mockNpcsData)) }; // Return copy
    }
    if (url.includes('dialogues.json')) {
      return { ok: true, json: async () => JSON.parse(JSON.stringify(mockDialoguesData)) }; // Return copy
    }
    if (url.includes('puzzles.json')) { // Added handler for puzzles.json
      return { ok: true, json: async () => JSON.parse(JSON.stringify(mockPuzzlesData)) };
    }
    return { ok: false, status: 404, json: async () => ({ message: "Not Found" }) };
  };

  const appShell = new MockAppShellForNpcDialogue();
  await appShell._initializeGame();

  // --- Existing Tests (Adjusted size expectation) ---
  assertTrue(appShell.allNpcs instanceof Map, "Test 1.1: allNpcs is a Map");
  assertEqual(appShell.allNpcs.size, 5, "Test 1.2: Correct number of NPCs loaded (including new ones)"); // Updated size
  assertDeepEqual(appShell.allNpcs.get("npc1"), mockNpcsData[0], "Test 1.3: NPC1 data loaded correctly");

  assertDeepEqual(appShell.getNpcDetails("npc2"), mockNpcsData[1], "Test 2.1: getNpcDetails returns correct NPC");
  assertEqual(appShell.getNpcDetails("invalid_id"), undefined, "Test 2.2: getNpcDetails handles invalid ID");

  assertTrue(typeof appShell.allDialogues === 'object' && appShell.allDialogues !== null, "Test 3.1: allDialogues is an object");
  assertTrue(appShell.allDialogues.hasOwnProperty("npc1"), "Test 3.2: Dialogue for NPC1 loaded");
  assertDeepEqual(appShell.allDialogues["npc2"], mockDialoguesData["npc2"], "Test 3.3: Dialogue for NPC2 data loaded correctly");
  
  assertDeepEqual(appShell.getDialogueForNpc("npc1"), mockDialoguesData["npc1"], "Test 4.1: getDialogueForNpc returns correct dialogue");
  assertEqual(appShell.getDialogueForNpc("invalid_id"), undefined, "Test 4.2: getDialogueForNpc handles invalid ID");

  // --- New Tests for Captain Isabella Moreau ---
  const isabellaId = "npc_captain_isabella_moreau";
  const isabellaData = mockNpcsData.find(npc => npc.id === isabellaId);
  const isabellaDialogueData = mockDialoguesData[isabellaId];
  assertNotNull(appShell.allNpcs.get(isabellaId), "Test 5.1: Captain Isabella Moreau loaded");
  assertDeepEqual(appShell.getNpcDetails(isabellaId), isabellaData, "Test 5.2: getNpcDetails returns correct data for Isabella");
  assertNotNull(appShell.allDialogues[isabellaId], "Test 5.3: Dialogue for Isabella loaded");
  assertDeepEqual(appShell.getDialogueForNpc(isabellaId), isabellaDialogueData, "Test 5.4: getDialogueForNpc returns correct dialogue for Isabella");
  assertTrue(
    appShell.getDialogueForNpc(isabellaId)?.moreau_start?.npcText.includes("Crimson Marauders"),
    "Test 5.5: Isabella's dialogue mentions 'Crimson Marauders' (backstory consistency)"
  );
  assertTrue(
    appShell.getNpcDetails(isabellaId)?.description.includes("Crimson Marauders"),
    "Test 5.6: Isabella's description mentions 'Crimson Marauders' (backstory consistency)"
  );


  // --- New Tests for Silas 'Silver-Tongue' Blackwood ---
  const silasId = "npc_silas_blackwood";
  const silasData = mockNpcsData.find(npc => npc.id === silasId);
  const silasDialogueData = mockDialoguesData[silasId];
  assertNotNull(appShell.allNpcs.get(silasId), "Test 6.1: Silas Blackwood loaded");
  assertDeepEqual(appShell.getNpcDetails(silasId), silasData, "Test 6.2: getNpcDetails returns correct data for Silas");
  assertNotNull(appShell.allDialogues[silasId], "Test 6.3: Dialogue for Silas loaded");
  assertDeepEqual(appShell.getDialogueForNpc(silasId), silasDialogueData, "Test 6.4: getDialogueForNpc returns correct dialogue for Silas");
  assertTrue(
    appShell.getDialogueForNpc(silasId)?.silas_start?.npcText.includes("rare artifacts") || appShell.getDialogueForNpc(silasId)?.silas_start?.npcText.includes("valuable information"),
    "Test 6.5: Silas's dialogue mentions 'rare artifacts' or 'valuable information' (backstory consistency)"
  );
  assertTrue(
    appShell.getNpcDetails(silasId)?.description.includes("rare artifacts and information"),
    "Test 6.6: Silas's description mentions 'rare artifacts and information' (backstory consistency)"
  );

  // --- New Tests for Esmeralda 'The Seer' Valdez ---
  const esmeraldaId = "npc_esmeralda_valdez";
  const esmeraldaData = mockNpcsData.find(npc => npc.id === esmeraldaId);
  const esmeraldaDialogueData = mockDialoguesData[esmeraldaId];
  assertNotNull(appShell.allNpcs.get(esmeraldaId), "Test 7.1: Esmeralda Valdez loaded");
  assertDeepEqual(appShell.getNpcDetails(esmeraldaId), esmeraldaData, "Test 7.2: getNpcDetails returns correct data for Esmeralda");
  assertNotNull(appShell.allDialogues[esmeraldaId], "Test 7.3: Dialogue for Esmeralda loaded");
  assertDeepEqual(appShell.getDialogueForNpc(esmeraldaId), esmeraldaDialogueData, "Test 7.4: getDialogueForNpc returns correct dialogue for Esmeralda");
  assertTrue(
    appShell.getDialogueForNpc(esmeraldaId)?.esmeralda_start?.npcText.includes("fortune teller") ||
    appShell.getDialogueForNpc(esmeraldaId)?.esmeralda_start?.npcText.includes("riddles") ||
    appShell.getDialogueForNpc(esmeraldaId)?.esmeralda_start?.npcText.includes("future"),
    "Test 7.5: Esmeralda's dialogue mentions 'fortune teller', 'riddles', or 'future' (backstory consistency)"
  );
   assertTrue(
    appShell.getNpcDetails(esmeraldaId)?.description.includes("fortune teller"),
    "Test 7.6: Esmeralda's description mentions 'fortune teller' (backstory consistency)"
  );

  // --- New Tests for Puzzle Data Loading ---
  assertTrue(appShell.allPuzzles instanceof Map, "Test 8.1: allPuzzles is a Map");
  assertEqual(appShell.allPuzzles.size, 2, "Test 8.2: Correct number of puzzles loaded");
  assertDeepEqual(appShell.allPuzzles.get("PUZZLE1"), mockPuzzlesData[0], "Test 8.3: PUZZLE1 data loaded correctly");
  assertDeepEqual(appShell.getPuzzleDetails("PUZZLE2"), mockPuzzlesData[1], "Test 8.4: getPuzzleDetails returns correct puzzle");
  assertEqual(appShell.getPuzzleDetails("invalid_puzzle_id"), undefined, "Test 8.5: getPuzzleDetails handles invalid ID for puzzles");


  window.fetch = originalFetch;

  console.log(`--- ${testSuiteName} ---`);
  if (results.length > 0) { results.forEach(r => console.log(r)); }
  console.log(`Total Tests: ${testsPassed + testsFailed}, Passed: ${testsPassed}, Failed: ${testsFailed}`);
  
  if (typeof window !== 'undefined') {
    window.allTestsPassed = (window.allTestsPassed === undefined ? true : window.allTestsPassed) && (testsFailed === 0);
  }
  return testsFailed === 0;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testNpcDialogueDataLoading, MockAppShellForNpcDialogue };
} else if (typeof window !== 'undefined') {
  window.testNpcDialogueDataLoading = testNpcDialogueDataLoading;
  window.MockAppShellForNpcDialogue = MockAppShellForNpcDialogue;
}
