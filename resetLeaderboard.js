const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://starx-network-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function getTopUsers(limit = 10) {
  const usersRef = db.ref("users");
  const snapshot = await usersRef.once("value");

  const users = [];

  snapshot.forEach((child) => {
    const data = child.val();
    const invitesObj = data.dailyInvites || {};
    const inviteCount = Object.keys(invitesObj).length;

    users.push({ username: data.username || child.key, invites: inviteCount });
  });

  users.sort((a, b) => b.invites - a.invites);

  return users.slice(0, limit);
}

async function sendEmail(topUsers) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const userList = topUsers
    .map((u, i) => `${i + 1}. ${u.username} - ${u.invites} invites`)
    .join("\n");

  const mailOptions = {
    from: `"Starx Network" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "Weekly Top 10 Inviters - Starx Network",
    text: `Here are the top 10 users by number of invites this week:\n\n${userList}`,
  };

  await transporter.sendMail(mailOptions);
  console.log("✅ Email sent with top 10 users");
}

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

async function main() {
  try {
    const topUsers = await getTopUsers(10);
    await sendEmail(topUsers);
    await resetDailyInvites();
  } catch (err) {
    console.error("❌ Error in weekly reset:", err);
  }
}

main().then(() => process.exit());
