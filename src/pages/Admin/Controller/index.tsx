import React from "react";
import AdminView from "../View/AdminView";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

const STORAGE_KEY = "admin_jwt";
const DEFAULT_EMAIL = "cassiotakarada7@gmail.com";

const AdminController: React.FC = () => {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [token, setToken] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState(DEFAULT_EMAIL);
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const verifyToken = React.useCallback(async (jwt: string) => {
    try {
      const response = await fetch("/api/admin/verify", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!response.ok) {
        throw new Error("invalid_token");
      }
      setStatus("authenticated");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setStatus("unauthenticated");
    }
  }, []);

  React.useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (!storedToken) {
      setStatus("unauthenticated");
      return;
    }
    setToken(storedToken);
    verifyToken(storedToken);
  }, [verifyToken]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Preencha email e senha.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const apiError = await readApiError(response);
        if (response.status === 401) {
          setError("Credenciais inválidas.");
        } else if (response.status === 500) {
          setError("Erro no servidor. Verifique a migração do admin.");
        } else {
          setError(apiError || "Não foi possível entrar.");
        }
        setStatus("unauthenticated");
        return;
      }
      const data = (await response.json()) as { token: string };
      localStorage.setItem(STORAGE_KEY, data.token);
      setToken(data.token);
      setStatus("authenticated");
      setPassword("");
    } catch {
      setError("Não foi possível entrar.");
      setStatus("unauthenticated");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!email || !password || !newPassword) {
      setError("Preencha email, senha atual e nova senha.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          currentPassword: password,
          newPassword,
        }),
      });
      if (!response.ok) {
        const apiError = await readApiError(response);
        if (response.status === 401) {
          setError("Credenciais inválidas.");
        } else if (response.status === 500) {
          setError("Erro no servidor. Verifique a migração do admin.");
        } else {
          setError(apiError || "Não foi possível trocar a senha.");
        }
        return;
      }
      setSuccess("Senha atualizada com sucesso.");
      setPassword("");
      setNewPassword("");
      setIsChangingPassword(false);
    } catch {
      setError("Não foi possível trocar a senha.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadReport = async (endpoint: string, filename: string) => {
    if (!token) {
      setError("Você precisa entrar novamente.");
      setStatus("unauthenticated");
      return;
    }
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("download_failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Não foi possível gerar a planilha. Tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AdminView
      status={status}
      email={email}
      password={password}
      newPassword={newPassword}
      error={error}
      success={success}
      isSubmitting={isSubmitting}
      isDownloading={isDownloading}
      isChangingPassword={isChangingPassword}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onNewPasswordChange={setNewPassword}
      onSubmit={handleLogin}
      onToggleChangePassword={() => {
        setError(null);
        setSuccess(null);
        setIsChangingPassword(prev => !prev);
      }}
      onChangePassword={handleChangePassword}
      onDownloadMonastery={() =>
        downloadReport("/api/admin/reports/monastery", "planilha-mosteiro.csv")
      }
      onDownloadInscritos={() =>
        downloadReport("/api/admin/reports/inscritos", "planilha-inscritos.csv")
      }
      onLogout={() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setStatus("unauthenticated");
        setPassword("");
        setNewPassword("");
        setError(null);
        setSuccess(null);
      }}
    />
  );
};

export default AdminController;

async function readApiError(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: string };
    return data?.error || null;
  } catch {
    return null;
  }
}

