module.exports = (req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const isSecure =
    req.secure ||
    (Array.isArray(forwardedProto)
      ? forwardedProto.includes("https")
      : forwardedProto === "https");

  if (!isSecure) {
    return res.status(403).json({ message: "HTTPS is required" });
  }

  return next();
};
