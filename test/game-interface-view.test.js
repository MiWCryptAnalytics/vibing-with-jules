// --- game-interface-view.test.js (Conceptual) ---

class MockGameInterfaceView {
  constructor() {
    this.locationData = null;
    this.playerInventory = [];
    this.playerResources = { gold: 0, silver: 0, rum: 0 };
    this._lastFoundMessage = '';
    this.dispatchedEvents = [];

    this.dispatchEvent = (event) => {
      this.dispatchedEvents.push({ type: event.type, detail: event.detail });
    };
    this.requestUpdate = () => { /* console.log("MockGameInterfaceView: requestUpdate called"); */ };
  }

  _formatPrice(priceObject) {
    if (!priceObject) return '';
    const currency = Object.keys(priceObject)[0];
    const amount = priceObject[currency];
    const currencyName = currency.charAt(0).toUpperCase() + currency.slice(1);
    return `${amount} ${currencyName}`;
  }

  _handleBuyGood(good) {
    let message = '';
    const price = good.marketSellsToPlayerPrice;
    if (!price) { console.error("Buy error: good has no selling price", good); return; }
    const currency = Object.keys(price)[0];
    const cost = price[currency];

    if (this.playerResources && this.playerResources[currency] >= cost) {
      const costUpdate = { [currency]: -cost };
      this.dispatchEvent(new CustomEvent('update-resources', { detail: costUpdate }));
      if (good.type === 'resource') {
        const resourceGain = { [good.resourceType]: good.quantity };
        this.dispatchEvent(new CustomEvent('update-resources', { detail: resourceGain }));
        message = `Bought ${good.quantity} ${good.name}.`;
      } else if (good.type === 'item') {
        this.dispatchEvent(new CustomEvent('add-to-inventory', { 
          detail: { item: { 
            id: good.itemIdToTrade, name: good.name, description: good.description, 
            icon: good.icon, itemImage: good.itemImage 
          } }
        }));
        message = `Bought ${good.name}.`;
      }
    } else {
      message = `Not enough ${currency} for ${good.name}.`;
    }
    this._lastFoundMessage = message;
    this.requestUpdate();
  }

  _handleSellGood(good) {
    let message = '';
    const payment = good.marketBuysFromPlayerPrice;
    if (!payment) { console.error("Sell error: good has no buying price", good); return; }
    const currency = Object.keys(payment)[0];
    const income = payment[currency];

    if (good.type === 'item') {
      const itemInInventory = this.playerInventory.find(item => item.id === good.itemIdToTrade);
      if (itemInInventory) {
        this.dispatchEvent(new CustomEvent('remove-from-inventory', { detail: { itemId: good.itemIdToTrade } }));
        const incomeUpdate = { [currency]: income };
        this.dispatchEvent(new CustomEvent('update-resources', { detail: incomeUpdate }));
        message = `Sold ${good.name} for ${this._formatPrice(payment)}.`;
      } else {
        message = `You don't have ${good.name} to sell.`;
      }
    } else if (good.type === 'resource') {
      if (this.playerResources && this.playerResources[good.resourceType] >= good.quantity) {
        const resourceDeduction = { [good.resourceType]: -good.quantity };
        this.dispatchEvent(new CustomEvent('update-resources', { detail: resourceDeduction }));
        const incomeUpdate = { [currency]: income };
        this.dispatchEvent(new CustomEvent('update-resources', { detail: incomeUpdate }));
        message = `Sold ${good.quantity} ${good.name} for ${this._formatPrice(payment)}.`;
      } else {
        message = `You don't have enough ${good.name} to sell.`;
      }
    }
    this._lastFoundMessage = message;
    this.requestUpdate();
  }
  
