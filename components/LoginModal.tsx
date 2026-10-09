// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, ArrowRight, User, Phone, Instagram, Upload, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { useSignUp, useSignIn, useClerk } from "@clerk/nextjs";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialView?: "login" | "register";
}

type VerifyMode = "signup" | "signin_first" | "signin_mfa";

const ERROR_PT: Record<string, string> = {
  form_identifier_exists: "Já existe uma conta com esse e-mail. Faça login.",
  form_identifier_not_found: "Não encontramos uma conta com esse e-mail.",
  form_password_incorrect: "Senha incorreta.",
  form_password_pwned: "Essa senha apareceu em vazamentos de dados. Escolha outra.",
  form_password_not_strong_enough: "Senha fraca. Use letras, números e símbolos.",
  form_password_validation_failed: "Senha inválida.",
  form_param_format_invalid: "Formato inválido. Confira o e-mail digitado.",
  form_code_incorrect: "Código incorreto.",
  verification_expired: "O código expirou. Peça um novo.",
  verification_failed: "Muitas tentativas. Peça um novo código.",
  too_many_requests: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  captcha_invalid: "Falha na verificação anti-bot. Recarregue a página e tente de novo.",
  captcha_missing_token: "Falha na verificação anti-bot. Recarregue a página e tente de novo.",
  session_exists: "Você já está logado.",
};

function errMsg(e: any, fallback = "Algo deu errado. Tente novamente."): string {
  if (!e) return fallback;
  const first = e.errors?.[0] || e;
  const code = first.code || e.code;
  if (code === "form_password_length_too_short") {
    const min = String(first.longMessage || first.message || "").match(/\d+/)?.[0];
    return min ? `A senha precisa ter pelo menos ${min} caracteres.` : "A senha é muito curta.";
  }
  if (code && ERROR_PT[code]) return ERROR_PT[code];
  return first.longMessage || first.message || e.message || fallback;
}

