import { useEffect } from "react";

const RESTORE_PREFIX = "studioos_restore_tool_";

export interface ToolRestorePayload {
  tool: string;
  metadata?: any;
  content?: string;
  title?: string;
  summary?: string;
}

/**
 * Salva o estado a ser restaurado e emite evento
 */
export function prepareToolRestore(tool: string, item: any) {
  if (!tool || !item) return;

  // Extrair ou normalizar dados
  const metadata = item.metadata || {};
  const content = item.content || item.metadata?.content || "";
  const title = item.title || item.metadata?.title || "";
  const summary = item.summary || item.metadata?.summary || "";

  const payload: ToolRestorePayload = {
    tool,
    metadata,
    content,
    title,
    summary,
  };

  try {
    sessionStorage.setItem(RESTORE_PREFIX + tool, JSON.stringify(payload));
  } catch {}

  try {
    window.dispatchEvent(
      new CustomEvent("studioos:restore_tool", {
        detail: payload,
      })
    );
  } catch {}
}

/**
 * Hook para ferramentas receberem o estado salvo ao serem abertas
 */
export function useToolRestore(tool: string, onRestore: (payload: ToolRestorePayload) => void) {
  useEffect(() => {
    // 1. Checar se há dados pendentes no sessionStorage
    try {
      const stored = sessionStorage.getItem(RESTORE_PREFIX + tool);
      if (stored) {
        const parsed = JSON.parse(stored) as ToolRestorePayload;
        if (parsed && parsed.tool === tool) {
          onRestore(parsed);
          // Limpa com um breve delay para suportar remounts do React StrictMode
          setTimeout(() => {
            try { sessionStorage.removeItem(RESTORE_PREFIX + tool); } catch {}
          }, 350);
        }
      }
    } catch {}

    // 2. Ouvir evento em tempo real caso a ferramenta já esteja montada
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToolRestorePayload>;
      if (customEvent.detail && customEvent.detail.tool === tool) {
        onRestore(customEvent.detail);
      }
    };

    window.addEventListener("studioos:restore_tool", handleEvent);
    return () => window.removeEventListener("studioos:restore_tool", handleEvent);
  }, [tool, onRestore]);
}

/**
 * Transforma resumos técnicos antigos em frases simples, claras e agradáveis para qualquer usuário
 */
