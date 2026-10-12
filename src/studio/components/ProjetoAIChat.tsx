import { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "./ui";
import { cn } from "../utils/cn";
import { type Project } from "../views/ProjetosScreen";
import { useAuth } from "../auth";
import { useStudioOS } from "../history";
import { useI18n, getAILanguageDirective } from "../i18n";
import { type ProjectSavedItem, TOOL_NAME_MAP, TOOL_ICON_MAP } from "../types/projectSavedItem";
import { prepareToolRestore } from "../utils/toolStateRestore";
import { requestAI, AIModelUnavailableError, type AIChatMessage } from "../ai";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  assignee?: string;
  project_id: string;
}

export type ProjectAction =
  | { type: "create_task"; title: string; description?: string; status?: "todo" | "in_progress" | "done" }
  | { type: "update_task_status"; taskId?: string; taskTitle?: string; newStatus: "todo" | "in_progress" | "done" }
  | { type: "delete_task"; taskId?: string; taskTitle?: string }
  | { type: "add_note"; content: string }
  | { type: "update_project"; status?: string; name?: string; description?: string }
  | {
      type: "save_tool_item";
      tool: string;
      title: string;
      summary?: string;
      content?: string;
      tag?: string;
      metadata?: any;
    };

export interface ExecutedAction {
  id: string;
  action: ProjectAction;
  status: "success" | "denied" | "error";
  message: string;
  savedItem?: ProjectSavedItem;
}

export interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  executedActions?: ExecutedAction[];
}

interface ProjetoAIChatProps {
  project: Project;
  tasks: Task[];
  savedItems: ProjectSavedItem[];
  notes: any[];
  userRole?: "owner" | "editor" | "viewer";
  onGo?: (view: string) => void;
  onCreateTask?: (task: { title: string; description?: string; status?: Task["status"] }) => Promise<{ success: boolean; message?: string }>;
  onUpdateTaskStatus?: (taskIdOrTitle: string, newStatus: Task["status"]) => Promise<{ success: boolean; message?: string }>;
  onDeleteTask?: (taskIdOrTitle: string) => Promise<{ success: boolean; message?: string }>;
  onAddNote?: (content: string) => Promise<{ success: boolean; message?: string }>;
  onUpdateProject?: (updates: { status?: string; name?: string; description?: string }) => Promise<{ success: boolean; message?: string }>;
  onSaveToolItem?: (item: {
    tool: string;
    title: string;
    summary?: string;
    content?: string;
    tag?: string;
    metadata?: any;
  }) => Promise<{ success: boolean; item?: ProjectSavedItem; message?: string }>;
}

const PRESET_PROMPTS = [
  {
    id: "rank_ideia",
    label: "💡 Ideia no Rank de Ideias",
    icon: "target",
    prompt: "Acesse a ferramenta Rank de Ideia, crie uma ideia inédita de alto impacto calibrada para este projeto, avalie os 5 critérios e salve diretamente nos itens salvos do projeto.",
  },
  {
    id: "titulos",
    label: "🎯 Gerar 5 Títulos",
    icon: "type",
    prompt: "Use a ferramenta Gerador de Títulos para criar 5 variações magnéticas de títulos com projeção de CTR para este projeto e salve nos itens salvos.",
  },
  {
    id: "hooks",
    label: "⚡ Criar Hooks",
    icon: "bolt",
    prompt: "Use a ferramenta Gerador de Hooks para criar 6 ganchos de abertura de alta retenção para este projeto e salve nos itens salvos.",
  },
  {
    id: "roteiro",
    label: "📜 Estruturar Roteiro",
    icon: "mic",
    prompt: "Use a ferramenta Roteiro & Gravação para estruturar um roteiro completo em 4 blocos (Hook, Contexto, Desenvolvimento, CTA) e salve nos itens salvos.",
  },
  {
    id: "resumir",
    label: "Resumir este projeto",
    icon: "fileText",
    prompt: "Faça um resumo executivo completo e estruturado deste projeto com base nas tarefas do kanban, anotações do bloco de notas e ferramentas/itens salvos.",
  },
  {
    id: "proximos_passos",
    label: "Próximos passos",
    icon: "listCheck",
    prompt: "Com base no status atual das tarefas do kanban e nas últimas anotações, quais devem ser os próximos passos e prioridades estratégicas? Se achar adequado, sugira a criação de tarefas no kanban.",
  },
];

