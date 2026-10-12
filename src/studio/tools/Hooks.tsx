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
import { useI18n } from "../i18n";
import { getLocalizedToolExamples } from "../i18n/examples";

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

function build(
  theme: string,
  tone: string,
  promise: string,
  tFn?: (k: string, p?: any, fb?: string) => string
): Out[] {
  const tLocal = tFn || ((_k: string, _p?: any, fb?: string) => fb || "");
  const t = cap(theme.trim() || tLocal("tools.hooks.default_theme", {}, "esse assunto"));
  const low = t.toLowerCase();
  const year = new Date().getFullYear() + 1;
  const aggressive = tone === "provocador";
  const soft = tone === "didático";
  const p = promise.trim();
  const pLow = p.toLowerCase();

  const raw: Record<string, [string, string, number, string, string]> = {
    numero: [
      tLocal("tools.hooks.numero_l1", { low: low.startsWith("investir") ? low.replace("investir", "").trim() : low }, `2 anos investindo ${low.startsWith("investir") ? low.replace("investir", "") : low}.`),
      p ? tLocal("tools.hooks.numero_l2_p", { p: cap(p) }, `${cap(p)} — com o número na tela.`) : tLocal("tools.hooks.numero_l2_def", {}, `O resultado? Menos que a poupança.`),
      88,
      tLocal("tools.hooks.angle_numero", {}, "Número na frente"),
      tLocal("tools.hooks.angle_numero_desc", {}, "Dado cru primeiro, contexto depois."),
    ],
    contrario: [
      tLocal("tools.hooks.contrario_l1", { t }, `${t} é o melhor caminho.`),
      soft ? tLocal("tools.hooks.contrario_l2_soft", {}, `Até você olhar o rendimento real.`) : tLocal("tools.hooks.contrario_l2_agg", {}, `Até você ver o extrato de verdade.`),
      82,
      tLocal("tools.hooks.angle_contrario", {}, "Contrário"),
      tLocal("tools.hooks.angle_contrario_desc", {}, "Afirma o senso comum e quebra em seguida."),
    ],
    transformacao: [
      tLocal("tools.hooks.transf_l1", { low }, `De R$100 por mês para R$0 em ${low}.`),
      p ? tLocal("tools.hooks.transf_l2_p", { pLow }, `Mudei uma coisa: ${pLow}.`) : tLocal("tools.hooks.transf_l2_def", {}, `Mudei tudo e triplicou em 6 meses.`),
      86,
      tLocal("tools.hooks.angle_transf", {}, "Transformação"),
      tLocal("tools.hooks.angle_transf_desc", {}, "De um estado para outro, com prazo."),
    ],
    autoridade: [
      tLocal("tools.hooks.autoridade_l1", {}, `O maior investidor do mundo nunca compraria isso.`),
      p ? tLocal("tools.hooks.autoridade_l2_p", { pLow }, `O motivo: ${pLow}.`) : tLocal("tools.hooks.autoridade_l2_def", {}, `E eu descobri da pior forma.`),
      74,
      tLocal("tools.hooks.angle_autoridade", {}, "Autoridade emprestada"),
      tLocal("tools.hooks.angle_autoridade_desc", {}, "Nome grande + descoberta pessoal."),
    ],
    confissao: [
      tLocal("tools.hooks.confissao_l1", { low }, `Eu perdi dinheiro com ${low}.`),
      aggressive ? tLocal("tools.hooks.confissao_l2_agg", {}, `E a culpa foi minha, não do mercado.`) : tLocal("tools.hooks.confissao_l2_soft", {}, `E não foi o mercado o problema.`),
      90,
      tLocal("tools.hooks.angle_confissao", {}, "Confissão"),
      tLocal("tools.hooks.angle_confissao_desc", {}, "Erro próprio como prova de honestidade."),
    ],
    futuro: [
      tLocal("tools.hooks.futuro_l1", { t, year }, `${t} vai mudar completamente em ${year}.`),
      p ? tLocal("tools.hooks.futuro_l2_p", { pLow }, `Quem entender ${pLow} sai na frente.`) : tLocal("tools.hooks.futuro_l2_def", {}, `Quem tem pouco dinheiro vai sentir primeiro.`),
      79,
      tLocal("tools.hooks.angle_futuro", {}, "Choque de futuro"),
      tLocal("tools.hooks.angle_futuro_desc", {}, "Mudança próxima + quem sente primeiro."),
    ],
  };

  return HOOK_ANGLES.map((a) => {
    const item = raw[a.id];
    const l1 = item ? item[0] : "";
    const l2 = item ? item[1] : "";
    const retentionBase = item ? item[2] : 80;
    const angleName = item ? item[3] : a.name;
    const angleDesc = item ? item[4] : a.desc;
    const words = (l1 + " " + l2).split(/\s+/).filter(Boolean).length;
    const retention = Math.min(96, retentionBase + (p ? 3 : 0));
    return { angle: angleName, id: a.id, desc: angleDesc, l1, l2, seconds: Math.round((words / 2.7) * 10) / 10, retention };
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
  const { t, resolvedLanguage } = useI18n();
  const examples = useExampleMode();
  const calibrated = isCalibrated(calib);
  const toolExamples = getLocalizedToolExamples(resolvedLanguage);

  const [theme, setTheme] = useState(
    examples ? toolExamples.hooksTheme : calib?.niche ? calib.niche.slice(0, 50) : ""
  );
  const [promise, setPromise] = useState(
    examples ? toolExamples.hooksPromise : calib?.prova ? calib.prova.slice(0, 50) : ""
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

  const outs = useMemo(() => theme.trim() || promise.trim() ? build(theme, tone, promise, t) : [], [theme, tone, promise, t]);
  const selected = outs.find((o) => o.id === picked);

  const toneLabel =
    tone === "provocador"
      ? t("tools.hooks.tone_provocative", {}, "Provocador")
      : tone === "didático"
      ? t("tools.hooks.tone_didactic", {}, "Didático")
      : t("tools.hooks.tone_neutral", {}, "Neutro");

  const friendlySummary = t(
    "tools.hooks.friendly_summary",
    {
      count: 6,
      tone: toneLabel,
      angle: outs[0]?.angle ?? "—",
      retention: outs[0]?.retention ?? 0,
    },
    `6 opções de ganchos criadas no tom ${toneLabel} · Gancho recomendado: ${outs[0]?.angle ?? "—"} (${outs[0]?.retention ?? 0}% retenção estimada)`
  );

  useAutosave(
    () => ({
      tool: "hooks",
      toolName: t("tools.hooks.title", {}, "Gerador de Hooks"),
      title: theme.trim() || promise.trim() ? t("tools.hooks.save_title", { theme }, `Hooks — ${theme}`) : "",
      summary: friendlySummary,
      tag: `${outs[0]?.retention ?? 0}%`,
      content: `TEMA: ${theme}\nPROMESSA: ${promise}\nTOM: ${tone} · DESTINO: ${format}\n\n${outs
        .map((o, i) => `${String(i + 1).padStart(2, "0")}. ${o.angle} · ${o.seconds.toFixed(1)}s · ret. ${o.retention}%\n    ${o.l1}\n    ${o.l2}`)
        .join("\n")}`,
    }),
    [outs, theme, promise, tone, format, friendlySummary, t]
  );

  return (
    <ToolShell
      id="hooks"
      title={t("tools.hooks.title", {}, "Gerador de Hooks")}
      accent="mint"
      lede={t("tools.hooks.lede", {}, "Duas linhas, seis ângulos. O hook não é introdução: é a entrega imediata do ouro nos primeiros segundos, com número cru, tensão e segunda pessoa.")}
      meta={[
        { k: t("tools.hooks.angles", {}, "Ângulos"), v: "6" },
        { k: t("tools.hooks.lines", {}, "Linhas"), v: "2" },
        { k: t("tools.hooks.target_duration", {}, "Duração alvo"), v: format === "shorts" ? "≤ 8s" : "≤ 15s" },
        { k: t("tools.hooks.tone", {}, "Tom"), v: cap(toneLabel) },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        theme.trim() || promise.trim()
          ? {
              type: "hooks",
              group: "Criação" as const,
              toolName: t("tools.hooks.title", {}, "Gerador de Hooks"),
              title: theme.trim() ? t("tools.hooks.save_title", { theme }, `Hooks — ${theme}`) : t("tools.hooks.generic_title", {}, "Hooks de Conteúdo"),
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
          <Card title={t("tools.hooks.selected_hook", {}, "Hook selecionado")} note={t("tools.hooks.teleprompter_ready", {}, "pronto pro teleprompter")} accent="mint">
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
                      {t("tools.hooks.spoken_in", {}, "Falado em")}
                    </div>
                    <div className="font-display text-lg font-bold text-bone-100 tabular-nums">
                      {selected.seconds.toFixed(1)}s
                    </div>
                  </div>
                  <div className="rounded border border-ink-800 bg-ink-950/50 px-3 py-2">
                    <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">
                      {t("tools.hooks.est_retention", {}, "Retenção est.")}
                    </div>
                    <div className="font-display text-lg font-bold text-mint-300 tabular-nums">
                      {selected.retention}%
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <CopyButton text={`${selected.l1}\n${selected.l2}`} />
                  <Button size="sm" variant="outline" icon="mic" onClick={() => onGo("roteiro")}>
                    {t("tools.hooks.open_teleprompter", {}, "Abrir teleprompter")}
                  </Button>
                </div>
              </>
            ) : (
              <p className="py-4 text-center font-mono text-[11px] tracking-[0.16em] text-ink-400 uppercase">
                {t("tools.hooks.select_angle", {}, "selecione um ângulo")}
              </p>
            )}
          </Card>

          <Card title={t("tools.hooks.anatomy_title", {}, "Anatomia do hook")} note={t("tools.hooks.framework_15", {}, "framework 15")} accent="signal">
            <ol className="space-y-2.5">
              {[
                [t("tools.hooks.anatomy_thesis", {}, "Tese"), t("tools.hooks.anatomy_thesis_desc", {}, "afirmação forte, sem contexto prévio")],
                [t("tools.hooks.anatomy_raw_num", {}, "Número cru"), t("tools.hooks.anatomy_raw_num_desc", {}, "dado real, não arredondado")],
                [t("tools.hooks.anatomy_tension", {}, "Tensão"), t("tools.hooks.anatomy_tension_desc", {}, "algo que só se resolve assistindo")],
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
        toolName={t("tools.hooks.title", {}, "Gerador de Hooks")}
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <Card title={t("tools.hooks.input_title", {}, "Sobre o que é o conteúdo?")} note={t("tools.hooks.input_note", {}, "entrada")} accent="mint">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="md:col-span-1">
            <Label hint={t("tools.hooks.theme_hint", {}, "tema do vídeo")}>
              {t("tools.hooks.subject", {}, "Assunto")}
            </Label>
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={t("tools.hooks.theme_placeholder", {}, "Ex.: investir R$100 por mês em FIIs")}
            />
          </div>
          <div className="md:col-span-3">
            <Label hint={t("tools.hooks.promise_hint", {}, "o que o hook promete entregar")}>
              {t("tools.hooks.main_promise", {}, "Promessa principal")}
            </Label>
            <Input
              value={promise}
              onChange={(e) => setPromise(e.target.value)}
              placeholder={t("tools.hooks.promise_placeholder", {}, "Ex.: o rendimento real com o extrato na tela")}
            />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">
              {t("tools.hooks.promise_desc", {}, "A promessa entra na segunda linha dos ângulos de número, transformação, autoridade e futuro.")}
            </p>
          </div>
          <div>
            <Label>{t("tools.hooks.tone", {}, "Tom")}</Label>
            <Segmented
              value={tone}
              onChange={(v) => setTone(v)}
              options={[
                { id: "provocador", label: t("tools.hooks.tone_provocative", {}, "Provocador") },
                { id: "neutro", label: t("tools.hooks.tone_neutral", {}, "Neutro") },
                { id: "didático", label: t("tools.hooks.tone_didactic", {}, "Didático") },
              ]}
            />
          </div>
          <div>
            <Label>{t("tools.hooks.destination", {}, "Destino")}</Label>
            <Select value={format} onChange={(e) => setFormat(e.target.value)} headerTitle={t("tools.hooks.dest_suggested", {}, "Destinos sugeridos")} className="min-w-[10rem]">
              <option value="shorts">{t("tools.hooks.dest_shorts", {}, "Shorts / Reels / TikTok")}</option>
              <option value="long">{t("tools.hooks.dest_long", {}, "Abertura de vídeo longo")}</option>
              <option value="post">{t("tools.hooks.dest_post", {}, "Primeira linha de post")}</option>
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
          <strong className="text-bone-100">{t("tools.hooks.golden_rule", {}, "Regra de ouro:")}</strong>{" "}
          {t("tools.hooks.golden_rule_desc", {}, "nunca comece com contexto. Se a primeira frase puder ser cortada sem perder informação, ela já nasceu errada.")}
        </p>
        <Button size="sm" variant="outline" icon="type" onClick={() => onGo("titulos")}>
          {t("tools.hooks.match_title", {}, "Casar com o título")}
        </Button>
      </div>
    </ToolShell>
  );
}
