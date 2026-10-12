import { useMemo, useState, useEffect } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Select, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { burstiness, paragraphs, sentences, words } from "./textAnalysis";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";
import { useI18n } from "../i18n";
import { getLocalizedToolExamples } from "../i18n/examples";

function getParts(t: (k: string, p?: any, fb?: string) => string) {
  return [
    {
      id: "hook",
      label: t("tools.receita.part_hook_label", {}, "1. Hook de ruptura"),
      role: t("tools.receita.part_hook_role", {}, "Primeira linha: afirmação que quebra o esperado, sem aquecimento."),
    },
    {
      id: "contexto",
      label: t("tools.receita.part_context_label", {}, "2. Contexto mínimo"),
      role: t("tools.receita.part_context_role", {}, "Duas linhas de cenário. Só o necessário para o número fazer sentido."),
    },
    {
      id: "virada",
      label: t("tools.receita.part_turn_label", {}, "3. Virada pessoal"),
      role: t("tools.receita.part_turn_role", {}, "O erro ou a descoberta em 1ª pessoa. Aqui mora a afinidade."),
    },
    {
      id: "prova",
      label: t("tools.receita.part_proof_label", {}, "4. Prova concreta"),
      role: t("tools.receita.part_proof_role", {}, "Dado, print, lista ou exemplo que pode ser verificado."),
    },
    {
      id: "cta",
      label: t("tools.receita.part_cta_label", {}, "5. Saída acionável"),
      role: t("tools.receita.part_cta_role", {}, "Uma ação pequena e imediata + convite de comentário."),
    },
  ];
}

function detectTone(t: string) {
  const low = t.toLowerCase();
  const marks: { k: string; v: number }[] = [
    { k: "confessional", v: (low.match(/\b(eu |meu|minha|errei|perdi|parei)\b/g) ?? []).length },
    { k: "provocador", v: (low.match(/\b(nunca|ninguém|ninguem|pare de|chega de|absurdo)\b/g) ?? []).length },
    { k: "didático", v: (low.match(/\b(passo|primeiro|depois|exemplo|significa|basicamente)\b/g) ?? []).length },
    { k: "urgente", v: (low.match(/\b(hoje|agora|antes que|última|ultimo|corre|amanhã|amanha)\b/g) ?? []).length },
    { k: "otimista", v: (low.match(/\b(melhor|ganhei|subiu|cresceu|consegui|funciona)\b/g) ?? []).length },
  ].sort((a, b) => b.v - a.v);
  return marks[0].v > 0 ? marks[0].k : "neutro";
}