  _handleObjectClick(clickedObject) {
    let messageToDisplay = '';
    if (clickedObject.isInteractableFeature && clickedObject.interaction && !clickedObject.isHandledInteractable) {
      const interaction = clickedObject.interaction;
      const requiredItem = this.playerInventory.find(invItem => invItem.id === interaction.requiredItemId);
      if (requiredItem) {
        messageToDisplay = interaction.successMessage;
        if (interaction.revealedItem) {
          this.dispatchEvent(new CustomEvent('add-to-inventory', { detail: { item: { ...interaction.revealedItem } } }));
        }
        const objectInScene = this.locationData.hiddenObjects.find(obj => obj.id === clickedObject.id);
        if (objectInScene) {
          objectInScene.name = `Opened ${clickedObject.name}`;
          objectInScene.description = interaction.revealedItem ? "It's now empty." : "You've interacted with this.";
          objectInScene.icon = 'lock_open';
          delete objectInScene.isInteractableFeature;
          delete objectInScene.interaction;
          objectInScene.isHandledInteractable = true;
        }
        if (interaction.consumesRequiredItem) {
          this.dispatchEvent(new CustomEvent('remove-from-inventory', { detail: { itemId: interaction.requiredItemId } }));
        }
      } else {
        let requiredItemName = interaction.requiredItemId.replace('item_', '').replace(/_/g, ' ');
        messageToDisplay = `You need a ${requiredItemName} to use the ${clickedObject.name}.`;
      }
    } else if (clickedObject.grantsResources && !clickedObject.isHandledInteractable) {
      this.dispatchEvent(new CustomEvent('update-resources', { detail: clickedObject.grantsResources }));
      messageToDisplay = clickedObject.foundMessage || `You found: ${clickedObject.name}!`;
      const objectInScene = this.locationData.hiddenObjects.find(obj => obj.id === clickedObject.id);
      if (objectInScene) {
        objectInScene.description = "The resources have been gathered.";
        objectInScene.isHandledInteractable = true;
      }
    } else if (clickedObject.isHandledInteractable) {
      messageToDisplay = `${clickedObject.name}: ${clickedObject.description}`;
    } else {
      this.dispatchEvent(new CustomEvent('add-to-inventory', { detail: { item: { ...clickedObject } } }));
      messageToDisplay = clickedObject.foundMessage || `You found: ${clickedObject.name}!`;
    }
    this._lastFoundMessage = messageToDisplay;
    this.requestUpdate();
  }
}

