// @desc    Admin-only test route
exports.adminTest = (req, res) => {
  res.json({
    message: "Welcome, Admin! You have access to this protected route.",
  });
};