function buildProjectContext({
  project,
  tasks,
  savedItems,
  notes,
  userRole,
}: {
  project: Project;
  tasks: Task[];
  savedItems: ProjectSavedItem[];
  notes: any[];
  userRole: "owner" | "editor" | "viewer";
}): string {
  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const roleDescription =
    userRole === "owner"
      ? "PROPRIETÁRIO (Dono total do projeto: pode criar, mover, editar, excluir tarefas, notas e alterar projeto)"
      : userRole === "editor"
      ? "COLABORADOR EDITOR (Pode criar, mover e editar tarefas e adicionar anotações. Não pode apagar o projeto)"
      : "COLABORADOR LEITOR (Apenas visualização: NÃO tem permissão para alterar nada)";

  const lines: string[] = [
    `=== DADOS DO PROJETO ===`,
    `Nome: ${project.name}`,
    project.description ? `Descrição: ${project.description}` : "",
    `Status Geral: ${project.status || "em andamento"} | Progresso Geral: ${project.progress || 0}%`,
    project.tags && project.tags.length > 0 ? `Tags: ${project.tags.join(", ")}` : "",
    project.external_link ? `Link Externo: ${project.external_link}` : "",
    project.target_date ? `Data Limite: ${project.target_date}` : "",
    `Permissão do Usuário Atual: ${roleDescription}`,
    "",
    `=== QUADRO KANBAN (${tasks.length} tarefas no total) ===`,
    `[A Fazer - ${todoTasks.length}]:`,
    todoTasks.length === 0
      ? "  (Nenhuma tarefa a fazer)"
      : todoTasks.map((t) => `  • [ID: ${t.id}] ${t.title}${t.description ? ` - ${t.description}` : ""}`).join("\n"),
    `[Em Andamento - ${inProgressTasks.length}]:`,
    inProgressTasks.length === 0
      ? "  (Nenhuma tarefa em andamento)"
      : inProgressTasks.map((t) => `  • [ID: ${t.id}] ${t.title}${t.description ? ` - ${t.description}` : ""}`).join("\n"),
    `[Concluído - ${doneTasks.length}]:`,
    doneTasks.length === 0
      ? "  (Nenhuma tarefa concluída)"
      : doneTasks.map((t) => `  • [ID: ${t.id}] ${t.title}${t.description ? ` - ${t.description}` : ""}`).join("\n"),
    "",
    `=== ITENS E FERRAMENTAS SALVAS DO PROJETO (${savedItems.length} itens) ===`,
  ];

  if (savedItems.length === 0) {
    lines.push("  (Nenhum item salvo no momento)");
  } else {
    savedItems.forEach((item, i) => {
      lines.push(`  ${i + 1}. [${item.group || "Geral"} • ${item.toolName || item.type}] ${item.title}`);
      if (item.tag) lines.push(`     Tag: ${item.tag}`);
      if (item.summary) lines.push(`     Resumo: ${item.summary}`);
      if (item.content && item.content !== item.summary) {
        const preview = item.content.length > 500 ? item.content.slice(0, 500) + "... [truncado]" : item.content;
        lines.push(`     Conteúdo: ${preview}`);
      }
      if (item.url) lines.push(`     URL: ${item.url}`);
    });
  }

  lines.push("");
  lines.push(`=== BLOCO DE NOTAS (${notes.length} anotações) ===`);
  if (notes.length === 0) {
    lines.push("  (Nenhuma anotação registrada)");
  } else {
    notes.forEach((n, i) => {
      const author = n.profile?.channel ? `@${n.profile.channel}` : (n.profile?.full_name || "Membro");
      const date = n.created_at ? new Date(n.created_at).toLocaleDateString("pt-BR") : "";
      lines.push(`  ${i + 1}. [${author}${date ? ` em ${date}` : ""}]: ${n.content}`);
    });
  }

  return lines.filter(Boolean).join("\n");
}

