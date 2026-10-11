import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon, Button } from "./ui";
import { VipBadge } from "./VipBadge";
import { cn } from "../utils/cn";
import { supabase, useAuth } from "../auth";

export interface ProjectInviteModalProps {
  inviteId: string;
  role?: string;
  isOpen: boolean;
  onClose: () => void;
  onGoToProject?: (projectId: string) => void;
  onGoToProjects?: () => void;
}

interface MiniProject {
  id: string;
  name: string;
  color?: string;
  owner_id: string;
  status: string;
}

interface OwnerProfile {
  id: string;
  full_name?: string;
  channel?: string;
  avatar_url?: string;
  is_vip?: boolean;
}

export function ProjectInviteModal({
  inviteId,
  role = "editor",
  isOpen,
  onClose,
  onGoToProject,
  onGoToProjects,
}: ProjectInviteModalProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [project, setProject] = useState<MiniProject | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [userStatus, setUserStatus] = useState<"guest" | "owner" | "member" | "pending" | "not_found">("guest");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const client = supabase;
    if (!isOpen || !inviteId || !client) return;

    let isSubscribed = true;

    const fetchInviteDetails = async () => {
      setLoading(true);
      setError(null);
      setSubmitted(false);

      try {
        // 1. Busca dados do projeto
        const { data: projData, error: projErr } = await client
          .from("studioos_projects")
          .select("id, name, color, owner_id, status")
          .eq("id", inviteId)
          .maybeSingle();

        if (projErr || !projData) {
          if (isSubscribed) {
            setUserStatus("not_found");
            setLoading(false);
          }
          return;
        }

        if (!isSubscribed) return;
        setProject(projData);

        // 2. Busca perfil do dono
        if (projData.owner_id) {
          const { data: ownerData } = await client
            .from("profiles")
            .select("id, full_name, channel, avatar_url, is_vip")
            .eq("id", projData.owner_id)
            .maybeSingle();

          if (isSubscribed && ownerData) {
            setOwner(ownerData);
          }
        }

        // 3. Determina o status do usuário autenticado no projeto
        if (user?.id) {
          if (projData.owner_id === user.id) {
            if (isSubscribed) setUserStatus("owner");
          } else {
            // Verifica se o usuário havia saído deste projeto
            const leftIds: string[] = (() => {
              try {
                return JSON.parse(localStorage.getItem(`studioos_left_projects_${user.id}`) || '[]');
              } catch {
                return [];
              }
            })();
            const hasLeftThisProject = leftIds.includes(inviteId);

            // Verifica se já é membro no banco
            const { data: memberData } = await client
              .from("studioos_project_members")
              .select("role")
              .eq("project_id", inviteId)
              .eq("user_id", user.id)
              .maybeSingle();

            if (memberData && !hasLeftThisProject) {
              if (isSubscribed) setUserStatus("member");
            } else {
              // Se havia vínculo mas o usuário saiu no cliente, limpa o vínculo órfão no banco
              if (memberData && hasLeftThisProject) {
                try {
                  await client.rpc("leave_project", { p_project_id: inviteId });
                  await client.from("studioos_project_members").delete().eq("project_id", inviteId).eq("user_id", user.id);
                } catch {}
              }

              // Verifica se já tem aplicação pendente
              const { data: appData } = await client
                .from("studioos_project_applications")
                .select("status")
                .eq("project_id", inviteId)
                .eq("user_id", user.id)
                .maybeSingle();

              if (appData && appData.status === "pending") {
                if (isSubscribed) setUserStatus("pending");
              } else {
                if (isSubscribed) setUserStatus("guest");
              }
            }
          }
        } else {
          if (isSubscribed) setUserStatus("guest");
        }
      } catch (err: any) {
        if (isSubscribed) {
          setError(err?.message || "Erro ao carregar convite");
          setUserStatus("not_found");
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchInviteDetails();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, inviteId, user?.id]);

  if (!mounted || !isOpen) return null;

  const handleAcceptInvite = async () => {
    const client = supabase;
    if (!client || !inviteId || !user?.id) return;
    setSubmitting(true);
    setError(null);

    try {
      const { error: rpcError } = await client.rpc("apply_for_project", {
        p_project_id: inviteId,
        p_role: role || "editor",
      });

      if (rpcError) {
        console.warn("RPC apply_for_project falhou, tentando fallback direto:", rpcError);
        const { error: directErr } = await client
          .from("studioos_project_applications")
          .upsert({
            project_id: inviteId,
            user_id: user.id,
            role: role || "editor",
            status: "pending"
          }, { onConflict: "project_id,user_id" });

        if (directErr) {
          setError(directErr.message || rpcError.message || "Erro ao solicitar acesso ao projeto.");
        } else {
          try {
            const leftIds: string[] = JSON.parse(localStorage.getItem(`studioos_left_projects_${user.id}`) || '[]');
            const updated = leftIds.filter(id => id !== inviteId);
            localStorage.setItem(`studioos_left_projects_${user.id}`, JSON.stringify(updated));
          } catch {}
          setSubmitted(true);
        }
      } else {
        try {
          const leftIds: string[] = JSON.parse(localStorage.getItem(`studioos_left_projects_${user.id}`) || '[]');
          const updated = leftIds.filter(id => id !== inviteId);
          localStorage.setItem(`studioos_left_projects_${user.id}`, JSON.stringify(updated));
        } catch {}
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao processar solicitação.");
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = role === "viewer" ? "Visualizador" : "Editor";
  const roleDesc =
    role === "viewer"
      ? "Acesso somente leitura para acompanhar tarefas e andamento."
      : "Permissão para criar, alterar e gerenciar tarefas e roteiros.";

  const ownerChannel = owner?.channel ? (owner.channel.startsWith("@") ? owner.channel : `@${owner.channel}`) : "@criador";
  const ownerName = owner?.full_name || ownerChannel;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="relative my-auto w-full max-w-[480px] overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Superior */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-signal-400/15 blur-3xl pointer-events-none rounded-full" />

        {/* Header da Modal */}
        <div className="relative flex items-center justify-between border-b border-ink-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-400/10 border border-signal-400/20 text-signal-400 shadow-[0_0_12px_rgba(242,179,61,0.2)]">
              <Icon name="userPlus" className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-bone-100 tracking-wide">
                Convite para Projeto
              </h3>
              <p className="font-mono text-[9.5px] uppercase tracking-widest text-ink-400">
                StudioOS · Colaboração
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-bone-100 disabled:opacity-50 cursor-pointer"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {/* Conteúdo da Modal */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-signal-400 border-t-transparent" />
              <p className="font-mono text-xs text-ink-400 tracking-wide">
                Carregando detalhes do convite...
              </p>
            </div>
          ) : userStatus === "not_found" ? (
            /* PROJETO NÃO ENCONTRADO */
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.2)]">
                <Icon name="alert" className="h-7 w-7" />
              </div>
              <div>
                <h4 className="font-display text-lg font-bold text-bone-50">
                  Projeto não encontrado
                </h4>
                <p className="mt-1.5 text-xs text-ink-300 max-w-sm mx-auto leading-relaxed">
                  O link de convite pode ter expirado ou o projeto foi removido pelo proprietário.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="outline" onClick={onClose} className="font-mono text-xs uppercase tracking-wider">
                  Fechar
                </Button>
              </div>
            </div>
          ) : submitted ? (
            /* SUCESSO APÓS SOLICITAR ACESSO */
            <div className="py-6 text-center space-y-4 animate-in fade-in duration-300">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.25)]">
                <Icon name="check" className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h4 className="font-display text-xl font-bold text-bone-50">
                  Acesso solicitado com sucesso!
                </h4>
                <p className="text-[13px] text-ink-300 max-w-md mx-auto leading-relaxed">
                  Sua solicitação para entrar em <strong className="text-bone-100">{project?.name}</strong> foi enviada para o proprietário (<span className="text-signal-400 font-medium">{ownerChannel}</span>).
                </p>
                <div className="mt-3 rounded-lg border border-ink-800 bg-ink-950/60 p-3 text-left">
                  <div className="flex items-center gap-2 text-[11.5px] text-bone-300 font-mono">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Aguarde a aprovação do proprietário para acessar o projeto.</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex items-center justify-center gap-3">
                <Button
                  variant="solid"
                  onClick={() => {
                    onClose();
                    onGoToProjects?.();
                  }}
                  className="font-mono text-xs uppercase tracking-wider px-6 py-2.5 gap-2 shadow-[0_0_20px_rgba(242,179,61,0.3)]"
                >
                  Ir para Meus Projetos
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : userStatus === "owner" ? (
            /* É O PROPRIETÁRIO */
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-signal-400/10 border border-signal-400/25 text-signal-400 shadow-[0_0_25px_rgba(242,179,61,0.2)]">
                <Icon name="crown" className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-display text-lg font-bold text-bone-50">
                  Você é o proprietário deste projeto!
                </h4>
                <p className="text-xs text-ink-300 max-w-sm mx-auto">
                  Você já possui controle total sobre o projeto <strong className="text-bone-100">{project?.name}</strong>.
                </p>
              </div>
              <div className="pt-3 flex items-center justify-center gap-3">
                <Button variant="outline" onClick={onClose} className="font-mono text-xs uppercase tracking-wider">
                  Fechar
                </Button>
                {project && onGoToProject && (
                  <Button
                    variant="solid"
                    onClick={() => {
                      onClose();
                      onGoToProject(project.id);
                    }}
                    className="font-mono text-xs uppercase tracking-wider gap-2 shadow-[0_0_15px_rgba(242,179,61,0.25)]"
                  >
                    Abrir Projeto
                    <Icon name="arrow" className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ) : userStatus === "member" ? (
            /* JÁ É MEMBRO */
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.2)]">
                <Icon name="layers" className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-display text-lg font-bold text-bone-50">
                  Você já faz parte deste projeto!
                </h4>
                <p className="text-xs text-ink-300 max-w-sm mx-auto">
                  Você já é um participante ativo do projeto <strong className="text-bone-100">{project?.name}</strong>.
                </p>
              </div>
              <div className="pt-3 flex items-center justify-center gap-3">
                <Button variant="outline" onClick={onClose} className="font-mono text-xs uppercase tracking-wider">
                  Fechar
                </Button>
                {project && onGoToProject && (
                  <Button
                    variant="solid"
                    onClick={() => {
                      onClose();
                      onGoToProject(project.id);
                    }}
                    className="font-mono text-xs uppercase tracking-wider gap-2 shadow-[0_0_15px_rgba(242,179,61,0.25)]"
                  >
                    Abrir Projeto
                    <Icon name="arrow" className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ) : userStatus === "pending" ? (
            /* JÁ SOLICITOU (PENDENTE) */
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                <Icon name="clock" className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-display text-lg font-bold text-bone-50">
                  Solicitação já enviada
                </h4>
                <p className="text-xs text-ink-300 max-w-sm mx-auto leading-relaxed">
                  Você já solicitou acesso ao projeto <strong className="text-bone-100">{project?.name}</strong> anteriormente. Aguarde o proprietário (<span className="text-signal-400 font-medium">{ownerChannel}</span>) aprovar.
                </p>
              </div>
              <div className="pt-3 flex items-center justify-center gap-3">
                <Button variant="solid" onClick={onClose} className="font-mono text-xs uppercase tracking-wider px-6">
                  Entendido
                </Button>
              </div>
            </div>
          ) : (
            /* CONVITE DISPONÍVEL (ESTADO PRINCIPAL) */
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <span className="inline-block rounded-full bg-signal-400/10 border border-signal-400/25 px-2.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-signal-400 mb-1">
                  Novo Convite
                </span>
                <h4 className="font-display text-lg font-bold text-bone-50">
                  Você foi convidado para colaborar!
                </h4>
                <p className="text-xs text-ink-300">
                  Confira as informações do projeto abaixo antes de aceitar.
                </p>
              </div>

              {/* CARD DE DETALHES DO PROJETO */}
              <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950/70 shadow-inner">
                {/* Cabeçalho do Projeto */}
                <div className="flex items-center gap-3 border-b border-ink-800/80 p-4 bg-ink-950/40">
                  <div
                    className="h-4 w-4 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: project?.color || "#F2B33D" }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-bold text-bone-100">
                      {project?.name || "Projeto StudioOS"}
                    </span>
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-ink-400">
                      ID: {project?.id}
                    </span>
                  </div>
                </div>

                {/* Dono do Projeto */}
                <div className="flex items-center justify-between p-4 border-b border-ink-800/50">
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9 shrink-0">
                      {owner?.avatar_url ? (
                        <img
                          src={owner.avatar_url}
                          alt={ownerName}
                          className="h-full w-full rounded-full object-cover border border-ink-700"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-ink-800 border border-ink-700 text-bone-200 font-bold text-xs uppercase">
                          {ownerName.slice(0, 2)}
                        </div>
                      )}
                      {owner?.is_vip && <VipBadge size="xs" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-bone-200">{ownerName}</span>
                      </div>
                      <span className="text-[11px] font-mono text-ink-400">{ownerChannel}</span>
                    </div>
                  </div>
                  <span className="rounded bg-ink-900 border border-ink-800 px-2 py-0.5 font-mono text-[9px] text-ink-400 uppercase tracking-wider">
                    Proprietário
                  </span>
                </div>

                {/* Cargo Proposto */}
                <div className="p-4 bg-ink-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
                      Permissão Proposta
                    </span>
                    <span className="rounded bg-signal-400/15 border border-signal-400/30 px-2 py-0.5 font-mono text-[10px] font-bold text-signal-400 uppercase tracking-wider">
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-bone-300 leading-relaxed">
                    {roleDesc}
                  </p>
                </div>
              </div>

              {/* Erro, se houver */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-300 flex items-start gap-2">
                  <Icon name="alert" className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Aviso explicativo */}
              <p className="text-[11px] text-ink-400 font-mono text-center">
                Ao clicar em aceitar, sua solicitação de entrada será enviada para aprovação do proprietário.
              </p>

              {/* Ações */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-300 transition-colors hover:bg-ink-800 hover:text-bone-100 disabled:opacity-50 cursor-pointer text-center"
                >
                  Recusar
                </button>
                <button
                  type="button"
                  onClick={handleAcceptInvite}
                  disabled={submitting}
                  className="rounded-xl bg-signal-400 hover:bg-signal-300 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-950 shadow-[0_6px_25px_-5px_rgba(242,179,61,0.5)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  {submitting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-950 border-t-transparent" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <span>Aceitar Convite</span>
                      <Icon name="arrow" className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
