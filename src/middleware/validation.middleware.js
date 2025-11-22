const { z } = require("zod");

const strongPassword = new RegExp(
  "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{12,})"
);

const registerSchema = z.object({
  body: z.object({
    username: z.string().min(1, { message: "Username is required" }),
    email: z.string().email({ message: "A valid email is required" }),
    password: z.string().regex(strongPassword, {
      message:
        "Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),
    department: z.string().min(1, { message: "Department is required" }),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, {
      message: "Current password is required",
    }),
    newPassword: z.string().regex(strongPassword, {
      message:
        "Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),
  }),
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    return res.status(400).send(err.errors);
  }
};

module.exports = { validate, registerSchema, changePasswordSchema };
