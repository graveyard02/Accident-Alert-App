// ==================== Imports ====================
const express = require("express");
const cors = require("cors");
const axios = require("axios");

// ==================== Firebase Setup ====================
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ==================== App Setup ====================
const app = express();
app.use(cors());
app.use(express.json());

// ==================== Fast2SMS ====================
const FAST2SMS_API_KEY = "Na4X2WGcQ2mHPZpahaW4cgzJfBArtdFbKR23oBhKTtKzsC1WbQU3Bn8NPXVW";

// ==================== Send SMS ====================
async function sendAlert(contact, msg) {
  try {
    const number = contact.contact_info.replace(/\D/g, "").slice(-10);

    console.log("📞 Sending SMS to:", number);

    const response = await axios.get(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        params: {
          authorization: FAST2SMS_API_KEY,
          route: "q",
          message: msg,
          numbers: number,
        },
      }
    );

    console.log("✅ SMS Response:", response.data);
  } catch (err) {
    console.error("❌ SMS Failed:", err.response?.data || err.message);
  }
}

// ==================== Severity ====================
function calculateSeverity(speed) {
  if (speed === undefined || speed === null) return "medium";
  if (speed > 70) return "high";
  if (speed >= 30) return "medium";
  return "low";
}

// ==================== Distance (KM) ====================
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ==================== REPORT ACCIDENT ====================
app.post("/api/accident", async (req, res) => {
  try {
    let { latitude, longitude, speed } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: "Latitude & longitude required",
      });
    }

    if (speed < 0) speed = 0;

    console.log("📍 Accident:", latitude, longitude, "Speed:", speed);

    const severity = calculateSeverity(speed);

    let accidentRef;

try {
  accidentRef = await db.collection("accidents").add({
    latitude,
    longitude,
    severity,
    responded: false,
    police_responded: false,
    hospital_responded: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    alert_sent_at: null,
    responded_at: null,
  });

  console.log("✅ Stored in Firestore:", accidentRef.id);

} catch (error) {
  console.error("❌ Firestore Error:", error);
  return res.status(500).json({ error: "Firestore failed" });
}

    // ---------- Find nearest contacts ----------
    const contactsSnap = await db.collection("emergency_contacts").get();

    let police = null;
    let hospital = null;
    let minPolice = Infinity;
    let minHospital = Infinity;

    contactsSnap.forEach((doc) => {
      const c = doc.data();

      const d = distance(latitude, longitude, c.latitude, c.longitude);

      if (c.type === "police" && d < minPolice) {
        minPolice = d;
        police = c;
      }

      if (c.type === "hospital" && d < minHospital) {
        minHospital = d;
        hospital = c;
      }
    });

    // ---------- Message ----------
    const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    const msg = `🚨 Accident Alert!
Location: ${latitude}, ${longitude}
Severity: ${severity}
Navigate: ${mapsLink}`;

    // ---------- Send Alerts ----------
    if (police) await sendAlert(police, msg);
    if (severity !== "low" && hospital) await sendAlert(hospital, msg);

    await accidentRef.update({
      alert_sent_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Accident reported", severity });
  } catch (err) {
    console.error("❌ Accident Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== GET ACTIVE ACCIDENTS ====================
app.get("/api/accidents/active", async (req, res) => {
  try {
    const snap = await db
      .collection("accidents")
      .where("responded", "==", false)
      .orderBy("timestamp", "desc")
      .get();

    res.json(
      snap.docs.map((d) => {
        const data = d.data();

        return {
          id: d.id,
          ...data,
          timestamp: data.timestamp
            ? data.timestamp.toDate().toISOString()
            : null,
          alert_sent_at: data.alert_sent_at
            ? data.alert_sent_at.toDate().toISOString()
            : null,
          responded_at: data.responded_at
            ? data.responded_at.toDate().toISOString()
            : null,
        };
      })
    );
  } catch (err) {
    console.error("❌ Read Error:", err);
    res.status(500).json({ error: "Read failed" });
  }
});

// ==================== GET ALL ACCIDENTS ====================
app.get("/api/accidents/all", async (req, res) => {
  try {
    const snap = await db
      .collection("accidents")
      .orderBy("timestamp", "desc")
      .get();

    res.json(
      snap.docs.map((d) => {
        const data = d.data();

        return {
          id: d.id,
          ...data,
          timestamp: data.timestamp
            ? data.timestamp.toDate().toISOString()
            : null,
          alert_sent_at: data.alert_sent_at
            ? data.alert_sent_at.toDate().toISOString()
            : null,
          responded_at: data.responded_at
            ? data.responded_at.toDate().toISOString()
            : null,
        };
      })
    );
  } catch (err) {
    console.error("❌ Read Error:", err);
    res.status(500).json({ error: "Read failed" });
  }
});

// ==================== POLICE RESPONDED ====================
app.put("/api/accident/:id/police/responded", async (req, res) => {
  try {
    const ref = db.collection("accidents").doc(req.params.id);

    await ref.update({ police_responded: true });

    const doc = await ref.get();
    const d = doc.data();

    if (d.police_responded && d.hospital_responded) {
      await ref.update({
        responded: true,
        responded_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({ message: "Police responded" });
  } catch (err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ==================== HOSPITAL RESPONDED ====================
app.put("/api/accident/:id/hospital/responded", async (req, res) => {
  try {
    const ref = db.collection("accidents").doc(req.params.id);

    await ref.update({ hospital_responded: true });

    const doc = await ref.get();
    const d = doc.data();

    if (d.police_responded && d.hospital_responded) {
      await ref.update({
        responded: true,
        responded_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({ message: "Hospital responded" });
  } catch (err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ==================== SERVER ====================
app.listen(4000, () => {
  console.log("🚀 Server running at http://localhost:4000");
});
