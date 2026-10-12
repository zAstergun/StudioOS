import { useMemo, useState, useEffect } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Meter, Select, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";
import { useI18n } from "../i18n";
import { getLocalizedToolExamples } from "../i18n/examples";

const num = (s?: string) => parseFloat((s || "").replace(/\./g, "").replace(",", ".")) || 0;
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const MEMBERSHIP_SECTIONS_DEF = [
  {
    id: "meta",
    titleKey: "tools.membros.sec_meta_title",
    titleFallback: "Meta e Situação",
    questions: [
      { id: "meta_renda", key: "Quanto quer ganhar/mês com membros?", labelKey: "tools.membros.q_meta_renda", fallback: "Quanto quer ganhar/mês com membros?" },
      { id: "membros_atuais", key: "Membros atuais e renda?", labelKey: "tools.membros.q_membros_atuais", fallback: "Membros atuais e renda?" },
      { id: "ja_teve", key: "Já teve área antes?", labelKey: "tools.membros.q_ja_teve", fallback: "Já teve área antes?" },
    ],
  },
  {
    id: "audiencia",
    titleKey: "tools.membros.sec_aud_title",
    titleFallback: "Tamanho Real da Audiência",
    questions: [
      { id: "inscritos", key: "Quantos inscritos?", labelKey: "tools.membros.q_inscritos", fallback: "Quantos inscritos?" },
      { id: "views_mes", key: "Views por mês (total)?", labelKey: "tools.membros.q_views_mes", fallback: "Views por mês (total)?" },
      { id: "unicos", key: "Espectadores únicos/mês?", labelKey: "tools.membros.q_unicos", fallback: "Espectadores únicos/mês?" },
      { id: "recorrencia", key: "% novos / casuais / recorrentes?", labelKey: "tools.membros.q_recorrencia", fallback: "% novos / casuais / recorrentes?" },
    ],
  },
  {
    id: "conteudo",
    titleKey: "tools.membros.sec_content_title",
    titleFallback: "Conteúdo",
    questions: [
      { id: "shorts_pct", key: "% views de Shorts?", labelKey: "tools.membros.q_shorts_pct", fallback: "% views de Shorts?" },
      { id: "nicho", key: "Nicho (1 frase)", labelKey: "tools.membros.q_nicho", fallback: "Nicho (1 frase)" },
      { id: "videos_mes", key: "Vídeos/mês e tempo cada?", labelKey: "tools.membros.q_videos_mes", fallback: "Vídeos/mês e tempo cada?" },
      { id: "live", key: "Faz live? Frequência e pico?", labelKey: "tools.membros.q_live", fallback: "Faz live? Frequência e pico?" },
      { id: "tops_flops", key: "3 vídeos top + 3 flops", labelKey: "tools.membros.q_tops_flops", fallback: "3 vídeos top + 3 flops" },
      { id: "assunto_ama", key: "Assunto que o público ama mas não performa?", labelKey: "tools.membros.q_assunto_ama", fallback: "Assunto que o público ama mas não performa?" },
      { id: "ja_vende", key: "Já vende algo?", labelKey: "tools.membros.q_ja_vende", fallback: "Já vende algo?" },
    ],
  },
];

