import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AdminView from "../View/AdminView";
import { clearAdminToken, getAdminToken, setAdminToken } from "../../../utils/auth/adminSession";

type AuthStatus =
  | "loading"
  | "unauthenticated"
  /** Pediu "Esqueci minha senha": percorre os passos de ForgotStep. */
  | "forgot"
  /** Entrou com senha temporária/primeiro acesso: só sai daqui trocando a senha. */
  | "must-change-password"
  | "authenticated";

/**
 * Passos do "esqueci minha senha": pede o e-mail, confirma o código de 6
 * dígitos recebido por e-mail e escolhe a senha nova.
 *
 * O código não loga em nada: ele só é trocado por uma autorização de curta
 * duração (resetToken) que serve unicamente para gravar a senha nova.
 */
type ForgotStep = "email" | "code" | "password" | "done";

/** Tela inicial do admin depois de entrar. */
const HOME_ROUTE = "/admin/inscritos";
const MIN_PASSWORD_LENGTH = 8;
/** Dígitos do código enviado por e-mail. Precisa casar com o backend (passwordOtp.ts). */
const OTP_CODE_LENGTH = 6;
/** Só o admin geral adiciona admins. Gate de UI; o servidor é quem decide. */
const SUPER_ADMIN_EMAIL = "cassiotakarada7@gmail.com";

