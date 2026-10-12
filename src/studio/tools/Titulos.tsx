import { useMemo, useState, useEffect } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Kicker, Label, Meter, Select, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { isCalibrated, type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";
import { useI18n } from "../i18n";
import { getLocalizedToolExamples } from "../i18n/examples";

const STOP = new Set([
  "a","o","as","os","de","do","da","dos","das","em","no","na","nos","nas","com","para","pra","por",
  "que","e","ou","mas","se","eu","voce","você","meu","minha","seu","sua","como","quando","mais",
  "isso","esse","essa","sao","é","foi","tem","nao","não","um","uma","aos","ao","ja","já",
  "the","in","on","at","to","for","of","with","by","from","an","and","or","is","are","was","were",
]);

function freq(text: string) {
  const m = new Map<string, number>();
  text
    .toLowerCase()
    .replace(/[^a-z0-9áàâãéêíóôõúüç\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .forEach((w) => m.set(w, (m.get(w) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function cap(s: string) {
  const t = s.trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

type Gen = { title: string; pattern: string; why: string; ctr: number; flag?: string };

function generate(
  tema: string,
  tops: string,
  ctr: number,
  platform: string,
  tFn?: (k: string, p?: any, fb?: string) => string
): Gen[] {
  const t = tFn || ((_k: string, _p?: any, fb?: string) => fb || "");
  const topic = cap(tema.trim() || t("tools.titulos.default_topic", {}, "esse assunto"));
  const low = topic.toLowerCase();
  const topWords = freq(tops).slice(0, 4).map((w) => w[0]);
  const anchor = topWords[0] ? cap(topWords[0]) : "";
  const nums = (tops.match(/\d+/g) ?? []).slice(0, 3);
  const n1 = nums[0] ?? "3";
  const n2 = nums[1] ?? "2";
  const year = new Date().getFullYear() + 1;

  const short = platform === "shorts";
  const trim = (s: string) => (short && s.length > 62 ? `${s.slice(0, 59).trimEnd()}…` : s);

  const base: Gen[] = [
    {
      title: trim(t("tools.titulos.p1_title", { low, n1 }, `Eu parei de ${low} — e o resultado apareceu em ${n1} meses`)),
      pattern: t("tools.titulos.p1_pattern", {}, "1ª pessoa + verbo de ação + consequência"),
      why: t("tools.titulos.p1_why", {}, "Confissão com prazo cria um loop aberto que só fecha assistindo."),
      ctr: ctr * 1.28,
      flag: t("tools.titulos.recommended", {}, "Recomendado"),
    },
    {
      title: trim(
        anchor
          ? t("tools.titulos.p2_title_anchor", { topic, anchor }, `${topic} não vale mais a pena (e ${anchor} explica)`)
          : t("tools.titulos.p2_title", { topic }, `${topic} não vale mais a pena`)
      ),
      pattern: t("tools.titulos.p2_pattern", {}, "Mudança + urgência"),
      why: t("tools.titulos.p2_why", {}, "Contradiz o senso comum do nicho e sinaliza informação nova."),
      ctr: ctr * 1.19,
    },
    {
      title: trim(t("tools.titulos.p3_title", { n2, low }, `Perdi ${n2} anos com ${low}. O que eu faria diferente`)),
      pattern: t("tools.titulos.p3_pattern", {}, "Confissão com humor"),
      why: t("tools.titulos.p3_why", {}, "Erro próprio = prova de honestidade, e reduz o medo de clicar."),
      ctr: ctr * 1.14,
    },
    {
      title: trim(t("tools.titulos.p4_title", { n1, low }, `${n1} alternativas melhores que ${low} começando com R$100`)),
      pattern: t("tools.titulos.p4_pattern", {}, "Número específico + sistema"),
      why: t("tools.titulos.p4_why", {}, "Número na frente, entregável claro e barreira de entrada baixa."),
      ctr: ctr * 1.22,
    },
    {
      title: trim(t("tools.titulos.p5_title", { low, year }, `Ninguém te contou isso sobre ${low} antes de ${year}`)),
      pattern: t("tools.titulos.p5_pattern", {}, "Quebra de expectativa"),
      why: t("tools.titulos.p5_why", {}, "Curiosidade com prazo: funciona como alerta, não como aula."),
      ctr: ctr * 1.08,
    },
  ];

  return base
    .map((b) => ({ ...b, ctr: Math.round(b.ctr * 10) / 10 }))
    .sort((a, b) => b.ctr - a.ctr);
}

export function Titulos({
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

  const [tema, setTema] = useState(
    examples ? toolExamples.titulosTema : calib?.niche ? calib.niche.slice(0, 55) : ""
  );
  const [tops, setTops] = useState(
    calib?.tops ? calib.tops : examples ? toolExamples.titulosTops : ""
  );
  const [flops, setFlops] = useState(
    calib?.flops ? calib.flops : examples ? toolExamples.titulosFlops : ""
  );
  const [ctr, setCtr] = useState(
    calib?.ctr ? calib.ctr : examples ? toolExamples.titulosCtr : ""
  );
  const [platform, setPlatform] = useState("yt");
  const [ran, setRan] = useState(true);

  const platforms = [
    { id: "yt", label: t("tools.titulos.platform_yt", {}, "YouTube · longo") },
    { id: "shorts", label: t("tools.titulos.platform_shorts", {}, "Shorts / Reels") },
    { id: "post", label: t("tools.titulos.platform_post", {}, "Post / legenda") },
  ];

  useEffect(() => {
    if (calib) {
      if (calib.tops) setTops(calib.tops);
      if (calib.flops) setFlops(calib.flops);
      if (calib.ctr) setCtr(calib.ctr);
      if (!tema && calib.niche) setTema(calib.niche.slice(0, 55));
    }
  }, [calib]);

  useToolRestore("titulos", (payload) => {
    if (payload.metadata?.tema !== undefined) {
      setTema(payload.metadata.tema);
      if (payload.metadata.ctr) setCtr(payload.metadata.ctr);
      if (payload.metadata.tops) setTops(payload.metadata.tops);
      if (payload.metadata.platform) setPlatform(payload.metadata.platform);
    } else if (payload.content) {
      const matchTema = payload.content.match(/TEMA:\s*(.*)/);
      const matchCtr = payload.content.match(/CTR BASE:\s*([\d.,]+)%/);
      const matchPlat = payload.content.match(/PLATAFORMA:\s*(.*)/);
      if (matchTema) setTema(matchTema[1].trim());
      if (matchCtr) setCtr(matchCtr[1].trim());
      if (matchPlat) setPlatform(matchPlat[1].trim());
    }
  });

  const ctrNum = Math.max(0, parseFloat(ctr.replace(",", ".")) || 0);
  const results = useMemo(
    () => (tema.trim() ? generate(tema, tops, ctrNum, platform, t) : []),
    [tema, tops, ctrNum, platform, t]
  );

  const best = results[0]?.ctr ?? 0;
  const friendlySummary = t(
    "tools.titulos.friendly_summary",
    { count: results.length, best: best.toFixed(1), base: ctrNum.toFixed(1) },
    `${results.length} opções de títulos geradas · CTR estimado de até ${best.toFixed(1)}% (base ${ctrNum.toFixed(1)}%)`
  );

  useAutosave(
    () => ({
      tool: "titulos",
      toolName: t("tools.titulos.title", {}, "Gerador de Títulos"),
      title: tema.trim() ? t("tools.titulos.save_title", { tema }, `Títulos — ${tema}`) : "",
      summary: friendlySummary,
      tag: `${best.toFixed(1)}%`,
      content: `TEMA: ${tema}\nCTR BASE: ${ctrNum.toFixed(1)}% · PLATAFORMA: ${platform}\n\n${results
        .map(
          (r, i) =>
            `${String(i + 1).padStart(2, "0")}. ${r.title}\n    ${t("tools.titulos.pattern_label", {}, "padrão")}: ${r.pattern} · ${t("tools.titulos.proj_ctr_label", {}, "ctr projetado")} ${r.ctr.toFixed(1)}%${r.flag ? ` · ${r.flag}` : ""}\n    ${t("tools.titulos.why_label", {}, "por que")}: ${r.why}`
        )
        .join("\n")}`,
    }),
    [results, tema, ctrNum, platform, friendlySummary, best, t]
  );
  const vocab = freq(tops).slice(0, 6);

  return (
    <ToolShell
      id="titulos"
      title={t("tools.titulos.title", {}, "Gerador de Títulos")}
      accent="oxide"
      lede={t("tools.titulos.lede", {}, "Cinco padrões de empacotamento aplicados ao seu tema, calibrados pelos títulos que já performaram no canal. Cada saída vem com a régua: por que funciona e quanto deve mover o CTR.")}
      meta={[
        { k: t("tools.titulos.patterns", {}, "Padrões"), v: "5" },
        { k: t("tools.titulos.ctr_base", {}, "CTR base"), v: `${ctrNum.toFixed(1)}%` },
        { k: t("tools.titulos.goal", {}, "Meta"), v: `${best.toFixed(1)}%` },
        { k: t("tools.titulos.platform", {}, "Plataforma"), v: platform === "yt" ? "YT" : platform === "shorts" ? "Shorts" : "Post" },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={tema.trim() ? {
        type: "titulos",
        group: "Criação" as const,
        toolName: t("tools.titulos.title", {}, "Gerador de Títulos"),
        title: t("tools.titulos.save_title", { tema }, `Títulos — ${tema}`),
        summary: friendlySummary,
        tag: `${best.toFixed(1)}%`,
        content: `TEMA: ${tema}\nCTR BASE: ${ctrNum.toFixed(1)}% · PLATAFORMA: ${platform}\n\n${results
          .map(
            (r, i) =>
              `${String(i + 1).padStart(2, "0")}. ${r.title}\n    ${t("tools.titulos.pattern_label", {}, "padrão")}: ${r.pattern} · ${t("tools.titulos.proj_ctr_label", {}, "ctr projetado")} ${r.ctr.toFixed(1)}%${r.flag ? ` · ${r.flag}` : ""}\n    ${t("tools.titulos.why_label", {}, "por que")}: ${r.why}`
          )
          .join("\n")}`,
        metadata: {
          tema,
          ctr,
          tops,
          platform,
        },
      } : null}
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title={t("tools.titulos.channel_vocab", {}, "Vocabulário do canal")} note={t("tools.titulos.extracted_tops", {}, "extraído dos tops")} accent="signal">
            <div className="flex flex-wrap gap-1.5">
              {vocab.length ? (
                vocab.map(([w, c]) => (
                  <span
                    key={w}
                    className="group inline-flex items-center gap-1.5 rounded border border-ink-700 bg-ink-950/60 px-2 py-1 font-mono text-[10.5px] text-bone-300 transition-colors hover:border-signal-400/50 hover:text-signal-300"
                  >
                    {w}
                    <span className="text-ink-500 tabular-nums">×{c}</span>
                  </span>
                ))
              ) : (
                <span className="font-mono text-[10.5px] text-ink-400">
                  {t("tools.titulos.no_vocab", {}, "informe títulos que performaram")}
                </span>
              )}
            </div>
            <p className="mt-3 border-t border-ink-800 pt-3 text-[11.5px] leading-relaxed text-ink-400">
              {t("tools.titulos.vocab_desc", {}, "Palavras repetidas nos seus vídeos vencedores são as que o seu público já reconhece. O gerador injeta a mais frequente em pelo menos uma variante.")}
            </p>
          </Card>

          <Card title={t("tools.titulos.what_flopped", {}, "O que floppou")} note={t("tools.titulos.avoid", {}, "evite")} accent="oxide">
            <ul className="space-y-2">
              {(flops.split("\n").filter(Boolean)).slice(0, 4).map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px] leading-snug text-bone-400">
                  <Icon name="close" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-oxide-400" strokeWidth={2.2} />
                  <span className="line-through decoration-oxide-400/50">{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-ink-800 pt-3 text-[11.5px] leading-relaxed text-ink-400">
              {t("tools.titulos.flops_desc", {}, "Padrão comum: título que descreve o conteúdo em vez de prometer uma consequência.")}
            </p>
          </Card>

          <Card title={t("tools.titulos.chaining", {}, "Encadeamento")} accent="mint">
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start" icon="bolt" onClick={() => onGo("hooks")}>
                {t("tools.titulos.chain_hooks", {}, "Gerar hooks do título vencedor")}
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" icon="frame" onClick={() => onGo("thumbnail")}>
                {t("tools.titulos.chain_thumb", {}, "Briefing da thumbnail")}
              </Button>
              <Button size="sm" variant="ghost" className="w-full justify-start" icon="gauge" onClick={() => onGo("rank")}>
                {t("tools.titulos.chain_rank", {}, "Voltar ao rank de ideia")}
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
        toolName={t("tools.titulos.title", {}, "Gerador de Títulos")}
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <Card
        title={t("tools.titulos.input", {}, "Entrada")}
        note={profileName ? `${t("tools.titulos.profile", {}, "perfil")}: ${profileName}` : t("tools.titulos.input_note", {}, "tema + histórico")}
        accent="oxide"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Label hint={t("tools.titulos.topic_hint", {}, "assunto principal")}>
              {t("tools.titulos.topic_label", {}, "Tema do vídeo")}
            </Label>
            <Input
              value={tema}
              onChange={(e) => {
                setTema(e.target.value);
                setRan(true);
              }}
              placeholder={t("tools.titulos.topic_placeholder", {}, "Ex.: investir R$100 por mês em FIIs")}
            />
          </div>
          <div>
            <Label hint={t("tools.titulos.one_per_line", {}, "1 por linha")}>
              {t("tools.titulos.top_titles_label", {}, "5 títulos que mais performaram")}
            </Label>
            <Textarea rows={5} value={tops} onChange={(e) => setTops(e.target.value)} />
          </div>
          <div>
            <Label hint={t("tools.titulos.one_per_line", {}, "1 por linha")}>
              {t("tools.titulos.flop_titles_label", {}, "5 que flopparam")}
            </Label>
            <Textarea rows={5} value={flops} onChange={(e) => setFlops(e.target.value)} />
          </div>
          <div>
            <Label>{t("tools.titulos.avg_ctr_label", {}, "CTR médio do canal")}</Label>
            <div className="flex items-center gap-2">
              <Input value={ctr} onChange={(e) => setCtr(e.target.value)} inputMode="decimal" className="w-24 text-center font-mono tabular-nums" />
              <span className="font-mono text-[12px] text-ink-400">%</span>
              <div className="ml-auto flex-1">
                <Meter value={ctrNum} max={12} accent="mint" showValue={false} />
                <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-500">
                  <span>0</span><span>{t("tools.titulos.good_ctr", {}, "bom: 4–7%")}</span><span>12</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Label>{t("tools.titulos.platform_label", {}, "Plataforma")}</Label>
            <Select value={platform} onChange={(e) => setPlatform(e.target.value)} headerTitle={t("tools.titulos.platforms_avail", {}, "Plataformas disponíveis")}>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
            <div className="mt-2.5">
              <Kicker accent="signal">
                {t("tools.titulos.char_limit", { count: platform === "shorts" ? 62 : 70 }, `limite ${platform === "shorts" ? "62" : "70"} caracteres`)}
              </Kicker>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-[10.5px] tracking-[0.2em] text-bone-400 uppercase">
            {t("tools.titulos.output_header", { count: results.length }, `Saída · ${results.length} títulos`)}
          </span>
          <span className="h-px flex-1 bg-ink-800" />
          {ran && tema.trim() && (
            <span className="font-mono text-[10px] tracking-[0.14em] text-mint-400 uppercase">
              {t("tools.titulos.generated", {}, "● gerado")}
            </span>
          )}
        </div>

        {!tema.trim() ? (
          <Card>
            <p className="py-6 text-center font-mono text-[11px] tracking-[0.16em] text-ink-400 uppercase">
              {t("tools.titulos.waiting_topic", {}, "Aguardando tema para análise…")}
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {results.map((r, i) => (
              <article
                key={r.title}
                className="group relative overflow-hidden rounded-lg border border-ink-700/80 bg-ink-900/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-600 hover:bg-ink-850"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-[3px] transition-all duration-300",
                    i === 0 ? "bg-mint-400" : "bg-ink-600 group-hover:bg-signal-400/70"
                  )}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-ink-400 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {r.flag && (
                        <span className="inline-flex items-center gap-1 rounded border border-mint-400/30 bg-mint-400/10 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] text-mint-300 uppercase">
                          <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />
                          {r.flag}
                        </span>
                      )}
                      <span className="rounded border border-ink-700 bg-ink-950/60 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-bone-400 uppercase">
                        {r.pattern}
                      </span>
                    </div>
                    <h3 className="font-display text-[19px] leading-tight font-bold tracking-[-0.02em] text-bone-50 transition-colors group-hover:text-signal-300 sm:text-[21px]">
                      {r.title}
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">{r.why}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                    <div className="text-right">
                      <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">
                        {t("tools.titulos.proj_ctr", {}, "CTR proj.")}
                      </div>
                      <div
                        className={cn(
                          "font-display text-xl font-extrabold tabular-nums",
                          r.ctr >= ctrNum * 1.2 ? "text-mint-300" : "text-signal-300"
                        )}
                      >
                        {r.ctr.toFixed(1)}%
                      </div>
                    </div>
                    <CopyButton text={r.title} />
                  </div>
                </div>
                <div className="mt-3">
                  <Meter value={r.ctr} max={Math.max(12, ctrNum * 1.5)} accent={i === 0 ? "mint" : "signal"} showValue={false} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
