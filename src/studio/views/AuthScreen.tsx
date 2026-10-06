import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { useAuth } from "../auth";
import { Icon } from "../components/ui";
import { Waveform } from "../components/Console";

type Mode = "login" | "signup" | "forgot" | "magic" | "sent" | "recover";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["muito fraca", "fraca", "ok", "boa", "forte", "excelente"];
  return { score: s, label: labels[s] };
}

/* ------------------------------------------------------------ fields */

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="font-mono text-[10.5px] tracking-[0.16em] text-bone-300 uppercase">{label}</label>
        {hint}
      </div>
      {children}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          error ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <p className="overflow-hidden pt-1 text-[11.5px] text-oxide-400">{error}</p>
      </div>
    </div>
  );
}

const inputCls = (invalid?: boolean) =>
  cn(
    "w-full rounded-md border bg-ink-950/70 px-3.5 py-3 text-[14.5px] text-bone-50 placeholder:text-ink-400 outline-none transition-all duration-200 focus:bg-ink-950 focus:ring-2",
    invalid
      ? "border-oxide-400/70 focus:border-oxide-400 focus:ring-oxide-400/15"
      : "border-ink-600/80 focus:border-signal-400/70 focus:ring-signal-400/15"
  );

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  invalid,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete: string;
  invalid?: boolean;
  id: string;
}) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(inputCls(invalid), "pr-24")}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {caps && (
          <span className="rounded bg-signal-400/15 px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.12em] text-signal-300 uppercase">
            caps
          </span>
        )}
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="rounded px-2 py-1 font-mono text-[9.5px] tracking-[0.14em] text-ink-400 uppercase transition-colors hover:bg-ink-800 hover:text-bone-100"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? "ocultar" : "mostrar"}
        </button>
      </div>
    </div>
  );
}

function Submit({ loading, children, icon = "arrow" }: { loading: boolean; children: ReactNode; icon?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-md bg-signal-400 px-5 py-3.5 text-[14.5px] font-bold text-ink-950 shadow-[0_18px_40px_-18px_rgba(247,183,51,0.95)] transition-all duration-200 hover:bg-signal-300 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
    >
      <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/40 opacity-0 transition-opacity group-hover:opacity-100 group-hover:[animation:sweep_0.75s_ease-out]" />
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
          Processando…
        </>
      ) : (
        <>
          {children}
          <Icon name={icon} className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.2} />
        </>
      )}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
      <path fill="#4285F4" d="M21 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.3-1.1 2.4-2.3 3.1l3.1 2.4c1.8-1.7 2.7-4.2 2.7-7.8z" />
      <path fill="#FBBC05" d="M6.4 14.2a6 6 0 0 1 0-4.4L3.2 7.4a9.6 9.6 0 0 0 0 9.2l3.2-2.4z" />
      <path fill="#34A853" d="M12 21.5c2.6 0 4.8-.9 6.3-2.4l-3.1-2.4c-.8.6-1.9 1-3.2 1-2.5 0-4.5-1.6-5.3-3.9l-3.2 2.4c1.6 3.1 4.8 5.3 8.5 5.3z" />
    </svg>
  );
}

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 18" className="h-[17px] w-[17px] shrink-0" aria-hidden="true">
      <path
        fill="#5865F2"
        d="M20.3 1.6A19.8 19.8 0 0 0 15.4.1a14 14 0 0 0-.63 1.3 18.3 18.3 0 0 0-5.49 0A13.9 13.9 0 0 0 8.64.1a19.7 19.7 0 0 0-4.9 1.5C.63 6.3-.21 10.9.21 15.4a19.9 19.9 0 0 0 6 3.05c.49-.66.92-1.37 1.29-2.1a13 13 0 0 1-2.03-.98c.17-.12.34-.25.5-.38a14.2 14.2 0 0 0 12.1 0c.16.14.33.26.5.38-.65.39-1.33.72-2.04.98.37.73.8 1.43 1.29 2.1a19.8 19.8 0 0 0 6.01-3.05c.5-5.22-.85-9.78-3.53-13.8ZM8.02 12.63c-1.18 0-2.16-1.08-2.16-2.4 0-1.33.95-2.41 2.16-2.41 1.22 0 2.19 1.09 2.17 2.4 0 1.33-.96 2.41-2.17 2.41Zm7.96 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.94-2.41 2.15-2.41 1.22 0 2.19 1.09 2.17 2.4 0 1.33-.95 2.41-2.17 2.41Z"
      />
    </svg>
  );
}

