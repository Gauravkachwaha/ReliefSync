import dotenv from "dotenv";
import emailService from "../src/services/emailService.js";

dotenv.config();

const test = async () => {
  console.log("Testing email service...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS length:", process.env.EMAIL_PASS?.length);

  const res = await emailService.sendEmail(
    "gs1447005@gmail.com",
    "ReliefSync Email Test Connection",
    "If you receive this, the email service connection works perfectly!"
  );

  if (res) {
    console.log("✅ Email test successful!");
    process.exit(0);
  } else {
    console.log("❌ Email test failed. Please check the logs above.");
    process.exit(1);
  }
};

test();
