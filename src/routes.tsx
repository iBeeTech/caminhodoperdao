import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Landing, Gallery, ErrorPage } from "./pages";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
};

export default AppRoutes;