function OAuthButton({
  provider,
  onClick,
  disabled,
  pending,
  compact,
}: {
  provider: "google" | "discord";
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  compact?: boolean;
}) {
  const isDiscord = provider === "discord";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-md border px-4 py-3 text-[13.5px] font-semibold transition-all duration-200 active:scale-[0.99] disabled:opacity-50",
        isDiscord
          ? "border-[#5865F2]/40 bg-[#5865F2]/[0.09] text-bone-50 hover:border-[#5865F2]/70 hover:bg-[#5865F2]/[0.16]"
          : "border-ink-600 bg-ink-900/70 text-bone-100 hover:border-bone-300/40 hover:bg-ink-800"
      )}
    >
      {pending ? (
        <span
          className={cn(
            "h-4 w-4 animate-spin rounded-full border-2 border-t-transparent",
            isDiscord ? "border-[#5865F2]" : "border-bone-300"
          )}
        />
      ) : isDiscord ? (
        <DiscordMark />
      ) : (
        <GoogleMark />
      )}
      {compact ? (isDiscord ? "Discord" : "Google") : `Continuar com ${isDiscord ? "Discord" : "Google"}`}
    </button>
  );
}

function Notice({ tone, children }: { tone: "error" | "ok" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "anim-rise flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-[12.5px] leading-relaxed",
        tone === "error" && "border-oxide-400/40 bg-oxide-400/[0.08] text-oxide-400",
        tone === "ok" && "border-mint-400/40 bg-mint-400/[0.08] text-mint-300",
        tone === "info" && "border-sky-400/30 bg-sky-400/[0.07] text-sky-400"
      )}
    >
      <Icon
        name={tone === "error" ? "close" : tone === "ok" ? "check" : "spark"}
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
        strokeWidth={2.4}
      />
      <span>{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------ studio side */

function StudioPanel({ mode }: { mode: Mode }) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const lines = useMemo(
    () => [
      { k: "Rank de Ideia", v: "0–10", c: "text-signal-300" },
      { k: "Score de Post", v: "0–50", c: "text-mint-300" },
      { k: "Mentor AI", v: "24 FW", c: "text-sky-400" },
      { k: "Histórico", v: "local", c: "text-bone-100" },
    ],
    []
  );

  return (
    <div className="relative hidden h-full flex-col overflow-hidden border-r border-ink-800 bg-ink-900/60 lg:flex">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-70" />
      <div className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-signal-400/[0.09] blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-[24rem] w-[24rem] rounded-full bg-sky-500/[0.08] blur-[100px]" />
      <div className="noise pointer-events-none absolute inset-0" />

      {/* status */}
      <div className="relative flex items-center gap-4 border-b border-ink-800 bg-ink-950/60 px-8 py-2.5">
        <span className="flex items-center gap-2">
          <span className="on-air-dot h-2 w-2 rounded-full bg-oxide-400" />
          <span className="anim-blink font-mono text-[10px] font-bold tracking-[0.3em] text-oxide-400 uppercase">
            Standby
          </span>
        </span>
        <span className="h-3 w-px bg-ink-600" />
        <span className="font-mono text-[10px] tracking-[0.18em] text-bone-400 uppercase">StudioOS / 2.5.0</span>
        <span className="ml-auto font-mono text-[11px] text-bone-300 tabular-nums">
          {time.toLocaleTimeString("pt-BR", { hour12: false })}
          <span className="ml-1.5 text-ink-400">BRT</span>
        </span>
      </div>

      <div className="relative flex flex-1 flex-col justify-between px-8 py-10 xl:px-12">
        <div>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-400 text-ink-950">
              <Icon name="logo" className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div>
              <div className="font-display text-xl leading-none font-extrabold tracking-[-0.03em] text-bone-50">
                StudioOS
              </div>
              <div className="mt-1 font-mono text-[9.5px] tracking-[0.2em] text-ink-400 uppercase">
                sistema operacional do criador
              </div>
            </div>
          </div>

          <h1 className="font-display text-[clamp(2.8rem,5.4vw,5.2rem)] leading-[0.84] font-extrabold tracking-[-0.045em] text-bone-50">
            {mode === "signup" ? (
              <>
                Monte seu
                <br />
                <span className="text-signal-400">estúdio.</span>
              </>
            ) : (
              <>
                O estúdio
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10 text-signal-400">te espera.</span>
                  <span className="absolute inset-x-0 bottom-[0.12em] z-0 h-[0.13em] bg-oxide-400/70" />
                </span>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-md text-[15.5px] leading-relaxed text-bone-300">
            {mode === "signup"
              ? "Uma conta, doze bancadas. Calibre o canal uma vez e todas as ferramentas passam a falar a sua língua."
              : "Entre para retomar o banco de ideias, os roteiros no teleprompter e o histórico das suas análises."}
          </p>
        </div>

        <div className="mt-10 space-y-4">
          <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-950/80">
            <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-oxide-400/80" />
                <span className="h-2 w-2 rounded-full bg-signal-400/80" />
                <span className="h-2 w-2 rounded-full bg-mint-400/80" />
              </div>
              <span className="font-mono text-[9.5px] tracking-[0.22em] text-ink-400 uppercase">
                monitor de entrada
              </span>
              <Icon name="sound" className="h-3.5 w-3.5 text-ink-400" />
            </div>
            <div className="p-4">
              <Waveform />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-ink-700/80 bg-ink-700/60">
            {lines.map((l) => (
              <div key={l.k} className="bg-ink-900 px-3 py-2.5">
                <div className="truncate font-mono text-[8.5px] tracking-[0.14em] text-ink-400 uppercase">{l.k}</div>
                <div className={cn("font-display text-[15px] font-bold", l.c)}>{l.v}</div>
              </div>
            ))}
          </div>

          <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
            <Icon name="lock" className="h-3.5 w-3.5 text-mint-400" strokeWidth={1.8} />
            sessão protegida · chave de IA continua só no seu navegador
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ screen */

export function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>(auth.recovering ? "recover" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauth, setOauth] = useState<"google" | "discord" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (auth.recovering) setMode("recover");
  }, [auth.recovering]);

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
    setTouched(false);
    setPassword("");
    setConfirm("");
  };

  const pw = strength(password);
  const emailErr = touched && !EMAIL_RE.test(email.trim()) ? "Informe um e-mail válido." : undefined;
  const passErr =
    touched && (mode === "signup" || mode === "recover") && password.length < 8
      ? "Use pelo menos 8 caracteres."
      : touched && mode === "login" && !password
        ? "Digite sua senha."
        : undefined;
  const confirmErr =
    touched && (mode === "signup" || mode === "recover") && confirm !== password ? "As senhas não conferem." : undefined;
  const nameErr = touched && mode === "signup" && name.trim().length < 2 ? "Como devemos te chamar?" : undefined;
  const termsErr = touched && mode === "signup" && !terms ? "Aceite os termos para continuar." : undefined;

  const run = async (fn: () => Promise<{ ok: boolean; error?: string; message?: string; needsConfirmation?: boolean }>) => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Algo deu errado.");
      else if (r.needsConfirmation) {
        setInfo(r.message ?? null);
        setMode("sent");
      } else if (r.message) {
        setInfo(r.message);
        if (mode === "forgot" || mode === "magic") setMode("sent");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const em = email.trim();

    if (mode === "login") {
      if (!EMAIL_RE.test(em) || !password) return;
      run(() => auth.signIn(em, password));
    } else if (mode === "signup") {
      if (!EMAIL_RE.test(em) || password.length < 8 || confirm !== password || name.trim().length < 2 || !terms) return;
      run(() => auth.signUp({ email: em, password, name: name.trim(), channel: channel.trim() || undefined }));
    } else if (mode === "forgot") {
      if (!EMAIL_RE.test(em)) return;
      run(() => auth.resetPassword(em));
    } else if (mode === "magic") {
      if (!EMAIL_RE.test(em)) return;
      run(() => auth.sendMagicLink(em));
    } else if (mode === "recover") {
      if (password.length < 8 || confirm !== password) return;
      run(() => auth.updatePassword(password));
    }
  };

  const titles: Record<Mode, { k: string; t: string; d: string }> = {
    login: { k: "01 · acesso", t: "Entrar no estúdio", d: "Use o e-mail e a senha da sua conta." },
    signup: { k: "02 · nova conta", t: "Criar conta", d: "Leva menos de um minuto. Sem cartão." },
    forgot: { k: "03 · recuperação", t: "Esqueci a senha", d: "Enviaremos um link para você definir uma nova senha." },
    magic: { k: "04 · link mágico", t: "Entrar sem senha", d: "Receba um link de acesso de uso único no seu e-mail." },
    sent: { k: "05 · verifique o e-mail", t: "Confira sua caixa", d: "" },
    recover: { k: "06 · nova senha", t: "Definir nova senha", d: "Escolha uma senha forte para a sua conta." },
  };
  const head = titles[mode];

  return (
    <div className="studio-bg min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <StudioPanel mode={mode} />

        <div className="relative flex min-h-screen flex-col">
          {/* mobile brand */}
          <div className="flex items-center gap-3 border-b border-ink-800 bg-ink-950/70 px-5 py-3 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-400 text-ink-950">
              <Icon name="logo" className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="font-display text-[16px] font-extrabold tracking-[-0.02em] text-bone-50">StudioOS</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="on-air-dot h-1.5 w-1.5 rounded-full bg-oxide-400" />
              <span className="font-mono text-[9px] tracking-[0.24em] text-oxide-400 uppercase">standby</span>
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
            <div className="w-full max-w-[26rem]">
              {/* tabs */}
              {(mode === "login" || mode === "signup") && (
                <div className="mb-8 grid grid-cols-2 gap-1 rounded-md border border-ink-700 bg-ink-950/70 p-1">
                  {(
                    [
                      ["login", "Entrar"],
                      ["signup", "Criar conta"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => go(id)}
                      className={cn(
                        "rounded px-3 py-2.5 font-mono text-[11px] tracking-[0.12em] uppercase transition-all duration-200",
                        mode === id
                          ? "bg-signal-400 text-ink-950 shadow-[0_6px_18px_-8px_rgba(247,183,51,0.9)]"
                          : "text-bone-400 hover:bg-ink-800 hover:text-bone-100"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {(mode === "forgot" || mode === "magic") && (
                <button
                  type="button"
                  onClick={() => go("login")}
                  className="group mb-8 inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] text-ink-400 uppercase transition-colors hover:text-signal-400"
                >
                  <Icon name="arrow" className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
                  voltar ao login
                </button>
              )}

              <div key={mode} className="anim-rise">
                <div className="mb-2 flex items-center gap-3">
                  <span className="h-px w-8 bg-signal-400/60" />
                  <span className="font-mono text-[10.5px] tracking-[0.22em] text-signal-400 uppercase">{head.k}</span>
                </div>
                <h2 className="font-display text-[2.3rem] leading-[0.95] font-extrabold tracking-[-0.035em] text-bone-50">
                  {head.t}
                </h2>
                {head.d && <p className="mt-2 text-[14px] leading-relaxed text-bone-400">{head.d}</p>}

                {auth.demo && mode !== "sent" && (
                  <div className="mt-5">
                    <Notice tone="info">
                      <strong className="text-bone-50">Modo demo:</strong> o Supabase ainda não foi configurado. Contas
                      ficam só neste navegador. Defina <code className="font-mono text-[11px]">PUBLIC_SUPABASE_URL</code> e{" "}
                      <code className="font-mono text-[11px]">PUBLIC_SUPABASE_ANON_KEY</code> para ativar.
                    </Notice>
                  </div>
                )}

                {mode === "sent" ? (
                  <div className="mt-6 space-y-5">
                    <div className="relative overflow-hidden rounded-xl border border-mint-400/30 bg-ink-900/70 p-6">
                      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-mint-400/15 blur-3xl" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-mint-400/40 bg-mint-400/10 text-mint-300">
                        <Icon name="check" className="h-5 w-5" strokeWidth={2.4} />
                      </div>
                      <p className="relative mt-4 text-[14.5px] leading-relaxed text-bone-100">{info}</p>
                      <p className="relative mt-2 text-[12.5px] leading-relaxed text-ink-400">
                        Não chegou? Confira o spam ou a aba promoções. O link expira em 1 hora.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => go("login")}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-ink-600 bg-ink-900/70 px-5 py-3 text-[14px] font-semibold text-bone-100 transition-all hover:border-signal-400/50 hover:text-signal-300"
                    >
                      <Icon name="arrow" className="h-4 w-4 rotate-180" strokeWidth={2} />
                      Voltar para o login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
                    {error && <Notice tone="error">{error}</Notice>}
                    {info && <Notice tone="ok">{info}</Notice>}

                    {mode === "signup" && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Seu nome" error={nameErr}>
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            placeholder="Ana Souza"
                            className={inputCls(!!nameErr)}
                          />
                        </Field>
                        <Field label="Canal" hint={<span className="text-[10.5px] text-ink-400">opcional</span>}>
                          <input
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                            placeholder="@seucanal"
                            className={inputCls()}
                          />
                        </Field>
                      </div>
                    )}

                    {mode !== "recover" && (
                      <Field label="E-mail" error={emailErr}>
                        <input
                          type="email"
                          inputMode="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          placeholder="voce@email.com"
                          autoFocus
                          className={inputCls(!!emailErr)}
                        />
                      </Field>
                    )}

                    {(mode === "login" || mode === "signup" || mode === "recover") && (
                      <Field
                        label={mode === "recover" ? "Nova senha" : "Senha"}
                        error={passErr}
                        hint={
                          mode === "login" ? (
                            <button
                              type="button"
                              onClick={() => go("forgot")}
                              className="text-[11.5px] text-ink-400 underline-offset-2 transition-colors hover:text-signal-300 hover:underline"
                            >
                              Esqueci a senha
                            </button>
                          ) : undefined
                        }
                      >
                        <PasswordInput
                          id="pw"
                          value={password}
                          onChange={setPassword}
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                          placeholder={mode === "login" ? "Sua senha" : "Mínimo de 8 caracteres"}
                          invalid={!!passErr}
                        />
                        {(mode === "signup" || mode === "recover") && password && (
                          <div className="mt-2">
                            <div className="flex gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    "h-1 flex-1 rounded-full transition-colors duration-300",
                                    i < pw.score
                                      ? pw.score <= 1
                                        ? "bg-oxide-400"
                                        : pw.score <= 3
                                          ? "bg-signal-400"
                                          : "bg-mint-400"
                                      : "bg-ink-800"
                                  )}
                                />
                              ))}
                            </div>
                            <div className="mt-1 flex justify-between font-mono text-[9.5px] tracking-[0.12em] uppercase">
                              <span className="text-ink-400">força da senha</span>
                              <span
                                className={cn(
                                  pw.score <= 1 ? "text-oxide-400" : pw.score <= 3 ? "text-signal-300" : "text-mint-300"
                                )}
                              >
                                {pw.label}
                              </span>
                            </div>
                          </div>
                        )}
                      </Field>
                    )}

                    {(mode === "signup" || mode === "recover") && (
                      <Field label="Confirmar senha" error={confirmErr}>
                        <PasswordInput
                          id="pw2"
                          value={confirm}
                          onChange={setConfirm}
                          autoComplete="new-password"
                          placeholder="Repita a senha"
                          invalid={!!confirmErr}
                        />
                      </Field>
                    )}

                    {mode === "signup" && (
                      <div>
                        <label className="flex cursor-pointer items-start gap-3 text-[12.5px] leading-relaxed text-bone-400">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={terms}
                            onClick={() => setTerms((t) => !t)}
                            className={cn(
                              "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-all duration-200",
                              terms
                                ? "border-signal-400 bg-signal-400 text-ink-950"
                                : termsErr
                                  ? "border-oxide-400/70 bg-ink-950"
                                  : "border-ink-600 bg-ink-950 hover:border-ink-400"
                            )}
                          >
                            {terms && <Icon name="check" className="h-3 w-3" strokeWidth={3.2} />}
                          </button>
                          <span onClick={() => setTerms((t) => !t)}>
                            Concordo com os <span className="text-bone-100 underline underline-offset-2">Termos de Uso</span> e a{" "}
                            <span className="text-bone-100 underline underline-offset-2">Política de Privacidade</span>.
                          </span>
                        </label>
                        {termsErr && <p className="mt-1 pl-[30px] text-[11.5px] text-oxide-400">{termsErr}</p>}
                      </div>
                    )}

                    <div className="pt-1">
                      <Submit loading={loading} icon={mode === "forgot" || mode === "magic" ? "spark" : "arrow"}>
                        {mode === "login" && "Entrar"}
                        {mode === "signup" && "Criar minha conta"}
                        {mode === "forgot" && "Enviar link de redefinição"}
                        {mode === "magic" && "Enviar link de acesso"}
                        {mode === "recover" && "Salvar nova senha"}
                      </Submit>
                    </div>

                    {(mode === "login" || mode === "signup") && (
                      <>
                        <div className="flex items-center gap-3 py-1">
                          <span className="h-px flex-1 bg-ink-800" />
                          <span className="font-mono text-[9.5px] tracking-[0.2em] text-ink-500 uppercase">
                            ou continue com
                          </span>
                          <span className="h-px flex-1 bg-ink-800" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <OAuthButton
                            provider="google"
                            compact
                            disabled={loading}
                            pending={oauth === "google"}
                            onClick={() => {
                              setOauth("google");
                              run(() => auth.signInWithOAuth("google")).finally(() => setOauth(null));
                            }}
                          />
                          <OAuthButton
                            provider="discord"
                            compact
                            disabled={loading}
                            pending={oauth === "discord"}
                            onClick={() => {
                              setOauth("discord");
                              run(() => auth.signInWithOAuth("discord")).finally(() => setOauth(null));
                            }}
                          />
                        </div>
                        {mode === "login" && (
                          <button
                            type="button"
                            onClick={() => go("magic")}
                            className="flex w-full items-center justify-center gap-2 py-1 text-[12.5px] text-bone-400 transition-colors hover:text-signal-300"
                          >
                            <Icon name="spark" className="h-3.5 w-3.5" />
                            Entrar com link mágico, sem senha
                          </button>
                        )}
                      </>
                    )}
                  </form>
                )}

                {(mode === "login" || mode === "signup") && (
                  <p className="mt-8 text-center text-[13px] text-bone-400">
                    {mode === "login" ? "Ainda não tem conta? " : "Já tem uma conta? "}
                    <button
                      type="button"
                      onClick={() => go(mode === "login" ? "signup" : "login")}
                      className="font-semibold text-signal-400 underline-offset-4 transition-colors hover:text-signal-300 hover:underline"
                    >
                      {mode === "login" ? "Criar conta grátis" : "Entrar"}
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-ink-800 px-5 py-4 font-mono text-[9.5px] tracking-[0.14em] text-ink-500 uppercase">
            <span>© {new Date().getFullYear()} asterdev studio</span>
            <span className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", auth.demo ? "bg-signal-400" : "bg-mint-400")} />
              {auth.demo ? "auth: modo demo" : "auth: supabase"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
