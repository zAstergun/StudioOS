"use client";

import { useRef, useState } from "react";
import { Camera, Check, Loader2, MapPin, Link2, AtSign, UserRound, AlertTriangle } from "lucide-react";

export type EditableProfile = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  bio: string;
  location: string;
  website: string;
  pronouns: string;
  avatar: string;
  cover: string;
  plan: string;
  memberSince: string;
  isPublic: boolean;
  showStats: boolean;
  allowMessages: boolean;
};

const FIELDS: Array<{
  key: keyof EditableProfile;
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  placeholder: string;
  max: number;
}> = [
  {
    key: "name",
    label: "Nome de exibição",
    hint: "Aparece no topo do seu perfil",
    icon: UserRound,
    placeholder: "Seu nome",
    max: 60,
  },
  {
    key: "username",
    label: "Nome de usuário",
    hint: "Letras, números, ponto e _",
    icon: AtSign,
    placeholder: "seu.usuario",
    max: 24,
  },
  {
    key: "role",
    label: "Cargo / especialidade",
    hint: "Uma linha sobre o que você faz",
    icon: UserRound,
    placeholder: "Criadora de conteúdo",
    max: 80,
  },
  {
    key: "location",
    label: "Localização",
    hint: "Cidade e país",
    icon: MapPin,
    placeholder: "Recife, PE — Brasil",
    max: 60,
  },
  {
    key: "website",
    label: "Site",
    hint: "Sem https://",
    icon: Link2,
    placeholder: "asterdev.studio",
    max: 80,
  },
  {
    key: "pronouns",
    label: "Pronomes",
    hint: "Opcional",
    icon: UserRound,
    placeholder: "ela/dela",
    max: 24,
  },
];

const TOGGLES: Array<{ key: "isPublic" | "showStats" | "allowMessages"; label: string; hint: string }> = [
  {
    key: "isPublic",
    label: "Perfil público",
    hint: "Qualquer pessoa com o link pode ver seu perfil",
  },
  {
    key: "showStats",
    label: "Mostrar estatísticas de uso",
    hint: "Exibe sessões, horas e sequência no perfil público",
  },
  {
    key: "allowMessages",
    label: "Permitir mensagens",
    hint: "Outros criadores podem abrir conversa com você",
  },
];

