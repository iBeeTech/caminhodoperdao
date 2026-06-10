import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Landing, Gallery, GalleryAlbum, ErrorPage, Admin, AdminEstorno, AdminTutoriais, AdminInscritos, AdminListaEspera, Staff, ResponsabilityTerms, Depoimentos, Testemunhos, AdminTestemunhos } from "./pages";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/gallery/:year" element={<GalleryAlbum />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/estorno" element={<AdminEstorno />} />
      <Route path="/tutoriais" element={<AdminTutoriais />} />
      <Route path="/admin/inscritos" element={<AdminInscritos />} />
      <Route path="/admin/lista-espera" element={<AdminListaEspera />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/depoimentos" element={<Depoimentos />} />
      <Route path="/testemunhos" element={<Testemunhos />} />
      <Route path="/admin/testemunhos" element={<AdminTestemunhos />} />
      <Route path="/responsabilityTerms" element={<ResponsabilityTerms />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<Navigate to="/error" replace />} />
    </Routes>
  );
};

export default AppRoutes;
