const sendEmail = require("./email.service");

const sendSecurityAlert = async (subject, message) => {
  const recipient = process.env.SECURITY_ALERT_EMAIL;

  if (!recipient) {
    console.warn("SECURITY_ALERT_EMAIL is not configured. Security alert:", {
      subject,
      message,
    });
    return;
  }

  await sendEmail({
    email: recipient,
    subject,
    message,
  });
};

module.exports = { sendSecurityAlert };
