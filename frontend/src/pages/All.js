import React, { useEffect, useState } from "react";
import axios from "axios";

function All() {
  const [accidents, setAccidents] = useState([]);

  // ✅ Fetch all accidents
  const fetchAllAccidents = async () => {
    try {
      const res = await axios.get(
        "http://localhost:4000/api/accidents/all"
      );
      console.log("ALL DATA:", res.data); // 🔍 debug
      setAccidents(res.data);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  useEffect(() => {
    fetchAllAccidents();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>📜 Accident History</h2>

      {accidents.length === 0 ? (
        <p>No accident history found</p>
      ) : (
        accidents.map((a, index) => (
          <div
            key={a.id}
            style={{
              background: "#fff",
              padding: "15px",
              marginBottom: "10px",
              borderRadius: "10px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              borderLeft: `5px solid ${
                a.responded ? "green" : "red"
              }`,
            }}
          >
            <h4>Accident #{index + 1}</h4>

            <p><b>📍 Latitude:</b> {a.latitude}</p>
            <p><b>📍 Longitude:</b> {a.longitude}</p>

            <p>
              <b>⚠ Severity:</b>{" "}
              <span
                style={{
                  color:
                    a.severity === "high"
                      ? "red"
                      : a.severity === "medium"
                      ? "orange"
                      : "green",
                }}
              >
                {a.severity}
              </span>
            </p>

            <p>
              <b>🕒 Time:</b>{" "}
              {a.timestamp
                ? new Date(a.timestamp).toLocaleString()
                : "N/A"}
            </p>

            <p>
              <b>Status:</b>{" "}
              <span
                style={{
                  color: a.responded ? "green" : "red",
                  fontWeight: "bold",
                }}
              >
                {a.responded ? "Resolved ✅" : "Active 🚨"}
              </span>
            </p>

            <p>
              🚓 Police: {a.police_responded ? "✔" : "❌"} | 🚑 Ambulance:{" "}
              {a.hospital_responded ? "✔" : "❌"}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

export default All;