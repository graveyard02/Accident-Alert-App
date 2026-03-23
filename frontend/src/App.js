import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import Home from "./pages/Home";
import All from "./pages/All"; // History page

function App() {
  return (
    <Router>
      <div style={{ padding: "10px" }}>
        <h1>🚑 Accident Alert System</h1>

        {/* 🔥 NAVBAR */}
        <nav style={{ marginBottom: "20px" }}>
          <Link to="/" style={linkStyle}>🏠 Home</Link>
          <Link to="/all" style={linkStyle}>📜 History</Link>
        </nav>

        {/* 🔀 ROUTES */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/all" element={<All />} />
        </Routes>
      </div>
    </Router>
  );
}

const linkStyle = {
  marginRight: "15px",
  textDecoration: "none",
  fontWeight: "bold",
  color: "#333",
};

export default App;