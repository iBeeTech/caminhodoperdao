import React from "react";
import { useSearchParams } from "react-router-dom";

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 760, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.5rem", marginBottom: "0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.5rem", fontSize: "0.95rem" },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "1.25rem",
    marginBottom: "1.75rem",
    background: "#fff",
  },
  cardTitle: { fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.75rem", color: "#1f7a3d" },
  gif: { width: "100%", maxWidth: 440, display: "block", margin: "0 auto", borderRadius: 10, border: "1px solid #eee" },
};

const TUTORIAIS = [
  {
    tipo: "camiseta",
    titulo: "Cancelar compra da camiseta",
    gif: "/tutoriais/cancelar-camiseta.gif",
  },
  {
    tipo: "inscricao",
    titulo: "Cancelar inscrição",
    gif: "/tutoriais/cancelar-inscricao.gif",
  },
];

const TutoriaisPage: React.FC = () => {
  const [params] = useSearchParams();
  const tipo = params.get("tipo");
  const lista = TUTORIAIS.filter((t) => !tipo || t.tipo === tipo);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Tutoriais de Cancelamento</h1>
      <p style={styles.subtitle}>
        Veja o passo a passo de como cancelar sua compra de camiseta ou sua inscrição.
      </p>

      {lista.map((t) => (
        <div key={t.gif} style={styles.card}>
          <div style={styles.cardTitle}>{t.titulo}</div>
          <img src={t.gif} alt={t.titulo} style={styles.gif} />
        </div>
      ))}
    </div>
  );
};

export default TutoriaisPage;
