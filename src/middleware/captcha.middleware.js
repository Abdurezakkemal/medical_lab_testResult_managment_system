const axios = require("axios");

const verifyCaptcha = async (req, res, next) => {
  const { captchaToken } = req.body;

  if (!captchaToken) {
    return res.status(400).json({ message: "CAPTCHA token is required." });
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
    );

    if (response.data.success) {
      next();
    } else {
      res.status(400).json({ message: "Failed CAPTCHA verification." });
    }
  } catch (error) {
    console.error("CAPTCHA verification error:", error.message);
    res.status(500).send("Error verifying CAPTCHA");
  }
};

module.exports = verifyCaptcha;