export function LoginModal({ isOpen, onClose, onSuccess, initialView = "login" }: LoginModalProps) {
  const clerk = useClerk();
  const { signUp } = useSignUp();
  const { signIn } = useSignIn();

  const [view, setView] = useState<"login" | "register" | "forgot">(initialView);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verifyMode, setVerifyMode] = useState<VerifyMode>("signup");
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [code, setCode] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setPendingVerification(false);
      setResetCodeSent(false);
      setErrorMsg("");
      setInfoMsg("");
      setResendCooldown(0);
      setPassword("");
      setCode("");
    }
  }, [isOpen, initialView]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const notReady = () => {
    setErrorMsg("Conectando ao servidor de autenticação... aguarde um segundo e tente de novo.");
  };

  const finish = async (resource: any) => {
    const { error } = await resource.finalize();
    if (error) {
      setErrorMsg(errMsg(error));
      return;
    }
    if (foto && clerk.user) {
      try {
        await clerk.user.setProfileImage({ file: foto });
      } catch (e) {
        console.error("Falha ao enviar foto de perfil:", e);
      }
    }
    if (onSuccess) {
      onSuccess();
    } else {
      onClose();
      window.location.reload();
    }
  };

  const sendCode = async (mode: VerifyMode) => {
    if (mode === "signup") return signUp.verifications.sendEmailCode();
    if (mode === "signin_first") return signIn.emailCode.sendCode();
    return signIn.mfa.sendEmailCode();
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMsg("");
    setInfoMsg("");
    const { error } = await sendCode(verifyMode);
    if (error) setErrorMsg(errMsg(error, "Erro ao reenviar código."));
    else {
      setInfoMsg("Código reenviado! Confira sua caixa de entrada e o spam.");
      setResendCooldown(30);
    }
    setIsResending(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nome || !password) {
      setErrorMsg("Preencha Nome, E-mail e Senha.");
      return;
    }
    if (!signUp) return notReady();

    setIsLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const [firstName, ...rest] = nome.trim().split(/\s+/);
      const { error } = await signUp.password({
        emailAddress: email.trim(),
        password,
        firstName,
        lastName: rest.join(" ") || undefined,
        unsafeMetadata: { telefone, instagram },
      });
      if (error) {
        setErrorMsg(errMsg(error));
        return;
      }

      if (signUp.status === "complete") {
        await finish(signUp);
        return;
      }

      const { error: sendErr } = await signUp.verifications.sendEmailCode();
      if (sendErr) {
        setErrorMsg(errMsg(sendErr, "Erro ao enviar o código por e-mail."));
        return;
      }

      setVerifyMode("signup");
      setPendingVerification(true);
      setInfoMsg(`Enviamos um código para ${email.trim()}.`);
      setResendCooldown(30);
    } catch (err) {
      console.error("[signup]", err);
      setErrorMsg(errMsg(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setErrorMsg("Digite o código de 6 dígitos.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      if (verifyMode === "signup") {
        const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
        if (error) {
          setErrorMsg(errMsg(error, "Código inválido."));
          return;
        }
        if (signUp.status === "complete") {
          await finish(signUp);
        } else if (signUp.status === "missing_requirements") {
          setErrorMsg(`Faltam campos obrigatórios no cadastro: ${signUp.missingFields?.join(", ") || "desconhecidos"}.`);
        } else {
          setErrorMsg(`Não foi possível concluir o cadastro (status: ${signUp.status}).`);
        }
        return;
      }

      const { error } =
        verifyMode === "signin_first"
          ? await signIn.emailCode.verifyCode({ code: code.trim() })
          : await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (error) {
        setErrorMsg(errMsg(error, "Código inválido."));
        return;
      }
      if (signIn.status === "complete") await finish(signIn);
      else setErrorMsg(`Não foi possível concluir o login (status: ${signIn.status}).`);
    } catch (err) {
      console.error("[verify]", err);
      setErrorMsg(errMsg(err, "Código inválido."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Digite seu e-mail e senha.");
      return;
    }
    if (!signIn) return notReady();

    setIsLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const { error } = await signIn.password({ emailAddress: email.trim(), password });
      if (error) {
        setErrorMsg(errMsg(error, "E-mail ou senha incorretos."));
        return;
      }

      const status = signIn.status;
      if (status === "complete") {
        await finish(signIn);
        return;
      }

      let mode: VerifyMode | null = null;
      if (status === "needs_second_factor" || status === "needs_client_trust") {
        const hasEmail = signIn.supportedSecondFactors?.some((f) => f.strategy === "email_code");
        if (hasEmail) mode = "signin_mfa";
      } else if (status === "needs_first_factor") {
        const hasEmail = signIn.supportedFirstFactors?.some((f) => f.strategy === "email_code");
        if (hasEmail) mode = "signin_first";
      }

      if (!mode) {
        setErrorMsg(`Esse login exige uma verificação não suportada aqui (status: ${status}).`);
        return;
      }

      const { error: sendErr } = await sendCode(mode);
      if (sendErr) {
        setErrorMsg(errMsg(sendErr, "Erro ao enviar o código por e-mail."));
        return;
      }
      setVerifyMode(mode);
      setPendingVerification(true);
      setInfoMsg(`Enviamos um código para ${email.trim()}.`);
      setResendCooldown(30);
    } catch (err) {
      console.error("[signin]", err);
      setErrorMsg(errMsg(err, "E-mail ou senha incorretos."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Digite seu e-mail.");
      return;
    }
    if (!signIn) return notReady();
    setIsLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const { error } = await signIn.create({ identifier: email.trim() });
      if (error) {
        setErrorMsg(errMsg(error));
        return;
      }
      const { error: sendErr } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendErr) {
        setErrorMsg(errMsg(sendErr, "Erro ao enviar o código."));
        return;
      }
      setResetCodeSent(true);
      setInfoMsg(`Enviamos um código para ${email.trim()}.`);
    } catch (err) {
      setErrorMsg(errMsg(err, "Erro ao solicitar redefinição."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async () => {
    if (!code || !password) {
      setErrorMsg("Preencha o código e a nova senha.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (error) {
        setErrorMsg(errMsg(error, "Código inválido."));
        return;
      }
      const { error: pwErr } = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (pwErr) {
        setErrorMsg(errMsg(pwErr));
        return;
      }
      if (signIn.status === "complete") await finish(signIn);
      else setErrorMsg(`Senha alterada, mas o login não foi concluído (status: ${signIn.status}). Tente entrar.`);
    } catch (err) {
      setErrorMsg(errMsg(err, "Erro ao redefinir a senha."));
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    "w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-white/30 transition-colors";
  const codeCls =
    "w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-center tracking-[0.5em] text-lg text-white focus:outline-none focus:border-white/30 transition-colors";
  const btnCls =
    "w-full group h-12 uppercase font-bold tracking-widest text-[11px] rounded-xl mt-6 neon-glow metallic-gradient text-black hover:opacity-90 border-0";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md px-4"
          >
            <div className="glass rounded-2xl border border-white/10 p-8 shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>

              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-8 text-center mt-2 relative z-10">
                <h2 className="text-2xl font-bold tracking-tight mb-2 uppercase text-glow">
                  {pendingVerification ? "Verificação" : view === "login" ? "Entrar" : view === "forgot" ? "Recuperar Senha" : "Criar Conta"}
                </h2>
                <p className="text-sm text-muted-foreground font-light">
                  {pendingVerification
                    ? "Digite o código que enviamos para o seu e-mail."
                    : view === "login"
                      ? "Acesse com seu e-mail e senha."
                      : view === "forgot"
                        ? "Vamos te enviar um código para criar uma nova senha."
                        : "Preencha seus dados para criar sua conta."}
                </p>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4 relative z-10 text-center">
                  {errorMsg}
                </div>
              )}
              {infoMsg && !errorMsg && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg text-sm mb-4 relative z-10 text-center">
                  {infoMsg}
                </div>
              )}

              {pendingVerification ? (
                <form onSubmit={handleVerify} className="space-y-4 relative z-10">
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="Código de 6 dígitos"
                      className={codeCls}
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className={btnCls}>
                    <span>{isLoading ? "Verificando..." : "Confirmar Acesso"}</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <div className="text-center mt-4 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || isResending}
                      className="text-xs text-muted-foreground hover:text-white disabled:opacity-50 disabled:hover:text-muted-foreground"
                    >
                      {isResending
                        ? "Reenviando..."
                        : resendCooldown > 0
                          ? `Reenviar código em ${resendCooldown}s`
                          : "Não recebeu? Reenviar código"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingVerification(false);
                        setCode("");
                        setInfoMsg("");
                        setErrorMsg("");
                      }}
                      className="text-xs text-muted-foreground hover:text-white"
                    >
                      Voltar
                    </button>
                  </div>
                </form>
              ) : view === "forgot" ? (
                <form className="space-y-4 relative z-10" onSubmit={handleForgotSend}>
                  {!resetCodeSent ? (
                    <>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Seu E-mail"
                          className={inputCls}
                        />
                      </div>
                      <Button type="submit" disabled={isLoading} className={btnCls}>
                        <span>{isLoading ? "Enviando..." : "Enviar Código"}</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="relative mb-4">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="Código de 6 dígitos"
                          className={codeCls}
                          maxLength={6}
                        />
                      </div>
                      <div className="relative mb-4">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Nova Senha"
                          className={inputCls}
                        />
                      </div>
                      <Button type="button" onClick={handleForgotReset} disabled={isLoading} className={btnCls}>
                        <span>{isLoading ? "Salvando..." : "Redefinir Senha"}</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </>
                  )}
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setView("login");
                        setResetCodeSent(false);
                        setErrorMsg("");
                        setInfoMsg("");
                      }}
                      className="text-xs text-muted-foreground hover:text-white"
                    >
                      Voltar para o Login
                    </button>
                  </div>
                </form>
              ) : view === "login" ? (
                <form className="space-y-4 relative z-10" onSubmit={handleSignIn}>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Seu E-mail"
                      className={inputCls}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua Senha"
                      className={`${inputCls} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot");
                        setResetCodeSent(false);
                        setErrorMsg("");
                        setInfoMsg("");
                      }}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>

                  <Button type="submit" disabled={isLoading} className={btnCls}>
                    <span>{isLoading ? "Entrando..." : "Acessar Plataforma"}</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </form>
              ) : (
                <form className="space-y-4 relative z-10" onSubmit={handleSignUp}>
                  <div className="flex justify-center mb-6">
                    <label className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all group relative overflow-hidden">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFoto(file);
                            setFotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Sua Foto" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground mb-1 group-hover:text-white transition-colors" />
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider group-hover:text-white transition-colors">Foto</span>
                        </>
                      )}
                      {fotoPreview && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="text" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome Completo" className={inputCls} />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="tel" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone (WhatsApp)" className={inputCls} />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu E-mail principal" className={inputCls} />
                  </div>

                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram (@seu.perfil)" className={inputCls} />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Crie uma Senha"
                      className={`${inputCls} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Clerk bot protection renders its challenge here in custom flows */}
                  <div id="clerk-captcha" />

                  <Button type="submit" disabled={isLoading} className={btnCls}>
                    <span>{isLoading ? "Processando..." : "Criar Conta"}</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </form>
              )}

              {view !== "forgot" && !pendingVerification && (
                <div className="mt-8 pt-6 border-t border-white/5 text-center relative z-10">
                  <p className="text-sm text-muted-foreground font-light">
                    {view === "login" ? "Ainda não tem uma conta? " : "Já possui uma conta? "}
                    <button
                      onClick={() => {
                        setView(view === "login" ? "register" : "login");
                        setErrorMsg("");
                        setInfoMsg("");
                      }}
                      className="text-white hover:underline font-medium"
                    >
                      {view === "login" ? "Criar conta" : "Fazer Login"}
                    </button>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