function testGameInterfaceInteractions() {
  let testsPassed = 0;
  let testsFailed = 0;
  const results = [];
  const testSuiteName = "GameInterfaceView Interactions Tests";

  const assertEqual = (actual, expected, message) => {
    if (actual === expected || (typeof actual === 'number' && typeof expected === 'number' && isNaN(actual) && isNaN(expected)) || (actual !== actual && expected !== expected) ) { // handles NaN
        testsPassed++;
    } else if (typeof actual === 'object' && typeof expected === 'object' && actual !== null && expected !== null) { // Deep compare for objects
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
            testsPassed++;
        } else {
            testsFailed++;
            results.push(`FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
        }
    }
     else {
      testsFailed++;
      results.push(`FAIL: ${message} (Expected: ${expected}, Got: ${actual})`);
    }
  };

  const assertDeepEqual = (actual, expected, message) => {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      testsPassed++;
    } else {
      testsFailed++;
      results.push(`FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
    }
  };

  const assertTrue = (condition, message) => {
    if (condition) {
      testsPassed++;
    } else {
      testsFailed++;
      results.push(`FAIL: ${message} (Expected true, Got false)`);
    }
  };

  const assertMatch = (actual, expectedPattern, message) => {
    if (typeof actual === 'string' && actual.includes(expectedPattern)) {
      testsPassed++;
    } else {
      testsFailed++;
      results.push(`FAIL: ${message} (Expected string containing: "${expectedPattern}", Got: "${actual}")`);
    }
  };

  const rustyKey = { id: "item_rusty_key", name: "Rusty Key" };
  const goldCoins = { id: "item_gold_coins", name: "Gold Coins", description: "Shiny coins." };
  const lockedChest = {
    id: "locked_chest_forest", name: "Locked Chest", icon: "inventory_2",
    isInteractableFeature: true,
    interaction: {
      requiredItemId: "item_rusty_key", successMessage: "Chest unlocked!",
      revealedItem: goldCoins, consumesRequiredItem: false
    }
  };
  const doubloonCache = {
    id: "found_cache_of_doubloons", name: "Cache of Doubloons",
    grantsResources: { gold: 50 }, foundMessage: "Found 50 Gold!"
  };

  let view = new MockGameInterfaceView();
  view.playerInventory = [rustyKey];
  view.locationData = { hiddenObjects: [JSON.parse(JSON.stringify(lockedChest)), rustyKey] }; // Use copy for chest
  view._handleObjectClick(view.locationData.hiddenObjects.find(o=>o.id==="locked_chest_forest"));
  assertDeepEqual(view.dispatchedEvents[0], { type: 'add-to-inventory', detail: { item: goldCoins } }, "Test 1.1: Gold Coins added");
  const chestState = view.locationData.hiddenObjects.find(o => o.id === "locked_chest_forest");
  assertTrue(chestState.isHandledInteractable, "Test 1.2: Chest handled");
  assertMatch(view._lastFoundMessage, "Chest unlocked!", "Test 1.3: Chest success message");
  view.dispatchedEvents = [];

  view = new MockGameInterfaceView();
  view.playerInventory = [];
  view.locationData = { hiddenObjects: [JSON.parse(JSON.stringify(lockedChest))] };
  view._handleObjectClick(view.locationData.hiddenObjects.find(o=>o.id==="locked_chest_forest"));
  assertEqual(view.dispatchedEvents.length, 0, "Test 2.1: No event if no key");
  const chestStateNoKey = view.locationData.hiddenObjects.find(o => o.id === "locked_chest_forest");
  assertTrue(!chestStateNoKey.isHandledInteractable, "Test 2.2: Chest not handled if no key");
  assertMatch(view._lastFoundMessage, "You need a rusty key", "Test 2.3: Need key message");
  view.dispatchedEvents = [];

  view = new MockGameInterfaceView();
  view.locationData = { hiddenObjects: [JSON.parse(JSON.stringify(doubloonCache))] };
  view._handleObjectClick(view.locationData.hiddenObjects.find(o=>o.id === "found_cache_of_doubloons"));
  assertDeepEqual(view.dispatchedEvents[0], { type: 'update-resources', detail: { gold: 50 } }, "Test 3.1: Gold resources updated");
  const cacheState = view.locationData.hiddenObjects.find(o => o.id === "found_cache_of_doubloons");
  assertTrue(cacheState.isHandledInteractable, "Test 3.2: Doubloon cache handled");
  assertMatch(view._lastFoundMessage, "Found 50 Gold!", "Test 3.3: Doubloons message");
  view.dispatchedEvents = [];

  const rumGood = {
    goodId: "rum_bottle_supply", name: "Bottle of Rum", type: "resource", resourceType: "rum", quantity: 1,
    marketSellsToPlayerPrice: { silver: 5 }, stock: 10, icon:"sports_bar", description:"Tasty"
  };
  const sextantGood = {
    goodId: "buy_sextant_from_player", name: "Sextant", type: "item", itemIdToTrade: "item_sextant",
    marketBuysFromPlayerPrice: { gold: 15 }, demand: 3, icon:"explore", description:"Useful"
  };
  const playerSextant = { id: "item_sextant", name: "Sextant" };

  view = new MockGameInterfaceView();
  view.playerResources = { gold: 0, silver: 10, rum: 0 };
  view._handleBuyGood(rumGood);
  assertEqual(view.dispatchedEvents.length, 2, "Test 4.1: Two events for buying rum");
  assertDeepEqual(view.dispatchedEvents[0], { type: 'update-resources', detail: { silver: -5 } }, "Test 4.2: Silver deducted");
  assertDeepEqual(view.dispatchedEvents[1], { type: 'update-resources', detail: { rum: 1 } }, "Test 4.3: Rum added");
  assertMatch(view._lastFoundMessage, "Bought 1 Bottle of Rum", "Test 4.4: Bought rum message");
  view.dispatchedEvents = [];

  view = new MockGameInterfaceView();
  view.playerResources = { gold: 0, silver: 3, rum: 0 };
  view._handleBuyGood(rumGood);
  assertEqual(view.dispatchedEvents.length, 0, "Test 5.1: No events if not enough silver");
  assertMatch(view._lastFoundMessage, "Not enough silver", "Test 5.2: Not enough silver message");
  view.dispatchedEvents = [];

  view = new MockGameInterfaceView();
  view.playerInventory = [playerSextant];
  view.playerResources = { gold: 0, silver: 0, rum: 0 };
  view._handleSellGood(sextantGood);
  assertEqual(view.dispatchedEvents.length, 2, "Test 6.1: Two events for selling sextant");
  assertDeepEqual(view.dispatchedEvents[0], { type: 'remove-from-inventory', detail: { itemId: "item_sextant" } }, "Test 6.2: Sextant removed");
  assertDeepEqual(view.dispatchedEvents[1], { type: 'update-resources', detail: { gold: 15 } }, "Test 6.3: Gold added");
  assertMatch(view._lastFoundMessage, "Sold Sextant for 15 Gold", "Test 6.4: Sold sextant message");
  view.dispatchedEvents = [];

  view = new MockGameInterfaceView();
  view.playerInventory = [];
  view.playerResources = { gold: 0, silver: 0, rum: 0 };
  view._handleSellGood(sextantGood);
  assertEqual(view.dispatchedEvents.length, 0, "Test 7.1: No events if no sextant to sell");
  assertMatch(view._lastFoundMessage, "You don't have Sextant to sell", "Test 7.2: Don't have sextant message");
  view.dispatchedEvents = [];
  
  console.log(`--- ${testSuiteName} ---`);
  if (results.length > 0) { results.forEach(r => console.log(r)); }
  console.log(`Total Tests: ${testsPassed + testsFailed}, Passed: ${testsPassed}, Failed: ${testsFailed}`);
  if (typeof window !== 'undefined') {
    window.allTestsPassed = (window.allTestsPassed === undefined ? true : window.allTestsPassed) && (testsFailed === 0);
  }
  return testsFailed === 0;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testGameInterfaceInteractions, MockGameInterfaceView };
} else if (typeof window !== 'undefined') {
  window.testGameInterfaceInteractions = testGameInterfaceInteractions;
  window.MockGameInterfaceView = MockGameInterfaceView;
}
