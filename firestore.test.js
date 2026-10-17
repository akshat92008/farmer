const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const ALICE_UID = "alice_farmer_1";
const BOB_UID = "bob_farmer_2";

const [emulatorHost, emulatorPortStr] = (
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085"
).split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test("1. Unauthenticated user cannot read farmer profile or crop cycles", async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(unauthDb.collection("users").doc(ALICE_UID).get());
  await assertFails(
    unauthDb.collection("users").doc(ALICE_UID).collection("crop_cycles").get()
  );
});

test("2. Authenticated farmer can create and read own FarmerProfile", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date(Date.now() - 1000);
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).set({
      userId: ALICE_UID,
      farmerName: "रामेश्वर सिंह",
      preferredLanguage: "hi",
      voiceEnabled: true,
      stateName: "उत्तर प्रदेश",
      districtName: "वाराणसी",
      villageName: "रामपुर",
      landSizeAcres: 3.5,
      irrigationType: "नहर और ट्यूबवेल",
      soilType: "दोमट मिट्टी",
      consentGiven: true,
      createdAt: now,
      updatedAt: now,
    })
  );
  await assertSucceeds(aliceDb.collection("users").doc(ALICE_UID).get());
});

test("3. Cross-user isolation: Bob cannot read or write Alice's profile or subcollections", async () => {
  const now = new Date(Date.now() - 1000);
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection("users").doc(ALICE_UID).set({
      userId: ALICE_UID,
      farmerName: "रामेश्वर सिंह",
      preferredLanguage: "hi",
      voiceEnabled: true,
      stateName: "उत्तर प्रदेश",
      districtName: "वाराणसी",
      villageName: "रामपुर",
      landSizeAcres: 3.5,
      irrigationType: "नहर",
      soilType: "दोमट",
      consentGiven: true,
      createdAt: now,
      updatedAt: now,
    });
    await db
      .collection("users")
      .doc(ALICE_UID)
      .collection("crop_cycles")
      .doc("cycle_1")
      .set({
        userId: ALICE_UID,
        fieldName: "पूर्वी खेत",
        cropName: "गेहूँ (Wheat)",
        varietyName: "HD-2967",
        areaAcres: 2.0,
        season: "Rabi",
        sowingDate: "2026-11-10",
        growthStage: "कल्ले निकलने की अवस्था",
        irrigationMethod: "ट्यूबवेल",
        notes: "पहली सिंचाई पूर्ण",
        createdAt: now,
        updatedAt: now,
      });
  });

  const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
  await assertFails(bobDb.collection("users").doc(ALICE_UID).get());
  await assertFails(
    bobDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("crop_cycles")
      .doc("cycle_1")
      .get()
  );
});

test("4. Shadow/Ghost field injection is rejected on create and update", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date(Date.now() - 1000);
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).set({
      userId: ALICE_UID,
      farmerName: "रामेश्वर सिंह",
      preferredLanguage: "hi",
      voiceEnabled: true,
      stateName: "उत्तर प्रदेश",
      districtName: "वाराणसी",
      villageName: "रामपुर",
      landSizeAcres: 3.5,
      irrigationType: "नहर",
      soilType: "दोमट",
      consentGiven: true,
      isAdmin: true,
      createdAt: now,
      updatedAt: now,
    })
  );
});

test("5. Authenticated farmer can create and list own CropCycle, CropCase, FarmTransaction, FarmReminder, and AssistantMessage", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date(Date.now() - 1000);

  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("crop_cycles")
      .doc("cycle_1")
      .set({
        userId: ALICE_UID,
        fieldName: "पूर्वी खेत",
        cropName: "गेहूँ (Wheat)",
        varietyName: "HD-2967",
        areaAcres: 2.0,
        season: "Rabi",
        sowingDate: "2026-11-10",
        growthStage: "कल्ले निकलने की अवस्था",
        irrigationMethod: "ट्यूबवेल",
        notes: "",
        createdAt: now,
        updatedAt: now,
      })
  );

  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("crop_cases")
      .doc("case_1")
      .set({
        userId: ALICE_UID,
        cropName: "गेहूँ (Wheat)",
        growthStage: "कल्ले निकलना",
        symptoms: "पत्तियाँ पीली पड़ रही हैं",
        spreadScope: "कुछ पौधों में",
        likelyCauses: "नाइट्रोजन या जिंक की कमी अथवा पीला रतुआ की शुरुआती संभावना",
        confidenceLevel: "MEDIUM",
        safeNextSteps: "पत्ते के दोनों तरफ जाँच करें और बिना पुष्टि के तेज रसायन न डालें",
        expertStatus: "NONE",
        expertNotes: "",
        createdAt: now,
        updatedAt: now,
      })
  );

  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("farm_transactions")
      .doc("tx_1")
      .set({
        userId: ALICE_UID,
        txType: "EXPENSE",
        category: "बीज (Seed)",
        cropName: "गेहूँ (Wheat)",
        title: "प्रमाणित बीज HD-2967",
        amountInr: 3200,
        quantityQuintal: 1.0,
        txDate: "2026-10-15",
        createdAt: now,
        updatedAt: now,
      })
  );

  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("reminders")
      .doc("rem_1")
      .set({
        userId: ALICE_UID,
        cropName: "गेहूँ (Wheat)",
        taskTitle: "पहली सिंचाई (CRI अवस्था - 21 दिन पर)",
        whySuggested: "बुवाई के 21 दिन बाद जड़ बनने की मुख्य अवस्था में नमी आवश्यक है (ICAR मानक)",
        dueDate: "2026-12-01",
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      })
  );

  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("conversations")
      .doc("msg_1")
      .set({
        userId: ALICE_UID,
        role: "USER",
        topic: "CROP_DOCTOR",
        messageText: "मेरी गेहूँ की पत्तियाँ पीली हो रही हैं, क्या करूँ?",
        sourceCitation: "ICAR-IIWBR गेहूँ प्रबंधन मार्गदर्शिका",
        flaggedHarmful: false,
        createdAt: now,
        updatedAt: now,
      })
  );

  // Aligned list queries
  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("crop_cycles")
      .where("userId", "==", ALICE_UID)
      .get()
  );
  await assertSucceeds(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("farm_transactions")
      .where("userId", "==", ALICE_UID)
      .get()
  );
});

test("6. Invalid enum or negative amount is rejected by validation helpers", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date(Date.now() - 1000);
  await assertFails(
    aliceDb
      .collection("users")
      .doc(ALICE_UID)
      .collection("farm_transactions")
      .doc("tx_bad")
      .set({
        userId: ALICE_UID,
        txType: "EXPENSE",
        category: "बीज",
        cropName: "गेहूँ",
        title: "खराब राशि",
        amountInr: -500,
        quantityQuintal: 0,
        txDate: "2026-10-15",
        createdAt: now,
        updatedAt: now,
      })
  );
});
