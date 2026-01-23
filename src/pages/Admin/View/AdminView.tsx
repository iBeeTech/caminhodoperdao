import React from "react";
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
  onDownloadMonastery: () => void;
  onDownloadInscritos: () => void;
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
  onDownloadMonastery,
  onDownloadInscritos,
  onLogout,
  onNewAdminEmailChange,
  onAddAdmin,
}) => {
  if (status === "loading") {
    return (
      <AdminPage>
        <AdminContainer>
          <AdminCard>
            <AdminTitle>Carregando...</AdminTitle>
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
            <AdminTitle>Administração</AdminTitle>
            <FieldGroup>
              <Label htmlFor="admin-email">Email</Label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={event => onEmailChange(event.target.value)}
                placeholder="Seu email"
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="admin-password">Senha</Label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={event => onPasswordChange(event.target.value)}
                placeholder="Sua senha"
              />
            </FieldGroup>
            {isChangingPassword && (
              <FieldGroup>
                <Label htmlFor="admin-new-password">Nova senha</Label>
                <input
                  id="admin-new-password"
                  type="password"
                  value={newPassword}
                  onChange={event => onNewPasswordChange(event.target.value)}
                  placeholder="Nova senha"
                />
              </FieldGroup>
            )}
            {error && <ErrorText>{error}</ErrorText>}
            {success && <SuccessText>{success}</SuccessText>}
            {isChangingPassword ? (
              <PrimaryButton type="button" onClick={onChangePassword} disabled={isSubmitting}>
                {isSubmitting ? "Atualizando..." : "Atualizar senha"}
              </PrimaryButton>
            ) : (
              <PrimaryButton type="button" onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Entrando..." : "Entrar"}
              </PrimaryButton>
            )}
            <SecondaryButton type="button" onClick={onToggleChangePassword} disabled={isSubmitting}>
              {isChangingPassword ? "Voltar ao login" : "Trocar senha"}
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
          <AdminTitle>Central de Planilhas</AdminTitle>
          {error && <ErrorText>{error}</ErrorText>}
          {success && <SuccessText>{success}</SuccessText>}
          <ButtonRow>
            <PrimaryButton type="button" onClick={onDownloadMonastery} disabled={isDownloading}>
              Gerar e Baixar Planilha Mosteiro
            </PrimaryButton>
            <SecondaryButton type="button" onClick={onDownloadInscritos} disabled={isDownloading}>
              Gerar e Baixar Planilha de Inscritos
            </SecondaryButton>
            <DangerButton type="button" onClick={onLogout} disabled={isDownloading}>
              Sair
            </DangerButton>
          </ButtonRow>
          {canManageAdmins && (
            <FieldGroup>
              <Label htmlFor="admin-new-email">Adicionar admin</Label>
              <input
                id="admin-new-email"
                type="email"
                value={newAdminEmail}
                onChange={event => onNewAdminEmailChange(event.target.value)}
                placeholder="email@dominio.com"
              />
              <PrimaryButton type="button" onClick={onAddAdmin} disabled={isAddingAdmin}>
                {isAddingAdmin ? "Adicionando..." : "Adicionar"}
              </PrimaryButton>
            </FieldGroup>
          )}
        </AdminCard>
      </AdminContainer>
    </AdminPage>
  );
};

export default AdminView;

