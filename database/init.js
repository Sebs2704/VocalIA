/**
 * VocalIA - MongoDB Setup Script
 * Ejecutar en MongoDB Atlas > Collections > Shell, o con mongosh:
 *   mongosh "tu_connection_string" --file init.js
 */

use("vocalia");

// ─── COLECCIÓN: users ────────────────────────────────────────────────────────
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "username", "email", "password_hash", "sex", "created_at"],
      properties: {
        _id:           { bsonType: "string", description: "ID tipo VIA-XXXXXXXX" },
        username:      { bsonType: "string" },
        email:         { bsonType: "string" },
        password_hash: { bsonType: "string" },
        sex:           { enum: ["masculino", "femenino"] },
        created_at:    { bsonType: "date" },
      },
    },
  },
});
db.users.createIndex({ email: 1 }, { unique: true });
print("✅ Colección 'users' lista");

// ─── COLECCIÓN: results ──────────────────────────────────────────────────────
db.createCollection("results", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "min_freq", "max_freq", "range", "date"],
      properties: {
        user_id:  { bsonType: "string" },
        min_freq: { bsonType: "double" },
        max_freq: { bsonType: "double" },
        range:    { bsonType: "string" },
        date:     { bsonType: "date" },
      },
    },
  },
});
db.results.createIndex({ user_id: 1, date: -1 });
print("✅ Colección 'results' lista");

// ─── COLECCIÓN: dataset ──────────────────────────────────────────────────────
db.createCollection("dataset", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sex", "filename", "submitted_at"],
      properties: {
        sex:          { enum: ["masculino", "femenino"] },
        label:        { bsonType: ["string", "null"] },
        filename:     { bsonType: "string" },
        file_size:    { bsonType: "int" },
        labeled:      { bsonType: "bool" },
        submitted_at: { bsonType: "date" },
      },
    },
  },
});
db.dataset.createIndex({ sex: 1, labeled: 1 });
db.dataset.createIndex({ submitted_at: -1 });
print("✅ Colección 'dataset' lista");

// ─── COLECCIÓN: recordings ───────────────────────────────────────────────────
db.createCollection("recordings");
db.recordings.createIndex({ user_id: 1, date: -1 });
print("✅ Colección 'recordings' lista");

print("\n🎤 VocalIA - Base de datos inicializada correctamente");
