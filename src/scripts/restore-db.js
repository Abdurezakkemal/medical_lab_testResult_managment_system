const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
require("../config");

const runRestore = async () => {
  try {
    const inputPath = process.argv[2];

    if (!inputPath) {
      console.error(
        "Usage: node src/scripts/restore-db.js <path-to-backup-json-file>"
      );
      process.exit(1);
    }

    const resolvedPath = path.isAbsolute(inputPath)
      ? inputPath
      : path.join(process.cwd(), inputPath);

    if (!fs.existsSync(resolvedPath)) {
      console.error("Backup file not found:", resolvedPath);
      process.exit(1);
    }

    const raw = fs.readFileSync(resolvedPath, "utf8");
    const backup = JSON.parse(raw);

    await connectDB();

    const db = mongoose.connection.db;
    const collectionsData = backup.collections || {};

    for (const [name, docs] of Object.entries(collectionsData)) {
      const collection = db.collection(name);

      await collection.deleteMany({});

      if (docs && docs.length) {
        const restoredDocs = docs.map((doc) => ({
          ...doc,
          _id: doc._id ? new mongoose.Types.ObjectId(doc._id) : undefined,
        }));

        await collection.insertMany(restoredDocs);
      }

      console.log(
        `Restored collection ${name} with ${docs ? docs.length : 0} documents.`
      );
    }

    console.log("Database restore completed from:", resolvedPath);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Database restore failed:", error.message);
    process.exit(1);
  }
};

runRestore();
