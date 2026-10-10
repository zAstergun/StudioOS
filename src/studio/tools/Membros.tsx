import { useMemo, useState, useEffect } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Meter, Select, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { MEMBERSHIP_SECTIONS } from "../data";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";

const num = (s?: string) => parseFloat((s || "").replace(/\./g, "").replace(",", ".")) || 0;
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

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
  const examples = useExampleMode();
  const [answers, setAnswers] = useState<Record<string, string>>(examples ? {
    "Quanto quer ganhar/mês com membros?": "12000",
    "Membros atuais e renda?": "34 membros · R$3.400",
    "Já teve área antes?": "Sim, uma comunidade no Discord por 6 meses",
    "Quantos inscritos?": "48000",
    "Views por mês (total)?": "620000",
    "Espectadores únicos/mês?": "210000",
    "% novos / casuais / recorrentes?": "42 / 38 / 20",
    "% views de Shorts?": "35",
    "Nicho (1 frase)": "Finanças para quem começa com pouco",
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
  const [promessa, setPromessa] = useState(examples ?
    "Toda semana uma decisão financeira real, com número na tela, para quem aporta pouco."
    : "");
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
  const total = MEMBERSHIP_SECTIONS.reduce((s, x) => s + x.questions.length, 0);

  const friendlySummary = `Projeção de ${calc.possiveis} membros (${brl(calc.receita)}/mês) · Modelo avaliado como ${calc.viavel ? "viável para o canal" : "meta alta para o tamanho da base atual"}`;

  useAutosave(
    () => ({
      tool: "membros",
      toolName: "Área de Membros",
      title: filled || promessa.trim() ? `Membros — meta ${brl(calc.meta)}/mês` : "",
      summary: friendlySummary,
      tag: calc.viavel ? "viável" : "ajustar",
      content: `ÁREA DE MEMBROS\n\nPromessa: ${promessa}\nPreço: ${brl(calc.p)}/mês · conversão ${conversao}%\nBase real: ${calc.base.toLocaleString("pt-BR")} · membros possíveis: ${calc.possiveis}\nReceita projetada: ${brl(calc.receita)} ↗ meta precisa de ${calc.necessarios}\n\nMÓDULOS\n${mods.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\nQUESTIONÁRIO (${filled}/${total})\n${Object.entries(answers).filter(([, v]) => v.trim()).map(([k, v]) => `${k} → ${v}`).join("\n")}`,
    }),
    [calc, mods, promessa, filled, friendlySummary],
    20,
    4500
  );

  return (
    <ToolShell
      id="membros"
      title="Área de Membros"
      accent="plum"
      lede="Arquitetura de ensino e matemática de assinatura. Responda o questionário e o painel calcula quantos membros a sua audiência real sustenta — antes de você prometer algo que não entrega."
      meta={[
        { k: "Perguntas", v: `${filled}/${total}` },
        { k: "Base real", v: calc.base.toLocaleString("pt-BR") },
        { k: "Receita est.", v: brl(calc.receita) },
        { k: "Viável", v: calc.viavel ? "Sim" : "Não" },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        filled > 0 || promessa.trim()
          ? {
              type: "membros",
              group: "Estratégia",
              toolName: "Área de Membros",
              title: promessa.trim() ? `Membros — ${promessa.slice(0, 50)}` : "Área de Membros & Assinatura",
              summary: friendlySummary,
              tag: calc.viavel ? "viável" : "ajustar",
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
          <Card title="Matemática da meta" note="ao vivo" accent="plum">
            <div className="space-y-4">
              <div>
                <Label hint="R$/mês">Preço da assinatura</Label>
                <Input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="numeric" className="font-mono tabular-nums" />
              </div>
              <div>
                <Label hint="% da base">Conversão esperada</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0.2} max={4} step={0.1}
                    value={parseFloat(conversao.replace(",", ".")) || 1.2}
                    onChange={(e) => setConversao(e.target.value)}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-ink-700 accent-plum-400"
                    aria-label="Conversão esperada"
                  />
                  <span className="w-12 text-right font-mono text-[12px] text-bone-100 tabular-nums">
                    {(parseFloat(conversao.replace(",", ".")) || 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-ink-800 bg-ink-800">
                {[
                  { k: "Base real", v: calc.base.toLocaleString("pt-BR"), c: "text-bone-50" },
                  { k: "Membros possíveis", v: calc.possiveis.toLocaleString("pt-BR"), c: "text-plum-400" },
                  { k: "Receita projetada", v: brl(calc.receita), c: "text-mint-300" },
                  { k: "Necessários p/ meta", v: calc.necessarios.toLocaleString("pt-BR"), c: "text-signal-300" },
                ].map((m) => (
                  <div key={m.k} className="bg-ink-950/70 px-3 py-2.5">
                    <div className="font-mono text-[9px] tracking-[0.14em] text-ink-400 uppercase">{m.k}</div>
                    <div className={cn("font-display text-[17px] font-extrabold tabular-nums", m.c)}>{m.v}</div>
                  </div>
                ))}
              </div>

              <div>
                <Meter value={Math.min(100, calc.pctBase)} max={100} accent={calc.viavel ? "mint" : "oxide"} label={`Meta exige ${calc.pctBase.toFixed(1)}% da base`} />
                <p className={cn("mt-2 text-[12px] leading-relaxed", calc.viavel ? "text-mint-300" : "text-oxide-400")}>
                  {calc.viavel
                    ? "Dentro do realista: abaixo de 6% da base recorrente."
                    : "Meta acima do que a audiência atual sustenta. Suba o preço, corte a meta ou cresça a base primeiro."}
                </p>
              </div>

              <Button size="sm" variant="outline" className="w-full" icon="brain" onClick={() => onGo("mentor")}>
                Discutir com o Mentor AI
              </Button>
            </div>
          </Card>

          <Card title="Promessa da área" accent="mint">
            <Textarea rows={4} value={promessa} onChange={(e) => setPromessa(e.target.value)} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              Uma frase, uma transformação, um ritmo. Se precisar de duas frases, a promessa ainda
              não está clara.
            </p>
          </Card>
        </div>
      }
    >
      <CalibrationNotice
        calib={calib}
        profileName={profileName}
        profileColor={profileColor}
        toolName="Área de Membros"
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {MEMBERSHIP_SECTIONS.map((sec, si) => (
          <Card
            key={sec.title}
            title={sec.title}
            note={`${sec.questions.length} perguntas`}
            accent={(["plum", "sky", "signal"] as const)[si % 3]}
            className={si === 2 ? "lg:col-span-2" : ""}
          >
            <div className={cn("grid gap-4", si === 2 && "md:grid-cols-2")}>
              {sec.questions.map((q, i) => (
                <div key={q}>
                  <Label n={i + 1 + (si === 1 ? 3 : si === 2 ? 7 : 0)}>{q}</Label>
                  {q.length > 60 ? (
                    <Textarea rows={2} value={answers[q] ?? ""} onChange={(e) => set(q, e.target.value)} placeholder="Responda…" />
                  ) : (
                    <Input value={answers[q] ?? ""} onChange={(e) => set(q, e.target.value)} placeholder="Responda…" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card title="Arquitetura de entrega" note="módulos" accent="sky" className="mt-6">
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
                    semana {i + 1}
                  </span>
                  <button
                    onClick={() => setMods((p) => p.filter((x) => x !== m))}
                    className="rounded p-1 text-ink-500 transition-colors hover:bg-oxide-400/15 hover:text-oxide-400"
                    aria-label={`Remover ${m}`}
                  >
                    <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                </li>
              ))}
              {!mods.length && (
                <li className="rounded-md border border-dashed border-ink-700 p-6 text-center font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase">
                  nenhum módulo planejado
                </li>
              )}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input
                value={novoMod}
                onChange={(e) => setNovoMod(e.target.value)}
                placeholder="Novo módulo ou entregável…"
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
                Adicionar
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Formato principal</Label>
              <Select defaultValue="aula">
                <option value="aula">Aulas gravadas + encontros</option>
                <option value="comunidade">Comunidade com curadoria</option>
                <option value="mentor">Mentoria em grupo pequeno</option>
                <option value="ferramenta">Ferramenta / planilha viva</option>
              </Select>
            </div>
            <div className="rounded-md border border-ink-800 bg-ink-950/50 p-3">
              <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                Regra de churn
              </div>
              <p className="text-[12px] leading-relaxed text-bone-400">
                Membro cancela quando não consegue nomear o que recebeu no mês. Todo módulo precisa
                de um entregável com nome e data.
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
