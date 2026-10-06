import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Meter, Select, Textarea } from "../components/ui";
import { Card, ToolShell } from "../components/ToolShell";
import { CALIBRATION_QUESTIONS, WIKI, accentSoft } from "../data";
import { AI_PROVIDERS, AIModelUnavailableError, listAvailableModels, requestAI, type AISettings } from "../ai";
import type { StudioConfig } from "../history";

/* ----------------------------------------------------------------- WIKI */

export function Wiki({ onBack, onGo }: { onBack: () => void; onGo: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const [open, setOpen] = useState<string | null>("rank");

  const cats = ["Todos", ...Array.from(new Set(WIKI.map((w) => w.cat)))];
  const list = useMemo(
    () =>
      WIKI.filter((w) => (cat === "Todos" ? true : w.cat === cat)).filter((w) =>
        q.trim()
          ? (w.title + w.lede + w.how + w.bullets.join(" ")).toLowerCase().includes(q.toLowerCase())
          : true
      ),
    [q, cat]
  );

  return (
    <ToolShell
      id="wiki"
      title="Wiki do Painel"
      accent="bone"
      lede="Cada ferramenta explicada como ela funciona por dentro: o que entra, o que o painel calcula e o que sai. Leia antes de reclamar do resultado."
      meta={[
        { k: "Verbete", v: String(WIKI.length) },
        { k: "Categorias", v: String(cats.length - 1) },
        { k: "Aberto", v: open ? "1" : "0" },
        { k: "Busca", v: q ? "on" : "off" },
      ]}
      onBack={onBack}
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title="Como usar o painel" accent="signal">
            <ol className="space-y-3">
              {[
                ["Calibre primeiro", "Sem nicho, tops e flops, toda ferramenta devolve texto genérico."],
                ["Rankeie antes de gravar", "Ideia abaixo de 6 não merece um dia de produção."],
                ["Empacote antes de roteirizar", "Título e thumb definem o roteiro, não o contrário."],
                ["Dê nota antes de publicar", "Abaixo de 40, o post volta para a bancada."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-signal-400/40 bg-signal-400/10 font-mono text-[10px] text-signal-400 tabular-nums">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-bone-100">{t}</span>
                    <span className="block text-[11.5px] leading-snug text-ink-400">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Atalhos" accent="mint">
            <div className="space-y-1.5">
              {[
                ["calibracao", "Calibrar canal"],
                ["rank", "Ranquear ideia"],
                ["score", "Dar nota num post"],
                ["historico", "Histórico & lixeira"],
                ["config", "Trocar provedor de IA"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => onGo(id)}
                  className="group flex w-full items-center gap-2 rounded border border-ink-800 bg-ink-950/50 px-2.5 py-2 text-left text-[12px] text-bone-300 transition-all hover:border-mint-400/40 hover:text-bone-50"
                >
                  <span className="font-mono text-[10px] text-ink-500">/{id}</span>
                  {label}
                  <Icon name="arrow" className="ml-auto h-3 w-3 text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:text-mint-400" strokeWidth={2.2} />
                </button>
              ))}
            </div>
          </Card>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-all duration-200",
                cat === c
                  ? "border-bone-200/50 bg-bone-100/10 text-bone-50"
                  : "border-ink-700 bg-ink-900/60 text-bone-400 hover:border-ink-500 hover:text-bone-100"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Icon name="eye" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar na wiki…" className="py-2 pl-8 text-[12.5px]" />
        </div>
      </div>

      <div className="space-y-2">
        {list.map((w) => {
          const isOpen = open === w.id;
          const accent = (w.cat === "Criação" ? "signal" : w.cat === "Publicação" ? "mint" : "sky") as "signal" | "mint" | "sky";
          return (
            <div
              key={w.id}
              className={cn(
                "overflow-hidden rounded-lg border transition-all duration-300",
                isOpen ? "border-ink-600 bg-ink-850" : "border-ink-800 bg-ink-900/60 hover:border-ink-700"
              )}
            >
              <button
                onClick={() => setOpen(isOpen ? null : w.id)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left"
              >
                <span className={cn("rounded border px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase", accentSoft[accent])}>
                  {w.cat}
                </span>
                <span className={cn("font-display text-[15.5px] font-bold tracking-tight transition-colors", isOpen ? "text-bone-50" : "text-bone-200")}>
                  {w.title}
                </span>
                <span className="ml-auto hidden flex-1 truncate pl-4 text-[12px] text-ink-400 sm:block">
                  {w.lede}
                </span>
                <Icon
                  name="chevron"
                  className={cn("h-4 w-4 shrink-0 text-ink-400 transition-transform duration-300", isOpen && "rotate-180 text-signal-400")}
                  strokeWidth={2}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-400 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-ink-800 px-4 py-4">
                    <p className="max-w-3xl text-[13.5px] leading-relaxed text-bone-300">{w.lede}</p>
                    <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
                      <div>
                        <div className="mb-1.5 font-mono text-[9.5px] tracking-[0.16em] text-signal-400 uppercase">
                          Como funciona
                        </div>
                        <p className="text-[13px] leading-relaxed text-bone-200">{w.how}</p>
                      </div>
                      <div>
                        <div className="mb-1.5 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                          O que entra / sai
                        </div>
                        <ul className="space-y-1.5">
                          {w.bullets.map((b) => (
                            <li key={b} className="flex items-start gap-2 text-[12px] leading-snug text-bone-300">
                              <Icon name="check" className="mt-0.5 h-3 w-3 shrink-0 text-mint-400" strokeWidth={2.6} />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-4" icon="arrow" onClick={() => onGo(w.id)}>
                      Abrir ferramenta
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!list.length && (
          <div className="rounded-lg border border-dashed border-ink-700 p-10 text-center font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase">
            nada encontrado para “{q}”
          </div>
        )}
      </div>
    </ToolShell>
  );
}

/* ---------------------------------------------------------- CALIBRAÇÃO */

export type Calib = {
  niche: string;
  answers: string[];
  tops: string;
  flops: string;
  ctr: string;
  prova: string;
  historias: string;
};

export const emptyCalib: Calib = {
  niche: "",
  answers: ["", "", "", ""],
  tops: "",
  flops: "",
  ctr: "",
  prova: "",
  historias: "",
};

export function calibProgress(c: Calib) {
  const fields = [c.niche, ...c.answers, c.tops, c.flops, c.ctr];
  const done = fields.filter((f) => f.trim().length > 1).length;
  return (done / fields.length) * 100;
}

export function Calibracao({
  onBack,
  calib,
  setCalib,
}: {
  onBack: () => void;
  calib: Calib;
  setCalib: (c: Calib) => void;
}) {
  const [tab, setTab] = useState<"avaliador" | "dados">("avaliador");
  const pct = calibProgress(calib);
  const setAnswer = (i: number, v: string) => {
    const answers = [...calib.answers];
    answers[i] = v;
    setCalib({ ...calib, answers });
  };

  const allTops = calib.tops.split("\n").filter((t) => t.trim());
  const allFlops = calib.flops.split("\n").filter((t) => t.trim());

  return (
    <ToolShell
      id="calibracao"
      title="Calibração do Canal"
      accent="bone"
      lede="Nenhuma ferramenta aqui funciona no escuro. O painel precisa do seu nicho, dos seus outliers e dos seus flops para trocar régua genérica por régua sua."
      meta={[
        { k: "Progresso", v: `${Math.round(pct)}%` },
        { k: "Perguntas", v: "4" },
        { k: "Tops", v: String(allTops.length) },
        { k: "Flops", v: String(allFlops.length) },
      ]}
      onBack={onBack}
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title="Status da calibração" note={`${Math.round(pct)}%`} accent="signal">
            <Meter value={pct} max={100} accent={pct >= 100 ? "mint" : "signal"} showValue={false} />
            <ul className="mt-4 space-y-2">
              {[
                { k: "Nicho em 1 frase", ok: calib.niche.trim().length > 3 },
                { k: "4 perguntas do avaliador", ok: calib.answers.every((a) => a.trim().length > 3) },
                { k: "5 títulos top", ok: allTops.length >= 5 },
                { k: "5 títulos flop", ok: allFlops.length >= 5 },
                { k: "CTR médio", ok: calib.ctr.trim().length > 0 },
              ].map((r) => (
                <li key={r.k} className="flex items-center gap-2 text-[12.5px]">
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                      r.ok ? "border-mint-400/60 bg-mint-400/20 text-mint-300" : "border-ink-600 text-ink-500"
                    )}
                  >
                    <Icon name={r.ok ? "check" : "close"} className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  <span className={r.ok ? "text-bone-200" : "text-ink-400"}>{r.k}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-ink-800 pt-3 text-[11.5px] leading-relaxed text-ink-400">
              Os dados ficam só neste navegador. Nada sobe para servidor nenhum.
            </p>
          </Card>

          <Card title="Vocabulário extraído" accent="mint">
            <div className="flex flex-wrap gap-1.5">
              {Array.from(
                new Set(
                  (calib.niche + " " + calib.tops)
                    .toLowerCase()
                    .replace(/[^a-z0-9áàâãéêíóôõúüç\s]/gi, " ")
                    .split(/\s+/)
                    .filter((w) => w.length > 3)
                )
              )
                .slice(0, 16)
                .map((w) => (
                  <span key={w} className="rounded border border-ink-700 bg-ink-950/60 px-2 py-1 font-mono text-[10px] text-bone-300">
                    {w}
                  </span>
                ))}
              {!(calib.niche + calib.tops).trim() && (
                <span className="font-mono text-[10.5px] text-ink-400">preencha nicho e tops</span>
              )}
            </div>
          </Card>
        </div>
      }
    >
      <div className="mb-5 inline-flex gap-1 rounded-md border border-ink-700 bg-ink-950/60 p-1">
        {([
          ["avaliador", "Avaliador"],
          ["dados", "Dados do canal"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded px-3.5 py-1.5 font-mono text-[11px] tracking-[0.1em] uppercase transition-all duration-200",
              tab === id ? "bg-signal-400 text-ink-950" : "text-bone-400 hover:bg-ink-800 hover:text-bone-100"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "avaliador" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Nicho do canal" note="base de tudo" accent="signal" className="lg:col-span-2">
            <Textarea
              rows={3}
              value={calib.niche}
              onChange={(e) => setCalib({ ...calib, niche: e.target.value })}
              placeholder="Ex.: finanças pessoais para quem começa com pouco dinheiro e não quer jargão de banco"
            />
          </Card>
          {CALIBRATION_QUESTIONS.map((q, i) => (
            <Card key={q} title={q} note={`pergunta ${i + 1}`} accent={(["sky", "mint", "plum", "oxide"] as const)[i]}>
              <Textarea rows={5} value={calib.answers[i]} onChange={(e) => setAnswer(i, e.target.value)} placeholder="Responda com exemplos reais…" />
              <div className="mt-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
                <span className={cn("h-1.5 w-1.5 rounded-full", calib.answers[i].trim().length > 3 ? "bg-mint-400" : "bg-ink-600")} />
                {calib.answers[i].trim().length > 3 ? "respondida" : "pendente"}
                <span className="ml-auto tabular-nums">{calib.answers[i].trim().split(/\s+/).filter(Boolean).length} palavras</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="5 títulos que mais performaram" note="outliers" accent="mint">
            <Textarea rows={7} value={calib.tops} onChange={(e) => setCalib({ ...calib, tops: e.target.value })} placeholder={"Um por linha\nEx.: Como saí de R$0 para R$10 mil em 2 anos"} />
            <div className="mt-2 font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
              {allTops.length}/5 preenchidos
            </div>
          </Card>
          <Card title="5 que flopparam" note="anti-padrão" accent="oxide">
            <Textarea rows={7} value={calib.flops} onChange={(e) => setCalib({ ...calib, flops: e.target.value })} placeholder="Um por linha" />
            <div className="mt-2 font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
              {allFlops.length}/5 preenchidos
            </div>
          </Card>
          <Card title="CTR médio do canal" accent="signal">
            <div className="flex items-center gap-3">
              <Input value={calib.ctr} onChange={(e) => setCalib({ ...calib, ctr: e.target.value })} inputMode="decimal" placeholder="4.8" className="w-28 font-mono tabular-nums" />
              <span className="font-mono text-[12px] text-ink-400">%</span>
              <div className="flex-1">
                <Meter value={parseFloat(calib.ctr.replace(",", ".")) || 0} max={12} accent="mint" showValue={false} />
                <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-500">
                  <span>0</span><span>4–7 bom</span><span>12</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
              O CTR médio vira a linha de base do Gerador de Títulos: as projeções são calculadas
              como múltiplo desse número.
            </p>
          </Card>
          <Card title="Prova e repertório" accent="sky">
            <Label>Vídeos com prova visível na tela</Label>
            <Textarea rows={3} value={calib.prova} onChange={(e) => setCalib({ ...calib, prova: e.target.value })} placeholder="Ex.: extrato, planilha, gráfico, teste ao vivo" />
            <div className="mt-3">
              <Label>Histórias próprias ou livros que costuma contar</Label>
              <Textarea rows={3} value={calib.historias} onChange={(e) => setCalib({ ...calib, historias: e.target.value })} placeholder="Ex.: Psicologia Financeira, minha época de estagiário…" />
            </div>
          </Card>
        </div>
      )}
    </ToolShell>
  );
}

/* -------------------------------------------------------------- CONFIG */

function ModelCombobox({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const input = containerRef.current?.querySelector("input");
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const desiredHeight = Math.min(220, options.length * 36 + 38);
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpensUp(spaceBelow < desiredHeight && rect.top > spaceBelow);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  const choose = (model: string) => {
    onChange(model);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Input
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="studioos-model-options"
        aria-activedescendant={activeIndex >= 0 ? `studioos-model-option-${activeIndex}` : undefined}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && options.length) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => (index + 1) % options.length);
          } else if (event.key === "ArrowUp" && options.length) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
          } else if (event.key === "Enter" && open && activeIndex >= 0) {
            event.preventDefault();
            choose(options[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        placeholder={placeholder}
        className="font-mono text-[12.5px]"
      />

      {open && (
        <div
          id="studioos-model-options"
          role="listbox"
          className={cn(
            "absolute inset-x-0 z-40 overflow-hidden rounded-md border border-ink-600 bg-ink-900 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.95)]",
            opensUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          {options.length ? (
            <>
              <div className="border-b border-ink-700 px-3 py-2 font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">
                Modelos sugeridos · {options.length}
              </div>
              <div className="max-h-52 overflow-y-auto p-1">
                {options.map((option, index) => (
                  <button
                    id={`studioos-model-option-${index}`}
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={option === value}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-3 py-2 text-left font-mono text-[12px] transition-colors",
                      activeIndex === index || option === value
                        ? "bg-ink-700 text-signal-300"
                        : "text-bone-200 hover:bg-ink-800"
                    )}
                  >
                    <span>{option}</span>
                    {option === value && <span className="text-[9px] uppercase tracking-wider">selecionado</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="px-3 py-2.5 text-[11px] text-ink-400">Digite o ID do modelo do seu provedor.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function Config({
  onBack,
  initialConfig,
  onKeyChange,
  onSettingsChange,
  onGo,
}: {
  onBack: () => void;
  initialConfig: StudioConfig;
  onKeyChange: (k: string) => void;
  onSettingsChange: (settings: Partial<AISettings>) => void;
  onGo?: (id: string) => void;
}) {
  const [apiKey, setApiKey] = useState(initialConfig.apiKey);
  const [provider, setProvider] = useState(initialConfig.provider);
  const [model, setModel] = useState(() => {
    const oldGoogleDefaults = ["", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-flash-latest"];
    return initialConfig.provider === "google" && oldGoogleDefaults.includes(initialConfig.model)
      ? "gemini-3.1-flash-lite"
      : initialConfig.model;
  });
  const [baseUrl, setBaseUrl] = useState(initialConfig.baseUrl);
  const [temp, setTemp] = useState(initialConfig.temperature);
  const setKey = (k: string) => {
    setApiKey(k);
    onKeyChange(k);
  };
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testError, setTestError] = useState("");
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [keyModels, setKeyModels] = useState<string[]>([]);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [modelListMessage, setModelListMessage] = useState("");

  useEffect(() => {
    const oldGoogleDefaults = ["", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-flash-latest"];
    if (initialConfig.provider === "google" && oldGoogleDefaults.includes(initialConfig.model)) {
      onSettingsChange({ model: "gemini-3.1-flash-lite" });
    }
  }, [initialConfig.model, initialConfig.provider, onSettingsChange]);

  const masked = apiKey ? `${apiKey.slice(0, 5)}${"•".repeat(Math.max(0, apiKey.length - 9))}${apiKey.slice(-4)}` : "";
  const current = AI_PROVIDERS.find((p) => p.id === provider) ?? AI_PROVIDERS[0];
  const modelOptions = [...new Set([...current.models, ...keyModels])];

  const refreshModels = async () => {
    if (!apiKey.trim()) {
      setModelListMessage("Informe a chave para consultar os modelos disponíveis.");
      return;
    }
    setRefreshingModels(true);
    setModelListMessage("");
    try {
      const models = await listAvailableModels({ provider, model, apiKey, baseUrl, temperature: temp });
      setKeyModels(models);
      setModelListMessage(models.length
        ? `${models.length} modelos encontrados para esta chave.`
        : "Não foi possível obter modelos para esta chave. Confira a chave ou tente novamente.");
    } catch {
      setModelListMessage("Não foi possível consultar o provedor. Confira a chave e tente novamente.");
    } finally {
      setRefreshingModels(false);
    }
  };

  const test = async () => {
    if (!apiKey.trim() && provider !== "custom") {
      setStatus("fail");
      setTestError("Informe a chave de API antes de testar.");
      return;
    }
    setStatus("testing");
    setTestError("");
    setModelSuggestions([]);
    try {
      await requestAI(
        { provider, model, apiKey, baseUrl, temperature: temp },
        "Responda somente com a palavra OK.",
        "Teste de conexão."
      );
      setStatus("ok");
    } catch (error) {
      setStatus("fail");
      if (error instanceof AIModelUnavailableError) {
        setTestError(`O modelo "${model}" não está disponível para esta chave.`);
        setModelSuggestions(error.availableModels);
        setKeyModels(error.availableModels);
      } else {
        setTestError(error instanceof Error ? error.message : "Não foi possível conectar ao provedor.");
        setModelSuggestions([]);
      }
    }
  };

  return (
    <ToolShell
      id="config"
      title="Provedor de IA"
      accent="mint"
      lede="O painel é seu: você traz a chave e ela nunca sai do seu navegador. Escolha o provedor, o modelo e o nível de temperatura adequado para cada tipo de ferramenta."
      meta={[
        { k: "Provedor", v: current.label },
        { k: "Modelo", v: model.split("-")[0] },
        { k: "Temp.", v: temp.toFixed(1) },
        { k: "Chave", v: apiKey ? "ok" : "—" },
      ]}
      onBack={onBack}
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <div className="rounded-lg border border-mint-400/30 bg-mint-400/[0.07] p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Icon name="lock" className="h-4 w-4 text-mint-400" />
              <span className="font-mono text-[9.5px] tracking-[0.18em] text-mint-400 uppercase">
                Privacidade
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-bone-200">
              Sua chave fica salva <strong className="text-bone-50">apenas no seu navegador local</strong>.
              Ela nunca é enviada para os nossos servidores.
            </p>
          </div>

          <Card title="Temperatura recomendada" accent="signal">
            <ul className="space-y-2.5">
              {[
                ["Rank / Score", "0.2 — leitura estável e repetível"],
                ["Títulos / Hooks", "0.9 — variação criativa"],
                ["Roteiro", "0.6 — voz preservada"],
                ["Humanizador", "0.3 — sem invenção"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-baseline justify-between gap-3 border-b border-ink-800 pb-2 last:border-0">
                  <span className="text-[12.5px] text-bone-200">{k}</span>
                  <span className="font-mono text-[10.5px] text-ink-400">{v}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Histórico & Lixeira" note="v2.5" accent="oxide">
            <p className="text-[12px] leading-relaxed text-bone-400">
              As execuções das ferramentas viram registros restauráveis. Itens apagados ficam na
              lixeira pela retenção configurada antes do purge permanente.
            </p>
            <button
              onClick={() => onGo?.("historico")}
              className="group mt-3 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-oxide-400 uppercase transition-colors hover:text-oxide-500"
            >
              abrir histórico & lixeira
              <Icon name="arrow" className="h-3 w-3 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
            </button>
          </Card>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Conexão" note="chave local" accent="mint">
          <div className="space-y-4">
            <div>
              <Label>Provedor de IA</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProvider(p.id);
                      const nextModel = p.models[0] ?? "";
                      setModel(nextModel);
                      onSettingsChange({ provider: p.id, model: nextModel });
                      setStatus("idle");
                      setTestError("");
                      setModelSuggestions([]);
                      setKeyModels([]);
                      setModelListMessage("");
                    }}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-left transition-all duration-200",
                      provider === p.id
                        ? "border-mint-400/60 bg-mint-400/10 text-mint-300"
                        : "border-ink-700 bg-ink-950/60 text-bone-300 hover:border-ink-500 hover:text-bone-50"
                    )}
                  >
                    <span className="block text-[13px] font-semibold">{p.label}</span>
                    <span className="block font-mono text-[9.5px] text-ink-400">
                      {p.models.length ? `${p.models.length} modelos` : "URL e modelo próprios"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label hint="localStorage">Chave de API</Label>
              <div className="flex gap-2">
                <Input
                  type={show ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setStatus("idle");
                    setTestError("");
                    setModelSuggestions([]);
                      setKeyModels([]);
                      setModelListMessage("");
                  }}
                  placeholder="sk-…"
                  className="font-mono text-[12.5px]"
                />
                <Button variant="outline" size="sm" onClick={() => setShow((s) => !s)} className="shrink-0">
                  {show ? "ocultar" : "mostrar"}
                </Button>
              </div>
              {current.keyUrl && (
                <a
                  href={current.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-mint-400 transition-colors hover:text-mint-300"
                >
                  Obter chave da {current.label}
                  <Icon name="arrow" className="h-3 w-3 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
                </a>
              )}
              {apiKey && (
                <p className="mt-2 font-mono text-[10.5px] text-ink-400">
                  salva como <span className="text-mint-400">{masked}</span>
                </p>
              )}
            </div>

            {provider === "custom" && (
              <div>
                <Label hint="OpenAI-compatible">URL base da API</Label>
                <Input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBaseUrl(value);
                    onSettingsChange({ baseUrl: value });
                    setStatus("idle");
                    setTestError("");
                  }}
                  placeholder="https://api.exemplo.com/v1"
                  className="font-mono text-[12.5px]"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">
                  A URL deve aceitar o formato de chat completions. O painel acrescenta /chat/completions se necessário.
                </p>
              </div>
            )}

            <div>
              <Label hint="Escolha uma sugestão ou digite">Modelo</Label>
              {provider !== "custom" && (
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="min-h-4 text-[10px] text-ink-400" aria-live="polite">{modelListMessage}</p>
                  <button
                    type="button"
                    onClick={refreshModels}
                    disabled={refreshingModels}
                    className="shrink-0 font-mono text-[9.5px] tracking-[0.08em] text-mint-400 transition-colors hover:text-mint-300 disabled:cursor-wait disabled:opacity-60"
                  >
                    {refreshingModels ? "consultando…" : "buscar modelos da chave ↻"}
                  </button>
                </div>
              )}
              <ModelCombobox
                value={model}
                options={modelOptions}
                placeholder={provider === "custom" ? "ID exato do modelo" : "Selecione ou digite o ID do modelo"}
                onChange={(value) => {
                  setModel(value);
                  onSettingsChange({ model: value });
                  setStatus("idle");
                  setTestError("");
                  setModelSuggestions([]);
                }}
              />
            </div>

            <div>
              <Label hint={`${temp.toFixed(1)}`}>Temperatura</Label>
              <input
                type="range" min={0} max={1.5} step={0.1} value={temp}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setTemp(value);
                  onSettingsChange({ temperature: value });
                  setStatus("idle");
                }}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-mint-400"
                aria-label="Temperatura"
              />
              <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-500">
                <span>determinístico</span><span>criativo</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-ink-800 pt-4">
              <Button icon="bolt" onClick={test} disabled={status === "testing"}>
                {status === "testing" ? "Testando…" : "Testar conexão"}
              </Button>
              <span
                className={cn(
                  "flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase transition-colors",
                  status === "ok" && "text-mint-400",
                  status === "fail" && "text-oxide-400",
                  status === "testing" && "text-signal-400",
                  status === "idle" && "text-ink-400"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", status === "ok" ? "bg-mint-400" : status === "fail" ? "bg-oxide-400" : status === "testing" ? "bg-signal-400 anim-blink" : "bg-ink-600")} />
                {status === "ok" ? `conectado · ${model}` : status === "fail" ? "falha na conexão" : status === "testing" ? "negociando…" : "aguardando teste"}
              </span>
            </div>
            {testError && (
              <div role="alert" className="rounded-md border border-oxide-400/25 bg-oxide-400/[0.06] p-3">
                <p className="text-[11.5px] leading-relaxed text-oxide-300">{testError}</p>
                {modelSuggestions.length > 0 && (
                  <div className="mt-3 rounded border border-mint-400/20 bg-mint-400/[0.04] p-3">
                    <p className="mb-2 font-mono text-[9.5px] tracking-[0.14em] text-mint-300 uppercase">
                      Modelos que sua chave pode usar
                    </p>
                    <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
                      {modelSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setModel(suggestion);
                            onSettingsChange({ model: suggestion });
                            setStatus("idle");
                            setTestError("");
                            setModelSuggestions([]);
                          }}
                          className="rounded border border-ink-600 bg-ink-950 px-2.5 py-1.5 font-mono text-[10.5px] text-bone-200 transition-colors hover:border-mint-400/60 hover:text-mint-300"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-ink-400">
                      Selecione uma opção para trocar o modelo e teste a conexão novamente.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card title="Seus dados no painel" note="exportar / limpar" accent="bone">
          <p className="text-[12.5px] leading-relaxed text-bone-400">
            Calibração, chave e preferências vivem em <span className="font-mono text-bone-200">localStorage</span>.
            Exporte um JSON para levar para outra máquina — ou apague tudo e recomece do zero.
          </p>
          <div className="mt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              icon="copy"
              onClick={() => {
                const data = { provider, model, temperature: temp, apiKey, baseUrl, exportedAt: new Date().toISOString() };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "studioos-config.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Exportar configuração (.json)
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-oxide-400 hover:bg-oxide-400/10 hover:text-oxide-400"
              icon="close"
              onClick={() => {
                setKey("");
                setStatus("idle");
              }}
            >
              Apagar chave salva
            </Button>
          </div>

          <div className="mt-5 rounded-md border border-ink-800 bg-ink-950/60 p-3">
            <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
              O que sai do navegador
            </div>
            <ul className="space-y-1.5">
              {[
                ["Chave de API", "direto ao provedor escolhido", true],
                ["Textos das ferramentas", "direto ao provedor escolhido", true],
                ["Calibração do canal", "nunca sai — fica local", false],
                ["Telemetria / analytics", "não existe neste painel", false],
              ].map(([k, v, out]) => (
                <li key={k as string} className="flex items-baseline justify-between gap-3 text-[11.5px]">
                  <span className="text-bone-300">{k as string}</span>
                  <span className={cn("font-mono text-[10px]", out ? "text-signal-400/80" : "text-mint-400/80")}>
                    {v as string}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </ToolShell>
  );
}
