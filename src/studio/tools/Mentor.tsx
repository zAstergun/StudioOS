import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { FRAMEWORKS, type Framework } from "../data";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";

const GROUPS = ["Todos", "Criação", "Diagnóstico", "Posicionamento", "Estratégia"];

const MENTORS = [
  "MrBeast",
  "Naval Ravikant",
  "Rick Rubin",
  "Paddy Galloway",
  "Petros Koublis",
  "Alex Hormozi",
];

function parecer(fw: Framework, situation: string, niche: string) {
  const s = situation.trim();
  const low = s.toLowerCase();
  const signals = [
    { re: /(ctr|clique|thumb|capa|título|titulo)/, tag: "empacotamento", advice: `Antes de mudar o vídeo, mude a vitrine: 3 títulos novos e 2 thumbs para o mesmo tema. É o teste mais barato do framework ${fw.n}.` },
    { re: /(reten|assistem|abandon|segund)/, tag: "retenção", advice: "Corte os primeiros 20 segundos. Se o hook não entrega a tese, o resto não importa: retenção cai antes do conteúdo começar." },
    { re: /(view|views|visualiza|alcance|distribu)/, tag: "distribuição", advice: `Compare com o teto do tema, não com a sua média. Se o teto é baixo, o problema não é execução — é escolha de pauta.` },
    { re: /(inscrit|seguidor|audi|público|publico)/, tag: "audiência", advice: "Separe novos, casuais e recorrentes. Estratégia para recorrente é profundidade; para novo é clareza absoluta do tema." },
    { re: /(dinheiro|renda|venda|produto|cliente|membro)/, tag: "monetização", advice: "Monetização segue confiança, não views. Se a curva de confiança ainda é curta, venda algo barato e rápido de entregar." },
    { re: /(tempo|rotina|cansad|burnout|constância|constancia)/, tag: "sustentação", advice: "Reduza o escopo antes de reduzir a frequência. Um formato mais simples, feito toda semana, vence um épico feito uma vez por mês." },
    { re: /(ideia|criativ|bloque|pauta)/, tag: "ideação", advice: "Volte ao seu melhor vídeo e liste 5 filhas diretas dele. Ideia nova demais paga imposto de explicação." },
    { re: /(nicho|posicion|marca|autoridade)/, tag: "posicionamento", advice: "Escolha um sub-território onde você pode ser o número 1 em 90 dias e faça uma série de 5 vídeos sobre ele." },
  ];
  const matched = signals.filter((x) => x.re.test(low));
  const picked = matched.length ? matched.slice(0, 3) : signals.slice(0, 2);

  return `PARECER DO MENTOR · FRAMEWORK ${fw.n} — ${fw.title.toUpperCase()}

LENTE APLICADA
${fw.lens}

PERGUNTA-TRILHO
${fw.question}

CONTEXTO DO CANAL
${niche.trim() || "(nicho ainda não calibrado — o parecer sai genérico sem isso)"}

LEITURA DO SEU CASO
${s || "(descreva a situação para uma leitura específica)"}
Sinal dominante detectado: ${picked.map((p) => p.tag).join(" · ")}.

PLANO EM 3 PASSOS
${picked.map((p, i) => `${i + 1}. ${p.advice}`).join("\n")}

ENTREGÁVEIS DESTE FRAMEWORK
${fw.output.map((o, i) => `${i + 1}. ${o}`).join("\n")}

CRITÉRIO DE SAÍDA
Rode o teste por 14 dias ou 4 vídeos. Se a métrica não mover, a hipótese estava errada — não o esforço.`;
}

