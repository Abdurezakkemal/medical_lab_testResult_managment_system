const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
require("../config");

const runBackup = async () => {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    const collections = await db.collections();

    const backup = {
      createdAt: new Date().toISOString(),
      database: db.databaseName,
      collections: {},
    };

    for (const collection of collections) {
      const name = collection.collectionName;
      const docs = await collection.find({}).toArray();

      const serializedDocs = docs.map((doc) => ({
        ...doc,
        _id: doc._id && doc._id.toString(),
      }));

      backup.collections[name] = serializedDocs;
    }

    const backupsDir = path.join(__dirname, "..", "..", "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filePath = path.join(backupsDir, `backup-${Date.now()}.json`);

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), "utf8");

    console.log("Database backup completed:", filePath);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Database backup failed:", error.message);
    process.exit(1);
  }
};

runBackup();