export function formatFriendlySummary(tool: string, rawSummary?: string, content?: string): string {
  if (!rawSummary) return "";

  let s = rawSummary.trim();

  // Limpar resumos técnicos do Humanizador
  // Exemplo legado: "-0 marcas · humanidade 44→44/100 · burstiness 0.0" ou "−1 marcas · humanidade 30→80/100 · burstiness 4.2"
  if (tool === "humanizador" || s.toLowerCase().includes("burstiness") || s.toLowerCase().includes("marcas") || s.toLowerCase().includes("humanidade") || s.toLowerCase().includes("texto fluido e autêntico")) {
    const marcasMatch = s.match(/[−-]?\s*(\d+)\s*marcas/i);
    const scoreMatch = s.match(/humanidade\s*(\d+)\s*(?:→|->|to|\/)\s*(\d+)(?:\/100)?/i) || s.match(/humanidade\s*(\d+)\/100/i) || s.match(/(\d+)\/100/);

    const marcas = marcasMatch ? parseInt(marcasMatch[1], 10) : 0;
    const scoreNovo = scoreMatch ? parseInt(scoreMatch[2] || scoreMatch[1], 10) : null;
    const scoreAntigo = scoreMatch && scoreMatch[2] ? parseInt(scoreMatch[1], 10) : null;

    // Detectar tamanho do texto a partir do conteúdo
    let wordCount = 0;
    if (content) {
      const draftMatch = content.match(/RASCUNHO ORIGINAL[\r\n]+([\s\S]*?)(?:[\r\n]+VERSÃO HUMANIZADA|$)/i);
      const draftText = draftMatch ? draftMatch[1].trim() : content.replace(/HUMANIDADE:.*|TROCAS:.*/g, "").trim();
      wordCount = draftText.split(/\s+/).filter(Boolean).length;
    }

    if (scoreNovo !== null) {
      // Caso 1: Amostra curta (< 12 palavras) - Ex: frase de teste
      if (wordCount > 0 && wordCount < 12) {
        if (marcas === 0) {
          return `🔍 Frase curta (${wordCount} ${wordCount === 1 ? "palavra" : "palavras"}) · Vocabulário limpo, sem marcas de IA · Insira mais texto para medir cadência e ritmo com precisão (Nota ${scoreNovo}/100)`;
        }
        return `⚠️ Frase curta (${wordCount} ${wordCount === 1 ? "palavra" : "palavras"}) · ${marcas} ${marcas === 1 ? "marca robótica detectada" : "marcas robóticas detectadas"} (Nota ${scoreNovo}/100)`;
      }

      // Caso 2: Texto com correções de marcas robóticas
      if (marcas > 0) {
        const evol = scoreAntigo !== null && scoreAntigo !== scoreNovo ? ` (evoluindo de ${scoreAntigo} para ${scoreNovo}/100)` : ` (Nota ${scoreNovo}/100)`;
        return `✨ ${marcas} ${marcas === 1 ? "expressão robótica ajustada" : "expressões robóticas ajustadas"} · Texto reescrito em tom humano${evol}`;
      }

      // Caso 3: Avaliação sem marcas por faixas de pontuação realistas
      if (scoreNovo >= 80) {
        return `✨ Tom altamente autêntico (${scoreNovo}/100) · Ritmo espontâneo e livre de clichês de IA`;
      } else if (scoreNovo >= 65) {
        return `🌿 Boa naturalidade (${scoreNovo}/100) · Leitura agradável e vocabulário sem clichês de IA`;
      } else if (scoreNovo >= 50) {
        return `⚖️ Tom intermediário (${scoreNovo}/100) · Frases com ritmo monótono, requer mais variação`;
      } else {
        return `🤖 Tom engessado (${scoreNovo}/100) · Amostra insuficiente ou vocabulário artificial`;
      }
    }
    // Caso tenha menção a notas gerais
    const fallbackScore = s.match(/(\d+)\/100/);
    if (fallbackScore) {
      const fb = parseInt(fallbackScore[1], 10);
      if (fb >= 80) return `✨ Texto altamente autêntico (${fb}/100) · Pronto para uso`;
      if (fb >= 65) return `🌿 Boa naturalidade (${fb}/100) · Leitura agradável`;
      return `⚖️ Rascunho com vocabulário simples (${fb}/100) · Requer mais desenvolvimento de texto`;
    }
  }

  // Limpar resumos do Rank de Ideia
  if (tool === "rank") {
    // Exemplo: "Potencial altíssimo · Produzir agora · pool 9 · prova 8 · conexao 7..."
    if (s.includes("pool") || s.includes("prova") || s.includes("conexao") || s.includes("outlier")) {
      const partes = s.split("·").map(p => p.trim());
      const veredito = partes[0] || "Potencial avaliado";
      const acao = partes[1] || "Produzir conteúdo";
      return `💡 Classificação: ${veredito} · Recomendação: ${acao} · Avaliada em potencial de retenção`;
    }
  }

  // Limpar resumos do Score de Post
  if (tool === "score") {
    // Exemplo: "Pronto para publicar · formato texto · pior critério: Clareza"
    if (s.includes("pior critério:") || s.includes("formato") || s.includes("burstiness")) {
      const matchCrit = s.match(/pior critério:\s*([^\s·]+)/i);
      const crit = matchCrit ? matchCrit[1] : "";
      const partes = s.split("·").map(p => p.trim());
      const status = partes[0] || "Post avaliado";
      return `📊 Status: ${status} · Analisado para redes sociais${crit ? ` (Foco de melhoria: ${crit})` : ""}`;
    }
  }

  // Limpar resumos de Roteiro
  if (tool === "roteiro") {
    // Exemplo: "84 palavras · ~0.6 min · checklist 4/4 · padrão de voz 6/6"
    const palMatch = s.match(/(\d+)\s*palavras/);
    const minMatch = s.match(/~?([\d.,]+)\s*min/);
    const checkMatch = s.match(/checklist\s*(\d+\/\d+)/);
    if (palMatch && minMatch) {
      return `📜 Roteiro estruturado com ${palMatch[1]} palavras (~${minMatch[1]} min de fala)${checkMatch ? ` · Qualidade: ${checkMatch[1]} itens atendidos` : ""}`;
    }
  }

  // Limpar resumos de Títulos
  if (tool === "titulos") {
    // Exemplo: "5 variações · CTR base 4.8% · topo: proj. 6.5%"
    const varMatch = s.match(/(\d+)\s*variações/);
    const projMatch = s.match(/proj\.?\s*([\d.,]+%)/);
    if (varMatch) {
      return `🎯 ${varMatch[1]} opções de títulos magnéticos geradas${projMatch ? ` · Melhor projeção de cliques: ${projMatch[1]}` : ""}`;
    }
  }

  // Limpar resumos de Hooks
  if (tool === "hooks") {
    // Exemplo: "6 ângulos · tom provocador · melhor: confissao (ret. 90%)"
    const retMatch = s.match(/ret\.?\s*([\d.,]+%)/);
    const tomMatch = s.match(/tom\s*([^·]+)/);
    return `⚡ 6 ganchos de abertura criados${tomMatch ? ` no tom ${tomMatch[1].trim()}` : ""}${retMatch ? ` · Retenção estimada em até ${retMatch[1]}` : ""}`;
  }

  // Limpar resumos de Thumbnail
  if (tool === "thumbnail") {
    const slotMatch = s.match(/slot\s*([^·]+)/) || s.match(/destaque:\s*([^·)]+)/i);
    return `🖼️ Briefing de capa planejado na regra 45/45${slotMatch ? ` (destaque: ${slotMatch[1].trim()})` : ""} · Sem poluição de texto`;
  }

  // Limpar resumos de Membros
  if (tool === "membros") {
    if (s.includes("viável") || s.includes("ajustar")) {
      return s.replace(/viável/i, "Meta viável para a base de inscritos").replace(/ajustar meta/i, "Necessário calibrar meta para a audiência");
    }
  }

  // Limpar resumos de Receita Viral
  if (tool === "receita") {
    if (s.includes("blocos") || s.includes("Tom")) {
      const tomMatch = s.match(/Tom\s*([^\s·]+)/i);
      return `🔥 Estrutura viral adaptada em 5 etapas${tomMatch ? ` no tom ${tomMatch[1]}` : ""} · Pronta para seu assunto`;
    }
  }

  // Limpeza geral de termos técnicos residuais
  s = s.replace(/burstiness\s*[\d.]+/gi, "");
  s = s.replace(/[−-]?\d+\s*marcas/gi, "");
  s = s.replace(/pool\s*\d+/gi, "");
  s = s.replace(/prova\s*\d+/gi, "");
  s = s.replace(/conexao\s*\d+/gi, "");
  s = s.replace(/outlier\s*\d+/gi, "");
  s = s.replace(/·\s*·+/g, "·");
  s = s.replace(/^\s*·\s*|\s*·\s*$/g, "").trim();

  return s;
}
