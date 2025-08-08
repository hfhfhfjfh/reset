const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://starx-network-default-rtdb.firebaseio.com"  // <- CHANGE THIS
});

const db = admin.database();

async function resetDailyInvites() {
  const usersRef = db.ref("users");
  const snapshot = await usersRef.once("value");

  const updates = {};

  snapshot.forEach((child) => {
    updates[`${child.key}/dailyInvites`] = null;
  });

  await usersRef.update(updates);
  console.log("✅ All dailyInvites reset!");
}

resetDailyInvites().then(() => process.exit()).catch(console.error);
