import dotenv from "dotenv";
import emailService from "../src/services/emailService.js";

dotenv.config();

const test = async () => {
  console.log("Testing email service...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS length:", process.env.EMAIL_PASS?.length);

  // Step 1: verify the SMTP connection/credentials truthfully.
  try {
    await emailService.verifyConnection();
    console.log("✅ SMTP connection verified — credentials are valid.");
  } catch (err) {
    console.error("❌ SMTP verification FAILED:", err.message);
    console.error(
      "\nEmails will fall back to console logging until this is fixed.\n" +
        "For Gmail: enable 2-Step Verification, then create an App Password at\n" +
        "https://myaccount.google.com/apppasswords and set it as EMAIL_PASS\n" +
        "(16 characters, no spaces) in Backend/.env.",
    );
    process.exit(1);
  }

  // Step 2: actually send a test email.
  await emailService.sendEmail(
    process.env.EMAIL_USER,
    "ReliefSync Email Test Connection",
    "If you receive this, the email service connection works perfectly!",
  );
  console.log("✅ Test email dispatched — check the inbox of", process.env.EMAIL_USER);
  process.exit(0);
};

test();
