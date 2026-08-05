import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Landing, Gallery, GalleryAlbum, ErrorPage, AdminPainel, AdminPlanilhas, AdminEstorno, AdminInscritos, AdminCredenciamento, AdminListaEspera, AdminPernoiteExtra, Staff, ResponsabilityTerms, Depoimentos, Testemunhos, AdminTestemunhos, Convite, AdminConvites, AdminConvidarGrupo, AdminInfoMosteiro, AdminPassarCpf, AdminPedidosSenha, AdminInscricaoManual, AdminContas, PeregrinoEntrar, PeregrinoPerfil, PeregrinoDashboard, PeregrinoMedalhas, UploadFotos } from "./pages";
import AdminLayout from "./pages/Admin/AdminLayout";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/gallery/:year" element={<GalleryAlbum />} />
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminPainel />} />
        <Route path="/admin/planilhas" element={<AdminPlanilhas />} />
        <Route path="/admin/estorno" element={<AdminEstorno />} />
        <Route path="/admin/inscritos" element={<AdminInscritos />} />
        <Route path="/admin/credenciamento" element={<AdminCredenciamento />} />
        <Route path="/admin/lista-espera" element={<AdminListaEspera />} />
        <Route path="/admin/pernoiteExtra" element={<AdminPernoiteExtra />} />
        <Route path="/admin/convites" element={<AdminConvites />} />
        <Route path="/admin/convidar-grupo" element={<AdminConvidarGrupo />} />
        <Route path="/admin/info-mosteiro" element={<AdminInfoMosteiro />} />
        <Route path="/admin/testemunhos" element={<AdminTestemunhos />} />
        <Route path="/admin/passar-cpf" element={<AdminPassarCpf />} />
        <Route path="/admin/pedidos-senha" element={<AdminPedidosSenha />} />
        <Route path="/admin/inscricao-manual" element={<AdminInscricaoManual />} />
        <Route path="/admin/contas" element={<AdminContas />} />
      </Route>
      <Route path="/entrar" element={<PeregrinoEntrar />} />
      <Route path="/dashboard" element={<PeregrinoDashboard />} />
      <Route path="/perfil" element={<PeregrinoPerfil />} />
      <Route path="/medalhas" element={<PeregrinoMedalhas />} />
      {/* Link com segredo e prazo, entregue ao fotógrafo. Fora do /admin de
          propósito: quem envia as fotos não tem conta no painel. */}
      <Route path="/upload-fotos" element={<UploadFotos />} />
      <Route path="/convite" element={<Convite />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/depoimentos" element={<Depoimentos />} />
      <Route path="/testemunhos" element={<Testemunhos />} />
      <Route path="/responsabilityTerms" element={<ResponsabilityTerms />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<Navigate to="/error" replace />} />
    </Routes>
  );
};

export default AppRoutes;