function cap(s: string) {
  const t = s.trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

export function ReceitaViral({
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

  const [original, setOriginal] = useState(
    examples ? toolExamples.receitaViralText : ""
  );
  const [format, setFormat] = useState("texto");
  const [tema, setTema] = useState(
    examples ? toolExamples.titulosTema : calib?.niche ? calib.niche.slice(0, 50) : ""
  );
  const [para, setPara] = useState(
    examples ? (calib?.niche || toolExamples.rankIdea.slice(0, 45)) : calib?.niche || ""
  );
  const [insumo, setInsumo] = useState(
    examples ? (calib?.prova || toolExamples.hooksPromise) : calib?.prova || ""
  );

  useEffect(() => {
    if (calib) {
      if (!tema && calib.niche) setTema(calib.niche.slice(0, 50));
      if (!para && calib.niche) setPara(calib.niche);
      if (!insumo && calib.prova) setInsumo(calib.prova);
    }
  }, [calib]);

  useToolRestore("receita", (payload) => {
    if (payload.metadata?.tema !== undefined) {
      setTema(payload.metadata.tema);
      if (payload.metadata.original) setOriginal(payload.metadata.original);
      if (payload.metadata.format) setFormat(payload.metadata.format);
      if (payload.metadata.para) setPara(payload.metadata.para);
      if (payload.metadata.insumo) setInsumo(payload.metadata.insumo);
    } else if (payload.content) {
      const matchTema = payload.content.match(/APLICAÇÃO — (.*?) \(tema novo\)/);
      const matchPara = payload.content.match(/Para quem:\s*(.*)/);
      const matchInsumo = payload.content.match(/Insumo que só você tem:\s*(.*)/);
      if (matchTema) setTema(matchTema[1].trim());
      if (matchPara) setPara(matchPara[1].trim());
      if (matchInsumo) setInsumo(matchInsumo[1].trim());
    }
  });

  const parts = useMemo(() => getParts(t), [t]);

  const analysis = useMemo(() => {
    const s = sentences(original);
    const p = paragraphs(original);
    const w = words(original).length;
    const nums = (original.match(/\b\d+(?:[.,]\d+)?\b/g) ?? []).length;
    const tone = detectTone(original);
    const first = s[0] ?? "";
    return {
      lines: original.split("\n").filter((l) => l.trim()).length,
      sentences: s.length,
      paragraphs: p.length,
      words: w,
      nums,
      tone,
      burst: burstiness(original),
      avg: s.length ? Math.round((w / s.length) * 10) / 10 : 0,
      firstWords: first ? first.split(/\s+/).length : 0,
      hasCta: /(comenta|comente|salva|salve|compartilha|segue|me chama|responde|comment|save|share|follow)/i.test(original),
      hasProof: /(r\$|\$|€|£|¥|\d)/.test(original),
    };
  }, [original]);

  const recipe = useMemo(() => {
    const defaultTopic = t("tools.receita.default_topic", {}, "seu tema");
    const tTopic = cap(tema.trim() || defaultTopic);
    const low = tTopic.toLowerCase();
    const audience = para.trim() || t("tools.receita.default_audience", {}, "eu");
    const inputSample = insumo.trim() ? cap(insumo.trim()) : t("tools.receita.default_input", {}, "A fatura");
    return [
      t("tools.receita.recipe_step1", { low }, `Cortei ${low} e não me arrependi.`),
      t("tools.receita.recipe_step2", { audience }, `Foi quando ${audience} percebeu que o custo era fixo e invisível.`),
      t("tools.receita.recipe_step3", { short: low.split(" ").slice(0, 4).join(" ") }, `Eu achava que ${low.split(" ").slice(0, 4).join(" ")} era necessidade. Era hábito.`),
      t("tools.receita.recipe_step4", { input: inputSample }, `${inputSample} mostra o número: some tudo por 12 meses antes de decidir.`),
      t("tools.receita.recipe_step5", {}, `Faz essa conta hoje. Comenta o valor que eu ajudo a interpretar.`),
    ];
  }, [tema, para, insumo, t]);

  const out = `${t("tools.receita.extracted_title", {}, "RECEITA EXTRAÍDA")}
${t("tools.receita.extracted_format", {
  paragraphs: analysis.paragraphs,
  sentences: analysis.sentences,
  words: analysis.words
}, `Formato original: ${analysis.paragraphs} blocos · ${analysis.sentences} frases · ${analysis.words} palavras`)}
${t("tools.receita.extracted_tone", {
  tone: analysis.tone,
  burst: analysis.burst.toFixed(1),
  nums: analysis.nums
}, `Tom: ${analysis.tone} · burstiness ${analysis.burst.toFixed(1)} · ${analysis.nums} número(s)`)}
${t("tools.receita.extracted_hook", { words: analysis.firstWords }, `Hook: ${analysis.firstWords} palavras, sem aquecimento`)}
${t("tools.receita.extracted_proof", {
  proof: analysis.hasProof ? t("common.yes", {}, "sim") : t("common.no", {}, "não"),
  cta: analysis.hasCta ? t("common.yes", {}, "sim") : t("common.no", {}, "não")
}, `Prova concreta: ${analysis.hasProof ? "sim" : "não"} · CTA de comentário: ${analysis.hasCta ? "sim" : "não"}`)}

${t("tools.receita.application_header", { topic: cap(tema.trim() || t("tools.receita.default_topic", {}, "seu tema")) }, `APLICAÇÃO — ${cap(tema.trim() || "seu tema")} (tema novo)`)}
${t("tools.receita.application_target", { para }, `Para quem: ${para}`)}
${t("tools.receita.application_input", { insumo }, `Insumo que só você tem: ${insumo}`)}

${recipe.map((r, i) => `${parts[i]?.label || ""}\n${r}`).join("\n\n")}

${t("tools.receita.guardrail_header", {}, "GUARDRAIL")}
${t("tools.receita.guardrail_body", {}, "Espelhe a estrutura, não o conteúdo. A receita funcionou porque um dia pareceu fresca.")}`;

  const RECIPE_MIN = 12;

  const friendlySummary = t(
    "tools.receita.friendly_summary",
    { tone: analysis.tone },
    `Estrutura viral desconstruída em 5 etapas · Tom ${analysis.tone} adaptado ao novo tema`
  );

  useAutosave(
    () => ({
      tool: "receita",
      toolName: t("tools.receita.title", {}, "Receita Viral"),
      title: original.trim() || tema.trim() ? `${t("tools.receita.title", {}, "Receita Viral")} — ${cap(tema.trim() || t("tools.receita.default_topic", {}, "seu tema"))}` : "",
      summary: friendlySummary,
      tag: analysis.tone,
      content: out,
    }),
    [out, tema, friendlySummary, t] as const,
    RECIPE_MIN
  );

  return (
    <ToolShell
      id="receita"
      title={t("tools.receita.title", {}, "Receita Viral")}
      accent="signal"
      lede={t("tools.receita.lede", {}, "Engenharia reversa: cole um post que performou, o painel extrai estrutura, tom e ritmo — e devolve a mesma receita aplicada ao seu tema, com o insumo que só você tem.")}
      meta={[
        { k: t("tools.receita.meta_parts", {}, "Partes"), v: "5" },
        { k: t("tools.receita.meta_tone", {}, "Tom"), v: cap(analysis.tone) },
        { k: t("tools.receita.meta_blocks", {}, "Blocos"), v: String(analysis.paragraphs) },
        { k: t("tools.receita.meta_burstiness", {}, "Burstiness"), v: analysis.burst.toFixed(1) },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        original.trim() || tema.trim()
          ? {
              type: "receita",
              group: "Publicação" as const,
              toolName: t("tools.receita.title", {}, "Receita Viral"),
              title: tema.trim() ? `${t("tools.receita.title", {}, "Receita Viral")} — ${cap(tema.trim())}` : t("tools.receita.title", {}, "Receita Viral"),
              summary: friendlySummary,
              tag: analysis.tone,
              content: out,
              metadata: {
                original,
                format,
                tema,
                para,
                insumo,
              },
            }
          : null
      }
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title={t("tools.receita.xray_title", {}, "Raio-X do original")} accent="sky">
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: t("tools.receita.stat_words", {}, "Palavras"), v: analysis.words },
                { k: t("tools.receita.stat_sentences", {}, "Frases"), v: analysis.sentences },
                { k: t("tools.receita.stat_avg_sentence", {}, "Média/frase"), v: analysis.avg },
                { k: t("tools.receita.stat_numbers", {}, "Números"), v: analysis.nums },
              ].map((m) => (
                <div key={m.k} className="rounded border border-ink-800 bg-ink-950/50 px-3 py-2">
                  <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">{m.k}</div>
                  <div className="font-display text-lg font-bold text-bone-100 tabular-nums">{m.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                { k: t("tools.receita.check_hook", {}, "Hook sem aquecimento"), ok: analysis.firstWords > 0 && analysis.firstWords <= 12 },
                { k: t("tools.receita.check_proof", {}, "Prova numérica"), ok: analysis.hasProof },
                { k: t("tools.receita.check_cta", {}, "CTA de comentário"), ok: analysis.hasCta },
                { k: t("tools.receita.check_burst", {}, "Ritmo variado"), ok: analysis.burst >= 4 },
              ].map((r) => (
                <div key={r.k} className="flex items-center gap-2 text-[12px]">
                  <Icon
                    name={r.ok ? "check" : "close"}
                    className={cn("h-3.5 w-3.5 shrink-0", r.ok ? "text-mint-400" : "text-oxide-400")}
                    strokeWidth={2.4}
                  />
                  <span className={r.ok ? "text-bone-200" : "text-ink-400"}>{r.k}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="rounded-lg border border-signal-400/30 bg-signal-400/[0.07] p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Icon name="eye" className="h-4 w-4 text-signal-400" />
              <span className="font-mono text-[9.5px] tracking-[0.18em] text-signal-400 uppercase">
                {t("tools.receita.honest_guardrail", {}, "Guardrail honesto")}
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-bone-200">
              {t("tools.receita.honest_guardrail_desc", {}, "Receita viral funciona porque um dia pareceu fresca. Não rode a mesma sem parar.")}{" "}
              <strong className="text-bone-50">{t("tools.receita.mirror_dont_copy", {}, "Espelhe, não copie.")}</strong>
            </p>
          </div>

          <Card title={t("tools.receita.after_title", {}, "Depois de aplicar")} accent="mint">
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start" icon="check" onClick={() => onGo("score")}>
                {t("tools.receita.go_score", {}, "Dar nota no Score de Post")}
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" icon="wave" onClick={() => onGo("humanizador")}>
                {t("tools.receita.go_humanizador", {}, "Tirar cheiro de IA")}
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
        toolName={t("tools.receita.title", {}, "Receita Viral")}
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t("tools.receita.original_post_title", {}, "Post original")} note={t("tools.receita.paste_whole", {}, "cole inteiro")} accent="signal">
          <Textarea
            rows={12}
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder={t("tools.receita.original_placeholder", {}, "Cole o post que performou, inteiro, com as quebras de linha")}
          />
          <div className="mt-3">
            <Label>{t("tools.receita.post_format", {}, "Formato do post")}</Label>
            <Select value={format} onChange={(e) => setFormat(e.target.value)} headerTitle={t("tools.receita.post_formats", {}, "Formatos do post")}>
              <option value="texto">{t("tools.receita.format_text", {}, "Texto longo (LinkedIn / Facebook)")}</option>
              <option value="carrossel">{t("tools.receita.format_carousel", {}, "Carrossel")}</option>
              <option value="thread">{t("tools.receita.format_thread", {}, "Thread (X)")}</option>
              <option value="legenda">{t("tools.receita.format_caption", {}, "Legenda de Reels / Shorts")}</option>
            </Select>
          </div>
        </Card>

        <Card title={t("tools.receita.apply_title", {}, "Aplicar no seu contexto")} note={t("tools.receita.apply_note", {}, "novo tema")} accent="mint">
          <div className="space-y-4">
            <div>
              <Label hint={t("tools.receita.what_tell", {}, "o que você vai contar")}>{t("tools.receita.new_theme", {}, "Tema novo")}</Label>
              <Input value={tema} onChange={(e) => setTema(e.target.value)} />
            </div>
            <div>
              <Label hint={t("tools.receita.audience_hint", {}, "audiência")}>{t("tools.receita.for_who", {}, "Para quem?")}</Label>
              <Input value={para} onChange={(e) => setPara(e.target.value)} />
            </div>
            <div>
              <Label hint={t("tools.receita.exclusive_proof", {}, "prova exclusiva")}>{t("tools.receita.exclusive_input", {}, "Insumo que só você tem")}</Label>
              <Input value={insumo} onChange={(e) => setInsumo(e.target.value)} />
            </div>
            <p className="rounded-md border border-ink-800 bg-ink-950/50 p-3 text-[11.5px] leading-relaxed text-ink-400">
              {t("tools.receita.exclusive_expl", {}, "O insumo exclusivo é o que impede a cópia: dado, print, história ou acesso que nenhum outro criador do nicho tem.")}
            </p>
          </div>
        </Card>
      </div>

      <Card title={t("tools.receita.extracted_recipe", {}, "Receita extraída")} note={t("tools.receita.five_parts", {}, "5 partes")} accent="plum" className="mt-6">
        <div className="grid gap-px overflow-hidden rounded-md border border-ink-800 bg-ink-800 md:grid-cols-5">
          {parts.map((p, i) => (
            <div key={p.id} className="group relative bg-ink-950/70 p-4 transition-colors duration-300 hover:bg-ink-900">
              <div className="mb-2 font-mono text-[9.5px] tracking-[0.14em] text-plum-400 uppercase">
                {p.label}
              </div>
              <p className="mb-3 text-[11.5px] leading-snug text-ink-400">{p.role}</p>
              <div className="rounded border border-ink-800 bg-ink-900/70 p-2.5">
                <span className="font-display text-[13.5px] leading-snug font-semibold text-bone-100 transition-colors group-hover:text-signal-300">
                  {recipe[i]}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CopyButton text={recipe.join("\n\n")} />
          <CopyButton text={out} />
          <span className="ml-auto font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
            {t("tools.receita.target_footer", { tone: analysis.tone, burst: analysis.burst.toFixed(1) }, `tom alvo: ${analysis.tone} · burstiness alvo ${analysis.burst.toFixed(1)}`)}
          </span>
        </div>
      </Card>
    </ToolShell>
  );
}
