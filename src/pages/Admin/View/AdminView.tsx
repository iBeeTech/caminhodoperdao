import React from "react";
import { useTranslation } from "react-i18next";
import {
  AdminCard,
  AdminContainer,
  AdminPage,
  AdminTitle,
  ButtonRow,
  ErrorText,
  FieldGroup,
  HelpText,
  InfoBox,
  Label,
  LinkButton,
  PrimaryButton,
  SecondaryButton,
  SecretBox,
  SuccessText,
} from "./AdminView.styles";

const dropTrigger: React.CSSProperties = {
  padding: "0.6rem 1.2rem", borderRadius: 8, border: "1px solid #1f7a3d", background: "#1f7a3d",
  color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem",
  display: "inline-flex", alignItems: "center", gap: 6,
};
const dropMenu: React.CSSProperties = {
  position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#fff",
  border: "1px solid #d1d5db", borderRadius: 10, boxShadow: "0 8px 22px rgba(0,0,0,0.14)",
  overflow: "hidden", zIndex: 30, minWidth: 240,
};
const dropItem: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left", padding: "0.65rem 1rem",
  border: "none", borderBottom: "1px solid #f1f1f1", background: "#fff", color: "#374151",
  fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
};

interface AdminViewProps {
  status: "loading" | "unauthenticated" | "forgot" | "must-change-password" | "authenticated";
  email: string;
  password: string;
  newPassword: string;
  confirmPassword: string;
  forgotEmail: string;
  forgotStep: "email" | "code" | "password" | "done";
  forgotCode: string;
  forgotNewPassword: string;
  forgotConfirmPassword: string;
  createdAdmin: { email: string; tempPassword: string } | null;
  error: string | null;
  success: string | null;
  isSubmitting: boolean;
  isDownloading: boolean;
  isAddingAdmin: boolean;
  canManageAdmins: boolean;
  newAdminEmail: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onForgotEmailChange: (value: string) => void;
  onForgotCodeChange: (value: string) => void;
  onForgotNewPasswordChange: (value: string) => void;
  onForgotConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onOpenForgot: () => void;
  onCloseForgot: () => void;
  onRestartForgot: () => void;
  onForgotPassword: () => void;
  onVerifyOtp: () => void;
  onResetPassword: () => void;
  onDismissCreatedAdmin: () => void;
  onChangePassword: () => void;
  onDownloadTotal: () => void;
  onDownloadStaffGeral: () => void;
  onDownloadPeregrinosGeral: () => void;
  onDownloadPeregrinosMosteiro: () => void;
  onDownloadTshirt: () => void;
  onDownloadCredPeregrinos: () => void;
  onDownloadCredStaff: () => void;
  onDownloadRetiradaCamisetas: () => void;
  onNewAdminEmailChange: (value: string) => void;
  onAddAdmin: () => void;
}

/** Submete no Enter sem recarregar a página. */
const handleSubmit = (action: () => void) => (event: React.FormEvent) => {
  event.preventDefault();
  action();
};

