import React from "react";
import { useTranslation } from "react-i18next";
import AdminView from "../View/AdminView";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

const STORAGE_KEY = "admin_jwt";
const DEFAULT_EMAIL = "cassiotakarada7@gmail.com";

const AdminController: React.FC = () => {
  const { t } = useTranslation("admin");
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [token, setToken] = React.useState<string | null>(null);
  const [adminEmail, setAdminEmail] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState(DEFAULT_EMAIL);
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newAdminEmail, setNewAdminEmail] = React.useState("");
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = React.useState(false);

  const verifyToken = React.useCallback(async (jwt: string) => {
    try {
      const response = await fetch("/api/admin/verify", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!response.ok) {
        throw new Error("invalid_token");
      }
      const data = (await response.json()) as { email?: string };
      setAdminEmail(data.email ?? null);
      setStatus("authenticated");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setAdminEmail(null);
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
      setError(t("messages.fillEmailPassword"));
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
          setError(t("messages.invalidCredentials"));
        } else if (response.status === 500) {
          setError(t("messages.serverError"));
        } else {
          setError(apiError || t("messages.loginError"));
        }
        setStatus("unauthenticated");
        return;
      }
      const data = (await response.json()) as { token: string };
      localStorage.setItem(STORAGE_KEY, data.token);
      setToken(data.token);
      setAdminEmail(email.toLowerCase());
      setStatus("authenticated");
      setPassword("");
    } catch {
      setError(t("messages.loginError"));
      setStatus("unauthenticated");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!email || !password || !newPassword) {
      setError(t("messages.fillChangePassword"));
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
          setError(t("messages.invalidCredentials"));
        } else if (response.status === 500) {
          setError(t("messages.serverError"));
        } else {
          setError(apiError || t("messages.changePasswordError"));
        }
        return;
      }
      setSuccess(t("messages.passwordUpdated"));
      setPassword("");
      setNewPassword("");
      setIsChangingPassword(false);
    } catch {
      setError(t("messages.changePasswordError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!token) {
      setError(t("messages.reauth"));
      setStatus("unauthenticated");
      return;
    }
    if (!newAdminEmail) {
      setError(t("messages.addAdminEmailRequired"));
      return;
    }
    setIsAddingAdmin(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newAdminEmail }),
      });
      if (!response.ok) {
        const apiError = await readApiError(response);
        if (response.status === 403) {
          setError(t("messages.addAdminNoPermission"));
        } else {
          setError(apiError || t("messages.addAdminError"));
        }
        return;
      }
      setSuccess(t("messages.addAdminSuccess"));
      setNewAdminEmail("");
    } catch {
      setError(t("messages.addAdminError"));
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const downloadReport = async (endpoint: string, filename: string) => {
    if (!token) {
      setError(t("messages.reauth"));
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
      setError(t("messages.downloadError"));
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
      onDownloadPeregrinosGeral={() =>
        downloadReport(
          "/api/admin/reports/inscritos?staff=0&sleep=0",
          "peregrinos-geral.xls"
        )
      }
      onDownloadPeregrinosMosteiro={() =>
        downloadReport(
          "/api/admin/reports/inscritos?staff=0&sleep=1",
          "peregrinos-mosteiro.xls"
        )
      }
      onDownloadStaffGeral={() =>
        downloadReport("/api/admin/reports/inscritos?staff=1&sleep=0", "staff-geral.xls")
      }
      onDownloadStaffMosteiro={() =>
        downloadReport("/api/admin/reports/inscritos?staff=1&sleep=1", "staff-mosteiro.xls")
      }
      onDownloadTshirt={() =>
        downloadReport("/api/admin/reports/tshirt", "planilha-camisetas.xls")
      }
      onLogout={() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setStatus("unauthenticated");
        setPassword("");
        setNewPassword("");
        setNewAdminEmail("");
        setAdminEmail(null);
        setError(null);
        setSuccess(null);
      }}
      canManageAdmins={adminEmail?.toLowerCase() === DEFAULT_EMAIL}
      newAdminEmail={newAdminEmail}
      isAddingAdmin={isAddingAdmin}
      onNewAdminEmailChange={setNewAdminEmail}
      onAddAdmin={handleAddAdmin}
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

