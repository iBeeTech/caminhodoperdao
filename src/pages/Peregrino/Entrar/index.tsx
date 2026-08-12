import React from "react";
import { useNavigate } from "react-router-dom";
import { setUserToken } from "../../../utils/auth/userSession";
import { peregrinoStyles } from "../peregrino.styles";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";
import logo from "../../../assets/logo.png";

/**
 * Entrada do peregrino: entrar, criar conta e confirmar o e-mail.
 *
 * Os três passos moram na mesma tela de propósito. Quem cria a conta cai
 * direto na confirmação, e quem tenta entrar sem ter confirmado é levado para
 * lá em vez de bater numa parede — foi o motivo de o login ter um erro próprio
 * para "e-mail não confirmado".
 *
 * ⚠️ **Com as inscrições encerradas (flag `enrollment`), o formulário CONTINUA
 * na tela**, com um aviso em cima. Escondê-lo trancaria também quem está na
 * lista de exceção — e a lista existe exatamente para alguém entrar num
 * momento em que ninguém mais entra. Quem não está nela recebe a recusa do
 * servidor, que é quem decide de verdade.
 */

type Step = "login" | "signup" | "confirm";

const MIN_PASSWORD_LENGTH = 8;

/** A mesma frase do aviso e da recusa do servidor — uma explicação só. */
const CLOSED_MESSAGE =
  "As inscrições estão encerradas. Não é possível entrar nem criar conta no momento.";
const OTP_LENGTH = 6;

const s = peregrinoStyles;

const PeregrinoEntrar: React.FC = () => {
  const navigate = useNavigate();
  // Quem chegou pelo botão "Cadastrar-se" do cabeçalho já entra no passo de
  // criar conta: mostrar o formulário de login a quem disse que não tem conta é
  // fazer a pessoa procurar o link certo na tela.
  const [step, setStep] = React.useState<Step>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("cadastro") === "1"
      ? "signup"
      : "login"
  );
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);
  const { isEnabled: isEnrollmentOpen } = useFeatureFlags("enrollment");
  const isClosed = isEnrollmentOpen === false;

  // Quem entra cai na caminhada, não no cadastro: o dashboard é o que a pessoa
  // vem ver. O perfil fica a um clique, no menu da conta.
  const goToDashboard = (token: string) => {
    setUserToken(token);
    navigate("/dashboard");
  };

  const handleLogin = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
      };

      if (response.ok && data.token) {
        goToDashboard(data.token);
        return;
      }
      // Conta criada e nunca confirmada: leva para a confirmação em vez de
      // deixar a pessoa presa numa senha certa que não abre nada.
      if (data.error === "email_not_confirmed") {
        setCode("");
        setStep("confirm");
        setError(null);
        return;
      }
      if (data.error === "enrollment_closed") {
        setError(CLOSED_MESSAGE);
        return;
      }
      setError("E-mail ou senha incorretos.");
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignup = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(
          data.error === "enrollment_closed"
            ? CLOSED_MESSAGE
            : data.error === "password_too_short"
              ? `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
              : "Não foi possível criar a conta. Confira o e-mail e tente de novo."
        );
        return;
      }
      // O servidor responde igual exista a conta ou não — de propósito, para a
      // tela não virar detector de quem já tem cadastro. Então seguimos sempre
      // para a confirmação: quem já tinha conta recebeu um e-mail avisando.
      setCode("");
      setStep("confirm");
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirm = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/confirm-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
      };

      if (response.ok && data.token) {
        goToDashboard(data.token);
        return;
      }
      setError(
        data.error === "too_many_attempts"
          ? "Muitas tentativas erradas. Comece de novo para receber outro código."
          : "Código inválido ou expirado. Confira os números."
      );
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setIsBusy(false);
    }
  };

  const emailOk = email.includes("@") && email.includes(".");
  const canLogin = emailOk && password.length > 0;
  const canSignup = emailOk && password.length >= MIN_PASSWORD_LENGTH;
  const canConfirm = code.length === OTP_LENGTH;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isBusy) return;
    if (step === "login" && canLogin) handleLogin();
    if (step === "signup" && canSignup) handleSignup();
    if (step === "confirm" && canConfirm) handleConfirm();
  };

  return (
    <div style={s.centered}>
      <form style={s.card} onSubmit={submit}>
        <img src={logo} alt="Caminho do Perdão" style={s.logo} />
        {step === "confirm" ? (
          <>
            <h1 style={s.title}>Confirme seu e-mail</h1>
            <p style={s.help}>
              Enviamos um código de 6 dígitos para <strong>{email}</strong>. Ele vale por
              30 minutos. Não achou? Confira o lixo eletrônico.
            </p>
            {error && <div style={s.error}>{error}</div>}
            <div style={s.field}>
              <label style={s.label} htmlFor="otp">
                Código
              </label>
              <input
                id="otp"
                style={s.otpInput}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              style={{ ...s.primaryButton, ...(canConfirm && !isBusy ? {} : s.buttonOff) }}
              disabled={!canConfirm || isBusy}
            >
              {isBusy ? "Confirmando..." : "Confirmar"}
            </button>
            <button
              type="button"
              style={s.linkButton}
              onClick={() => {
                setStep("login");
                setError(null);
                setCode("");
              }}
            >
              Voltar
            </button>
          </>
        ) : (
          <>
            <h1 style={s.title}>{step === "login" ? "Entrar" : "Criar conta"}</h1>
            {isClosed && (
              <div style={s.error} role="status">
                {CLOSED_MESSAGE} Se a organização liberou o seu acesso, entre normalmente
                por aqui.
              </div>
            )}
            <p style={s.help}>
              {step === "login"
                ? "Entre para ver sua inscrição, seu histórico e seu credenciamento."
                : "Sua conta guarda suas inscrições e sua caminhada ao longo dos anos."}
            </p>
            {error && <div style={s.error}>{error}</div>}

            <div style={s.field}>
              <label style={s.label} htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                style={s.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="seu@email.com"
              />
            </div>

            <div style={s.field}>
              <label style={s.label} htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                style={s.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={step === "login" ? "current-password" : "new-password"}
                placeholder={
                  step === "login" ? "Sua senha" : `Pelo menos ${MIN_PASSWORD_LENGTH} caracteres`
                }
              />
            </div>

            <button
              type="submit"
              style={{
                ...s.primaryButton,
                ...((step === "login" ? canLogin : canSignup) && !isBusy ? {} : s.buttonOff),
              }}
              disabled={(step === "login" ? !canLogin : !canSignup) || isBusy}
            >
              {isBusy
                ? step === "login"
                  ? "Entrando..."
                  : "Criando..."
                : step === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>

            <button
              type="button"
              style={s.linkButton}
              onClick={() => {
                setStep(step === "login" ? "signup" : "login");
                setError(null);
                setPassword("");
              }}
            >
              {step === "login" ? "Não tenho conta — criar agora" : "Já tenho conta — entrar"}
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default PeregrinoEntrar;
