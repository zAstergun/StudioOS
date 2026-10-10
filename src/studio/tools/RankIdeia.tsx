import { useMemo, useState, useEffect } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Label, Meter, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { useAutosave } from "./useAutosave";
import { useStudioOS } from "../history";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { getDynamicSuggestions, isCalibrated, type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";

const STOP = new Set([
  "a","o","as","os","um","uma","de","do","da","dos","das","em","no","na","nos","nas","com","sem",
  "para","pra","por","que","e","ou","mas","se","eu","voce","você","meu","minha","seu","sua",
  "como","quando","onde","qual","quais","mais","menos","muito","muita","ja","já","aos","ao","à","às",
  "isso","esse","essa","este","esta","sao","é","ser","são","foi","tem","ter","nao","não","sim",
  "the","of","and","to","in","is","for","on","with","how","why","what",
]);

function keywords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áàâãéêíóôõúüç\s-]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

type Crit = {
  key: string;
  label: string;
  score: number;
  why: string;
  accent: "signal" | "sky" | "mint" | "plum" | "oxide";
};

export function evaluate(idea: string, niche: string): { crits: Crit[]; total: number } {
  const text = idea.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const kw = keywords(text);
  const nkw = new Set(keywords(niche));

  const hasNumber = /\d/.test(text);
  const money = /(r\$|reais|dinheiro|invest|renda|lucro|preju|milh|mil)/i.test(text);
  const second = /(você|voce|seu|sua|te |você)/i.test(text);
  const first = /(eu |meu|minha|parei|comecei|perdi|testei|fiz)/i.test(text);
  const proof = /(tela|print|extrato|gráfico|grafico|mostrar|resultado|número|numero|planilha|dashboard|ao vivo|testei)/i.test(text);
  const overlap = kw.filter((w) => nkw.has(w));
  const tension = /(nunca|parei|erro|pior|segredo|ninguém|ninguem|verdade|flopou|falha|risco|medo|perdi)/i.test(text);

  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

  const pool = clamp(
    3.4 +
      (money ? 2.4 : 0) +
      (hasNumber ? 1.5 : 0) +
      (second ? 1.1 : 0) +
      (tension ? 1.3 : 0) +
      Math.min(1.4, words.length / 12)
  );

  const prova = clamp(2.6 + (proof ? 4.4 : 0) + (hasNumber ? 1.6 : 0) + (money ? 0.9 : 0));

  const conexao = clamp(3.2 + (first ? 3.1 : 0) + (second ? 1.6 : 0) + (tension ? 1.2 : 0));

  const fit = nkw.size
    ? clamp(3.5 + Math.min(4.5, overlap.length * 1.7) + (words.length >= 5 && words.length <= 18 ? 1.4 : 0))
    : clamp(5 + (words.length >= 5 && words.length <= 18 ? 1.5 : 0));

  const outlier = clamp(
    4.2 + (tension ? 1.6 : 0) + (first && hasNumber ? 1.5 : 0) + (kw.length > 3 ? 0.8 : 0) + (money ? 0.6 : 0)
  );

  const crits: Crit[] = [
    {
      key: "pool",
      label: "Pool de Atenção",
      score: pool,
      accent: "signal",
      why: money
        ? "Dinheiro amplia o teto de espectadores."
        : "Sem interesse universal (dinheiro, tempo, status). Teto baixo.",
    },
    {
      key: "prova",
      label: "Prova Visual",
      score: prova,
      accent: "sky",
      why: proof
        ? "Tem algo que dá para mostrar na tela — retenção sobe."
        : "Nada visível na tela. Adicione print, extrato, gráfico ou teste ao vivo.",
    },
    {
      key: "conexao",
      label: "Conexão Pessoal",
      score: conexao,
      accent: "mint",
      why: first
        ? "1ª pessoa + consequência: parece história, não aula."
        : "Falta 1ª pessoa. Troque “como fazer” por “o que aconteceu comigo”.",
    },
    {
      key: "fit",
      label: "Fit com o Canal",
      score: fit,
      accent: "plum",
      why: nkw.size
        ? overlap.length
          ? `${overlap.length} palavra(s) do nicho calibrado: ${overlap.slice(0, 3).join(", ")}.`
          : "Fora do vocabulário do nicho calibrado."
        : "Calibre o nicho para medir o fit de verdade.",
    },
    {
      key: "outlier",
      label: "Fator Outlier",
      score: outlier,
      accent: "oxide",
      why: tension
        ? "Tem tensão/confissão — quebra o padrão do feed."
        : "Previsível demais. Adicione uma quebra de expectativa.",
    },
  ];

  if (!text) {
    return {
      crits: crits.map((crit) => ({ ...crit, score: 0, why: "Adicione uma ideia para avaliar este critério." })),
      total: 0,
    };
  }

  const weights = [0.26, 0.2, 0.18, 0.2, 0.16];
  const total = crits.reduce((s, c, i) => s + c.score * weights[i], 0);

  return { crits, total: Math.round(total * 10) / 10 };
}