const AdminView: React.FC<AdminViewProps> = ({
  status,
  email,
  password,
  newPassword,
  confirmPassword,
  forgotEmail,
  forgotStep,
  forgotCode,
  forgotNewPassword,
  forgotConfirmPassword,
  createdAdmin,
  error,
  success,
  isSubmitting,
  isDownloading,
  isAddingAdmin,
  canManageAdmins,
  newAdminEmail,
  onEmailChange,
  onPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onForgotEmailChange,
  onForgotCodeChange,
  onForgotNewPasswordChange,
  onForgotConfirmPasswordChange,
  onSubmit,
  onOpenForgot,
  onCloseForgot,
  onRestartForgot,
  onForgotPassword,
  onVerifyOtp,
  onResetPassword,
  onDismissCreatedAdmin,
  onChangePassword,
  onDownloadTotal,
  onDownloadStaffGeral,
  onDownloadPeregrinosGeral,
  onDownloadPeregrinosMosteiro,
  onDownloadTshirt,
  onDownloadCredPeregrinos,
  onDownloadCredStaff,
  onDownloadRetiradaCamisetas,
  onNewAdminEmailChange,
  onAddAdmin,
}) => {
  const { t } = useTranslation("admin");
  const [openMenu, setOpenMenu] = React.useState<null | "completas" | "controle">(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Dropdown persiste: só fecha ao clicar fora ou apertar Esc (não no mouseleave).
  React.useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  if (status === "loading") {
    return (
      <AdminPage>
        <AdminContainer>
          <AdminCard>
            <AdminTitle>{t("loading")}</AdminTitle>
          </AdminCard>
        </AdminContainer>
      </AdminPage>
    );
  }

  if (status === "unauthenticated") {
    return (
      <AdminPage>
        <AdminContainer>
          {/* <form> para o Enter submeter; sem ele o campo não tem o que
              acionar e só o clique no botão funciona. */}
          <AdminCard as="form" onSubmit={handleSubmit(onSubmit)}>
            <AdminTitle>{t("login.title")}</AdminTitle>
            <FieldGroup>
              <Label htmlFor="admin-email">{t("login.emailLabel")}</Label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={event => onEmailChange(event.target.value)}
                placeholder={t("login.emailPlaceholder")}
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="admin-password">{t("login.passwordLabel")}</Label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={event => onPasswordChange(event.target.value)}
                placeholder={t("login.passwordPlaceholder")}
              />
            </FieldGroup>
            {error && <ErrorText>{error}</ErrorText>}
            {success && <SuccessText>{success}</SuccessText>}
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("login.submitting") : t("login.submit")}
            </PrimaryButton>
            {/* type="button": senão o Enter no campo dispararia este link. */}
            <LinkButton type="button" onClick={onOpenForgot} disabled={isSubmitting}>
              {t("login.forgotPassword")}
            </LinkButton>
          </AdminCard>
        </AdminContainer>
      </AdminPage>
    );
  }

  // "Esqueci minha senha": registra o pedido. A confirmação é sempre a mesma,
  // exista o e-mail ou não — a tela nunca revela quem é admin.
  if (status === "forgot") {
    // Cada passo tem o seu próprio submit; "done" não tem campo nenhum.
    const stepAction =
      forgotStep === "email"
        ? onForgotPassword
        : forgotStep === "code"
          ? onVerifyOtp
          : forgotStep === "password"
            ? onResetPassword
            : () => undefined;

    return (
      <AdminPage>
        <AdminContainer>
          <AdminCard as="form" onSubmit={handleSubmit(stepAction)}>
            <AdminTitle>
              {forgotStep === "code"
                ? t("forgot.codeTitle")
                : forgotStep === "password"
                  ? t("forgot.newPasswordTitle")
                  : t("forgot.title")}
            </AdminTitle>

            {forgotStep === "email" && (
              <>
                <HelpText>{t("forgot.help")}</HelpText>
                <FieldGroup>
                  <Label htmlFor="forgot-email">{t("login.emailLabel")}</Label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={event => onForgotEmailChange(event.target.value)}
                    placeholder={t("login.emailPlaceholder")}
                  />
                </FieldGroup>
                {error && <ErrorText>{error}</ErrorText>}
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("forgot.submitting") : t("forgot.submit")}
                </PrimaryButton>
                <SecondaryButton type="button" onClick={onCloseForgot} disabled={isSubmitting}>
                  {t("forgot.backToLogin")}
                </SecondaryButton>
              </>
            )}

            {forgotStep === "code" && (
              <>
                {/* Sem citar o e-mail digitado: a tela não confirma se ele existe. */}
                <HelpText>{t("forgot.codeHelp")}</HelpText>
                <FieldGroup>
                  <Label htmlFor="forgot-code">{t("forgot.codeLabel")}</Label>
                  <input
                    id="forgot-code"
                    // inputMode numérico abre o teclado de números no celular;
                    // autoComplete one-time-code deixa o sistema oferecer o
                    // código que acabou de chegar.
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={forgotCode}
                    onChange={event =>
                      onForgotCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder={t("forgot.codePlaceholder")}
                  />
                </FieldGroup>
                {error && <ErrorText>{error}</ErrorText>}
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("forgot.codeSubmitting") : t("forgot.codeSubmit")}
                </PrimaryButton>
                <SecondaryButton type="button" onClick={onRestartForgot} disabled={isSubmitting}>
                  {t("forgot.restart")}
                </SecondaryButton>
              </>
            )}

            {forgotStep === "password" && (
              <>
                <HelpText>{t("forgot.newPasswordHelp")}</HelpText>
                <FieldGroup>
                  <Label htmlFor="forgot-new-password">{t("changePassword.newLabel")}</Label>
                  <input
                    id="forgot-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={forgotNewPassword}
                    onChange={event => onForgotNewPasswordChange(event.target.value)}
                    placeholder={t("changePassword.newPlaceholder")}
                  />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="forgot-confirm-password">
                    {t("changePassword.confirmLabel")}
                  </Label>
                  <input
                    id="forgot-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={forgotConfirmPassword}
                    onChange={event => onForgotConfirmPasswordChange(event.target.value)}
                    placeholder={t("changePassword.confirmPlaceholder")}
                  />
                </FieldGroup>
                {error && <ErrorText>{error}</ErrorText>}
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("changePassword.submitting") : t("changePassword.submit")}
                </PrimaryButton>
                <SecondaryButton type="button" onClick={onRestartForgot} disabled={isSubmitting}>
                  {t("forgot.restart")}
                </SecondaryButton>
              </>
            )}

            {forgotStep === "done" && (
              <>
                <InfoBox role="status">
                  <strong>{t("forgot.doneTitle")}</strong>
                  <p style={{ margin: "6px 0 0" }}>{t("forgot.doneBody")}</p>
                </InfoBox>
                <PrimaryButton type="button" onClick={onCloseForgot}>
                  {t("forgot.backToLogin")}
                </PrimaryButton>
              </>
            )}
          </AdminCard>
        </AdminContainer>
      </AdminPage>
    );
  }

  // Primeiro acesso ou senha temporária. O servidor recusa este token em
  // qualquer outro endpoint, então não há como pular esta tela.
  if (status === "must-change-password") {
    return (
      <AdminPage>
        <AdminContainer>
          <AdminCard as="form" onSubmit={handleSubmit(onChangePassword)}>
            <AdminTitle>{t("changePassword.title")}</AdminTitle>
            <HelpText>{t("changePassword.help")}</HelpText>
            <FieldGroup>
              <Label htmlFor="new-password">{t("changePassword.newLabel")}</Label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={event => onNewPasswordChange(event.target.value)}
                placeholder={t("changePassword.newPlaceholder")}
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="confirm-password">{t("changePassword.confirmLabel")}</Label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={event => onConfirmPasswordChange(event.target.value)}
                placeholder={t("changePassword.confirmPlaceholder")}
              />
            </FieldGroup>
            {error && <ErrorText>{error}</ErrorText>}
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("changePassword.submitting") : t("changePassword.submit")}
            </PrimaryButton>
          </AdminCard>
        </AdminContainer>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminContainer>
        <AdminCard>
          <AdminTitle>{t("panel.title")}</AdminTitle>
          {error && <ErrorText>{error}</ErrorText>}
          {success && <SuccessText>{success}</SuccessText>}
          <ButtonRow>
            <div ref={menuRef} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {/* Planilhas Completas */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                style={dropTrigger}
                disabled={isDownloading}
                onClick={() => setOpenMenu((m) => (m === "completas" ? null : "completas"))}
              >
                Planilhas Completas <span style={{ fontSize: "0.7rem" }}>▾</span>
              </button>
              {openMenu === "completas" && (
                <div style={dropMenu}>
                  <button style={{ ...dropItem, fontWeight: 700, color: "#1f7a3d" }} onClick={() => { setOpenMenu(null); onDownloadTotal(); }}>
                    {t("panel.reportTotal")}
                  </button>
                  <button style={dropItem} onClick={() => { setOpenMenu(null); onDownloadPeregrinosGeral(); }}>
                    {t("panel.reportPeregrinosGeral")}
                  </button>
                  <button style={dropItem} onClick={() => { setOpenMenu(null); onDownloadPeregrinosMosteiro(); }}>
                    {t("panel.reportPeregrinosMosteiro")}
                  </button>
                  <button style={dropItem} onClick={() => { setOpenMenu(null); onDownloadStaffGeral(); }}>
                    {t("panel.reportStaffGeral")}
                  </button>
                  <button style={{ ...dropItem, borderBottom: "none" }} onClick={() => { setOpenMenu(null); onDownloadTshirt(); }}>
                    {t("panel.reportTshirt")}
                  </button>
                </div>
              )}
            </div>

            {/* Planilhas de Controle */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                style={dropTrigger}
                disabled={isDownloading}
                onClick={() => setOpenMenu((m) => (m === "controle" ? null : "controle"))}
              >
                Planilhas de Controle <span style={{ fontSize: "0.7rem" }}>▾</span>
              </button>
              {openMenu === "controle" && (
                <div style={dropMenu}>
                  <button style={dropItem} onClick={() => { setOpenMenu(null); onDownloadCredPeregrinos(); }}>
                    Credenciamento de Peregrinos
                  </button>
                  <button style={dropItem} onClick={() => { setOpenMenu(null); onDownloadCredStaff(); }}>
                    Credenciamento de Staff
                  </button>
                  <button style={{ ...dropItem, borderBottom: "none" }} onClick={() => { setOpenMenu(null); onDownloadRetiradaCamisetas(); }}>
                    Retirada de Camisetas
                  </button>
                </div>
              )}
            </div>
            </div>
          </ButtonRow>
          {canManageAdmins && (
            <FieldGroup>
              <Label htmlFor="admin-new-email">{t("panel.addAdminLabel")}</Label>
              <input
                id="admin-new-email"
                type="email"
                value={newAdminEmail}
                onChange={event => onNewAdminEmailChange(event.target.value)}
                placeholder={t("panel.addAdminPlaceholder")}
              />
              <PrimaryButton type="button" onClick={onAddAdmin} disabled={isAddingAdmin}>
                {isAddingAdmin ? t("panel.addingAdmin") : t("panel.addAdmin")}
              </PrimaryButton>

              {/* Único momento em que a senha temporária é visível: ela não fica
                  guardada em claro em lugar nenhum. */}
              {createdAdmin && (
                <SecretBox role="status">
                  <strong>{t("panel.adminCreatedTitle", { email: createdAdmin.email })}</strong>
                  <p style={{ margin: "6px 0 0" }}>{t("panel.adminCreatedBody")}</p>
                  <code>{createdAdmin.tempPassword}</code>
                  <p style={{ margin: "10px 0 0" }}>
                    <SecondaryButton type="button" onClick={onDismissCreatedAdmin}>
                      {t("panel.adminCreatedDismiss")}
                    </SecondaryButton>
                  </p>
                </SecretBox>
              )}
            </FieldGroup>
          )}
        </AdminCard>
      </AdminContainer>
    </AdminPage>
  );
};

export default AdminView;

