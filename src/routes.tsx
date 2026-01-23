import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Landing, Gallery, GalleryAlbum, ErrorPage, Admin } from "./pages";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/gallery/:year" element={<GalleryAlbum />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<Navigate to="/error" replace />} />
    </Routes>
  );
};

export default AppRoutes;