const AdminController: React.FC = () => {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [token, setToken] = React.useState<string | null>(null);
  const [adminEmail, setAdminEmail] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [newAdminEmail, setNewAdminEmail] = React.useState("");
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [forgotStep, setForgotStep] = React.useState<ForgotStep>("email");
  const [forgotCode, setForgotCode] = React.useState("");
  const [forgotNewPassword, setForgotNewPassword] = React.useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = React.useState("");
  // challengeId e resetToken ficam só em memória e morrem ao sair da tela: são
  // credenciais de curta duração, não têm por que sobreviver a um refresh.
  const [challengeId, setChallengeId] = React.useState<string | null>(null);
  const [resetToken, setResetToken] = React.useState<string | null>(null);
  const [createdAdmin, setCreatedAdmin] = React.useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = React.useState(false);
  // Senha do login, guardada só em memória para a troca obrigatória logo em
  // seguida (change-password exige a senha atual). Nunca persistida.
  const pendingPasswordRef = React.useRef<string | null>(null);

  const signOutLocal = React.useCallback(() => {
    clearAdminToken();
    pendingPasswordRef.current = null;
    setToken(null);
    setAdminEmail(null);
    setStatus("unauthenticated");
  }, []);

  const verifyToken = React.useCallback(
    async (jwt: string) => {
      try {
        const response = await fetch("/api/admin/verify", {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (!response.ok) {
          throw new Error("invalid_token");
        }
        const data = (await response.json()) as { email?: string; mustChangePassword?: boolean };

        // Troca pendente sem a senha atual em memória (ex.: recarregou a
        // página): não dá para concluir a troca, então volta ao login.
        if (data.mustChangePassword) {
          signOutLocal();
          setError(t("messages.reloginToChangePassword"));
          return;
        }

        setAdminEmail(data.email ?? null);
        setStatus("authenticated");
      } catch {
        signOutLocal();
      }
    },
    [signOutLocal, t]
  );

  React.useEffect(() => {
    const storedToken = getAdminToken();
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
      const data = (await response.json()) as { token: string; mustChangePassword?: boolean };
      setAdminToken(data.token);
      setToken(data.token);
      setAdminEmail(email.toLowerCase());

      // Primeiro acesso ou senha temporária: o token só serve para trocar a
      // senha (o servidor recusa o resto), então prende na tela de troca.
      if (data.mustChangePassword) {
        pendingPasswordRef.current = password;
        setPassword("");
        setStatus("must-change-password");
        return;
      }

      setPassword("");
      setStatus("authenticated");
      navigate(HOME_ROUTE);
    } catch {
      setError(t("messages.loginError"));
      setStatus("unauthenticated");
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Troca obrigatória: usa a senha do login como senha atual. */
  const handleChangePassword = async () => {
    const currentPassword = pendingPasswordRef.current;
    if (!currentPassword) {
      signOutLocal();
      setError(t("messages.reloginToChangePassword"));
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError(t("messages.fillChangePassword"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("messages.passwordsDoNotMatch"));
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("messages.passwordTooShort", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword === currentPassword) {
      setError(t("messages.passwordMustDiffer"));
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
          currentPassword,
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
      // O token atual é de troca pendente e o servidor o recusa nos demais
      // endpoints: só um login novo emite um token utilizável.
      setNewPassword("");
      setConfirmPassword("");
      signOutLocal();
      setSuccess(t("messages.passwordUpdatedLoginAgain"));
    } catch {
      setError(t("messages.changePasswordError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Limpa tudo do fluxo de recuperação. Usado ao abrir, fechar e recomeçar. */
  const resetForgotFlow = React.useCallback(() => {
    setForgotStep("email");
    setForgotCode("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setChallengeId(null);
    setResetToken(null);
  }, []);

  /**
   * Passo 1: pede o código. O servidor responde igual exista o e-mail ou não —
   * inclusive devolvendo um challengeId de aparência idêntica —, então a tela
   * também não pode diferenciar: avança sempre para o passo do código.
   */
  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setError(t("messages.fillEmail"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (response.status === 429) {
        setError(t("messages.tooManyRequests"));
        return;
      }
      if (!response.ok) {
        setError(t("messages.resetError"));
        return;
      }
      const data = (await response.json()) as { challengeId?: string };
      if (!data.challengeId) {
        setError(t("messages.resetError"));
        return;
      }
      setChallengeId(data.challengeId);
      setForgotCode("");
      setForgotStep("code");
    } catch {
      setError(t("messages.resetError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Passo 2: troca o código de 6 dígitos pela autorização de redefinir. */
  const handleVerifyOtp = async () => {
    if (!challengeId) {
      resetForgotFlow();
      return;
    }
    const code = forgotCode.trim();
    if (code.length !== OTP_CODE_LENGTH) {
      setError(t("messages.fillCode"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      if (response.status === 429) {
        setError(t("messages.tooManyAttempts"));
        return;
      }
      if (!response.ok) {
        setError(t("messages.invalidCode"));
        return;
      }
      const data = (await response.json()) as { resetToken?: string };
      if (!data.resetToken) {
        setError(t("messages.resetError"));
        return;
      }
      setResetToken(data.resetToken);
      setForgotStep("password");
    } catch {
      setError(t("messages.resetError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Passo 3: grava a senha escolhida pela própria pessoa. */
  const handleResetPassword = async () => {
    if (!challengeId || !resetToken) {
      setError(t("messages.resetTokenExpired"));
      resetForgotFlow();
      return;
    }
    if (!forgotNewPassword || !forgotConfirmPassword) {
      setError(t("messages.fillChangePassword"));
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError(t("messages.passwordsDoNotMatch"));
      return;
    }
    if (forgotNewPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("messages.passwordTooShort", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, resetToken, newPassword: forgotNewPassword }),
      });
      if (!response.ok) {
        const apiError = await readApiError(response);
        if (apiError === "password_too_short") {
          setError(t("messages.passwordTooShort", { min: MIN_PASSWORD_LENGTH }));
        } else {
          setError(t("messages.resetTokenExpired"));
        }
        return;
      }
      // A senha nova já vale: some com os segredos de curta duração da memória.
      setChallengeId(null);
      setResetToken(null);
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setForgotCode("");
      setForgotStep("done");
    } catch {
      setError(t("messages.resetError"));
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
      const data = (await response.json()) as {
        created?: boolean;
        reason?: string;
        email?: string;
        tempPassword?: string;
      };
      if (!data.created) {
        setError(t("messages.addAdminAlreadyExists"));
        return;
      }
      // Única vez que a senha temporária aparece: não fica guardada em lugar
      // nenhum em claro. O super admin a repassa por fora.
      setCreatedAdmin({ email: data.email ?? newAdminEmail, tempPassword: data.tempPassword ?? "" });
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
      confirmPassword={confirmPassword}
      forgotEmail={forgotEmail}
      forgotStep={forgotStep}
      forgotCode={forgotCode}
      forgotNewPassword={forgotNewPassword}
      forgotConfirmPassword={forgotConfirmPassword}
      createdAdmin={createdAdmin}
      error={error}
      success={success}
      isSubmitting={isSubmitting}
      isDownloading={isDownloading}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onForgotEmailChange={setForgotEmail}
      onForgotCodeChange={setForgotCode}
      onForgotNewPasswordChange={setForgotNewPassword}
      onForgotConfirmPasswordChange={setForgotConfirmPassword}
      onSubmit={handleLogin}
      onOpenForgot={() => {
        setError(null);
        setSuccess(null);
        resetForgotFlow();
        setForgotEmail(email);
        setStatus("forgot");
      }}
      onCloseForgot={() => {
        setError(null);
        resetForgotFlow();
        setStatus("unauthenticated");
      }}
      onRestartForgot={() => {
        setError(null);
        resetForgotFlow();
      }}
      onForgotPassword={handleForgotPassword}
      onVerifyOtp={handleVerifyOtp}
      onResetPassword={handleResetPassword}
      onDismissCreatedAdmin={() => setCreatedAdmin(null)}
      onChangePassword={handleChangePassword}
      onDownloadTotal={() =>
        downloadReport("/api/admin/reports/total", "planilha-total.xlsx")
      }
      onDownloadPeregrinosGeral={() =>
        downloadReport(
          "/api/admin/reports/inscritos?staff=0",
          "peregrinos-geral.xlsx"
        )
      }
      onDownloadPeregrinosMosteiro={() =>
        downloadReport(
          "/api/admin/reports/inscritos?staff=0&sleep=1",
          "peregrinos-mosteiro.xlsx"
        )
      }
      onDownloadStaffGeral={() =>
        downloadReport("/api/admin/reports/inscritos?staff=1", "staff-geral.xlsx")
      }
      onDownloadTshirt={() =>
        downloadReport("/api/admin/reports/tshirt", "planilha-camisetas.xlsx")
      }
      onDownloadCredPeregrinos={() =>
        downloadReport(
          "/api/admin/reports/credenciamento?tipo=peregrinos",
          "credenciamento-peregrinos.xlsx"
        )
      }
      onDownloadCredStaff={() =>
        downloadReport(
          "/api/admin/reports/credenciamento?tipo=staff",
          "credenciamento-staff.xlsx"
        )
      }
      onDownloadRetiradaCamisetas={() =>
        downloadReport(
          "/api/admin/reports/credenciamento?tipo=camisetas",
          "retirada-camisetas.xlsx"
        )
      }
      canManageAdmins={adminEmail?.toLowerCase() === SUPER_ADMIN_EMAIL}
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

