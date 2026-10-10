import { useMemo, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Meter, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { burstiness, findCliches, humanScore, rewrite, words, type Hit } from "./textAnalysis";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";

function Marked({ text, hits }: { text: string; hits: Hit[] }) {
  if (!text.trim())
    return <p className="font-mono text-[12px] text-ink-400">Cole o rascunho para ver as marcas.</p>;
  const parts: ReactNode[] = [];
  let cursor = 0;
  hits.forEach((h, i) => {
    parts.push(<span key={`t${i}`}>{text.slice(cursor, h.index)}</span>);
    parts.push(
      <mark
        key={`h${i}`}
        className="group relative mx-[1px] rounded-[3px] bg-oxide-400/25 px-1 py-0.5 text-oxide-400 decoration-oxide-400/60 underline decoration-wavy underline-offset-4 transition-colors hover:bg-oxide-400/40"
        title={h.fix ? `troque por “${h.fix}”` : "corte"}
      >
        {h.word}
      </mark>
    );
    cursor = h.index + h.length;
  });
  parts.push(<span key="end">{text.slice(cursor)}</span>);
  return (
    <p className="font-body text-[15px] leading-[1.85] text-bone-200">
      {parts}
    </p>
  );
}

export function Humanizador({
  onBack,
  onGo,
  calib,
  profileName,
  profileColor,
}: {
  onBack: () => void;
  onGo: (id: string) => void;
  calib?: Calib;
  profileName?: string;
  profileColor?: string;
}) {
  const examples = useExampleMode();
  const [draft, setDraft] = useState(
    examples ? "Neste post, vamos mergulhar na jornada de quem quer otimizar seus investimentos. É importante notar que o cenário atual exige uma estratégia robusta e inovadora. Além disso, existem dicas práticas que podem alavancar seus resultados de forma eficiente e transformar sua relação com o dinheiro em uma verdadeira jornada. Vale lembrar que cada passo conta nessa caminhada transformadora." : ""
  );

  useToolRestore("humanizador", (payload) => {
    if (payload.metadata?.draft) {
      setDraft(payload.metadata.draft);
    } else if (payload.content) {
      const match = payload.content.match(/RASCUNHO ORIGINAL[\r\n]+([\s\S]*?)(?:[\r\n]+VERSÃO HUMANIZADA|$)/i);
      if (match && match[1]) {
        setDraft(match[1].trim());
      } else {
        const clean = payload.content
          .replace(/^HUMANIDADE:.*[\r\n]*/i, "")
          .replace(/^TROCAS:.*[\r\n]*/i, "")
          .replace(/^RASCUNHO ORIGINAL[\r\n]*/i, "")
          .trim();
        setDraft(clean);
      }
    }
  });

  const hits = useMemo(() => findCliches(draft), [draft]);
  const b = useMemo(() => burstiness(draft), [draft]);
  const w = words(draft).length;
  const score = useMemo(() => (draft.trim() ? humanScore(draft) : 0), [draft]);
  const fixed = useMemo(() => rewrite(draft), [draft]);
  const newHits = findCliches(fixed).length;
  const newScore = fixed.trim() ? humanScore(fixed) : 0;

  const friendlySummary = useMemo(() => {
    if (!draft.trim()) return "Nenhum texto inserido";
    if (w < 12) {
      if (hits.length === 0) {
        return `🔍 Frase curta (${w} ${w === 1 ? "palavra" : "palavras"}) · Vocabulário limpo, sem marcas de IA · Insira mais texto para medir cadência e ritmo (Nota ${newScore}/100)`;
      }
      return `⚠️ Frase curta (${w} ${w === 1 ? "palavra" : "palavras"}) · ${hits.length} ${hits.length === 1 ? "termo robótico ajustado" : "termos robóticos ajustados"} (Nota ${newScore}/100)`;
    }
    if (newScore >= 80) {
      return `✨ Tom altamente autêntico (${newScore}/100) · Ritmo espontâneo e livre de clichês de IA`;
    }
    if (newScore >= 65) {
      return `🌿 Boa naturalidade (${newScore}/100) · ${hits.length > 0 ? `${hits.length} ${hits.length === 1 ? "marca robótica removida" : "marcas robóticas removidas"} · ` : "Sem marcas evidentes de IA · "}Leitura agradável`;
    }
    if (newScore >= 45) {
      return `⚖️ Tom intermediário (${newScore}/100) · ${hits.length > 0 ? `${hits.length} ${hits.length === 1 ? "expressão ajustada" : "expressões ajustadas"} · ` : ""}Frases com ritmo monótono, requer mais variação`;
    }
    return `🤖 Tom engessado (${newScore}/100) · ${hits.length > 0 ? `${hits.length} marcas típicas de IA · ` : ""}Recomendado reescrever com tom de conversa`;
  }, [draft, w, hits.length, newScore]);

  useAutosave(
    () => ({
      tool: "humanizador",
      toolName: "Humanizador",
      title: draft.trim() ? `Humanizado — ${draft.slice(0, 68).trim()}…` : "",
      summary: friendlySummary,
      tag: `${newScore}/100`,
      content: `HUMANIDADE: ${score}/100 → ${newScore}/100\nTROCAS: ${hits.length} termos (${hits.slice(0, 8).map((h) => `${h.word}→${h.fix || "corte"}`).join(", ")})\n\nRASCUNHO ORIGINAL\n${draft}\n\nVERSÃO HUMANIZADA\n${fixed}`,
    }),
    [draft, fixed, score, newScore, friendlySummary],
    16
  );

  const longSentences = draft
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .filter((s) => s.trim().split(/\s+/).length > 26);

  const gauge = 2 * Math.PI * 44;

  return (
    <ToolShell
      id="humanizador"
      title="Humanizador"
      accent="oxide"
      lede="Filtro anti-robô. Detecta o vocabulário batido de IA, mede a variação do tamanho das frases (burstiness) e devolve uma versão reescrita com ritmo de gente — sem perder o seu argumento."
      meta={[
        { k: "Marcas de IA", v: String(hits.length) },
        { k: "Burstiness", v: b.toFixed(1) },
        { k: "Palavras", v: String(w) },
        { k: "Humanidade", v: `${score}/100` },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        draft.trim()
          ? {
              type: "humanizador",
              group: "Publicação",
              toolName: "Humanizador",
              title: `Texto Humanizado (${newScore}/100)`,
              summary: friendlySummary,
              tag: `${newScore}/100`,
              content: `HUMANIDADE: ${score}/100 → ${newScore}/100\nTROCAS: ${hits.length} termos (${hits.slice(0, 8).map((h) => `${h.word}→${h.fix || "corte"}`).join(", ")})\n\nRASCUNHO ORIGINAL\n${draft}\n\nVERSÃO HUMANIZADA\n${fixed}`,
              metadata: {
                draft,
              },
            }
          : null
      }
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title="Índice de humanidade" note="0–100" accent="oxide">
            <div className="flex items-center gap-5">
              <div className="relative h-[104px] w-[104px] shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" className="text-ink-800" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="44" fill="none" strokeWidth="8" strokeLinecap="round"
                    className={cn(
                      "transition-[stroke-dashoffset] duration-700 ease-out",
                      newScore > 70 ? "text-mint-400" : score > 70 ? "text-mint-400" : score > 45 ? "text-signal-400" : "text-oxide-400"
                    )}
                    stroke="currentColor"
                    strokeDasharray={gauge}
                    strokeDashoffset={gauge * (1 - score / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[1.9rem] leading-none font-extrabold text-bone-50 tabular-nums">{score}</span>
                  <span className="font-mono text-[8.5px] tracking-[0.18em] text-ink-400 uppercase">antes</span>
                </div>
              </div>
              <div>
                <div className="font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">depois da reescrita</div>
                <div className={cn("font-display text-[2.4rem] leading-none font-extrabold tabular-nums", newScore > score ? "text-mint-300" : "text-bone-200")}>
                  {newScore}
                </div>
                <div className="mt-1 font-mono text-[10.5px] text-mint-400 tabular-nums">
                  +{Math.max(0, newScore - score)} pontos · {newHits} marcas restantes
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3 border-t border-ink-800 pt-4">
              <Meter value={b} max={12} accent="sky" label="Burstiness (variação de frases)" />
              <Meter value={Math.max(0, 12 - hits.length)} max={12} accent="mint" label="Limpeza de vocabulário" />
              <Meter value={Math.min(10, w / 15)} max={10} accent="signal" label="Corpo do texto" />
            </div>
          </Card>

          <Card title="Ritmo" note="frases longas" accent="sky">
            {longSentences.length ? (
              <ul className="space-y-2">
                {longSentences.slice(0, 3).map((s) => (
                  <li key={s} className="rounded border border-ink-800 bg-ink-950/50 p-2.5">
                    <span className="mb-1 block font-mono text-[9px] tracking-[0.14em] text-signal-400 uppercase">
                      {s.trim().split(/\s+/).length} palavras — corte no meio
                    </span>
                    <span className="block text-[12px] leading-snug text-bone-400">
                      {s.trim().slice(0, 96)}…
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-bone-400">
                Nenhuma frase acima de 26 palavras. Ritmo de fala preservado.
              </p>
            )}
          </Card>

          <Card title="Próximo passo" accent="mint">
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start" icon="check" onClick={() => onGo("score")}>
                Dar nota no Score de Post
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" icon="flask" onClick={() => onGo("receita")}>
                Comparar com receita viral
              </Button>
            </div>
          </Card>
        </div>
      }
    >
      <CalibrationNotice
        calib={calib}
        profileName={profileName}
        profileColor={profileColor}
        toolName="Humanizador"
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Rascunho com marcas de IA" note={`${hits.length} detectadas`} accent="oxide">
          <Textarea
            rows={9}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Cole aqui o texto que saiu do ChatGPT ou do Claude"
          />
          <div className="mt-4 rounded-md border border-ink-800 bg-ink-950/60 p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <Icon name="eye" className="h-3.5 w-3.5 text-oxide-400" />
              <span className="font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                Leitura com destaque
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto pr-1">
              <Marked text={draft} hits={hits} />
            </div>
          </div>

          {hits.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                Trocas sugeridas
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hits.slice(0, 14).map((h, i) => (
                  <span
                    key={`${h.word}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded border border-ink-700 bg-ink-950/60 px-2 py-1 font-mono text-[10.5px]"
                  >
                    <span className="text-oxide-400 line-through decoration-oxide-400/60">{h.word}</span>
                    <Icon name="arrow" className="h-2.5 w-2.5 text-ink-500" strokeWidth={2.5} />
                    <span className="text-mint-300">{h.fix || "cortar"}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Versão humanizada" note="reescrita automática" accent="mint">
          <div className="min-h-[13rem] rounded-md border border-mint-400/20 bg-ink-950/60 p-4">
            {fixed ? (
              <p className="font-body text-[15px] leading-[1.85] text-bone-100">{fixed}</p>
            ) : (
              <p className="font-mono text-[12px] text-ink-400">Aguardando rascunho…</p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={fixed} />
            <Button size="sm" variant="outline" icon="wave" onClick={() => setDraft(fixed)}>
              Aplicar como rascunho
            </Button>
            <span className="ml-auto font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
              {words(fixed).length} palavras · {burstiness(fixed).toFixed(1)} burstiness
            </span>
          </div>

          <div className="mt-5 rounded-md border border-ink-800 bg-ink-900/60 p-4">
            <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-signal-400 uppercase">
              Regras da reescrita
            </div>
            <ul className="space-y-1.5">
              {[
                "Troca o vocabulário batido por palavra de conversa",
                "Corta muletas de abertura que não carregam informação",
                "Mantém o argumento e a ordem original das ideias",
                "Não inventa dado nem promete o que o texto não entrega",
              ].map((r) => (
                <li key={r} className="flex items-start gap-2 text-[12px] leading-snug text-bone-400">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal-400" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </ToolShell>
  );
}
