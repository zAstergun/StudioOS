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

const PARTS = [
  { id: "hook", label: "1. Hook de ruptura", role: "Primeira linha: afirmação que quebra o esperado, sem aquecimento." },
  { id: "contexto", label: "2. Contexto mínimo", role: "Duas linhas de cenário. Só o necessário para o número fazer sentido." },
  { id: "virada", label: "3. Virada pessoal", role: "O erro ou a descoberta em 1ª pessoa. Aqui mora a afinidade." },
  { id: "prova", label: "4. Prova concreta", role: "Dado, print, lista ou exemplo que pode ser verificado." },
  { id: "cta", label: "5. Saída acionável", role: "Uma ação pequena e imediata + convite de comentário." },
];

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
  const examples = useExampleMode();
  const [original, setOriginal] = useState(
    examples ? "Vendi meu carro e não me arrependi.\n\nFoi em 2022, quando o seguro subiu 40% e eu usava o carro três vezes por semana.\n\nEu achava que carro era liberdade. Era custo fixo disfarçado de conquista.\n\nSomei tudo: R$2.100 por mês entre parcela, seguro, combustível e estacionamento. Em um ano, R$25.200.\n\nComprei bicicleta elétrica e passei a usar aplicativo. Gasto atual: R$430 por mês.\n\nSe você faz as contas do seu carro uma vez por ano, faz agora. Comenta o valor que eu te ajudo a interpretar." : ""
  );
  const [format, setFormat] = useState("texto");
  const [tema, setTema] = useState(examples ? "trocar o plano de internet caro por um combo mais barato" : calib?.niche ? calib.niche.slice(0, 50) : "");
  const [para, setPara] = useState(examples ? "quem trabalha de casa e paga boleto sem olhar" : calib?.niche || "");
  const [insumo, setInsumo] = useState(examples ? "minha fatura real dos últimos 12 meses" : calib?.prova || "");

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
      hasCta: /(comenta|comente|salva|salve|compartilha|segue|me chama|responde)/i.test(original),
      hasProof: /(r\$|\d)/.test(original),
    };
  }, [original]);

  const recipe = useMemo(() => {
    const t = cap(tema.trim() || "seu tema");
    const low = t.toLowerCase();
    return [
      `Cortei ${low} e não me arrependi.`,
      `Foi quando ${para.trim() || "eu"} percebeu que o custo era fixo e invisível.`,
      `Eu achava que ${low.split(" ").slice(0, 4).join(" ")} era necessidade. Era hábito.`,
      `${insumo.trim() ? cap(insumo.trim()) : "A fatura"} mostra o número: some tudo por 12 meses antes de decidir.`,
      `Faz essa conta hoje. Comenta o valor que eu ajudo a interpretar.`,
    ];
  }, [tema, para, insumo]);

  const out = `RECEITA EXTRAÍDA
Formato original: ${analysis.paragraphs} blocos · ${analysis.sentences} frases · ${analysis.words} palavras
Tom: ${analysis.tone} · burstiness ${analysis.burst.toFixed(1)} · ${analysis.nums} número(s)
Hook: ${analysis.firstWords} palavras, sem aquecimento
Prova concreta: ${analysis.hasProof ? "sim" : "não"} · CTA de comentário: ${analysis.hasCta ? "sim" : "não"}

APLICAÇÃO — ${cap(tema.trim() || "seu tema")} (tema novo)
Para quem: ${para}
Insumo que só você tem: ${insumo}

${recipe.map((r, i) => `${PARTS[i].label}\n${r}`).join("\n\n")}

GUARDRAIL
Espelhe a estrutura, não o conteúdo. A receita funcionou porque um dia pareceu fresca.`;

  const RECIPE_MIN = 12;

  const friendlySummary = `Estrutura viral desconstruída em 5 etapas · Tom ${analysis.tone} adaptado ao novo tema`;

  useAutosave(
    () => ({
      tool: "receita",
      toolName: "Receita Viral",
      title: original.trim() || tema.trim() ? `Receita — ${cap(tema.trim() || "seu tema")}` : "",
      summary: friendlySummary,
      tag: analysis.tone,
      content: out,
    }),
    [out, tema, friendlySummary],
    RECIPE_MIN
  );

  return (
    <ToolShell
      id="receita"
      title="Receita Viral"
      accent="signal"
      lede="Engenharia reversa: cole um post que performou, o painel extrai estrutura, tom e ritmo — e devolve a mesma receita aplicada ao seu tema, com o insumo que só você tem."
      meta={[
        { k: "Partes", v: "5" },
        { k: "Tom", v: cap(analysis.tone) },
        { k: "Blocos", v: String(analysis.paragraphs) },
        { k: "Burstiness", v: analysis.burst.toFixed(1) },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        original.trim() || tema.trim()
          ? {
              type: "receita",
              group: "Criação",
              toolName: "Receita Viral",
              title: tema.trim() ? `Receita — ${cap(tema.trim())}` : "Receita Viral",
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
          <Card title="Raio-X do original" accent="sky">
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "Palavras", v: analysis.words },
                { k: "Frases", v: analysis.sentences },
                { k: "Média/frase", v: analysis.avg },
                { k: "Números", v: analysis.nums },
              ].map((m) => (
                <div key={m.k} className="rounded border border-ink-800 bg-ink-950/50 px-3 py-2">
                  <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">{m.k}</div>
                  <div className="font-display text-lg font-bold text-bone-100 tabular-nums">{m.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                { k: "Hook sem aquecimento", ok: analysis.firstWords > 0 && analysis.firstWords <= 12 },
                { k: "Prova numérica", ok: analysis.hasProof },
                { k: "CTA de comentário", ok: analysis.hasCta },
                { k: "Ritmo variado", ok: analysis.burst >= 4 },
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
                Guardrail honesto
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-bone-200">
              Receita viral funciona porque um dia pareceu fresca. Não rode a mesma sem parar.
              <strong className="text-bone-50"> Espelhe, não copie.</strong>
            </p>
          </div>

          <Card title="Depois de aplicar" accent="mint">
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start" icon="check" onClick={() => onGo("score")}>
                Dar nota no Score de Post
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" icon="wave" onClick={() => onGo("humanizador")}>
                Tirar cheiro de IA
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
        toolName="Receita Viral"
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Post original" note="cole inteiro" accent="signal">
          <Textarea rows={12} value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="Cole o post que performou, inteiro, com as quebras de linha" />
          <div className="mt-3">
            <Label>Formato do post</Label>
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="texto">Texto longo (LinkedIn / Facebook)</option>
              <option value="carrossel">Carrossel</option>
              <option value="thread">Thread (X)</option>
              <option value="legenda">Legenda de Reels / Shorts</option>
            </Select>
          </div>
        </Card>

        <Card title="Aplicar no seu contexto" note="novo tema" accent="mint">
          <div className="space-y-4">
            <div>
              <Label hint="o que você vai contar">Tema novo</Label>
              <Input value={tema} onChange={(e) => setTema(e.target.value)} />
            </div>
            <div>
              <Label hint="audiência">Para quem?</Label>
              <Input value={para} onChange={(e) => setPara(e.target.value)} />
            </div>
            <div>
              <Label hint="prova exclusiva">Insumo que só você tem</Label>
              <Input value={insumo} onChange={(e) => setInsumo(e.target.value)} />
            </div>
            <p className="rounded-md border border-ink-800 bg-ink-950/50 p-3 text-[11.5px] leading-relaxed text-ink-400">
              O insumo exclusivo é o que impede a cópia: dado, print, história ou acesso que
              nenhum outro criador do nicho tem.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Receita extraída" note="5 partes" accent="plum" className="mt-6">
        <div className="grid gap-px overflow-hidden rounded-md border border-ink-800 bg-ink-800 md:grid-cols-5">
          {PARTS.map((p, i) => (
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
            tom alvo: {analysis.tone} · burstiness alvo {analysis.burst.toFixed(1)}
          </span>
        </div>
      </Card>
    </ToolShell>
  );
}