export function verdict(total: number) {
  if (total >= 8) return { tag: "Potencial altíssimo", act: "Produzir agora", tone: "mint", note: "Coloque na frente da fila de gravação." };
  if (total >= 6) return { tag: "Boa ideia", act: "Ajustar ângulo", tone: "signal", note: "Um critério puxa a média para baixo. Corrija antes de gravar." };
  if (total >= 4) return { tag: "Morna", act: "Reempacotar", tone: "oxide", note: "O tema pode funcionar, o ângulo não. Troque a variável." };
  return { tag: "Fraca", act: "Descartar", tone: "oxide", note: "Teto baixo e sem prova. Volte ao banco de ideias." };
}

export function RankIdeia({
  onBack,
  onGo,
  niche,
  calib,
  profileName,
  profileColor,
}: {
  onBack: () => void;
  onGo: (id: string) => void;
  niche?: string;
  calib?: Calib;
  profileName?: string;
  profileColor?: string;
}) {
  const examples = useExampleMode();
  const effectiveNiche = niche ?? calib?.niche ?? "";
  const [localNiche, setLocalNiche] = useState(effectiveNiche);
  const [idea, setIdea] = useState(examples ? "Eu parei de investir R$100 por mês em FIIs e mostrei o extrato na tela" : "");
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (effectiveNiche) {
      setLocalNiche(effectiveNiche);
    }
  }, [effectiveNiche]);

  const activeSuggestions = useMemo(() => getDynamicSuggestions(calib), [calib]);
  const calibrated = isCalibrated(calib);

  const restore = (content: string) => {
    const ideaM = content.match(/IDEIA: (.*)/);
    const nicheM = content.match(/NICHO: (.*)/);
    if (ideaM) setIdea(ideaM[1]);
    if (nicheM && !nicheM[1].startsWith("(não")) setLocalNiche(nicheM[1]);
    setShow(true);
  };

  useToolRestore("rank", (payload) => {
    if (payload.metadata?.idea) {
      setIdea(payload.metadata.idea);
      if (payload.metadata.niche) setLocalNiche(payload.metadata.niche);
      setShow(true);
    } else if (payload.content) {
      restore(payload.content);
    }
  });

  const { crits, total } = useMemo(() => evaluate(idea, localNiche), [idea, localNiche]);
  const v = verdict(total);

  const friendlySummary = `Classificação: ${v.tag} (Nota ${total.toFixed(1)}/10) · Próximo passo: ${v.act}`;

  useAutosave(
    () => ({
      tool: "rank",
      toolName: "Rank de Ideia",
      title: idea.slice(0, 90),
      summary: friendlySummary,
      tag: `${total.toFixed(1)}/10`,
      content: `RATING: ${total.toFixed(1)}/10 — ${v.tag} (${v.act})\nIDEIA: ${idea}\nNICHO: ${localNiche || "(não calibrado)"}\n\nCRITÉRIOS\n${crits.map((c) => `${c.label.padEnd(18, " ")} ${c.score}/10 — ${c.why}`).join("\n")}\n\nPESOS\npool 26% · prova 20% · conexão 18% · fit 20% · outlier 16%`,
    }),
    [idea, localNiche, total, friendlySummary],
    6
  );

  const recentRuns = useStudioOS()
    .history.filter((h) => h.tool === "rank")
    .slice(0, 5);

  const dash = 2 * Math.PI * 52;
  const pct = total / 10;

  return (
    <ToolShell
      id="rank"
      title="Rank de Ideia"
      accent="signal"
      lede="Régua de 0 a 10 calibrada no seu canal. Cinco critérios, pesos fixos, zero achismo: a ideia passa, ajusta ou morre antes de você gastar um dia de gravação."
      meta={[
        { k: "Critérios", v: "5" },
        { k: "Escala", v: "0–10" },
        { k: "Corte", v: "≥ 8.0" },
        { k: "Avaliadas", v: "128" },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={idea.trim() ? {
        type: "rank",
        group: "Criação",
        toolName: "Rank de Ideia",
        title: idea.slice(0, 90),
        summary: friendlySummary,
        tag: `${total.toFixed(1)}/10`,
        content: `RATING: ${total.toFixed(1)}/10 — ${v.tag} (${v.act})\nIDEIA: ${idea}\nNICHO: ${localNiche || "(não calibrado)"}\n\nCRITÉRIOS\n${crits.map((c) => `${c.label.padEnd(18, " ")} ${c.score}/10 — ${c.why}`).join("\n")}\n\nPESOS\npool 26% · prova 20% · conexão 18% · fit 20% · outlier 16%`,
        metadata: {
          idea,
          niche: localNiche,
        },
      } : null}
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title="Veredito" note="tempo real">
            <div className="flex items-center gap-5">
              <div className="relative h-[124px] w-[124px] shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-ink-800" strokeWidth="9" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="9"
                    strokeLinecap="round"
                    className={cn(
                      "transition-[stroke-dashoffset,stroke] duration-700 ease-out",
                      v.tone === "mint" ? "stroke-mint-400 text-mint-400" : "stroke-signal-400 text-signal-400"
                    )}
                    stroke="currentColor"
                    strokeDasharray={dash}
                    strokeDashoffset={dash * (1 - pct)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[2.6rem] leading-none font-extrabold text-bone-50 tabular-nums">
                    {total.toFixed(1)}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.2em] text-ink-400 uppercase">/ 10</span>
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className={cn(
                    "font-display text-[17px] leading-tight font-extrabold",
                    v.tone === "mint" ? "text-mint-300" : "text-signal-300"
                  )}
                >
                  {v.tag}
                </div>
                <div className="mt-1 font-mono text-[10px] tracking-[0.18em] text-bone-300 uppercase">
                  → {v.act}
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">{v.note}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t border-ink-800 pt-4">
              {crits.map((c) => (
                <div key={c.key}>
                  <Meter value={c.score} max={10} accent={c.accent} label={c.label} />
                  <p className="mt-1 text-[11.5px] leading-snug text-ink-400">{c.why}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Histórico do avaliador" note={examples ? "acesso com conta" : `${recentRuns.length} recente(s)`} accent="bone">
            {examples ? (
              <div>
                <p className="text-[12px] leading-relaxed text-bone-400">Entre para consultar e restaurar suas análises.</p>
                <Button size="sm" variant="outline" className="mt-3" icon="login" onClick={() => onGo("historico")}>
                  Entrar para acessar
                </Button>
              </div>
            ) : recentRuns.length ? (
              <ul className="space-y-1.5">
                {recentRuns.map((run) => {
                  const rating = run.content.match(/RATING:([\d.]+)\/10/);
                  const score = rating ? parseFloat(rating[1]) : null;
                  return (
                    <li key={run.id}>
                      <button
                        onClick={() => restore(run.content)}
                        className="group flex w-full items-center gap-2.5 rounded-md border border-ink-800 bg-ink-950/60 px-2.5 py-2 text-left transition-all duration-200 hover:border-signal-400/40 hover:bg-ink-850"
                        title="Restaurar análise"
                      >
                        <Icon name="historico" className="h-3.5 w-3.5 shrink-0 text-ink-500 transition-colors group-hover:text-signal-400" />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-bone-300 transition-colors group-hover:text-bone-50">
                          {run.title}
                        </span>
                        {score !== null && (
                          <span
                            className={cn(
                              "shrink-0 font-display text-[13px] font-extrabold tabular-nums",
                              score >= 8 ? "text-mint-300" : score >= 6 ? "text-signal-300" : "text-oxide-400"
                            )}
                          >
                            {score.toFixed(1)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-2 text-center font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
                cada análise vira registro aqui
              </p>
            )}
            {!examples && (
              <button
                onClick={() => onGo("historico")}
                className="mt-3 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase transition-colors hover:text-signal-400"
              >
                ver todo o histórico
                <Icon name="arrow" className="h-3 w-3" strokeWidth={2.4} />
              </button>
            )}
          </Card>

          <Card title="Próximo passo" accent="mint">
            <p className="mb-3 text-[12.5px] leading-relaxed text-bone-400">
              Ideia aprovada vira empacotamento. Leve o tema direto para o título e o hook.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon="type" onClick={() => onGo("titulos")}>
                Gerar títulos
              </Button>
              <Button size="sm" variant="outline" icon="bolt" onClick={() => onGo("hooks")}>
                Gerar hooks
              </Button>
            </div>
          </Card>
        </div>
      }
    >
      <CalibrationNotice
        calib={calib}
        calibrated={calibrated}
        profileName={profileName}
        profileColor={profileColor}
        toolName="Rank de Ideia"
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <Card title="Descreva a ideia do vídeo" note="análise ao digitar" accent="signal">
          <Textarea
            rows={5}
            value={idea}
            onChange={(e) => {
              setIdea(e.target.value);
              setShow(true);
            }}
            placeholder="Ex.: Eu parei de investir R$100 em FIIs e o resultado foi pior que a poupança"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
              {idea.trim() ? idea.trim().split(/\s+/).length : 0} palavras
            </span>
            <span className="h-3 w-px bg-ink-700" />
            <span className="font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
              {idea.length} caracteres
            </span>
            <span className="ml-auto font-mono text-[10px] tracking-[0.14em] text-mint-400 uppercase">
              {show && idea.trim() ? "● analisado" : "○ aguardando"}
            </span>
          </div>

          <div className="mt-5 space-y-2 border-t border-ink-800 pt-4">
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-400">
                {calibrated ? `Sugestões para ${profileName || "este perfil"}` : "Sugestões de teste"}
              </span>
              {calibrated && (
                <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-wider text-mint-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
                  calibradas
                </span>
              )}
            </div>

            {activeSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setIdea(s)}
                className="group flex w-full items-center gap-2.5 rounded-md border border-ink-800 bg-ink-950/50 px-3 py-2 text-left text-[12.5px] text-bone-300 transition-all duration-200 hover:border-signal-400/40 hover:bg-ink-850 hover:text-bone-50 cursor-pointer"
              >
                <Icon name="spark" className="h-3.5 w-3.5 shrink-0 text-ink-400 transition-colors group-hover:text-signal-400" />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Calibração" note={profileName ? `perfil: ${profileName}` : "base"} accent="bone">
          <div className="mb-2 flex items-center justify-between">
            <Label hint="1 frase">Nicho do canal</Label>
            {profileName && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-bone-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: profileColor || "#F2B33D" }} />
                {profileName}
              </span>
            )}
          </div>
          <Textarea
            rows={3}
            value={localNiche}
            onChange={(e) => setLocalNiche(e.target.value)}
            placeholder="Finanças pessoais para quem começa com pouco dinheiro"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {keywords(localNiche)
              .slice(0, 8)
              .map((w) => (
                <span
                  key={w}
                  className="rounded border border-ink-700 bg-ink-950/60 px-2 py-0.5 font-mono text-[10px] text-bone-400"
                >
                  {w}
                </span>
              ))}
            {!keywords(localNiche).length && (
              <div className="flex flex-col gap-1 w-full pt-1">
                <span className="font-mono text-[10px] text-ink-400">sem vocabulário calibrado</span>
                <button
                  type="button"
                  onClick={() => onGo("calibracao")}
                  className="self-start font-mono text-[9.5px] uppercase tracking-wider text-signal-400 underline hover:text-signal-300 cursor-pointer"
                >
                  Calibrar canal agora →
                </button>
              </div>
            )}
          </div>
          <p className="mt-3 border-t border-ink-800 pt-3 text-[11.5px] leading-relaxed text-ink-400">
            O <strong className="text-bone-300">Fit com o Canal</strong> mede a sobreposição entre as
            palavras da ideia e o vocabulário do nicho declarado aqui.
          </p>
        </Card>
      </div>

      <Card title="Leitura crítica" note="5 critérios" accent="sky" className="mt-6">
        <div className="grid gap-px overflow-hidden rounded-md border border-ink-800 bg-ink-800 sm:grid-cols-2 lg:grid-cols-5">
          {crits.map((c) => (
            <div
              key={c.key}
              className="group relative bg-ink-950/70 p-4 transition-colors duration-300 hover:bg-ink-900"
            >
              <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                {c.label}
              </div>
              <div
                className={cn(
                  "font-display text-[2.1rem] leading-none font-extrabold tabular-nums transition-colors",
                  c.score >= 8
                    ? "text-mint-300"
                    : c.score >= 6
                      ? "text-signal-300"
                      : c.score >= 4
                        ? "text-bone-200"
                        : "text-oxide-400"
                )}
              >
                {c.score}
              </div>
              <Meter value={c.score} max={10} accent={c.accent} showValue={false} className="" />
              <p className="mt-2.5 text-[11.5px] leading-snug text-ink-400">{c.why}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CopyButton text={`Rank de Ideia — ${total.toFixed(1)}/10\n${idea}\n\n${crits.map((c) => `${c.label}: ${c.score}/10 — ${c.why}`).join("\n")}`} />
          <span className="font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
            pesos: pool 26% · prova 20% · conexão 18% · fit 20% · outlier 16%
          </span>
        </div>
      </Card>
    </ToolShell>
  );
}
