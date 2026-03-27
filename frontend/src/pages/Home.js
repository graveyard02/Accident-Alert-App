import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
};

function Home() {
  const [accidents, setAccidents] = useState([]);
  const mapRef = useRef(null);
  const prevCount = useRef(0);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  // 🔄 Fetch accidents
  const fetchAccidents = async () => {
    try {
      const res = await axios.get(
        "http://localhost:4000/api/accidents/active"
      );

      if (JSON.stringify(res.data) !== JSON.stringify(accidents)) {
        setAccidents(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 🔁 Poll every 3 sec
  useEffect(() => {
    fetchAccidents();
    const interval = setInterval(fetchAccidents, 3000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 Move + Zoom ONLY when new accident added
  useEffect(() => {
    if (!mapRef.current || accidents.length === 0) return;

    if (accidents.length > prevCount.current) {
      const latest = accidents[0];

      const position = {
        lat: Number(latest.latitude),
        lng: Number(latest.longitude),
      };

      mapRef.current.panTo(position);
      mapRef.current.setZoom(
        latest.severity === "high" ? 16 : 14
      );

      prevCount.current = accidents.length;
    }
  }, [accidents]);

  if (!isLoaded) return <div>Loading Map...</div>;

  // ✅ Show only active accidents
  const activeAccidents = accidents.filter(
    (a) => !(a.police_responded && a.hospital_responded)
  );

  return (
    <div style={{ display: "flex", height: "90vh" }}>
      
      {/* 🗺 MAP */}
      <div style={{ width: "70%" }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          defaultCenter={{ lat: 12.9716, lng: 77.5946 }} // ✅ no reset
          defaultZoom={5}
          onLoad={(map) => (mapRef.current = map)}
        >
          {activeAccidents.map((a) => (
            <Marker
              key={a.id}
              position={{
                lat: Number(a.latitude),
                lng: Number(a.longitude),
              }}
            />
          ))}
        </GoogleMap>
      </div>

      {/* 📋 SIDE PANEL */}
      <div
        style={{
          width: "30%",
          padding: "15px",
          overflowY: "scroll",
          background: "#f5f5f5",
          borderLeft: "2px solid #ddd",
        }}
      >
        <h2>🚨 Active Accidents</h2>

        {activeAccidents.length === 0 ? (
          <p>No active accidents</p>
        ) : (
          activeAccidents.map((a, index) => (
            <div
              key={a.id}
              style={{
                background: "#fff",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "8px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                cursor: "pointer",
              }}
              onClick={() => {
                mapRef.current.panTo({
                  lat: Number(a.latitude),
                  lng: Number(a.longitude),
                });
                mapRef.current.setZoom(15);
              }}
            >
              <h4>Accident #{index + 1}</h4>

              <p><b>📍 Lat:</b> {a.latitude}</p>
              <p><b>📍 Lng:</b> {a.longitude}</p>

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
                🚓 Police: {a.police_responded ? "✔" : "❌"} | 
                🚑 Ambulance: {a.hospital_responded ? "✔" : "❌"}
              </p>

              {/* 🚓 POLICE BUTTON */}
              <button
                style={{
                  marginRight: "10px",
                  background: a.police_responded ? "gray" : "blue",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
                disabled={a.police_responded}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await axios.put(
                      `http://localhost:4000/api/accident/${a.id}/police/responded`
                    );
                    fetchAccidents();
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                🚓 Police Responded
              </button>

              {/* 🚑 AMBULANCE BUTTON */}
              <button
                style={{
                  background: a.hospital_responded ? "gray" : "green",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
                disabled={a.hospital_responded}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await axios.put(
                      `http://localhost:4000/api/accident/${a.id}/hospital/responded`
                    );
                    fetchAccidents();
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                🚑 Ambulance Responded
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Home;