function renderFormattedText(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded border border-ink-800/80 bg-ink-950/90 px-1.5 py-0.5 font-mono text-[11px] text-signal-400">
          {part.slice(1, -1)}
        </code>
      );
    }
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return (
        <strong key={i} className="font-semibold text-bone-50">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return (
        <em key={i} className="italic text-bone-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function FormattedMarkdown({ content }: { content: string }) {
  // Normalize markdown text:
  // 1. Separate inline bullets like " * Status..." into clean newlines
  let normalized = content.replace(/([^\n])\s+\*\s+/g, "$1\n* ");
  // 2. Separate inline numbered lists like " 1. Title" into newlines
  normalized = normalized.replace(/([^\n])\s+(\d+\.\s+)/g, "$1\n$2");
  // 3. Separate horizontal rules
  normalized = normalized.replace(/([^\n])\s*---\s*([^\n])/g, "$1\n\n---\n\n$2");
  // 4. Join isolated numbered list items like "1.\nTitle"
  normalized = normalized.replace(/^(\d+[\.\)])[ \t]*\r?\n+([^\r\n]+)/gm, "$1 $2");
  // 5. Join isolated hashes with title on next line like "###\nTitle"
  normalized = normalized.replace(/^(#{1,4})[ \t]*\r?\n+([^\r\n]+)/gm, "$1 $2");

  const lines = normalized.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "bullet" | "number"; items: { num?: string; text: string }[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    if (currentList.type === "bullet") {
      elements.push(
        <ul key={`list_${elements.length}`} className="my-2 space-y-1.5 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-bone-200">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-400" />
              <span className="flex-1">{renderFormattedText(item.text)}</span>
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`list_${elements.length}`} className="my-2 space-y-1.5 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-bone-200">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] font-bold text-signal-400">
                {item.num || `${idx + 1}.`}
              </span>
              <span className="flex-1">{renderFormattedText(item.text)}</span>
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Ignore isolated hashes without text (e.g. "###" on its own)
    if (/^#{1,4}$/.test(trimmed)) {
      flushList();
      continue;
    }

    // Divider: --- or *** or ___
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList();
      elements.push(
        <div key={`hr_${elements.length}`} className="my-3 border-t border-ink-800/80" />
      );
      continue;
    }

    // Headers: #, ##, ###, ####
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      const headingText = headerMatch[2];

      if (level === 1) {
        elements.push(
          <div key={`h1_${elements.length}`} className="mt-4 mb-2">
            <h2 className="font-display text-[15px] font-bold text-bone-50 tracking-wide">
              {renderFormattedText(headingText)}
            </h2>
          </div>
        );
      } else if (level === 2) {
        elements.push(
          <div key={`h2_${elements.length}`} className="mt-3.5 mb-2 flex items-center gap-2 border-b border-ink-800/60 pb-1.5">
            <span className="h-2 w-2 rounded-sm bg-signal-400" />
            <h3 className="font-display text-[14px] font-bold text-bone-50 tracking-wide">
              {renderFormattedText(headingText)}
            </h3>
          </div>
        );
      } else {
        // level 3 and 4
        elements.push(
          <div key={`h3_${elements.length}`} className="mt-3 mb-1.5 flex items-center gap-2 border-b border-ink-800/40 pb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-400" />
            <h4 className="font-display text-[13px] font-bold text-signal-400 tracking-wide">
              {renderFormattedText(headingText)}
            </h4>
          </div>
        );
      }
      continue;
    }

    // Bullet item: -, *, •
    const bulletMatch = trimmed.match(/^([•\-\*])\s+(.+)$/);
    if (bulletMatch && !/^(\-{3,}|\*{3,})$/.test(trimmed)) {
      if (!currentList || currentList.type !== "bullet") {
        flushList();
        currentList = { type: "bullet", items: [] };
      }
      currentList.items.push({ text: bulletMatch[2] });
      continue;
    }

    // Numbered item: 1. or 1)
    const numberMatch = trimmed.match(/^(\d+[\.\)])\s+(.+)$/);
    if (numberMatch) {
      if (!currentList || currentList.type !== "number") {
        flushList();
        currentList = { type: "number", items: [] };
      }
      currentList.items.push({ num: numberMatch[1], text: numberMatch[2] });
      continue;
    }

    // Blockquote: >
    if (trimmed.startsWith(">")) {
      flushList();
      elements.push(
        <blockquote key={`quote_${elements.length}`} className="my-2 border-l-2 border-signal-400/60 bg-ink-950/40 py-1 pl-3 font-sans text-[12px] italic text-bone-300">
          {renderFormattedText(trimmed.replace(/^>\s*/, ""))}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p_${elements.length}`} className="my-1 text-[12.5px] leading-relaxed text-bone-200">
        {renderFormattedText(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

function extractProjectActions(text: string): { cleanText: string; actions: ProjectAction[] } {
  const actions: ProjectAction[] = [];

  // Match ```project_actions ... ``` or ```json ... ``` with project actions
  const codeBlockRegex = /```(?:project_actions|json)?\s*([\s\S]*?)\s*```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const rawContent = match[1].trim();
    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object" && item.type) {
            actions.push(item);
          }
        }
      } else if (parsed && typeof parsed === "object" && parsed.type) {
        actions.push(parsed);
      }
    } catch {
      // Ignore non-json code blocks
    }
  }

  // Remove the action code blocks from the displayed chat text
  const cleanText = text.replace(/```(?:project_actions|json)?\s*[\s\S]*?\s*```/g, "").trim();

  return { cleanText, actions };
}

export function ProjetoAIChat({
  project,
  tasks,
  savedItems,
  notes,
  userRole = "owner",
  onGo,
  onCreateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onAddNote,
  onUpdateProject,
  onSaveToolItem,
}: ProjetoAIChatProps) {
  const { user } = useAuth();
  const os = useStudioOS();
  const { t } = useI18n();
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const presetPrompts = useMemo(
    () => [
      {
        id: "rank_ideia",
        label: t("ai_chat.preset_rank_label", undefined, "💡 Ideia no Rank de Ideias"),
        icon: "target",
        prompt: t("ai_chat.preset_rank_prompt", undefined, "Acesse a ferramenta Rank de Ideia, crie uma ideia inédita de alto impacto calibrada para este projeto, avalie os 5 critérios e salve diretamente nos itens salvos do projeto."),
      },
      {
        id: "titulos",
        label: t("ai_chat.preset_titulos_label", undefined, "🎯 Gerar 5 Títulos"),
        icon: "type",
        prompt: t("ai_chat.preset_titulos_prompt", undefined, "Use a ferramenta Gerador de Títulos para criar 5 variações magnéticas de títulos com projeção de CTR para este projeto e salve nos itens salvos."),
      },
      {
        id: "hooks",
        label: t("ai_chat.preset_hooks_label", undefined, "⚡ Criar Hooks"),
        icon: "bolt",
        prompt: t("ai_chat.preset_hooks_prompt", undefined, "Use a ferramenta Gerador de Hooks para criar 6 ganchos de abertura de alta retenção para este projeto e salve nos itens salvos."),
      },
      {
        id: "roteiro",
        label: t("ai_chat.preset_roteiro_label", undefined, "📜 Estruturar Roteiro"),
        icon: "mic",
        prompt: t("ai_chat.preset_roteiro_prompt", undefined, "Use a ferramenta Roteiro & Gravação para estruturar um roteiro completo em 4 blocos (Hook, Contexto, Desenvolvimento, CTA) e salve nos itens salvos."),
      },
      {
        id: "resumir",
        label: t("ai_chat.preset_summary_label", undefined, "Resumir este projeto"),
        icon: "fileText",
        prompt: t("ai_chat.preset_summary_prompt", undefined, "Faça um resumo executivo completo e estruturado deste projeto com base nas tarefas do kanban, anotações do bloco de notas e ferramentas/itens salvos."),
      },
      {
        id: "proximos_passos",
        label: t("ai_chat.preset_next_steps_label", undefined, "Próximos passos"),
        icon: "listCheck",
        prompt: t("ai_chat.preset_next_steps_prompt", undefined, "Com base no status atual das tarefas do kanban e nas últimas anotações, quais devem ser os próximos passos e prioridades estratégicas? Se achar adequado, sugira a criação de tarefas no kanban."),
      },
    ],
    [t]
  );

  // Storage key is strictly per-project and per-user
  const storageKey = `studioos_project_ai_chat_p_${project.id}_u_${user?.id || "guest"}`;

  const [messages, setMessages] = useState<ChatEntry[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleNavigateToConfig = () => {
    if (onGo) {
      onGo("config");
    } else {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("view", "config");
        window.location.href = url.toString();
      } catch {}
    }
  };

  // Save to localStorage whenever messages change (persists locally per user/project)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [storageKey, messages]);

  // Auto-scroll chat container to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  const handleClearChat = () => {
    setMessages([]);
    setShowClearConfirm(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading) return;

    const userMessage: ChatEntry = {
      id: `msg_u_${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const apiKey = os.config.apiKey?.trim();
      const provider = os.config.provider;
      const model = os.config.model;

      if (!apiKey && provider !== "custom") {
        const warningMsg: ChatEntry = {
          id: `msg_a_${Date.now()}`,
          role: "assistant",
          content:
            "⚠️ Nenhuma chave de API configurada para o provedor selecionado (" +
            (provider || "Google") +
            ").\n\nPor favor, acesse as **Configurações** (?view=config ou clique no botão acima) para inserir sua chave de API e escolher o modelo de IA desejado.",
          timestamp: Date.now(),
        };
        setMessages([...nextMessages, warningMsg]);
        setLoading(false);
        return;
      }

      const projectContext = buildProjectContext({
        project,
        tasks,
        savedItems,
        notes,
        userRole,
      });

      const rolePermissionRules =
        userRole === "owner"
          ? "O usuário atual é o PROPRIETÁRIO do projeto. Ele tem permissão total para criar tarefas, mover tarefas, excluir tarefas, criar anotações e alterar dados do projeto."
          : userRole === "editor"
          ? "O usuário atual é um COLABORADOR COM FUNÇÃO EDITOR. Ele PODE criar tarefas, mover tarefas, editar tarefas e adicionar notas. Ele NÃO PODE excluir o projeto nem alterar configurações reservadas ao proprietário."
          : "O usuário atual é um COLABORADOR COM FUNÇÃO LEITOR (VIEWER). Ele NÃO tem permissão para criar tarefas, mover tarefas, excluir nada ou alterar dados do projeto. Se ele solicitar qualquer alteração, recuse amavelmente explicando a restrição de sua conta.";

      const systemPrompt = `Você é o Copiloto IA inteligente, analítico e criativo do projeto "${project.name}" no StudioOS.
Você tem acesso aos dados reais e atualizados do projeto:

${projectContext}

PERMISSÕES DO USUÁRIO ATUAL:
${rolePermissionRules}

FERRAMENTAS DO STUDIOOS DISPONÍVEIS:
O StudioOS possui 10 ferramentas profissionais integradas. Você tem autoridade para usar qualquer uma delas, gerar conteúdo de alta performance e salvá-lo automaticamente como Item Salvo oficial do projeto:
1. "rank" (Rank de Ideia): Avalia ideias de conteúdo com notas de 0 a 100 em 5 critérios (viralidade, originalidade, autoridade, conversao, execucao), nota ponderada e veredicto.
   Metadata padrão: {"idea": "Nome/Conceito da Ideia", "niche": "Nicho do Projeto", "criteria": {"viralidade": 85, "originalidade": 90, "autoridade": 80, "conversao": 75, "execucao": 85}, "score": 83, "verdict": "Veredicto analítico"}
2. "titulos" (Gerador de Títulos): Títulos magnéticos com alta taxa de clique (CTR) para YouTube, Instagram ou TikTok.
   Metadata padrão: {"tema": "Tema central", "platform": "youtube", "tops": ["Título 1", "Título 2", "Título 3", "Título 4", "Título 5"], "ctr": "12.4%"}
3. "hooks" (Gerador de Hooks): Ganchos de abertura de altíssima retenção para os primeiros 3 segundos.
   Metadata padrão: {"theme": "Tema", "promise": "Promessa principal", "tone": "curioso", "picked": "Gancho de maior impacto", "items": ["Gancho 1", "Gancho 2", "Gancho 3"]}
4. "roteiro" (Roteirizador & Gravação): Roteiros estruturados em 4 blocos essenciais: Hook, Contexto, Desenvolvimento e CTA.
   Metadata padrão: {"tab": "video", "takeName": "Título do Roteiro", "blocks": {"hook": "...", "contexto": "...", "dev": "...", "cta": "..."}}
5. "thumbnail" (Planejador de Thumbnails): Conceito visual, texto curto e contraste para capas de vídeo.
   Metadata padrão: {"tema": "Tema do vídeo", "thumbText": "TEXTO DA CAPA", "archetypeId": "curiosidade", "slotType": "rosto_e_objeto", "faceExpression": "surpresa", "bgHex": "#08080c", "rimHex": "#f59e0b"}
6. "humanizador" (Humanizador de Conteúdo): Reescreve textos mecânicos com cadência humana, naturalidade e quebra de padrões.
   Metadata padrão: {"draft": "Texto humanizado completo...", "score": 88}
7. "score" (Analisador de Score): Análise diagnóstica e pontuação de retenção para roteiros ou posts.
   Metadata padrão: {"draft": "Texto analisado...", "format": "youtube", "score": 82}
8. "receita" (Receita de Conteúdo): Desdobra uma ideia base em múltiplos formatos rápidos (carrossel, reels, artigo).
   Metadata padrão: {"tema": "Tema base", "original": "Texto de origem", "format": "carrossel", "para": "Público alvo", "insumo": "..."}
9. "mentor" (Mentor de Estratégia): Recomendações táticas para canais e criadores.
   Metadata padrão: {"situation": "Situação ou gargalo", "group": "posicionamento", "frameworkN": 1}
10. "membros" (Calculadora de Comunidade): Simulação de receita e conversão de membros.
    Metadata padrão: {"inscritos": 10000, "preco": 29.90, "conversao": 2.0}

REGRAS DE EXECUÇÃO DE AÇÕES NO PROJETO:
Você PODE executar ações diretamente no projeto quando o usuário pedir (ou quando for uma sugestão que o usuário concordou em criar)!
Quando o usuário solicitar a criação de tarefas, movimentação de status, exclusão de tarefas, adição de notas, alteração do projeto OU a geração de itens com as ferramentas do StudioOS:
Se a permissão dele permitir, você DEVE adicionar ao final da sua resposta um bloco JSON formatado exatamente como:

\`\`\`project_actions
[
  {
    "type": "save_tool_item",
    "tool": "rank", // "rank" | "titulos" | "hooks" | "roteiro" | "thumbnail" | "humanizador" | "score" | "receita" | "mentor" | "membros"
    "title": "Título conciso do item gerado",
    "summary": "Resumo objetivo em 1 ou 2 linhas",
    "tag": "Ideia Aprovada",
    "content": "Conteúdo textual completo gerado...",
    "metadata": { ...metadados específicos da ferramenta... }
  }
]
\`\`\`

Ações disponíveis:
- \`{"type": "save_tool_item", "tool": "rank"|"titulos"|"hooks"|"roteiro"|"thumbnail"|"humanizador"|"score"|"receita"|"mentor"|"membros", "title": "...", "summary": "...", "tag": "...", "content": "...", "metadata": { ... }}\`
- \`{"type": "create_task", "title": "...", "description": "...", "status": "todo" | "in_progress" | "done"}\`
- \`{"type": "update_task_status", "taskId": "...", "taskTitle": "...", "newStatus": "todo" | "in_progress" | "done"}\`
- \`{"type": "delete_task", "taskId": "...", "taskTitle": "..."}\` (apenas para quem tem permissão)
- \`{"type": "add_note", "content": "..."}\`
- \`{"type": "update_project", "status": "planejamento" | "em andamento" | "concluido" | "pausado"}\` (apenas se for owner)

REGRA DE OURO PARA FERRAMENTAS DO PROJETO:
Quando o usuário pedir: "vá no rank de ideias gere aleatoriamente e adicione aos itens salvos desse projeto", ou qualquer variação como "gere ideias", "crie títulos", "crie hooks", "crie um roteiro", "crie um briefing", etc.:
1. No texto da resposta, gere o conteúdo COMPLETO, criativo, detalhado e formatado em Markdown impecável.
2. Emita OBRIGATORIAMENTE o bloco \`\`\`project_actions com \`{"type": "save_tool_item", ...}\`. Isso adicionará o item oficial à lista de Itens Salvos do projeto, com suporte a restauração e abertura direta na ferramenta!
3. Caso a permissão do usuário seja "viewer", não emita o bloco de ação e avise gentilmente.

ESCOPO CIRÚRGICO E PRINCÍPIO DA NÃO-REPETIÇÃO (MUITO IMPORTANTE):
1. ATENÇÃO ESTRITA À MENSAGEM ATUAL:
   - Responda e execute EXATAMENTE e APENAS o que o usuário solicitou na mensagem atual.
   - NUNCA re-execute, recrie, repita ou gere novamente itens ou ações de mensagens anteriores, a menos que o usuário tenha pedido expressamente para recriá-los.
2. CORREÇÃO OU AJUSTE PONTUAL (ex: "o briefing não ficou salvo", "só crie a thumbnail", "altere o título"):
   - Verifique sempre a seção "=== ITENS E FERRAMENTAS SALVAS DO PROJETO ===" acima e o histórico de mensagens.
   - Se um item já estiver salvo no projeto (por exemplo, se o Roteiro já consta nos Itens Salvos), NUNCA gere outro roteiro nem emita ação para ele!
   - Foque 100% no item específico que o usuário mencionou (ex: se o briefing de thumbnail não ficou salvo, crie e salve UNICAMENTE o Briefing de Thumbnail).
   - Emita a ação save_tool_item UNICAMENTE para o item que falta ou que foi expressamente solicitado nesta mensagem.
3. CONCISÃO E FOCO:
   - Fazer coisas que o usuário NÃO pediu ou repetir trabalho já concluído anteriormente confunde e frustra o usuário. Seja cirúrgico, objetivo e direto ao ponto.

DIRETRIZES DE FORMATAÇÃO E TEXTO:
1. ${getAILanguageDirective()}
2. Formate sua resposta em Markdown limpo e estruturado:
   - Use títulos com \`### Título da Seção\` para dividir o texto. NUNCA coloque \`###\` isolado em uma linha sem texto. Escreva sempre na mesma linha: \`### 1. Planejamento de Thumbnail\`.
   - Use tópicos com marcadores (\`- Item\`) para listas e pontos acionáveis.
   - NUNCA isole o número de uma lista em uma linha separada (ex: \`1.\` sozinho). Escreva sempre o número e o texto na mesma linha: \`1. **Título**: descrição...\`.
   - NUNCA agrupe múltiplos tópicos ou itens na mesma linha; use sempre quebras de linha limpas entre parágrafos.
   - Use \`**negrito**\` para destacar termos essenciais.
3. Se você executar ações, mencione claramente no seu texto o que foi gerado e salvo.`;

      // Pass conversation history with executed actions feedback
      const historyForApi: AIChatMessage[] = nextMessages.slice(-12).map((m) => {
        let content = m.content;
        if (m.executedActions && m.executedActions.length > 0) {
          const actsDesc = m.executedActions
            .map((a) => `[Ação do projeto executada: ${a.message} | Status: ${a.status}]`)
            .join("\n");
          content = `${content}\n\n${actsDesc}`;
        }
        return {
          role: m.role,
          content,
        };
      });

      const reply = await requestAI(
        {
          provider: provider || "google",
          model: model || "gemini-3.8-flash",
          apiKey: apiKey || "",
          baseUrl: os.config.baseUrl || "",
          temperature: os.config.temperature ?? 0.7,
        },
        systemPrompt,
        textToSend,
        {
          maxTokens: 2048,
          messages: historyForApi,
        }
      );

      // Extract and execute project actions if requested by the AI
      const { cleanText, actions } = extractProjectActions(reply);
      const executedActions: ExecutedAction[] = [];

      for (const act of actions) {
        // Enforce role permissions locally before executing
        if (userRole === "viewer") {
          executedActions.push({
            id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            action: act,
            status: "denied",
            message: "Operação não permitida: Sua função no projeto é de Leitor (somente leitura).",
          });
          continue;
        }

        if (act.type === "update_project" && userRole !== "owner") {
          executedActions.push({
            id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            action: act,
            status: "denied",
            message: "Operação não permitida: Apenas o proprietário do projeto pode alterar dados gerais do projeto.",
          });
          continue;
        }

        try {
          let res: { success: boolean; message?: string } = { success: false, message: "Ação não suportada." };

          if (act.type === "create_task") {
            res = (await onCreateTask?.({
              title: act.title,
              description: act.description,
              status: act.status || "todo",
            })) || { success: false };
          } else if (act.type === "update_task_status") {
            res = (await onUpdateTaskStatus?.(act.taskId || act.taskTitle || "", act.newStatus)) || {
              success: false,
            };
          } else if (act.type === "delete_task") {
            res = (await onDeleteTask?.(act.taskId || act.taskTitle || "")) || { success: false };
          } else if (act.type === "add_note") {
            res = (await onAddNote?.(act.content)) || { success: false };
          } else if (act.type === "update_project") {
            res = (await onUpdateProject?.({
              status: act.status,
              name: act.name,
              description: act.description,
            })) || { success: false };
          } else if (act.type === "save_tool_item") {
            const saveRes = await onSaveToolItem?.({
              tool: act.tool,
              title: act.title,
              summary: act.summary,
              content: act.content,
              tag: act.tag,
              metadata: act.metadata,
            });
            if (saveRes?.success) {
              const toolName = TOOL_NAME_MAP[act.tool] || act.tool;
              executedActions.push({
                id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                action: act,
                status: "success",
                message: saveRes.message || `Item gerado e salvo em Itens Salvos do Projeto (${toolName}).`,
                savedItem: saveRes.item,
              });
              continue;
            } else {
              res = { success: false, message: saveRes?.message || "Falha ao salvar item nos itens salvos do projeto." };
            }
          }

          executedActions.push({
            id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            action: act,
            status: res.success ? "success" : "error",
            message: res.message || (res.success ? "Ação executada com sucesso." : "Falha ao executar ação."),
          });
        } catch (err: any) {
          executedActions.push({
            id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            action: act,
            status: "error",
            message: err.message || "Erro inesperado ao executar ação.",
          });
        }
      }

      const assistantMessage: ChatEntry = {
        id: `msg_a_${Date.now()}`,
        role: "assistant",
        content: cleanText || (executedActions.length > 0 ? "Executei as ações solicitadas no projeto:" : reply),
        timestamp: Date.now(),
        executedActions: executedActions.length > 0 ? executedActions : undefined,
      };

      setMessages([...nextMessages, assistantMessage]);
    } catch (err: any) {
      let errorMessage = "Ocorreu um erro ao consultar a IA.";
      if (err instanceof AIModelUnavailableError) {
        errorMessage = `O modelo configurado não está disponível para esta chave. Modelos sugeridos: ${err.availableModels.slice(0, 5).join(", ")}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      const errorEntry: ChatEntry = {
        id: `msg_a_${Date.now()}`,
        role: "assistant",
        content: `❌ ${errorMessage}`,
        timestamp: Date.now(),
      };
      setMessages([...nextMessages, errorEntry]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasApiKey = Boolean(os.config.apiKey?.trim() || os.config.provider === "custom");

  return (
    <div className="overflow-hidden rounded-xl border border-ink-800/40 bg-ink-900/20 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800/30 px-5 py-3.5 bg-ink-950/20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-signal-400/30 bg-signal-400/10 text-signal-400 shadow-[0_0_12px_rgba(242,179,61,0.15)]">
            <Icon name="bot" className="h-4.5 w-4.5" strokeWidth={1.8} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-[10.5px] font-bold tracking-[0.14em] text-bone-100 uppercase">
                {t("ai_chat.title", undefined, "Assistente IA do Projeto")}
              </h3>
              <span className="flex items-center gap-1 rounded bg-signal-400/10 border border-signal-400/25 px-1.5 py-0.5 font-mono text-[8px] font-bold text-signal-300">
                <span className="h-1.5 w-1.5 rounded-full bg-signal-400 animate-pulse" />
                ONLINE
              </span>
              <span
                className="hidden sm:inline-flex items-center gap-1 rounded bg-ink-800/60 border border-ink-700/50 px-1.5 py-0.5 font-mono text-[8px] text-bone-400"
                title={t("ai_chat.isolated_history_title", undefined, "Histórico isolado apenas para você neste navegador")}
              >
                {t("ai_chat.private_local", undefined, "PRIVADO & LOCAL")}
              </span>
            </div>
            <p className="font-mono text-[9px] text-ink-400 mt-0.5">
              {t("ai_chat.context_synced", undefined, "Contexto sincronizado")}: {tasks.length} {t("ai_chat.tasks_count", undefined, "tarefas")} • {savedItems.length} {t("ai_chat.saved_count", undefined, "itens salvos")} • {notes.length} {t("ai_chat.notes_count", undefined, "notas")}
            </p>
          </div>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2">
          {/* Provider / Model Pill */}
          {hasApiKey ? (
            <button
              type="button"
              onClick={handleNavigateToConfig}
              className="group flex items-center gap-1.5 rounded-md border border-ink-800 bg-ink-900/60 px-2.5 py-1 font-mono text-[9px] text-bone-400 hover:text-signal-300 hover:border-signal-400/40 hover:bg-ink-800/80 transition-all cursor-pointer"
              title={t("ai_chat.change_provider_title", undefined, "Clique para escolher outro modelo de IA ou provedor em Configurações (?view=config)")}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
              <span className="uppercase font-bold">{os.config.provider || "google"}</span>
              <span className="text-ink-600">•</span>
              <span className="text-ink-300 truncate max-w-[125px] font-medium group-hover:text-bone-100">{os.config.model || "gemini"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNavigateToConfig}
              className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-[9px] font-bold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
              title={t("ai_chat.configure_key_title", undefined, "Clique para cadastrar sua chave de API em Configurações (?view=config)")}
            >
              <Icon name="alert" className="h-3 w-3" />
              {t("ai_chat.configure_key_btn", undefined, "CONFIGURAR CHAVE")}
            </button>
          )}

          {/* CLEAR CHAT BUTTON */}
          {messages.length > 0 && (
            <div className="relative">
              {showClearConfirm ? (
                <div className="flex items-center gap-1.5 rounded-md bg-ink-950/95 border border-red-500/30 p-1 shadow-lg">
                  <span className="font-mono text-[8.5px] text-red-300 px-1">{t("ai_chat.clear_confirm_q", undefined, "Limpar?")}</span>
                  <button
                    onClick={handleClearChat}
                    className="rounded bg-red-500/20 px-2 py-0.5 font-mono text-[8.5px] font-bold text-red-300 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                  >
                    {t("ai_chat.yes", undefined, "Sim")}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="rounded px-1.5 py-0.5 font-mono text-[8.5px] text-bone-400 hover:text-bone-200 transition-colors cursor-pointer"
                  >
                    {t("ai_chat.no", undefined, "Não")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1 rounded-md border border-ink-800 bg-ink-900/60 px-2.5 py-1 font-mono text-[9px] text-ink-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all cursor-pointer"
                  title={t("ai_chat.clear_chat_title", undefined, "Limpar histórico de chat deste projeto (ação local manual)")}
                >
                  <Icon name="trash" className="h-3 w-3" />
                  <span className="hidden sm:inline">{t("ai_chat.clear_chat_btn", undefined, "Limpar chat")}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QUICK PRESET PROMPTS (CHIPS BAR) */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-ink-800/25 bg-ink-950/30 px-4 py-2 scrollbar-none">
        <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-wider text-ink-500 mr-1">
          {t("ai_chat.quick_questions", undefined, "Perguntas rápidas:")}
        </span>
        {presetPrompts.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSendMessage(preset.prompt)}
            disabled={loading}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-ink-800/80 bg-ink-900/70 px-2.5 py-1 font-mono text-[9px] text-bone-300 hover:border-signal-400/40 hover:bg-signal-400/10 hover:text-signal-300 transition-all cursor-pointer disabled:opacity-40"
          >
            <Icon name={preset.icon} className="h-3 w-3 text-signal-400" />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* MESSAGES CONTAINER */}
      <div ref={chatScrollRef} className="flex flex-col gap-3 p-5 min-h-[220px] max-h-[460px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center my-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-signal-400/30 bg-signal-400/10 text-signal-400 shadow-[0_0_20px_rgba(242,179,61,0.15)]">
              <Icon name="bot" className="h-6 w-6" strokeWidth={1.7} />
            </div>
            <div className="max-w-md">
              <h4 className="font-display text-sm font-bold text-bone-100 mb-1">
                {t("ai_chat.empty_title", { project: project.name }, `Como posso ajudar com o projeto "${project.name}"?`)}
              </h4>
              <p className="text-[12px] text-ink-400 leading-relaxed">
                {t("ai_chat.empty_desc", undefined, "Posso analisar seu Kanban, anotações e ferramentas salvas, além de criar tarefas, mover itens ou registrar notas diretamente quando você me pedir!")}
              </p>
            </div>

            {/* Aviso destacado quando não tem chave */}
            {!hasApiKey && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 max-w-lg w-full text-left my-2 shadow-[0_0_20px_rgba(245,158,11,0.07)]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <Icon name="alert" className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-amber-200">{t("ai_chat.no_key_title", undefined, "Nenhuma chave de IA configurada")}</div>
                    <div className="text-[11px] text-amber-300/80 leading-snug">
                      {t("ai_chat.no_key_desc", undefined, "Insira sua chave gratuita (Google Gemini, Groq, OpenAI, etc.) para conversar com o projeto.")}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleNavigateToConfig}
                  className="flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 font-mono text-[9px] font-bold text-ink-950 uppercase hover:bg-amber-300 transition-colors shrink-0 cursor-pointer shadow-sm"
                >
                  <span>{t("ai_chat.configure_btn", undefined, "Configurar")}</span>
                  <Icon name="arrowRight" className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Quick Actions Grid for Empty State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
              {presetPrompts.slice(0, 4).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSendMessage(preset.prompt)}
                  disabled={loading}
                  className="flex items-center gap-2.5 rounded-lg border border-ink-800/60 bg-ink-900/40 p-2.5 text-left text-bone-200 hover:border-signal-400/40 hover:bg-signal-400/[0.04] hover:text-signal-300 transition-all cursor-pointer group disabled:opacity-40"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-signal-400/20 bg-signal-400/10 text-signal-400 group-hover:bg-signal-400 group-hover:text-ink-950 transition-colors">
                    <Icon name={preset.icon} className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-full",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-signal-400/30 bg-signal-400/15 text-signal-400 mt-0.5">
                    <Icon name="bot" className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={cn(
                    "group relative rounded-xl p-4 transition-all max-w-[88%] sm:max-w-[82%]",
                    isUser
                      ? "bg-signal-400/15 border border-signal-400/30 text-bone-50 ml-8"
                      : "bg-ink-950/60 border border-ink-800/60 text-bone-200"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-ink-800/30 font-mono text-[8.5px] uppercase tracking-wider text-ink-500">
                    <span className={cn(isUser ? "text-signal-300 font-bold" : "text-signal-400 font-bold")}>
                      {isUser ? (user?.name || t("common.you", undefined, "Você")) : "Copiloto IA"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          setCopiedId(msg.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-400 hover:text-signal-300 p-0.5"
                        title={t("ai_chat.copy_message_title", undefined, "Copiar mensagem")}
                      >
                        <Icon
                          name={copiedId === msg.id ? "check" : "copy"}
                          className="h-3 w-3"
                        />
                      </button>
                    </div>
                  </div>

                  {isUser ? (
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-bone-100">
                      {msg.content}
                    </p>
                  ) : (
                    <>
                      <FormattedMarkdown content={msg.content} />
                      {msg.content.includes("Nenhuma chave de API configurada") && (
                        <div className="mt-3 pt-2.5 border-t border-ink-800/40">
                          <button
                            onClick={handleNavigateToConfig}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/15 border border-amber-500/30 px-3 py-1.5 font-mono text-[10px] font-bold text-amber-300 hover:bg-amber-400 hover:text-ink-950 transition-all cursor-pointer"
                          >
                            <Icon name="alert" className="h-3.5 w-3.5" />
                            <span>{t("ai_chat.configure_key_model", undefined, "Configurar Chave / Modelo →")}</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* EXECUTED ACTIONS WIDGET */}
                  {msg.executedActions && msg.executedActions.length > 0 && (
                    <div className="mt-3.5 space-y-2 border-t border-ink-800/60 pt-2.5">
                      <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-signal-400">
                        <Icon name="bolt" className="h-3 w-3" />
                        <span>{t("ai_chat.project_actions_title", undefined, "Ações do Projeto")}</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.executedActions.map((exec) => {
                          const saveAction = exec.action.type === "save_tool_item" ? exec.action : null;
                          const toolKey = saveAction ? saveAction.tool : "";
                          const toolName = toolKey ? (TOOL_NAME_MAP[toolKey] || toolKey) : "";
                          const toolIcon = toolKey ? (TOOL_ICON_MAP[toolKey] || "sparkles") : "check";

                          const handleOpenTool = () => {
                            if (!saveAction || !toolKey) return;
                            const itemToRestore = exec.savedItem || {
                              id: `ai_item_${Date.now()}`,
                              type: toolKey,
                              title: saveAction.title || "Item Salvo",
                              summary: saveAction.summary || "",
                              content: saveAction.content || "",
                              tag: saveAction.tag || "",
                              metadata: saveAction.metadata || {},
                              created_at: new Date().toISOString(),
                            };
                            prepareToolRestore(toolKey, itemToRestore as any);
                            onGo?.(toolKey);
                          };

                          return (
                            <div
                              key={exec.id}
                              className={cn(
                                "rounded-lg border p-2.5 font-mono text-[10px] transition-all",
                                exec.status === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                                exec.status === "denied" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
                                exec.status === "error" && "border-red-500/30 bg-red-500/10 text-red-300"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5 shrink-0">
                                  {exec.status === "success" && (
                                    <Icon name={saveAction ? toolIcon : "check"} className="h-3.5 w-3.5 text-emerald-400" />
                                  )}
                                  {exec.status === "denied" && <Icon name="lock" className="h-3.5 w-3.5 text-amber-400" />}
                                  {exec.status === "error" && <Icon name="alert" className="h-3.5 w-3.5 text-red-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="leading-snug">{exec.message}</div>
                                  {saveAction && exec.status === "success" && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2 pt-1.5 border-t border-emerald-500/20">
                                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 uppercase tracking-wider">
                                        {toolName}
                                      </span>
                                      {saveAction.tag && (
                                        <span className="rounded bg-ink-950/60 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-200">
                                          {saveAction.tag}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={handleOpenTool}
                                        className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-signal-400 px-2.5 py-1 font-mono text-[10px] font-bold text-ink-950 transition-all hover:bg-signal-300 hover:shadow-md cursor-pointer active:scale-95"
                                        title={t("ai_chat.open_tool_title", { tool: toolName }, `Abrir e carregar dados na ferramenta ${toolName}`)}
                                      >
                                        <Icon name="restore" className="h-3 w-3" />
                                        <span>{t("ai_chat.open_in_tool", undefined, "Abrir na Ferramenta →")}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-signal-400/40 bg-signal-400 text-ink-950 font-mono text-[10px] font-bold uppercase mt-0.5">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="flex gap-3 justify-start max-w-[85%]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-signal-400/30 bg-signal-400/15 text-signal-400 animate-pulse mt-0.5">
              <Icon name="bot" className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-xl border border-ink-800/60 bg-ink-950/60 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal-400 animate-ping" />
                <span className="font-mono text-[10px] tracking-wider text-signal-300 uppercase">
                  {t("ai_chat.evaluating_context", undefined, "Avaliando contexto e executando ações solicitadas...")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="border-t border-ink-800/40 bg-ink-950/40 p-4">
        <div className="relative flex items-end gap-2 rounded-xl border border-ink-800/60 bg-ink-950/80 p-2 focus-within:border-signal-400/50 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={t("ai_chat.input_placeholder", undefined, 'Pergunte algo ou peça para a IA: "Crie uma tarefa...", "Mova a tarefa...", "Adicione uma anotação..."')}
            rows={2}
            className="w-full resize-none bg-transparent px-2 py-1 text-[13px] text-bone-100 placeholder:text-ink-500 focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal-400 text-ink-950 shadow-[0_4px_14px_-6px_rgba(242,179,61,0.5)] transition-all hover:bg-signal-300 disabled:opacity-30 disabled:shadow-none cursor-pointer"
            title={t("ai_chat.send_title", undefined, "Enviar mensagem (Enter)")}
          >
            <Icon name="send" className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-ink-500 font-mono">
          <span>
            {t("ai_chat.press_enter_hint", undefined, "Pressione Enter para enviar • Shift + Enter para quebra de linha")}
          </span>
          <span className="hidden sm:inline">
            {userRole === "owner" ? t("ai_chat.role_owner", undefined, "👑 Você é Proprietário (Acesso Total)") : userRole === "editor" ? t("ai_chat.role_editor", undefined, "✏️ Você é Editor") : t("ai_chat.role_viewer", undefined, "👁️ Você é Leitor (Sem edição)")}
          </span>
        </div>
      </div>
    </div>
  );
}
