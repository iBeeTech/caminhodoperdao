import React from "react";
import { useTranslation } from "react-i18next";
import AdminNav from "../AdminNav";
import {
  AdminCard,
  AdminContainer,
  AdminPage,
  AdminTitle,
  ButtonRow,
  DangerButton,
  ErrorText,
  FieldGroup,
  Label,
  PrimaryButton,
  SecondaryButton,
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
  status: "loading" | "unauthenticated" | "authenticated";
  email: string;
  password: string;
  newPassword: string;
  error: string | null;
  success: string | null;
  isSubmitting: boolean;
  isDownloading: boolean;
  isChangingPassword: boolean;
  isAddingAdmin: boolean;
  canManageAdmins: boolean;
  newAdminEmail: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onToggleChangePassword: () => void;
  onChangePassword: () => void;
  onDownloadStaffGeral: () => void;
  onDownloadPeregrinosGeral: () => void;
  onDownloadPeregrinosMosteiro: () => void;
  onDownloadTshirt: () => void;
  onDownloadVendas: () => void;
  onDownloadCredPeregrinos: () => void;
  onDownloadCredStaff: () => void;
  onDownloadRetiradaCamisetas: () => void;
  onLogout: () => void;
  onNewAdminEmailChange: (value: string) => void;
  onAddAdmin: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({
  status,
  email,
  password,
  newPassword,
  error,
  success,
  isSubmitting,
  isDownloading,
  isChangingPassword,
  isAddingAdmin,
  canManageAdmins,
  newAdminEmail,
  onEmailChange,
  onPasswordChange,
  onNewPasswordChange,
  onSubmit,
  onToggleChangePassword,
  onChangePassword,
  onDownloadStaffGeral,
  onDownloadPeregrinosGeral,
  onDownloadPeregrinosMosteiro,
  onDownloadTshirt,
  onDownloadVendas,
  onDownloadCredPeregrinos,
  onDownloadCredStaff,
  onDownloadRetiradaCamisetas,
  onLogout,
  onNewAdminEmailChange,
  onAddAdmin,
}) => {
  const { t } = useTranslation("admin");
  const [openMenu, setOpenMenu] = React.useState<null | "completas" | "controle">(null);
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
          <AdminCard>
            <AdminTitle>{t("login.title")}</AdminTitle>
            <FieldGroup>
              <Label htmlFor="admin-email">{t("login.emailLabel")}</Label>
              <input
                id="admin-email"
                type="email"
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
                value={password}
                onChange={event => onPasswordChange(event.target.value)}
                placeholder={t("login.passwordPlaceholder")}
              />
            </FieldGroup>
            {isChangingPassword && (
              <FieldGroup>
                <Label htmlFor="admin-new-password">{t("login.newPasswordLabel")}</Label>
                <input
                  id="admin-new-password"
                  type="password"
                  value={newPassword}
                  onChange={event => onNewPasswordChange(event.target.value)}
                  placeholder={t("login.newPasswordPlaceholder")}
                />
              </FieldGroup>
            )}
            {error && <ErrorText>{error}</ErrorText>}
            {success && <SuccessText>{success}</SuccessText>}
            {isChangingPassword ? (
              <PrimaryButton type="button" onClick={onChangePassword} disabled={isSubmitting}>
                {isSubmitting ? t("login.changePasswordSubmitting") : t("login.changePasswordSubmit")}
              </PrimaryButton>
            ) : (
              <PrimaryButton type="button" onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting ? t("login.submitting") : t("login.submit")}
              </PrimaryButton>
            )}
            <SecondaryButton type="button" onClick={onToggleChangePassword} disabled={isSubmitting}>
              {isChangingPassword ? t("login.backToLogin") : t("login.toggleChangePassword")}
            </SecondaryButton>
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
          <AdminNav />
          {error && <ErrorText>{error}</ErrorText>}
          {success && <SuccessText>{success}</SuccessText>}
          <ButtonRow>
            {/* Planilhas Completas */}
            <div style={{ position: "relative" }} onMouseLeave={() => setOpenMenu(null)}>
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
                  <button style={dropItem} onClick={() => { setOpenMenu(null); onDownloadPeregrinosGeral(); }}>
                    {t("panel.reportPeregrinosGeral")}
                  </button>
                  <button style={dropItem} onClick={() => { setOpenMenu(null); onDownloadPeregrinosMosteiro(); }}>
                    {t("panel.reportPeregrinosMosteiro")}
                  </button>
                  <button style={dropItem} onClick={() => { setOpenMenu(null); onDownloadStaffGeral(); }}>
                    {t("panel.reportStaffGeral")}
                  </button>
                  <button style={dropItem} onClick={() => { setOpenMenu(null); onDownloadTshirt(); }}>
                    {t("panel.reportTshirt")}
                  </button>
                  {canManageAdmins && (
                    <button style={{ ...dropItem, borderBottom: "none" }} onClick={() => { setOpenMenu(null); onDownloadVendas(); }}>
                      {t("panel.reportVendas")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Planilhas de Controle */}
            <div style={{ position: "relative" }} onMouseLeave={() => setOpenMenu(null)}>
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

            <DangerButton type="button" onClick={onLogout} disabled={isDownloading}>
              {t("panel.logout")}
            </DangerButton>
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
            </FieldGroup>
          )}
        </AdminCard>
      </AdminContainer>
    </AdminPage>
  );
};

export default AdminView;

