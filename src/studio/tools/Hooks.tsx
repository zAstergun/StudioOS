import { useMemo, useState, useEffect } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Meter, Segmented, Select } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { HOOK_ANGLES } from "../data";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { isCalibrated, type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";

function cap(s: string) {
  const t = s.trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

type Out = {
  angle: string;
  id: string;
  desc: string;
  l1: string;
  l2: string;
  seconds: number;
  retention: number;
};

function build(theme: string, tone: string, promise: string): Out[] {
  const t = cap(theme.trim() || "esse assunto");
  const low = t.toLowerCase();
  const year = new Date().getFullYear() + 1;
  const aggressive = tone === "provocador";
  const soft = tone === "didático";
  const p = promise.trim();
  const pLow = p.toLowerCase();

  const raw: Record<string, [string, string, number]> = {
    numero: [
      `2 anos investindo ${low.startsWith("investir") ? low.replace("investir", "") : low}.`,
      p ? `${cap(p)} — com o número na tela.` : `O resultado? Menos que a poupança.`,
      88,
    ],
    contrario: [
      `${t} é o melhor caminho.`,
      soft ? `Até você olhar o rendimento real.` : `Até você ver o extrato de verdade.`,
      82,
    ],
    transformacao: [
      `De R$100 por mês para R$0 em ${low}.`,
      p ? `Mudei uma coisa: ${pLow}.` : `Mudei tudo e triplicou em 6 meses.`,
      86,
    ],
    autoridade: [
      `O maior investidor do mundo nunca compraria isso.`,
      p ? `O motivo: ${pLow}.` : `E eu descobri da pior forma.`,
      74,
    ],
    confissao: [
      `Eu perdi dinheiro com ${low}.`,
      aggressive ? `E a culpa foi minha, não do mercado.` : `E não foi o mercado o problema.`,
      90,
    ],
    futuro: [
      `${t} vai mudar completamente em ${year}.`,
      p ? `Quem entender ${pLow} sai na frente.` : `Quem tem pouco dinheiro vai sentir primeiro.`,
      79,
    ],
  };

  return HOOK_ANGLES.map((a) => {
    const [l1, l2, retentionBase] = raw[a.id];
    const words = (l1 + " " + l2).split(/\s+/).filter(Boolean).length;
    const retention = Math.min(96, retentionBase + (p ? 3 : 0));
    return { ...a, angle: a.name, id: a.id, l1, l2, seconds: Math.round((words / 2.7) * 10) / 10, retention };
  }).sort((x, y) => y.retention - x.retention);
}

export function Hooks({
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
  const calibrated = isCalibrated(calib);
  const [theme, setTheme] = useState(
    examples ? "investir R$100 por mês em FIIs" : calib?.niche ? calib.niche.slice(0, 50) : ""
  );
  const [promise, setPromise] = useState(
    examples ? "o rendimento real com o extrato na tela" : calib?.prova ? calib.prova.slice(0, 50) : ""
  );
  const [tone, setTone] = useState<"provocador" | "didático" | "neutro">("provocador");
  const [format, setFormat] = useState("shorts");
  const [picked, setPicked] = useState<string | null>(examples ? "confissao" : null);

  useEffect(() => {
    if (calib) {
      if (!theme && calib.niche) setTheme(calib.niche.slice(0, 50));
      if (!promise && calib.prova) setPromise(calib.prova.slice(0, 50));
    }
  }, [calib]);

  useToolRestore("hooks", (payload) => {
    if (payload.metadata?.theme !== undefined) {
      setTheme(payload.metadata.theme);
      if (payload.metadata.promise) setPromise(payload.metadata.promise);
      if (payload.metadata.tone) setTone(payload.metadata.tone);
      if (payload.metadata.format) setFormat(payload.metadata.format);
      if (payload.metadata.picked) setPicked(payload.metadata.picked);
    } else if (payload.content) {
      const matchTema = payload.content.match(/TEMA:\s*(.*)/);
      const matchProm = payload.content.match(/PROMESSA:\s*(.*)/);
      const matchTom = payload.content.match(/TOM:\s*([^·]+)/);
      const matchDest = payload.content.match(/DESTINO:\s*(.*)/);
      if (matchTema) setTheme(matchTema[1].trim());
      if (matchProm) setPromise(matchProm[1].trim());
      if (matchTom && ["provocador", "didático", "neutro"].includes(matchTom[1].trim())) {
        setTone(matchTom[1].trim() as any);
      }
      if (matchDest) setFormat(matchDest[1].trim());
    }
  });

  const outs = useMemo(() => theme.trim() || promise.trim() ? build(theme, tone, promise) : [], [theme, tone, promise]);
  const selected = outs.find((o) => o.id === picked);

  const friendlySummary = `6 opções de ganchos criadas no tom ${tone} · Gancho recomendado: ${outs[0]?.angle ?? "—"} (${outs[0]?.retention ?? 0}% retenção estimada)`;

  useAutosave(
    () => ({
      tool: "hooks",
      toolName: "Gerador de Hooks",
      title: theme.trim() || promise.trim() ? `Hooks — ${theme}` : "",
      summary: friendlySummary,
      tag: `${outs[0]?.retention ?? 0}%`,
      content: `TEMA: ${theme}\nPROMESSA: ${promise}\nTOM: ${tone} · DESTINO: ${format}\n\n${outs
        .map((o, i) => `${String(i + 1).padStart(2, "0")}. ${o.angle} · ${o.seconds.toFixed(1)}s · ret. ${o.retention}%\n    ${o.l1}\n    ${o.l2}`)
        .join("\n")}`,
    }),
    [outs, theme, promise, tone, format, friendlySummary],
    6
  );

  return (
    <ToolShell
      id="hooks"
      title="Gerador de Hooks"
      accent="mint"
      lede="Duas linhas, seis ângulos. O hook não é introdução: é a entrega imediata do ouro nos primeiros segundos, com número cru, tensão e segunda pessoa."
      meta={[
        { k: "Ângulos", v: "6" },
        { k: "Linhas", v: "2" },
        { k: "Duração alvo", v: format === "shorts" ? "≤ 8s" : "≤ 15s" },
        { k: "Tom", v: cap(tone) },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        theme.trim() || promise.trim()
          ? {
              type: "hooks",
              group: "Criação",
              toolName: "Gerador de Hooks",
              title: theme.trim() ? `Hooks — ${theme}` : "Hooks de Conteúdo",
              summary: friendlySummary,
              tag: `${outs[0]?.retention ?? 0}%`,
              content: `TEMA: ${theme}\nPROMESSA: ${promise}\nTOM: ${tone} · DESTINO: ${format}\n\n${outs
                .map((o, i) => `${String(i + 1).padStart(2, "0")}. ${o.angle} · ${o.seconds.toFixed(1)}s · ret. ${o.retention}%\n    ${o.l1}\n    ${o.l2}`)
                .join("\n")}`,
              metadata: {
                theme,
                promise,
                tone,
                format,
                picked,
              },
            }
          : null
      }
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title="Hook selecionado" note="pronto pro teleprompter" accent="mint">
            {selected ? (
              <>
                <div className="rounded-md border border-mint-400/25 bg-ink-950/70 p-4">
                  <p className="font-display text-[19px] leading-snug font-bold text-bone-50">
                    {selected.l1}
                  </p>
                  <p className="mt-1.5 font-display text-[19px] leading-snug font-bold text-mint-300">
                    {selected.l2}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded border border-ink-800 bg-ink-950/50 px-3 py-2">
                    <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">
                      Falado em
                    </div>
                    <div className="font-display text-lg font-bold text-bone-100 tabular-nums">
                      {selected.seconds.toFixed(1)}s
                    </div>
                  </div>
                  <div className="rounded border border-ink-800 bg-ink-950/50 px-3 py-2">
                    <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">
                      Retenção est.
                    </div>
                    <div className="font-display text-lg font-bold text-mint-300 tabular-nums">
                      {selected.retention}%
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <CopyButton text={`${selected.l1}\n${selected.l2}`} />
                  <Button size="sm" variant="outline" icon="mic" onClick={() => onGo("roteiro")}>
                    Abrir teleprompter
                  </Button>
                </div>
              </>
            ) : (
              <p className="py-4 text-center font-mono text-[11px] tracking-[0.16em] text-ink-400 uppercase">
                selecione um ângulo
              </p>
            )}
          </Card>

          <Card title="Anatomia do hook" note="framework 15" accent="signal">
            <ol className="space-y-2.5">
              {[
                ["Tese", "afirmação forte, sem contexto prévio"],
                ["Número cru", "dado real, não arredondado"],
                ["Tensão", "algo que só se resolve assistindo"],
              ].map(([k, v], i) => (
                <li key={k} className="flex gap-3">
                  <span className="mt-0.5 font-mono text-[10px] text-signal-400 tabular-nums">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-bone-100">{k}</span>
                    <span className="block text-[11.5px] leading-snug text-ink-400">{v}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      }
    >
      <CalibrationNotice
        calib={calib}
        profileName={profileName}
        profileColor={profileColor}
        toolName="Gerador de Hooks"
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <Card title="Sobre o que é o conteúdo?" note="entrada" accent="mint">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="md:col-span-1">
            <Label hint="tema do vídeo">Assunto</Label>
            <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex.: investir R$100 por mês em FIIs" />
          </div>
          <div className="md:col-span-3">
            <Label hint="o que o hook promete entregar">Promessa principal</Label>
            <Input
              value={promise}
              onChange={(e) => setPromise(e.target.value)}
              placeholder="Ex.: o rendimento real com o extrato na tela"
            />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">
              A promessa entra na segunda linha dos ângulos de número, transformação, autoridade e futuro.
            </p>
          </div>
          <div>
            <Label>Tom</Label>
            <Segmented
              value={tone}
              onChange={(v) => setTone(v)}
              options={[
                { id: "provocador", label: "Provocador" },
                { id: "neutro", label: "Neutro" },
                { id: "didático", label: "Didático" },
              ]}
            />
          </div>
          <div>
            <Label>Destino</Label>
            <Select value={format} onChange={(e) => setFormat(e.target.value)} className="min-w-[10rem]">
              <option value="shorts">Shorts / Reels / TikTok</option>
              <option value="long">Abertura de vídeo longo</option>
              <option value="post">Primeira linha de post</option>
            </Select>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {outs.map((o, i) => {
          const active = picked === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setPicked(o.id)}
              className={cn(
                "group relative overflow-hidden rounded-lg border p-4 text-left transition-all duration-300",
                active
                  ? "border-mint-400/50 bg-ink-850 shadow-[0_20px_50px_-30px_rgba(67,217,163,0.8)]"
                  : "border-ink-700/80 bg-ink-900/60 hover:-translate-y-0.5 hover:border-ink-600 hover:bg-ink-850"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono text-[10px] text-ink-400 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "font-mono text-[9.5px] tracking-[0.16em] uppercase transition-colors",
                    active ? "text-mint-300" : "text-bone-400"
                  )}
                >
                  {o.angle}
                </span>
                <span className="ml-auto font-mono text-[9.5px] text-ink-500 tabular-nums">
                  {o.seconds.toFixed(1)}s
                </span>
              </div>

              <p className="font-display text-[17px] leading-snug font-bold text-bone-50">{o.l1}</p>
              <p
                className={cn(
                  "mt-1 font-display text-[17px] leading-snug font-bold transition-colors",
                  active ? "text-mint-300" : "text-bone-300 group-hover:text-signal-300"
                )}
              >
                {o.l2}
              </p>

              <div className="mt-3.5 flex items-center gap-3">
                <div className="flex-1">
                  <Meter value={o.retention} max={100} accent={active ? "mint" : "bone"} showValue={false} />
                </div>
                <span className="font-mono text-[9.5px] text-ink-400 tabular-nums">
                  ret. {o.retention}%
                </span>
              </div>

              <span className="mt-2 block text-[11px] leading-snug text-ink-400">{o.desc}</span>

              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 h-[2px] origin-left bg-mint-400 transition-transform duration-500",
                  active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50"
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-ink-700/70 bg-ink-900/50 p-4">
        <Icon name="spark" className="h-4 w-4 text-signal-400" />
        <p className="flex-1 text-[12.5px] leading-relaxed text-bone-400">
          <strong className="text-bone-100">Regra de ouro:</strong> nunca comece com contexto.
          Se a primeira frase puder ser cortada sem perder informação, ela já nasceu errada.
        </p>
        <Button size="sm" variant="outline" icon="type" onClick={() => onGo("titulos")}>
          Casar com o título
        </Button>
      </div>
    </ToolShell>
  );
}
