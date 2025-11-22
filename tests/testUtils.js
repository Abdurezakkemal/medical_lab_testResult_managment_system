const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/user.model");
const Role = require("../src/models/role.model");
const sendEmail = require("../src/services/email.service");

/**
 * Creates and verifies a user for testing purposes.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @param {string} username - The user's username.
 * @param {string} department - The user's department.
 * @param {string[]} roleNames - An array of role names to assign to the user.
 * @returns {Promise<User>} The created and verified user object.
 */
const createUser = async (email, password, username, department, roleNames) => {
  // Register user
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({ username, email, password, department });

  // If registration failed (e.g., due to validation), abort early
  if (response.statusCode !== 201) {
    return null;
  }

  // Extract the verification token from the mocked email, if available
  let verificationToken = null;
  if (sendEmail && sendEmail.mock && sendEmail.mock.calls.length > 0) {
    const lastCall = sendEmail.mock.calls[sendEmail.mock.calls.length - 1];
    if (lastCall && lastCall[0] && lastCall[0].message) {
      const message = lastCall[0].message;
      const match = message.match(/\/verifyemail\/([a-f0-9]+)/i);
      if (match) {
        verificationToken = match[1];
      }
    }
  }

  if (verificationToken) {
    // Use the real verification token sent in the email to verify the user
    await request(app).get(`/api/v1/auth/verifyemail/${verificationToken}`);
  } else {
    // Fallback: mark the user as verified directly if we couldn't extract the token
    await User.updateOne(
      { email },
      {
        isVerified: true,
        emailVerificationToken: undefined,
        emailVerificationTokenExpires: undefined,
      }
    );
  }

  // Ensure roles exist and get their IDs
  const roleIds = await Promise.all(
    roleNames.map(async (name) => {
      let role = await Role.findOne({ name });
      if (!role) {
        role = await new Role({ name, permissions: ["upload_results"] }).save();
      }
      return role._id;
    })
  );

  // Retrieve the now-verified user
  const user = await User.findOne({ email });
  if (!user) {
    return null;
  }

  // Assign roles and save the user
  user.roles = roleIds;
  await user.save();

  // Login the user to get a token
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  return { user, authToken: loginRes.body.accessToken };
};

module.exports = { createUser };