export function Membros({
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
  const toolExamples = getLocalizedToolExamples(resolvedLanguage);

  const [answers, setAnswers] = useState<Record<string, string>>(examples ? {
    "Quanto quer ganhar/mês com membros?": "12000",
    "Membros atuais e renda?": "34 membros · R$3.400",
    "Já teve área antes?": "Sim, uma comunidade no Discord por 6 meses",
    "Quantos inscritos?": "48000",
    "Views por mês (total)?": "620000",
    "Espectadores únicos/mês?": "210000",
    "% novos / casuais / recorrentes?": "42 / 38 / 20",
    "% views de Shorts?": "35",
    "Nicho (1 frase)": calib?.niche || toolExamples.titulosTema,
    "Vídeos/mês e tempo cada?": "8 vídeos · 9 minutos",
    "Faz live? Frequência e pico?": "1 live por mês · pico 900 simultâneos",
    "3 vídeos top + 3 flops": "",
    "Assunto que o público ama mas não performa?": "Análise de carteira ao vivo",
    "Já vende algo?": "Uma planilha por R$47",
  } : calib?.niche ? { "Nicho (1 frase)": calib.niche } : {});

  useEffect(() => {
    if (calib?.niche) {
      setAnswers((prev) => prev["Nicho (1 frase)"] ? prev : { ...prev, "Nicho (1 frase)": calib.niche });
    }
  }, [calib]);

  const [preco, setPreco] = useState(examples ? "49" : "");
  const [conversao, setConversao] = useState(examples ? "1.2" : "");
  const [promessa, setPromessa] = useState(examples ? toolExamples.membrosGoal : "");
  const [mods, setMods] = useState(examples ? [
    "Diagnóstico de carteira em 4 aulas",
    "Encontro mensal ao vivo com análise",
    "Planilha de aporte automático",
  ] : []);
  const [novoMod, setNovoMod] = useState("");

  useToolRestore("membros", (payload) => {
    if (payload.metadata?.answers !== undefined) {
      setAnswers(payload.metadata.answers);
      if (payload.metadata.preco) setPreco(payload.metadata.preco);
      if (payload.metadata.conversao) setConversao(payload.metadata.conversao);
      if (payload.metadata.promessa) setPromessa(payload.metadata.promessa);
      if (payload.metadata.mods) setMods(payload.metadata.mods);
    } else if (payload.content) {
      const matchPromessa = payload.content.match(/Promessa:\s*(.*)/);
      const matchPreco = payload.content.match(/Preço:\s*R\$\s*([\d.,]+)/);
      const matchConv = payload.content.match(/conversão\s*([\d.,]+)%/);
      if (matchPromessa) setPromessa(matchPromessa[1].trim());
      if (matchPreco) setPreco(matchPreco[1].trim());
      if (matchConv) setConversao(matchConv[1].trim());
    }
  });

  const set = (k: string, v: string) => setAnswers((p) => ({ ...p, [k]: v }));

  const calc = useMemo(() => {
    const unicos = num(answers["Espectadores únicos/mês?"]);
    const inscritos = num(answers["Quantos inscritos?"]);
    const meta = num(answers["Quanto quer ganhar/mês com membros?"]);
    const recorrentesPct = parseFloat(((answers["% novos / casuais / recorrentes?"] || "").match(/(\d+)\s*$/) ?? ["0"])[1]) || 0;
    const base = Math.max(unicos * (recorrentesPct / 100), inscritos * 0.12);
    const conv = Math.max(0, parseFloat(conversao.replace(",", ".")) || 0) / 100;
    const p = num(preco);
    const possiveis = Math.round(base * conv);
    const receita = possiveis * p;
    const necessarios = p ? Math.ceil(meta / p) : 0;
    const pctBase = base ? (necessarios / base) * 100 : 0;
    const viavel = pctBase <= 6;
    return { base: Math.round(base), possiveis, receita, necessarios, pctBase, viavel, meta, p };
  }, [answers, preco, conversao]);

  const filled = Object.values(answers).filter((v) => v.trim()).length;
  const total = MEMBERSHIP_SECTIONS_DEF.reduce((s, x) => s + x.questions.length, 0);

  const friendlySummary = t(
    "tools.membros.friendly_summary",
    {
      members: calc.possiveis,
      revenue: brl(calc.receita),
      status: calc.viavel
        ? t("tools.membros.status_viable", {}, "viável para o canal")
        : t("tools.membros.status_high", {}, "meta alta para o tamanho da base atual"),
    },
    `Projeção de ${calc.possiveis} membros (${brl(calc.receita)}/mês) · Modelo avaliado como ${calc.viavel ? "viável para o canal" : "meta alta para o tamanho da base atual"}`
  );

  useAutosave(
    () => ({
      tool: "membros",
      toolName: t("tools.membros.title", {}, "Área de Membros"),
      title: filled || promessa.trim() ? `${t("tools.membros.title", {}, "Área de Membros")} — meta ${brl(calc.meta)}/mês` : "",
      summary: friendlySummary,
      tag: calc.viavel ? t("tools.membros.status_viable_tag", {}, "viável") : t("tools.membros.status_adjust_tag", {}, "ajustar"),
      content: `ÁREA DE MEMBROS\n\nPromessa: ${promessa}\nPreço: ${brl(calc.p)}/mês · conversão ${conversao}%\nBase real: ${calc.base.toLocaleString("pt-BR")} · membros possíveis: ${calc.possiveis}\nReceita projetada: ${brl(calc.receita)} ↗ meta precisa de ${calc.necessarios}\n\nMÓDULOS\n${mods.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\nQUESTIONÁRIO (${filled}/${total})\n${Object.entries(answers).filter(([, v]) => v.trim()).map(([k, v]) => `${k} → ${v}`).join("\n")}`,
    }),
    [calc, mods, promessa, filled, friendlySummary, t] as const,
    20,
    4500
  );

  return (
    <ToolShell
      id="membros"
      title={t("tools.membros.title", {}, "Área de Membros")}
      accent="plum"
      lede={t("tools.membros.lede", {}, "Arquitetura de ensino e matemática de assinatura. Responda o questionário e o painel calcula quantos membros a sua audiência real sustenta — antes de você prometer algo que não entrega.")}
      meta={[
        { k: t("tools.membros.meta_questions", {}, "Perguntas"), v: `${filled}/${total}` },
        { k: t("tools.membros.meta_real_base", {}, "Base real"), v: calc.base.toLocaleString("pt-BR") },
        { k: t("tools.membros.meta_est_rev", {}, "Receita est."), v: brl(calc.receita) },
        { k: t("tools.membros.meta_viable", {}, "Viável"), v: calc.viavel ? t("common.yes", {}, "Sim") : t("common.no", {}, "Não") },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        filled > 0 || promessa.trim()
          ? {
              type: "membros",
              group: "Estratégia" as const,
              toolName: t("tools.membros.title", {}, "Área de Membros"),
              title: promessa.trim() ? `${t("tools.membros.title", {}, "Área de Membros")} — ${promessa.slice(0, 50)}` : t("tools.membros.title", {}, "Área de Membros"),
              summary: friendlySummary,
              tag: calc.viavel ? t("tools.membros.status_viable_tag", {}, "viável") : t("tools.membros.status_adjust_tag", {}, "ajustar"),
              content: `ÁREA DE MEMBROS\n\nPromessa: ${promessa}\nPreço: ${brl(calc.p)}/mês · conversão ${conversao}%\nBase real: ${calc.base.toLocaleString("pt-BR")} · membros possíveis: ${calc.possiveis}\nReceita projetada: ${brl(calc.receita)} ↗ meta precisa de ${calc.necessarios}\n\nMÓDULOS\n${mods.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\nQUESTIONÁRIO (${filled}/${total})\n${Object.entries(answers).filter(([, v]) => v.trim()).map(([k, v]) => `${k} → ${v}`).join("\n")}`,
              metadata: {
                answers,
                preco,
                conversao,
                promessa,
                mods,
              },
            }
          : null
      }
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title={t("tools.membros.math_title", {}, "Matemática da meta")} note={t("tools.membros.live", {}, "ao vivo")} accent="plum">
            <div className="space-y-4">
              <div>
                <Label hint={t("tools.membros.currency_per_month", {}, "R$/mês")}>
                  {t("tools.membros.sub_price", {}, "Preço da assinatura")}
                </Label>
                <Input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="numeric" className="font-mono tabular-nums" />
              </div>
              <div>
                <Label hint={t("tools.membros.pct_base_hint", {}, "% da base")}>
                  {t("tools.membros.expected_conv", {}, "Conversão esperada")}
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0.2} max={4} step={0.1}
                    value={parseFloat(conversao.replace(",", ".")) || 1.2}
                    onChange={(e) => setConversao(e.target.value)}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-ink-700 accent-plum-400"
                    aria-label={t("tools.membros.expected_conv", {}, "Conversão esperada")}
                  />
                  <span className="w-12 text-right font-mono text-[12px] text-bone-100 tabular-nums">
                    {(parseFloat(conversao.replace(",", ".")) || 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-ink-800 bg-ink-800">
                {[
                  { k: t("tools.membros.real_base", {}, "Base real"), v: calc.base.toLocaleString("pt-BR"), c: "text-bone-50" },
                  { k: t("tools.membros.possible_members", {}, "Membros possíveis"), v: calc.possiveis.toLocaleString("pt-BR"), c: "text-plum-400" },
                  { k: t("tools.membros.proj_revenue", {}, "Receita projetada"), v: brl(calc.receita), c: "text-mint-300" },
                  { k: t("tools.membros.needed_for_goal", {}, "Necessários p/ meta"), v: calc.necessarios.toLocaleString("pt-BR"), c: "text-signal-300" },
                ].map((m) => (
                  <div key={m.k} className="bg-ink-950/70 px-3 py-2.5">
                    <div className="font-mono text-[9px] tracking-[0.14em] text-ink-400 uppercase">{m.k}</div>
                    <div className={cn("font-display text-[17px] font-extrabold tabular-nums", m.c)}>{m.v}</div>
                  </div>
                ))}
              </div>

              <div>
                <Meter
                  value={Math.min(100, calc.pctBase)}
                  max={100}
                  accent={calc.viavel ? "mint" : "oxide"}
                  label={t("tools.membros.goal_demands_base", { pct: calc.pctBase.toFixed(1) }, `Meta exige ${calc.pctBase.toFixed(1)}% da base`)}
                />
                <p className={cn("mt-2 text-[12px] leading-relaxed", calc.viavel ? "text-mint-300" : "text-oxide-400")}>
                  {calc.viavel
                    ? t("tools.membros.realistic_desc", {}, "Dentro do realista: abaixo de 6% da base recorrente.")
                    : t("tools.membros.unrealistic_desc", {}, "Meta acima do que a audiência atual sustenta. Suba o preço, corte a meta ou cresça a base primeiro.")}
                </p>
              </div>

              <Button size="sm" variant="outline" className="w-full" icon="brain" onClick={() => onGo("mentor")}>
                {t("tools.membros.discuss_mentor", {}, "Discutir com o Mentor AI")}
              </Button>
            </div>
          </Card>

          <Card title={t("tools.membros.area_promise", {}, "Promessa da área")} accent="mint">
            <Textarea rows={4} value={promessa} onChange={(e) => setPromessa(e.target.value)} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              {t("tools.membros.promise_expl", {}, "Uma frase, uma transformação, um ritmo. Se precisar de duas frases, a promessa ainda não está clara.")}
            </p>
          </Card>
        </div>
      }
    >
      <CalibrationNotice
        calib={calib}
        profileName={profileName}
        profileColor={profileColor}
        toolName={t("tools.membros.title", {}, "Área de Membros")}
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {MEMBERSHIP_SECTIONS_DEF.map((sec, si) => (
          <Card
            key={sec.id}
            title={t(sec.titleKey, {}, sec.titleFallback)}
            note={`${sec.questions.length} ${t("tools.membros.questions_count", {}, "perguntas")}`}
            accent={(["plum", "sky", "signal"] as const)[si % 3]}
            className={si === 2 ? "lg:col-span-2" : ""}
          >
            <div className={cn("grid gap-4", si === 2 && "md:grid-cols-2")}>
              {sec.questions.map((q, i) => {
                const labelText = t(q.labelKey, {}, q.fallback);
                return (
                  <div key={q.key}>
                    <Label n={i + 1 + (si === 1 ? 3 : si === 2 ? 7 : 0)}>{labelText}</Label>
                    {q.key.length > 60 ? (
                      <Textarea
                        rows={2}
                        value={answers[q.key] ?? ""}
                        onChange={(e) => set(q.key, e.target.value)}
                        placeholder={t("tools.membros.answer_placeholder", {}, "Responda…")}
                      />
                    ) : (
                      <Input
                        value={answers[q.key] ?? ""}
                        onChange={(e) => set(q.key, e.target.value)}
                        placeholder={t("tools.membros.answer_placeholder", {}, "Responda…")}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Card title={t("tools.membros.delivery_title", {}, "Arquitetura de entrega")} note={t("tools.membros.modules_note", {}, "módulos")} accent="sky" className="mt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div>
            <ul className="space-y-2">
              {mods.map((m, i) => (
                <li
                  key={m}
                  className="group flex items-center gap-3 rounded-md border border-ink-800 bg-ink-950/60 p-3 transition-all duration-200 hover:border-sky-400/40 hover:bg-ink-900"
                >
                  <span className="font-mono text-[11px] text-sky-400 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[13.5px] font-medium text-bone-100">{m}</span>
                  <span className="font-mono text-[9.5px] tracking-[0.12em] text-ink-500 uppercase">
                    {t("tools.membros.week_num", { num: i + 1 }, `semana ${i + 1}`)}
                  </span>
                  <button
                    onClick={() => setMods((p) => p.filter((x) => x !== m))}
                    className="rounded p-1 text-ink-500 transition-colors hover:bg-oxide-400/15 hover:text-oxide-400"
                    aria-label={t("tools.membros.remove_module_aria", { module: m }, `Remover ${m}`)}
                  >
                    <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                </li>
              ))}
              {!mods.length && (
                <li className="rounded-md border border-dashed border-ink-700 p-6 text-center font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase">
                  {t("tools.membros.no_modules", {}, "nenhum módulo planejado")}
                </li>
              )}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input
                value={novoMod}
                onChange={(e) => setNovoMod(e.target.value)}
                placeholder={t("tools.membros.new_module_placeholder", {}, "Novo módulo ou entregável…")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && novoMod.trim()) {
                    setMods((p) => [...p, novoMod.trim()]);
                    setNovoMod("");
                  }
                }}
              />
              <Button
                icon="plus"
                onClick={() => {
                  if (!novoMod.trim()) return;
                  setMods((p) => [...p, novoMod.trim()]);
                  setNovoMod("");
                }}
              >
                {t("common.add", {}, "Adicionar")}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>{t("tools.membros.main_format", {}, "Formato principal")}</Label>
              <Select defaultValue="aula" headerTitle={t("tools.membros.avail_formats", {}, "Formatos disponíveis")}>
                <option value="aula">{t("tools.membros.fmt_recorded", {}, "Aulas gravadas + encontros")}</option>
                <option value="comunidade">{t("tools.membros.fmt_community", {}, "Comunidade com curadoria")}</option>
                <option value="mentor">{t("tools.membros.fmt_mentoring", {}, "Mentoria em grupo pequeno")}</option>
                <option value="ferramenta">{t("tools.membros.fmt_tool", {}, "Ferramenta / planilha viva")}</option>
              </Select>
            </div>
            <div className="rounded-md border border-ink-800 bg-ink-950/50 p-3">
              <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                {t("tools.membros.churn_rule_title", {}, "Regra de churn")}
              </div>
              <p className="text-[12px] leading-relaxed text-bone-400">
                {t("tools.membros.churn_rule_desc", {}, "Membro cancela quando não consegue nomear o que recebeu no mês. Todo módulo precisa de um entregável com nome e data.")}
              </p>
            </div>
            <CopyButton
              text={`ÁREA DE MEMBROS\n\nPromessa: ${promessa}\nPreço: ${brl(num(preco))}/mês\nBase real: ${calc.base}\nMembros possíveis: ${calc.possiveis}\nReceita projetada: ${brl(calc.receita)}\n\nMódulos:\n${mods.map((m, i) => `${i + 1}. ${m}`).join("\n")}`}
            />
          </div>
        </div>
      </Card>
    </ToolShell>
  );
}