export function ProfileForm({
  profile,
  onSaved,
}: {
  profile: EditableProfile;
  onSaved: (p: EditableProfile) => void;
}) {
  const [form, setForm] = useState<EditableProfile>(profile);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(profile);

  const set = <K extends keyof EditableProfile>(key: K, value: EditableProfile[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível salvar.");
      onSaved(data.profile as EditableProfile);
      setStatus("saved");
      setToast({ kind: "ok", text: "Perfil atualizado e sincronizado com o StudioOS." });
      setTimeout(() => setStatus("idle"), 2200);
    } catch (err) {
      setStatus("idle");
      setToast({ kind: "err", text: (err as Error).message });
    } finally {
      setTimeout(() => setToast(null), 4200);
    }
  };

  const pickAvatar = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2_000_000) {
      setToast({ kind: "err", text: "Escolha uma imagem com menos de 2 MB." });
      setTimeout(() => setToast(null), 4200);
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      set("avatar", String(reader.result));
      setUploading(false);
    };
    reader.onerror = () => {
      setUploading(false);
      setToast({ kind: "err", text: "Não foi possível ler o arquivo." });
      setTimeout(() => setToast(null), 4200);
    };
    reader.readAsDataURL(file);
  };

  const inputClass =
    "w-full rounded-lg border border-[#26262b] bg-[#0d0d0f] px-3 py-2.5 text-[13px] text-[#f4f4f2] placeholder:text-[#4e4e56] transition-colors focus:border-[#F2B33D] focus:bg-[#111114] focus:outline-none";

  return (
    <section id="editar" className="panel p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h2 className="font-display text-[15px] font-bold tracking-[-0.01em]">
            Configurar informações do perfil
          </h2>
          <p className="micro mt-1">Alterações ficam salvas no banco do StudioOS</p>
        </div>
        <span className="flex-1" />
        <button
          type="button"
          onClick={save}
          disabled={status === "saving" || (!dirty && status !== "saved")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.11em] transition-all duration-200 ${
            status === "saved"
              ? "bg-[#2FD4A0] text-[#062018]"
              : dirty
                ? "bg-[#F2B33D] text-[#161103] hover:bg-[#ffc45c]"
                : "cursor-not-allowed border border-[#26262b] text-[#7f7f88]"
          }`}
        >
          {status === "saving" ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Salvando
            </>
          ) : status === "saved" ? (
            <>
              <Check size={13} strokeWidth={3} /> Salvo
            </>
          ) : (
            "Salvar alterações"
          )}
        </button>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="shrink-0">
          <div className="group relative h-[112px] w-[112px] overflow-hidden rounded-2xl border border-[#2a2a30] bg-[#1c1c20]">
            <img
              src={form.avatar || "images/avatar.jpg"}
              alt={`Foto de perfil de ${form.name}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-[#08080a]/72 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <span className="flex flex-col items-center gap-1.5 text-[#F2B33D]">
                <Camera size={20} strokeWidth={1.8} />
                <span className="micro text-[#F2B33D]">
                  {uploading ? "Lendo…" : "Trocar foto"}
                </span>
              </span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickAvatar(file);
              e.target.value = "";
            }}
          />
          <p className="micro mt-2 max-w-[112px] leading-relaxed">JPG ou PNG · até 2 MB</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="bio" className="text-[12px] font-medium text-[#b6b6be]">
                Bio
              </label>
              <span className="tnum text-[11px] text-[#7f7f88]">
                {form.bio.length}/400
              </span>
            </div>
            <textarea
              id="bio"
              rows={3}
              maxLength={400}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              className={`${inputClass} mt-2 resize-none leading-relaxed`}
              placeholder="Conte em duas linhas o que você faz no StudioOS"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="text-[12px] font-medium text-[#b6b6be]">
              E-mail de contato
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => {
              const Icon = f.icon;
              return (
                <div key={String(f.key)}>
                  <label
                    htmlFor={String(f.key)}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#b6b6be]"
                  >
                    <Icon size={12} strokeWidth={2} className="text-[#7f7f88]" />
                    {f.label}
                  </label>
                  <input
                    id={String(f.key)}
                    maxLength={f.max}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => set(f.key, e.target.value as EditableProfile[typeof f.key])}
                    placeholder={f.placeholder}
                    className={`${inputClass} mt-2`}
                  />
                  <p className="micro mt-1.5">{f.hint}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 hairline" />

      <div className="mt-5 grid gap-2">
        {TOGGLES.map((t) => {
          const on = form[t.key];
          return (
            <button
              key={t.key}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => set(t.key, !on)}
              className="flex items-center gap-4 rounded-xl border border-[#232327] bg-[#0d0d0f] px-4 py-3 text-left transition-colors hover:border-[#33333a]"
            >
              <span
                className={`relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-200 ${
                  on ? "bg-[#F2B33D]" : "bg-[#2a2a30]"
                }`}
              >
                <span
                  className={`absolute top-[3px] h-4 w-4 rounded-full bg-[#0b0b0d] transition-all duration-200 ${
                    on ? "left-[21px]" : "left-[3px]"
                  }`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{t.label}</span>
                <span className="micro mt-1 block truncate">{t.hint}</span>
              </span>
              <span className={`micro ${on ? "text-[#F2B33D]" : "text-[#7f7f88]"}`}>
                {on ? "Ativo" : "Off"}
              </span>
            </button>
          );
        })}
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 flex max-w-[340px] items-start gap-3 rounded-xl border px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)] ${
            toast.kind === "ok"
              ? "border-[#2FD4A0]/35 bg-[#0d1a16]"
              : "border-[#F2604C]/40 bg-[#1b1010]"
          }`}
        >
          {toast.kind === "ok" ? (
            <Check size={15} strokeWidth={3} className="mt-0.5 text-[#2FD4A0]" />
          ) : (
            <AlertTriangle size={15} className="mt-0.5 text-[#F2604C]" />
          )}
          <p className="text-[12px] leading-relaxed text-[#e2e2e6]">{toast.text}</p>
        </div>
      )}
    </section>
  );
}
