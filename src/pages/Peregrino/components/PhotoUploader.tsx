import React from "react";
import { theme } from "../../../styles/theme";
import { PHOTO_CACHE_KEY } from "../../../components/molecules/Header/AccountMenu";
import { SessionExpiredError, deletePhoto, fetchPhoto, uploadPhoto } from "../api";

/**
 * Foto de perfil: escolher, ver e remover.
 *
 * A imagem é REDUZIDA NO NAVEGADOR antes de subir — recorte quadrado no centro,
 * 256px, JPEG. Foto de celular hoje tem 4 MB; subir isso para desenhar um
 * círculo de 40px gastaria banda de quem está no 4G no meio do caminho e
 * encheria o KV à toa. Depois do corte sobram ~25 KB.
 *
 * Ao trocar a foto, o cache do cabeçalho é limpo na hora: sem isso o avatar do
 * topo só mudaria na próxima aba aberta, e a pessoa acharia que não salvou.
 */

const c = theme.colors;

/** Lado do quadrado final. 256 dá nitidez em tela retina num avatar de 40-96px. */
const OUTPUT_SIZE = 256;
const JPEG_QUALITY = 0.85;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: "50%",
    border: `3px solid ${c.gold}`,
    background: `linear-gradient(150deg, ${c.goldSoft} 0%, ${c.gold} 100%)`,
    color: "#4a3105",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 30,
    fontWeight: 800,
    overflow: "hidden",
    flexShrink: 0,
  },
  image: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  actions: { display: "flex", flexDirection: "column", gap: 8 },
  button: {
    padding: "0.55rem 1rem",
    borderRadius: theme.radius.sm,
    border: `1px solid ${c.border}`,
    background: c.surface,
    color: c.text,
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  remove: { border: "none", background: "none", color: "#b91c1c", fontSize: "0.85rem", cursor: "pointer", padding: 0, textAlign: "left" },
  hint: { color: c.muted, fontSize: 12, margin: 0, lineHeight: 1.5 },
  error: { color: "#b91c1c", fontSize: 12, margin: 0 },
};

/** Recorta o centro em quadrado e devolve a data URL já reduzida. */
async function shrinkToSquare(file: File): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("invalid_image"));
      element.src = bitmapUrl;
    });

    const side = Math.min(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_unavailable");

    context.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

interface PhotoUploaderProps {
  /** Carimbo da foto atual, vindo de `/api/me`. Nulo = sem foto. */
  photoUpdatedAt: number | null;
  fallbackInitial: string;
  onChanged: (photoUpdatedAt: number | null) => void;
  onSessionExpired: () => void;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photoUpdatedAt,
  fallbackInitial,
  onChanged,
  onSessionExpired,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!photoUpdatedAt) {
      setPreview(null);
      return;
    }
    let isActive = true;
    fetchPhoto().then(url => {
      if (isActive) setPreview(url);
    });
    return () => {
      isActive = false;
    };
  }, [photoUpdatedAt]);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("Imagem muito grande. Tente uma foto menor.");
      return;
    }
    setIsBusy(true);
    try {
      const dataUrl = await shrinkToSquare(file);
      const saved = await uploadPhoto(dataUrl);
      // Mostra o recorte local na hora, sem esperar o servidor devolver a
      // imagem de volta — ela é exatamente a que acabamos de mandar.
      setPreview(dataUrl);
      sessionStorage.setItem(PHOTO_CACHE_KEY, dataUrl);
      onChanged(saved.photoUpdatedAt);
    } catch (uploadError) {
      if (uploadError instanceof SessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError("Não foi possível salvar a foto. Tente de novo.");
    } finally {
      setIsBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await deletePhoto();
      setPreview(null);
      sessionStorage.setItem(PHOTO_CACHE_KEY, "none");
      onChanged(null);
    } catch (removeError) {
      if (removeError instanceof SessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError("Não foi possível remover a foto.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div style={styles.row}>
      <div style={styles.avatar}>
        {preview ? <img src={preview} alt="Sua foto" style={styles.image} /> : fallbackInitial}
      </div>

      <div style={styles.actions}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          style={styles.button}
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
        >
          {isBusy ? "Enviando..." : preview ? "Trocar foto" : "Escolher foto"}
        </button>
        {preview && !isBusy && (
          <button type="button" style={styles.remove} onClick={handleRemove}>
            Remover foto
          </button>
        )}
        <p style={styles.hint}>
          A imagem é recortada em quadrado e reduzida no seu aparelho antes de subir.
        </p>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
};

export default PhotoUploader;