export function Mentor({ onBack, onGo, niche }: { onBack: () => void; onGo: (id: string) => void; niche: string }) {
  const examples = useExampleMode();
  const [group, setGroup] = useState("Todos");
  const [sel, setSel] = useState<Framework>(FRAMEWORKS[3]);
  const [situation, setSituation] = useState(examples ? "Meus vídeos têm CTR de 3% e retenção de 32%. O canal está travado em 8 mil inscritos." : "");
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      FRAMEWORKS.filter((f) => (group === "Todos" ? true : f.group === group)).filter((f) =>
        q.trim() ? (f.title + f.lens + f.group).toLowerCase().includes(q.toLowerCase()) : true
      ),
    [group, q]
  );

  const out = useMemo(() => parecer(sel, situation, niche), [sel, situation, niche]);

  useAutosave(
    () => ({
      tool: "mentor",
      toolName: "Mentor AI",
      title: situation.trim() ? `Parecer ${sel.n} — ${sel.title}` : "",
      summary: `framework ${sel.n} · ligado no caso: ${situation.slice(0, 90)}`,
      tag: sel.n,
      content: out,
    }),
    [out, sel],
    20
  );

  return (
    <ToolShell
      id="mentor"
      title="Mentor AI"
      accent="sky"
      lede="Não é um chat: é um consultório com 24 modelos mentais. Escolha o framework, descreva a situação e receba um parecer com lente, leitura do caso, plano em três passos e critério de saída."
      meta={[
        { k: "Frameworks", v: "24" },
        { k: "Grupos", v: "4" },
        { k: "Ativo", v: sel.n },
        { k: "Saída", v: "Parecer" },
      ]}
      onBack={onBack}
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title={`Framework ${sel.n}`} note={sel.group} accent="sky">
            <div className="mb-3 flex items-start gap-3">
              <span className="font-display text-[2.6rem] leading-none font-extrabold text-sky-400/80 tabular-nums">
                {sel.n}
              </span>
              <div>
                <h3 className="font-display text-[17px] leading-tight font-extrabold text-bone-50">
                  {sel.title}
                </h3>
                <p className="mt-1 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                  {sel.group}
                </p>
              </div>
            </div>
            <p className="rounded-md border border-sky-400/25 bg-sky-400/[0.06] p-3 text-[12.5px] leading-relaxed text-bone-200">
              {sel.lens}
            </p>
            <div className="mt-3">
              <div className="mb-1.5 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                Pergunta-trilho
              </div>
              <p className="text-[13px] leading-snug text-bone-300">{sel.question}</p>
            </div>
            <div className="mt-4 border-t border-ink-800 pt-3">
              <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                Entregáveis
              </div>
              <ul className="space-y-1.5">
                {sel.output.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-[12px] leading-snug text-bone-300">
                    <Icon name="arrow" className="mt-0.5 h-3 w-3 shrink-0 text-sky-400" strokeWidth={2.4} />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card title="Escola de pensamento" accent="bone">
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
              Os 24 frameworks sintetizam padrões públicos desses criadores e estrategistas,
              reescritos como perguntas aplicáveis ao seu canal.
            </p>
          </Card>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                "rounded border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-all duration-200",
                group === g
                  ? "border-sky-400/60 bg-sky-400/15 text-sky-400"
                  : "border-ink-700 bg-ink-900/60 text-bone-400 hover:border-ink-500 hover:text-bone-100"
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <Icon name="eye" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar framework…" className="py-2 pl-8 text-[12.5px]" />
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
                  {f.group}
                </span>
              </div>
              <div
                className={cn(
                  "font-display text-[14.5px] leading-tight font-bold transition-colors",
                  active ? "text-bone-50" : "text-bone-200 group-hover:text-sky-400"
                )}
              >
                {f.title}
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
            nenhum framework encontrado
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card title="Seu caso" note="entrada do parecer" accent="signal">
          <Label hint="seja específico">Situação atual</Label>
          <Textarea rows={7} value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="Ex.: CTR 3%, retenção 32%, canal travado em 8 mil inscritos, 2 vídeos por semana." />
          <div className="mt-3">
            <Label>Nicho calibrado</Label>
            <div className="rounded-md border border-ink-700 bg-ink-950/60 px-3 py-2.5 text-[13px] text-bone-300">
              {niche.trim() || <span className="text-ink-400">não calibrado — </span>}
              {!niche.trim() && (
                <button onClick={() => onGo("calibracao")} className="font-mono text-[11px] text-signal-400 underline underline-offset-2 hover:text-signal-300">
                  calibrar agora
                </button>
              )}
            </div>
          </div>
          <Button className="mt-4 w-full" icon="brain" onClick={() => setSel(FRAMEWORKS.find((f) => f.n === sel.n) ?? sel)}>
            Gerar parecer
          </Button>
        </Card>

        <Card title="Parecer do mentor" note={`framework ${sel.n}`} accent="sky">
          <pre className="max-h-[30rem] overflow-auto whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/70 p-4 font-mono text-[12px] leading-[1.75] text-bone-200">
            {out}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={out} />
            <Button size="sm" variant="outline" icon="gauge" onClick={() => onGo("rank")}>
              Testar a ideia sugerida
            </Button>
            <span className="ml-auto font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
              {out.split(/\s+/).length} palavras de parecer
            </span>
          </div>
        </Card>
      </div>
    </ToolShell>
  );
}
