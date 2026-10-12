import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { FRAMEWORKS, type Framework } from "../data";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { isCalibrated, type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";
import { useI18n } from "../i18n";
import { getLocalizedToolExamples } from "../i18n/examples";

const MENTORS = [
  "MrBeast",
  "Naval Ravikant",
  "Rick Rubin",
  "Paddy Galloway",
  "Petros Koublis",
  "Alex Hormozi",
];

function parecer(
  fw: Framework,
  situation: string,
  niche: string,
  calib: Calib | undefined,
  profileName: string | undefined,
  t: (k: string, p?: any, fb?: string) => string
) {
  const s = situation.trim();
  const low = s.toLowerCase();
  const signals = [
    {
      re: /(ctr|clique|click|thumb|capa|título|titulo|title)/,
      tag: t("tools.mentor.signal_pack_tag", {}, "empacotamento"),
      advice: t(
        "tools.mentor.signal_pack_adv",
        { n: fw.n },
        `Antes de mudar o vídeo, mude a vitrine: 3 títulos novos e 2 thumbs para o mesmo tema. É o teste mais barato do framework ${fw.n}.`
      ),
    },
    {
      re: /(reten|assistem|abandon|segund|retention|watch|drop)/,
      tag: t("tools.mentor.signal_ret_tag", {}, "retenção"),
      advice: t(
        "tools.mentor.signal_ret_adv",
        {},
        "Corte os primeiros 20 segundos. Se o hook não entrega a tese, o resto não importa: retenção cai antes do conteúdo começar."
      ),
    },
    {
      re: /(view|views|visualiza|alcance|distribu|reach)/,
      tag: t("tools.mentor.signal_dist_tag", {}, "distribuição"),
      advice: t(
        "tools.mentor.signal_dist_adv",
        {},
        "Compare com o teto do tema, não com a sua média. Se o teto é baixo, o problema não é execução — é escolha de pauta."
      ),
    },
    {
      re: /(inscrit|seguidor|audi|público|publico|subscriber|sub|audience)/,
      tag: t("tools.mentor.signal_aud_tag", {}, "audiência"),
      advice: t(
        "tools.mentor.signal_aud_adv",
        {},
        "Separe novos, casuais e recorrentes. Estratégia para recorrente é profundidade; para novo é clareza absoluta do tema."
      ),
    },
    {
      re: /(dinheiro|renda|venda|produto|cliente|membro|money|revenue|sale|client|member)/,
      tag: t("tools.mentor.signal_mon_tag", {}, "monetização"),
      advice: t(
        "tools.mentor.signal_mon_adv",
        {},
        "Monetização segue confiança, não views. Se a curva de confiança ainda é curta, venda algo barato e rápido de entregar."
      ),
    },
    {
      re: /(tempo|rotina|cansad|burnout|constância|constancia|time|routine|tired|burn)/,
      tag: t("tools.mentor.signal_sus_tag", {}, "sustentação"),
      advice: t(
        "tools.mentor.signal_sus_adv",
        {},
        "Reduza o escopo antes de reduzir a frequência. Um formato mais simples, feito toda semana, vence um épico feito uma vez por mês."
      ),
    },
    {
      re: /(ideia|criativ|bloque|pauta|idea|creative|block)/,
      tag: t("tools.mentor.signal_ide_tag", {}, "ideação"),
      advice: t(
        "tools.mentor.signal_ide_adv",
        {},
        "Volte ao seu melhor vídeo e liste 5 filhas diretas dele. Ideia nova demais paga imposto de explicação."
      ),
    },
    {
      re: /(nicho|posicion|marca|autoridade|niche|position|brand|authority)/,
      tag: t("tools.mentor.signal_pos_tag", {}, "posicionamento"),
      advice: t(
        "tools.mentor.signal_pos_adv",
        {},
        "Escolha um sub-território onde você pode ser o número 1 em 90 dias e faça uma série de 5 vídeos sobre ele."
      ),
    },
  ];
  const matched = signals.filter((x) => x.re.test(low));
  const picked = matched.length ? matched.slice(0, 3) : signals.slice(0, 2);

  const topLines = (calib?.tops || "").split("\n").map(tl => tl.trim()).filter(Boolean).slice(0, 2);
  const fwTitle = t(`tools.mentor.fw.${fw.n}.title`, {}, fw.title);
  const fwLens = t(`tools.mentor.fw.${fw.n}.lens`, {}, fw.lens);
  const fwQuestion = t(`tools.mentor.fw.${fw.n}.question`, {}, fw.question);

  return `${t("tools.mentor.report_title", {}, "PARECER DO MENTOR")} · FRAMEWORK ${fw.n} — ${fwTitle.toUpperCase()}

${t("tools.mentor.section_lens", {}, "LENTE APLICADA")}
${fwLens}

${t("tools.mentor.section_rail", {}, "PERGUNTA-TRILHO")}
${fwQuestion}

${t("tools.mentor.section_context", {}, "CONTEXTO DO CANAL")} ${profileName ? `(PERFIL: ${profileName.toUpperCase()})` : ""}
${niche.trim() || t("tools.mentor.niche_uncalibrated_note", {}, "(nicho ainda não calibrado — o parecer sai genérico sem isso)")}${
  topLines.length ? `\n${t("tools.mentor.outliers_ref", {}, "Outliers de referência no canal:")}\n${topLines.map(tl => `• ${tl}`).join("\n")}` : ""
}

${t("tools.mentor.section_reading", {}, "LEITURA DO SEU CASO")}
${s || t("tools.mentor.case_empty_note", {}, "(descreva a situação para uma leitura específica)")}
${t("tools.mentor.dominant_signal", { signals: picked.map((p) => p.tag).join(" · ") }, `Sinal dominante detectado: ${picked.map((p) => p.tag).join(" · ")}.`)}

${t("tools.mentor.section_plan", {}, "PLANO EM 3 PASSOS")}
${picked.map((p, i) => `${i + 1}. ${p.advice}`).join("\n")}

${t("tools.mentor.section_outputs", {}, "ENTREGÁVEIS DESTE FRAMEWORK")}
${fw.output.map((o, i) => `${i + 1}. ${t(`tools.mentor.fw.${fw.n}.output.${i}`, {}, o)}`).join("\n")}

${t("tools.mentor.section_exit", {}, "CRITÉRIO DE SAÍDA")}
${t("tools.mentor.exit_criteria_body", {}, "Rode o teste por 14 dias ou 4 vídeos. Se a métrica não mover, a hipótese estava errada — não o esforço.")}`;
}

export function Mentor({
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
  const { t, resolvedLanguage } = useI18n();
  const effectiveNiche = niche ?? calib?.niche ?? "";
  const calibrated = isCalibrated(calib);
  const examples = useExampleMode();
  const toolExamples = getLocalizedToolExamples(resolvedLanguage);

  const groups = useMemo(() => [
    { id: "Todos", label: t("tools.mentor.group_all", {}, "Todos") },
    { id: "Criação", label: t("tools.mentor.group_creation", {}, "Criação") },
    { id: "Diagnóstico", label: t("tools.mentor.group_diagnostic", {}, "Diagnóstico") },
    { id: "Posicionamento", label: t("tools.mentor.group_positioning", {}, "Posicionamento") },
    { id: "Estratégia", label: t("tools.mentor.group_strategy", {}, "Estratégia") },
  ], [t]);

  const [group, setGroup] = useState("Todos");
  const [sel, setSel] = useState<Framework>(FRAMEWORKS[3]);
  const [situation, setSituation] = useState(
    examples ? toolExamples.mentorDoubt : ""
  );
  const [q, setQ] = useState("");

  useToolRestore("mentor", (payload) => {
    if (payload.metadata?.situation !== undefined) {
      setSituation(payload.metadata.situation);
      if (payload.metadata.group) setGroup(payload.metadata.group);
      if (payload.metadata.q) setQ(payload.metadata.q);
      if (payload.metadata.frameworkN) {
        const found = FRAMEWORKS.find((f) => f.n === payload.metadata.frameworkN);
        if (found) setSel(found);
      }
    } else if (payload.content) {
      const matchCaso = payload.content.match(/CASO ANALISADO[\r\n]+([\s\S]*?)[\r\n]+LENTE/i);
      if (matchCaso) setSituation(matchCaso[1].trim());
      const matchFw = payload.content.match(/PARECER ESTRATÉGICO — MODELO (\d+)/i);
      if (matchFw) {
        const found = FRAMEWORKS.find((f) => f.n === matchFw[1]);
        if (found) setSel(found);
      }
    }
  });

  const list = useMemo(
    () =>
      FRAMEWORKS.filter((f) => (group === "Todos" ? true : f.group === group)).filter((f) =>
        q.trim() ? (f.title + f.lens + f.group).toLowerCase().includes(q.toLowerCase()) : true
      ),
    [group, q]
  );

  const out = useMemo(
    () => parecer(sel, situation, effectiveNiche, calib, profileName, t),
    [sel, situation, effectiveNiche, calib, profileName, t]
  );

  const selTitle = t(`tools.mentor.fw.${sel.n}.title`, {}, sel.title);
  const selGroup = t(`tools.mentor.groups.${sel.group}`, {}, sel.group);

  const friendlySummary = t(
    "tools.mentor.friendly_summary",
    { title: selTitle, group: selGroup },
    `Parecer estratégico com modelo "${selTitle}" (${selGroup}) · Plano de ação em 3 passos estruturado`
  );

  useAutosave(
    () => ({
      tool: "mentor",
      toolName: t("tools.mentor.title", {}, "Mentor AI"),
      title: situation.trim() ? `${t("tools.mentor.opinion", {}, "Parecer")} ${sel.n} — ${selTitle}` : "",
      summary: friendlySummary,
      tag: sel.n,
      content: out,
    }),
    [out, sel, friendlySummary, selTitle, t] as const,
    20
  );

  return (
    <ToolShell
      id="mentor"
      title={t("tools.mentor.title", {}, "Mentor AI")}
      accent="sky"
      lede={t("tools.mentor.lede", {}, "Não é um chat: é um consultório com 24 modelos mentais. Escolha o framework, descreva a situação e receba um parecer com lente, leitura do caso, plano em três passos e critério de saída.")}
      meta={[
        { k: t("tools.mentor.meta_frameworks", {}, "Frameworks"), v: "24" },
        { k: t("tools.mentor.meta_groups", {}, "Grupos"), v: "4" },
        { k: t("tools.mentor.meta_active", {}, "Ativo"), v: sel.n },
        { k: t("tools.mentor.meta_output", {}, "Saída"), v: t("tools.mentor.opinion", {}, "Parecer") },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        situation.trim()
          ? {
              type: "mentor",
              group: "Estratégia" as const,
              toolName: t("tools.mentor.title", {}, "Mentor AI"),
              title: `${t("tools.mentor.opinion", {}, "Parecer")} ${sel.n} — ${selTitle}`,
              summary: friendlySummary,
              tag: sel.n,
              content: out,
              metadata: {
                group,
                frameworkN: sel.n,
                situation,
                q,
              },
            }
          : null
      }
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title={`${t("tools.mentor.framework_card", {}, "Framework")} ${sel.n}`} note={selGroup} accent="sky">
            <div className="mb-3 flex items-start gap-3">
              <span className="font-display text-[2.6rem] leading-none font-extrabold text-sky-400/80 tabular-nums">
                {sel.n}
              </span>
              <div>
                <h3 className="font-display text-[17px] leading-tight font-extrabold text-bone-50">
                  {selTitle}
                </h3>
                <p className="mt-1 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                  {selGroup}
                </p>
              </div>
            </div>
            <p className="rounded-md border border-sky-400/25 bg-sky-400/[0.06] p-3 text-[12.5px] leading-relaxed text-bone-200">
              {t(`tools.mentor.fw.${sel.n}.lens`, {}, sel.lens)}
            </p>
            <div className="mt-3">
              <div className="mb-1.5 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                {t("tools.mentor.rail_question", {}, "Pergunta-trilho")}
              </div>
              <p className="text-[13px] leading-snug text-bone-300">
                {t(`tools.mentor.fw.${sel.n}.question`, {}, sel.question)}
              </p>
            </div>
            <div className="mt-4 border-t border-ink-800 pt-3">
              <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                {t("tools.mentor.deliverables", {}, "Entregáveis")}
              </div>
              <ul className="space-y-1.5">
                {sel.output.map((o, idx) => (
                  <li key={o} className="flex items-start gap-2 text-[12px] leading-snug text-bone-300">
                    <Icon name="arrow" className="mt-0.5 h-3 w-3 shrink-0 text-sky-400" strokeWidth={2.4} />
                    {t(`tools.mentor.fw.${sel.n}.output.${idx}`, {}, o)}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card title={t("tools.mentor.school_thought", {}, "Escola de pensamento")} accent="bone">
            <div className="flex flex-wrap gap-1.5">
              {MENTORS.map((m) => (
                <span
                  key={m}
                  className="rounded border border-ink-700 bg-ink-950/60 px-2 py-1 font-mono text-[10px] text-bone-400 transition-colors hover:border-sky-400/50 hover:text-sky-400"
                >
                  {m}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
              {t("tools.mentor.school_desc", {}, "Os 24 frameworks sintetizam padrões públicos desses criadores e estrategistas, reescritos como perguntas aplicáveis ao seu canal.")}
            </p>
          </Card>
        </div>
      }
    >
      <CalibrationNotice
        calib={calib}
        calibrated={calibrated}
        profileName={profileName}
        profileColor={profileColor}
        toolName={t("tools.mentor.title", {}, "Mentor AI")}
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={cn(
                "rounded border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-all duration-200",
                group === g.id
                  ? "border-sky-400/60 bg-sky-400/15 text-sky-400"
                  : "border-ink-700 bg-ink-900/60 text-bone-400 hover:border-ink-500 hover:text-bone-100"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <Icon name="eye" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("tools.mentor.search_placeholder", {}, "Buscar framework…")}
            className="py-2 pl-8 text-[12.5px]"
          />
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-lg border border-ink-700/80 bg-ink-800 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((f) => {
          const active = sel.n === f.n;
          return (
            <button
              key={f.n}
              onClick={() => setSel(f)}
              className={cn(
                "group relative overflow-hidden p-4 text-left transition-all duration-300",
                active ? "bg-ink-800" : "bg-ink-900 hover:bg-ink-850"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums transition-colors",
                    active ? "text-sky-400" : "text-ink-500 group-hover:text-bone-400"
                  )}
                >
                  {f.n}
                </span>
                <span className="font-mono text-[8.5px] tracking-[0.14em] text-ink-500 uppercase">
                  {t(`tools.mentor.groups.${f.group}`, {}, f.group)}
                </span>
              </div>
              <div
                className={cn(
                  "font-display text-[14.5px] leading-tight font-bold transition-colors",
                  active ? "text-bone-50" : "text-bone-200 group-hover:text-sky-400"
                )}
              >
                {t(`tools.mentor.fw.${f.n}.title`, {}, f.title)}
              </div>
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 h-[2px] origin-left transition-transform duration-500",
                  active ? "scale-x-100 bg-sky-400" : "scale-x-0 bg-sky-400/60 group-hover:scale-x-100"
                )}
              />
            </button>
          );
        })}
        {!list.length && (
          <div className="bg-ink-900 p-8 text-center font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase sm:col-span-2 lg:col-span-4">
            {t("tools.mentor.empty_frameworks", {}, "nenhum framework encontrado")}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card
          title={t("tools.mentor.your_case", {}, "Seu caso")}
          note={profileName ? `${t("tools.mentor.profile_note", {}, "perfil")}: ${profileName}` : t("tools.mentor.input_note", {}, "entrada do parecer")}
          accent="signal"
        >
          <Label hint={t("tools.mentor.hint_specific", {}, "seja específico")}>
            {t("tools.mentor.current_situation", {}, "Situação atual")}
          </Label>
          <Textarea
            rows={7}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder={t("tools.mentor.case_placeholder", {}, "Ex.: CTR 3%, retenção 32%, canal travado em 8 mil inscritos, 2 vídeos por semana.")}
          />
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <Label>{t("tools.mentor.calibrated_niche", {}, "Nicho calibrado")}</Label>
              {profileName && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-bone-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: profileColor || "#F2B33D" }} />
                  {profileName}
                </span>
              )}
            </div>
            <div className="rounded-md border border-ink-700 bg-ink-950/60 px-3 py-2.5 text-[13px] text-bone-300">
              {effectiveNiche.trim() || <span className="text-ink-400">{t("tools.mentor.not_calibrated", {}, "não calibrado — ")}</span>}
              {!effectiveNiche.trim() && (
                <button type="button" onClick={() => onGo("calibracao")} className="font-mono text-[11px] text-signal-400 underline underline-offset-2 hover:text-signal-300">
                  {t("tools.mentor.calibrate_now", {}, "calibrar agora")}
                </button>
              )}
            </div>
          </div>
          <Button className="mt-4 w-full" icon="brain" onClick={() => setSel(FRAMEWORKS.find((f) => f.n === sel.n) ?? sel)}>
            {t("tools.mentor.generate_opinion", {}, "Gerar parecer")}
          </Button>
        </Card>

        <Card title={t("tools.mentor.mentor_opinion", {}, "Parecer do mentor")} note={`framework ${sel.n}`} accent="sky">
          <pre className="max-h-[30rem] overflow-auto whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/70 p-4 font-mono text-[12px] leading-[1.75] text-bone-200">
            {out}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={out} />
            <Button size="sm" variant="outline" icon="gauge" onClick={() => onGo("rank")}>
              {t("tools.mentor.test_suggested_idea", {}, "Testar a ideia sugerida")}
            </Button>
            <span className="ml-auto font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
              {t("tools.mentor.words_count", { count: out.split(/\s+/).length }, `${out.split(/\s+/).length} palavras de parecer`)}
            </span>
          </div>
        </Card>
      </div>
    </ToolShell>
  );
}
