import React from "react";
import { Landing, Gallery } from "./pages";
import "./App.css";

function App() {
  const path = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") || "/" : "/";
  const isGalleryPage = path === "/gallery";
  return (
    <div className="App">
      {isGalleryPage ? <Gallery /> : <Landing />}
    </div>
  );
}

export default App;
