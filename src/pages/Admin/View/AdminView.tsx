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
  OrangeButton,
  PrimaryButton,
  PurpleButton,
  ReportLink,
  SecondaryButton,
  SuccessText,
  YellowButton,
} from "./AdminView.styles";

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
  onLogout,
  onNewAdminEmailChange,
  onAddAdmin,
}) => {
  const { t } = useTranslation("admin");
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
            <SecondaryButton
              type="button"
              onClick={onDownloadPeregrinosGeral}
              disabled={isDownloading}
            >
              {t("panel.reportPeregrinosGeral")}
            </SecondaryButton>
            <OrangeButton
              type="button"
              onClick={onDownloadPeregrinosMosteiro}
              disabled={isDownloading}
            >
              {t("panel.reportPeregrinosMosteiro")}
            </OrangeButton>
            <YellowButton
              type="button"
              onClick={onDownloadStaffGeral}
              disabled={isDownloading}
            >
              {t("panel.reportStaffGeral")}
            </YellowButton>
            <PurpleButton type="button" onClick={onDownloadTshirt} disabled={isDownloading}>
              {t("panel.reportTshirt")}
            </PurpleButton>
            <DangerButton type="button" onClick={onLogout} disabled={isDownloading}>
              {t("panel.logout")}
            </DangerButton>
          </ButtonRow>
          {canManageAdmins && (
            <ReportLink type="button" onClick={onDownloadVendas} disabled={isDownloading}>
              {t("panel.reportVendas")}
            </ReportLink>
          )}
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

