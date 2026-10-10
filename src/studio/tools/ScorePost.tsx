import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Label, Meter, Segmented, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { burstiness, findCliches, paragraphs, sentences, words } from "./textAnalysis";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

type Crit = { id: string; label: string; score: number; ev: string; fix: string; accent: "signal" | "sky" | "mint" | "plum" | "oxide" };

function scorePost(t: string, format: string): Crit[] {
  const sents = sentences(t);
  const paras = paragraphs(t);
  const w = words(t).length;
  const first = sents[0] ?? "";
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  const b = burstiness(t);
  const cliches = findCliches(t).length;
  const nums = (t.match(/\b\d+(?:[.,]\d+)?\b/g) ?? []).length;
  const second = (t.match(/\b(você|voce|seu|sua)\b/gi) ?? []).length;
  const longest = paras.reduce((m, p) => Math.max(m, words(p).length), 0);

  const ideal = format === "carrossel" ? 90 : format === "thread" ? 220 : 160;

  const hook = Math.round(
    Math.min(10,
      (first ? 3 : 0) +
      (first.length > 0 && first.length <= 95 ? 2.5 : 0) +
      (/\d/.test(first) ? 2 : 0) +
      (/(nunca|parei|erro|ninguém|ninguem|perdi|verdade|não|nao|pior|melhor|risco)/i.test(first) ? 1.5 : 0) +
      (/^(oi|olá|ola|e aí|eai)/i.test(first) ? -3 : 0)
    )
  );

  const voz = Math.round(Math.min(10, (b / 7) * 7 + Math.min(3, second * 0.8)));

  const valor = Math.round(
    Math.min(10,
      (w >= ideal * 0.6 ? 4 : (w / (ideal * 0.6)) * 4) +
      Math.min(3, nums * 1.1) +
      (w > ideal * 2.2 ? -2 : 0) +
      (paras.length >= 3 ? 3 : paras.length)
    )
  );

  const estrutura = Math.round(
    Math.min(10,
      (lines.length >= 4 ? 4 : lines.length) +
      (longest <= 45 ? 3.5 : longest <= 80 ? 2 : 0.5) +
      (paras.length >= 2 ? 2.5 : 0.5)
    )
  );

  const prontidao = Math.round(Math.max(0, 10 - cliches * 2 - (EMOJI.test(t) ? 2 : 0)));

  return [
    {
      id: "hook",
      label: "Hook",
      score: Math.max(0, hook),
      accent: "signal",
      ev: first ? `“${first.slice(0, 70)}${first.length > 70 ? "…" : ""}” · ${words(first).length} palavras` : "post vazio",
      fix: /\d/.test(first) ? "Número presente na abertura — segure essa régua." : "Coloque um número cru na primeira linha.",
    },
    {
      id: "voz",
      label: "Voz",
      score: voz,
      accent: "sky",
      ev: `burstiness ${b.toFixed(1)} · ${second} menção(ões) em 2ª pessoa`,
      fix: b < 4 ? "Frases todas do mesmo tamanho. Alterne: uma curta depois de uma longa." : "Ritmo variado, leitura de fala.",
    },
    {
      id: "valor",
      label: "Valor",
      score: valor,
      accent: "mint",
      ev: `${w} palavras · ${nums} dado(s) numérico(s) · ideal p/ ${format}: ~${ideal}`,
      fix: w < ideal * 0.6 ? "Denso demais para o formato. Acrescente um exemplo concreto." : w > ideal * 2.2 ? "Gordura sobrando. Corte um parágrafo." : "Densidade adequada ao formato.",
    },
    {
      id: "estrutura",
      label: "Estrutura",
      score: estrutura,
      accent: "plum",
      ev: `${lines.length} linhas · ${paras.length} parágrafo(s) · maior bloco com ${longest} palavras`,
      fix: longest > 45 ? "Quebre o parágrafo mais longo: escaneabilidade cai no mobile." : "Blocos curtos, escaneáveis.",
    },
    {
      id: "prontidao",
      label: "Prontidão",
      score: prontidao,
      accent: "oxide",
      ev: `${cliches} marca(s) de IA${EMOJI.test(t) ? " · emoji encontrado" : ""}`,
      fix: cliches ? "Passe no Humanizador antes de publicar." : "Sem clichê de IA. Pode apertar publicar.",
    },
  ];
}

function verdict(total: number) {
  if (total >= 40) return { tag: "Pronto para publicar", tone: "mint", note: "Acima do corte de 40. Publique e meça em 48h." };
  if (total >= 30) return { tag: "Quase lá", tone: "signal", note: "Um ou dois critérios seguram a nota. Corrija o de menor score." };
  if (total >= 18) return { tag: "Reescrever", tone: "oxide", note: "Estrutura fraca. Volte ao hook e reorganize em blocos." };
  return { tag: "Não publique", tone: "oxide", note: "Ainda é rascunho. Falta tese, prova e ritmo." };
}

