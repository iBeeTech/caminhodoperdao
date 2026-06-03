import React from "react";

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
  linkRow: { marginTop: "0.85rem", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  link: { fontSize: "0.85rem", color: "#2563eb", wordBreak: "break-all" },
};

const TUTORIAIS = [
  {
    titulo: "Cancelar compra da camiseta",
    gif: "/tutoriais/cancelar-camiseta.gif",
  },
  {
    titulo: "Cancelar inscrição",
    gif: "/tutoriais/cancelar-inscricao.gif",
  },
];

const TutoriaisPage: React.FC = () => {
  const [copied, setCopied] = React.useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const copy = (url: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied((c) => (c === url ? null : c)), 2000);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Tutoriais de Cancelamento</h1>
      <p style={styles.subtitle}>
        Veja o passo a passo de como cancelar sua compra de camiseta ou sua inscrição.
      </p>

      {TUTORIAIS.map((t) => {
        const fullUrl = `${origin}${t.gif}`;
        return (
          <div key={t.gif} style={styles.card}>
            <div style={styles.cardTitle}>{t.titulo}</div>
            <img src={t.gif} alt={t.titulo} style={styles.gif} />
            <div style={styles.linkRow}>
              <a href={t.gif} target="_blank" rel="noopener noreferrer" style={styles.link}>
                {fullUrl}
              </a>
              <button
                type="button"
                onClick={() => copy(fullUrl)}
                style={{
                  padding: "0.35rem 0.8rem",
                  borderRadius: 8,
                  border: "1px solid #1f7a3d",
                  background: copied === fullUrl ? "#1f7a3d" : "#fff",
                  color: copied === fullUrl ? "#fff" : "#1f7a3d",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {copied === fullUrl ? "Copiado!" : "Copiar link"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TutoriaisPage;