export function ScorePost({
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
    examples ? "Parei de aportar R$100 por mês em FIIs.\n\nO resultado em 2 anos: R$2.400 colocados, R$2.311 de saldo. Menos que a poupança.\n\nEu escolhi fundo pelo dividend yield e ignorei a vacância. Você não precisa repetir.\n\nHoje eu divido assim: 60% tesouro, 30% um FII de tijolo com vacância abaixo de 10%, 10% caixa.\n\nSe você aporta R$100 por mês, faça essa conta antes do próximo aporte." : ""
  );
  const [format, setFormat] = useState<"carrossel" | "texto" | "thread" | "legenda">("texto");

  useToolRestore("score", (payload) => {
    if (payload.metadata?.draft !== undefined) {
      setDraft(payload.metadata.draft);
      if (payload.metadata.format) setFormat(payload.metadata.format);
    } else if (payload.content) {
      const matchDraft = payload.content.match(/RASCUNHO[\r\n]+([\s\S]*)$/i);
      const matchFormat = payload.content.match(/formato:\s*([^\s·]+)/i);
      if (matchDraft) setDraft(matchDraft[1].trim());
      if (matchFormat && ["carrossel", "texto", "thread", "legenda"].includes(matchFormat[1].trim())) {
        setFormat(matchFormat[1].trim() as any);
      }
    }
  });

  const crits = useMemo(() => scorePost(draft, format), [draft, format]);
  const total = crits.reduce((s, c) => s + c.score, 0);
  const v = verdict(total);
  const worst = [...crits].sort((a, b) => a.score - b.score)[0];

  const friendlySummary = `Avaliação: ${total}/50 (${v.tag}) para post em ${format} · ${total >= 40 ? "Pronto para publicar!" : "Dica de melhoria: " + worst.fix}`;

  useAutosave(
    () => ({
      tool: "score",
      toolName: "Score de Post",
      title: draft.trim() ? `Score ${total}/50 — ${draft.split("\n")[0].slice(0, 64)}` : "",
      summary: friendlySummary,
      tag: `${total}/50`,
      content: `SCORE DE POST — ${total}/50 · ${v.tag.toUpperCase()}\nformato: ${format} · ${words(draft).length} palavras · burstiness ${burstiness(draft).toFixed(1)}\n\n${crits.map((c) => `${c.label.padEnd(11, " ")} ${String(c.score).padStart(2)}/10 — ${c.ev}`).join("\n")}\n\ncorreção prioritária: ${worst.fix}\n\nRASCUNHO\n${draft}`,
    }),
    [draft, format, total, friendlySummary],
    16
  );

  return (
    <ToolShell
      id="score"
      title="Score de Post"
      accent="mint"
      lede="Nota de 0 a 50 em cinco critérios, calculada sobre o texto que você colou — não sobre uma impressão. Acima de 40 publica. Abaixo disso, o painel aponta exatamente qual critério derrubou a nota."
      meta={[
        { k: "Critérios", v: "5" },
        { k: "Escala", v: "0–50" },
        { k: "Corte", v: "≥ 40" },
        { k: "Avaliados", v: "312" },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        draft.trim()
          ? {
              type: "score",
              group: "Publicação",
              toolName: "Score de Post",
              title: `Score ${total}/50 — ${draft.split("\n")[0].slice(0, 50)}`,
              summary: friendlySummary,
              tag: `${total}/50`,
              content: `SCORE DE POST — ${total}/50 · ${v.tag.toUpperCase()}\nformato: ${format} · ${words(draft).length} palavras · burstiness ${burstiness(draft).toFixed(1)}\n\n${crits.map((c) => `${c.label.padEnd(11, " ")} ${String(c.score).padStart(2)}/10 — ${c.ev}`).join("\n")}\n\ncorreção prioritária: ${worst.fix}\n\nRASCUNHO\n${draft}`,
              metadata: {
                draft,
                format,
              },
            }
          : null
      }
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title="Placar" note="tempo real" accent="mint">
            <div className="mb-4 flex items-end gap-3">
              <span
                className={cn(
                  "font-display text-[4.5rem] leading-[0.8] font-extrabold tabular-nums",
                  v.tone === "mint" ? "text-mint-300" : total >= 30 ? "text-signal-300" : "text-oxide-400"
                )}
              >
                {total}
              </span>
              <span className="pb-2 font-mono text-[12px] text-ink-400">/ 50</span>
            </div>

            {/* LED segments */}
            <div className="mb-4 flex gap-1">
              {Array.from({ length: 25 }).map((_, i) => {
                const on = i < Math.round(total / 2);
                const hot = i >= 20;
                const mid = i >= 15;
                return (
                  <span
                    key={i}
                    className={cn(
                      "h-5 flex-1 rounded-[2px] transition-all duration-300",
                      on ? (hot ? "bg-mint-400" : mid ? "bg-signal-400" : "bg-sky-400") : "bg-ink-800"
                    )}
                    style={{ transitionDelay: `${i * 18}ms` }}
                  />
                );
              })}
            </div>

            <div
              className={cn(
                "rounded-md border p-3",
                v.tone === "mint" ? "border-mint-400/30 bg-mint-400/[0.07]" : "border-signal-400/25 bg-signal-400/[0.06]"
              )}
            >
              <div className={cn("font-display text-[15px] font-bold", v.tone === "mint" ? "text-mint-300" : "text-signal-300")}>
                {v.tag}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-bone-300">{v.note}</p>
            </div>

            <div className="mt-4 space-y-3 border-t border-ink-800 pt-4">
              {crits.map((c) => (
                <Meter key={c.id} value={c.score} max={10} accent={c.accent} label={c.label} />
              ))}
            </div>
          </Card>

          <Card title="Correção prioritária" note={worst.label} accent="oxide">
            <p className="font-display text-[15px] leading-snug font-bold text-bone-100">{worst.fix}</p>
            <p className="mt-2 font-mono text-[10.5px] text-ink-400">{worst.ev}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" icon="wave" onClick={() => onGo("humanizador")}>
                Humanizador
              </Button>
              <Button size="sm" variant="ghost" icon="flask" onClick={() => onGo("receita")}>
                Receita viral
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
        toolName="Score de Post"
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <Card title="Cole o rascunho completo" note="avaliação ao digitar" accent="mint">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Label>Formato do post</Label>
          <Segmented
            value={format}
            onChange={setFormat}
            options={[
              { id: "carrossel", label: "Carrossel" },
              { id: "texto", label: "Texto longo" },
              { id: "thread", label: "Thread" },
              { id: "legenda", label: "Legenda" },
            ]}
          />
        </div>
        <Textarea
          rows={12}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Cole o post inteiro, com as quebras de linha como ele vai publicado"
        />
        <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
          <span>{words(draft).length} palavras</span>
          <span className="h-3 w-px bg-ink-700" />
          <span>{sentences(draft).length} frases</span>
          <span className="h-3 w-px bg-ink-700" />
          <span>{paragraphs(draft).length} blocos</span>
          <span className="h-3 w-px bg-ink-700" />
          <span>{findCliches(draft).length} marcas de IA</span>
          <span className="ml-auto flex items-center gap-1.5 text-mint-400">
            <span className="h-1.5 w-1.5 rounded-full bg-mint-400" /> avaliado
          </span>
        </div>
      </Card>

      <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-ink-700/80 bg-ink-800 md:grid-cols-2 xl:grid-cols-5">
        {crits.map((c, i) => (
          <div key={c.id} className="group relative bg-ink-900 p-4 transition-colors duration-300 hover:bg-ink-850">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-[9.5px] text-ink-500 tabular-nums">{i + 1}</span>
              <span className="font-mono text-[9.5px] tracking-[0.16em] text-bone-400 uppercase">
                {c.label}
              </span>
              <span
                className={cn(
                  "ml-auto font-display text-xl font-extrabold tabular-nums",
                  c.score >= 8 ? "text-mint-300" : c.score >= 5 ? "text-signal-300" : "text-oxide-400"
                )}
              >
                {c.score}
              </span>
            </div>
            <Meter value={c.score} max={10} accent={c.accent} showValue={false} />
            <p className="mt-2.5 font-mono text-[10px] leading-snug text-ink-400">{c.ev}</p>
            <p className="mt-2 text-[12px] leading-snug text-bone-300">{c.fix}</p>
          </div>
        ))}
      </div>

      <Card title="Laudo para copiar" accent="bone" className="mt-6">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/70 p-4 font-mono text-[11.5px] leading-relaxed text-bone-300">
{`SCORE DE POST — ${total}/50 · ${v.tag.toUpperCase()}
formato: ${format} · ${words(draft).length} palavras · burstiness ${burstiness(draft).toFixed(1)}

${crits.map((c) => `${c.label.padEnd(11, " ")} ${String(c.score).padStart(2)}/10 — ${c.ev}`).join("\n")}

correção prioritária: ${worst.fix}`}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton
            text={`SCORE DE POST — ${total}/50 · ${v.tag}\n\n${crits.map((c) => `${c.label}: ${c.score}/10 — ${c.ev}`).join("\n")}\n\nCorreção prioritária: ${worst.fix}`}
          />
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
            <Icon name="clock" className="h-3 w-3" /> reavalie 48h depois de publicar
          </span>
        </div>
      </Card>
    </ToolShell>
  );
}
