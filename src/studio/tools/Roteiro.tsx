import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Meter, Segmented, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { QUALITY_CHECKS, SCRIPT_BLOCKS, VOICE_PATTERNS } from "../data";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function splitSentences(t: string) {
  return t
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function analyzeVoice(sample: string, provoca: string, cta: string) {
  const sents = splitSentences(sample);
  const words = sample.trim() ? sample.trim().split(/\s+/) : [];
  const lens = sents.map((s) => s.split(/\s+/).length);
  const avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const variance = lens.length
    ? Math.sqrt(lens.reduce((a, b) => a + (b - avg) ** 2, 0) / lens.length)
    : 0;
  const first = (sample.match(/\b(eu|meu|minha|me| mim)\b/gi) ?? []).length;
  const second = (sample.match(/\b(você|voce|seu|sua|te|ti)\b/gi) ?? []).length;
  const numbers = (sample.match(/\b\d+(?:[.,]\d+)?\b/g) ?? []).length;
  const questions = (sample.match(/\?/g) ?? []).length;

  const found: { label: string; on: boolean; ev: string }[] = [
    { label: VOICE_PATTERNS[0], on: avg > 0 && sents.length > 1, ev: avg ? `frase média de ${avg.toFixed(1)} palavras` : "sem amostra" },
    { label: VOICE_PATTERNS[1], on: second >= first, ev: `${second} marca(s) de 2ª pessoa vs ${first} de 1ª` },
    { label: VOICE_PATTERNS[2], on: questions >= 1 || provoca.trim().length > 8, ev: questions ? `${questions} pergunta(s) retórica(s)` : "definido no campo de provocação" },
    { label: VOICE_PATTERNS[3], on: first >= 2, ev: `${first} confissão(ões) em 1ª pessoa` },
    { label: VOICE_PATTERNS[4], on: numbers >= 1, ev: numbers ? `${numbers} número(s) cru(s)` : "nenhum número na amostra" },
    { label: VOICE_PATTERNS[5], on: cta.trim().length > 4, ev: cta.trim() ? "CTA recorrente declarado" : "CTA vazio" },
  ];

  const match = found.filter((f) => f.on).length;
  return { avg, variance, first, second, numbers, questions, found, match, words: words.length };
}

/* --------------------------------------------------------- teleprompter */

function Teleprompter({ text }: { text: string }) {
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [size, setSize] = useState(30);
  const [mirror, setMirror] = useState(false);
  const y = useRef(0);
  const inner = useRef<HTMLDivElement | null>(null);
  const raf = useRef(0);
  const last = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const tick = (t: number) => {
      const dt = last.current ? (t - last.current) / 1000 : 0;
      last.current = t;
      const el = inner.current;
      if (el) {
        const max = el.parentElement ? el.parentElement.clientHeight : 0;
        y.current -= speed * 62 * dt;
        if (-y.current > el.scrollHeight - max * 0.35) {
          y.current = 0;
          setPlaying(false);
        }
        el.style.transform = `translate3d(0, ${y.current}px, 0)`;
        const total = el.scrollHeight - max * 0.35;
        setProgress(total > 0 ? Math.min(100, (-y.current / total) * 100) : 0);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing, speed]);

  const reset = () => {
    y.current = 0;
    if (inner.current) inner.current.style.transform = "translate3d(0,0,0)";
    setProgress(0);
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minutes = words / 145;

  return (
    <div className="overflow-hidden rounded-lg border border-bone-200/20 bg-bone-100 text-ink-900 shadow-[0_40px_90px_-40px_rgba(0,0,0,1)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-900/10 bg-bone-200/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="on-air-dot h-2 w-2 rounded-full bg-oxide-500" />
          <span className="font-mono text-[10px] font-bold tracking-[0.22em] text-ink-900/70 uppercase">
            Teleprompter
          </span>
        </div>
        <span className="font-mono text-[10px] text-ink-900/50 tabular-nums">
          {words} palavras · ~{minutes.toFixed(1)} min
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setPlaying((p) => !p)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded transition-all duration-200 active:scale-90",
              playing ? "bg-oxide-500 text-bone-50" : "bg-ink-900 text-bone-50 hover:bg-ink-700"
            )}
            aria-label={playing ? "Pausar" : "Rolar"}
          >
            <Icon name={playing ? "pause" : "play"} className="h-4 w-4" strokeWidth={1.9} />
          </button>
          <button
            onClick={reset}
            className="flex h-8 w-8 items-center justify-center rounded bg-ink-900/10 text-ink-900 transition-colors hover:bg-ink-900/20"
            aria-label="Reiniciar"
          >
            <Icon name="refresh" className="h-4 w-4" strokeWidth={1.9} />
          </button>
          <button
            onClick={() => setSize((s) => Math.max(18, s - 3))}
            className="flex h-8 w-8 items-center justify-center rounded bg-ink-900/10 font-mono text-[13px] text-ink-900 transition-colors hover:bg-ink-900/20"
            aria-label="Diminuir fonte"
          >
            A−
          </button>
          <button
            onClick={() => setSize((s) => Math.min(56, s + 3))}
            className="flex h-8 w-8 items-center justify-center rounded bg-ink-900/10 font-mono text-[15px] text-ink-900 transition-colors hover:bg-ink-900/20"
            aria-label="Aumentar fonte"
          >
            A+
          </button>
          <button
            onClick={() => setMirror((m) => !m)}
            className={cn(
              "rounded px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.14em] uppercase transition-colors",
              mirror ? "bg-ink-900 text-bone-50" : "bg-ink-900/10 text-ink-900 hover:bg-ink-900/20"
            )}
          >
            espelho
          </button>
        </div>
      </div>

      <div className="relative h-[340px] overflow-hidden bg-bone-50">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-bone-50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-bone-50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-[38%] z-10 h-px bg-oxide-500/40" />
        <div className="pointer-events-none absolute left-0 top-[38%] z-10 -translate-y-1/2 border-y-[5px] border-l-[7px] border-y-transparent border-l-oxide-500" />

        <div ref={inner} className="absolute inset-x-0 top-[46%] px-8 py-4 will-change-transform">
          <div
            className="font-display leading-[1.35] font-semibold"
            style={{ fontSize: `${size}px`, transform: mirror ? "scaleX(-1)" : undefined }}
          >
            {text.trim() ? (
              text.split("\n").map((line, i) => (
                <p key={i} className={cn("mb-3", !line.trim() && "h-6")}>
                  {line}
                </p>
              ))
            ) : (
              <p className="text-ink-900/35">Preencha o roteiro para ver o texto aqui.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink-900/10 bg-bone-200/60 px-4 py-3">
        <span className="font-mono text-[10px] tracking-[0.16em] text-ink-900/60 uppercase">
          Velocidade
        </span>
        <input
          type="range"
          min={0.3}
          max={3}
          step={0.1}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="h-1 w-40 cursor-pointer appearance-none rounded-full bg-ink-900/20 accent-oxide-500"
          aria-label="Velocidade de rolagem"
        />
        <span className="font-mono text-[11px] font-bold text-ink-900 tabular-nums">
          {speed.toFixed(1)}×
        </span>
        <span className="font-mono text-[10px] tracking-[0.14em] text-ink-900/50 uppercase">
          {speed < 0.7 ? "lento" : speed < 1.3 ? "normal" : speed < 2 ? "rápido" : "grave hoje"}
        </span>
        <div className="ml-auto flex w-40 items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-900/15">
            <div className="h-full rounded-full bg-oxide-500 transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-[10px] text-ink-900/60 tabular-nums">
            {progress.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- tool */

export function Roteiro({ onBack, onGo }: { onBack: () => void; onGo: (id: string) => void }) {
  const examples = useExampleMode();
  const [tab, setTab] = useState<"voz" | "roteiro" | "prompter">("voz");
  const [sample, setSample] = useState(
    examples ? "Eu perdi dois anos aportando R$100 por mês em fundo imobiliário. O resultado? Menos que a poupança. Você não precisa repetir esse erro. Olha o extrato aqui na tela: R$2.400 aportados, R$2.311 de saldo. Eu errei, e a culpa foi minha." : ""
  );
  const [provoca, setProvoca] = useState(examples ? "Provoca com humor, mostra o próprio erro antes de cobrar alguém" : "");
  const [cta, setCta] = useState(examples ? "Se esse número te assustou, comenta 100 que eu mostro o próximo passo" : "");
  const [takeName, setTakeName] = useState(examples ? "Take 01 — FIIs R$100" : "");

  const [blocks, setBlocks] = useState<Record<string, string>>(examples ? {
    hook: "Dois anos. R$100 por mês. E o meu saldo era menor que a poupança. Olha esse extrato.",
    contexto: "Eu comecei a aportar em FIIs em 2023 porque todo mundo falava de renda mensal. Só que ninguém mostrava o rendimento real.",
    dev: "Primeiro erro: escolhi fundo pelo dividend yield. Segundo erro: ignorei a vacância. Terceiro erro: aportei todo mês sem olhar o preço da cota. Aqui na tela está a planilha com os três anos.\nQuando eu troquei por um mix de tesouro direto com um FII de tijolo bom, o resultado mudou. Não ficou rico, ficou honesto.",
    cta: "Se você aporta R$100 por mês, faz essa conta antes do próximo aporte. E comenta 100 que eu trago o passo a passo da migração.",
  } : {});

  const voice = useMemo(() => analyzeVoice(sample, provoca, cta), [sample, provoca, cta]);

  const full = useMemo(
    () =>
      SCRIPT_BLOCKS.map((b) => blocks[b.id]?.trim())
        .filter(Boolean)
        .join("\n\n"),
    [blocks]
  );

  const words = full.trim() ? full.trim().split(/\s+/).length : 0;
  const duration = words / 145;

  const checks = useMemo(() => {
    const sents = splitSentences(full);
    const firstSent = sents[0] ?? "";
    return [
      {
        ...QUALITY_CHECKS[0],
        ok: firstSent.length > 0 && firstSent.split(/\s+/).length <= 18 && !/^(oi|olá|ola|e aí|eai|bom|então|entao)/i.test(firstSent),
        ev: firstSent ? `1ª frase: “${firstSent.slice(0, 58)}${firstSent.length > 58 ? "…" : ""}”` : "roteiro vazio",
      },
      {
        ...QUALITY_CHECKS[1],
        ok: /\d/.test(firstSent + " " + (sents[1] ?? "")),
        ev: /\d/.test(full) ? `${(full.match(/\b\d+(?:[.,]\d+)?\b/g) ?? []).length} número(s) no texto` : "nenhum número",
      },
      {
        ...QUALITY_CHECKS[2],
        ok: full.length > 0 && !/—|–|\(|\)/.test(full) && !EMOJI.test(full),
        ev: EMOJI.test(full)
          ? "emoji encontrado"
          : /[—–]/.test(full)
            ? "travessão encontrado"
            : /\(|\)/.test(full)
              ? "parênteses encontrados"
              : "limpo para leitura em voz alta",
      },
      {
        ...QUALITY_CHECKS[3],
        ok: words > 0 && duration <= 15,
        ev: words ? `${words} palavras · ~${duration.toFixed(1)} min` : "roteiro vazio",
      },
    ];
  }, [full, words, duration]);

  const checkScore = checks.filter((c) => c.ok).length;

  useAutosave(
    () => ({
      tool: "roteiro",
      toolName: "Roteiro & Gravação",
      title: blocks.hook.trim() || sample.trim() ? `Roteiro — ${(blocks.hook.trim() || sample.trim()).slice(0, 72)}` : "",
      summary: `${words} palavras · ~${duration.toFixed(1)} min · checklist ${checkScore}/4 · voz calibrada ${voice.match}/6`,
      tag: `${checkScore}/4`,
      content: `ROTEIRO MONTADO\nhook: ${blocks.hook}\n\ncontexto: ${blocks.contexto}\n\ndesenvolvimento: ${blocks.dev}\n\ncta: ${blocks.cta}\n\nSTATS\n${words} palavras · ~${duration.toFixed(1)} min · checklist ${checkScore}/4 · padrão de voz ${voice.match}/6\n\nCHECKLIST\n${checks.map((c) => `${c.ok ? "[x]" : "[ ]"} ${c.q} — ${c.ev}`).join("\n")}`,
    }),
    [full, words, duration, checkScore, voice.match],
    30
  );

  return (
    <ToolShell
      id="roteiro"
      title="Roteiro & Gravação"
      accent="sky"
      lede="Três abas: motor de voz, roteiro em blocos e teleprompter. O texto final sai com contagem de palavras, duração estimada e checklist de qualidade aplicado de verdade sobre o que você escreveu."
      meta={[
        { k: "Blocos", v: "4" },
        { k: "Palavras", v: String(words) },
        { k: "Duração", v: `${duration.toFixed(1)}m` },
        { k: "Checklist", v: `${checkScore}/4` },
      ]}
      onBack={onBack}
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title="Padrão detectado" note={`${voice.match}/6`} accent="sky">
            {voice.words === 0 ? (
              <p className="py-3 text-center font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase">
                aguardando amostra de voz…
              </p>
            ) : (
              <ul className="space-y-2.5">
                {voice.found.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                        f.on ? "border-mint-400/60 bg-mint-400/20 text-mint-300" : "border-ink-600 text-ink-500"
                      )}
                    >
                      {f.on ? <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} /> : <Icon name="close" className="h-2.5 w-2.5" strokeWidth={3} />}
                    </span>
                    <span>
                      <span className={cn("block text-[12.5px] leading-snug", f.on ? "text-bone-100" : "text-ink-400")}>
                        {f.label}
                      </span>
                      <span className="block font-mono text-[10px] text-ink-500">{f.ev}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Checklist de qualidade" note={`${checkScore}/4`} accent="mint">
            <ul className="space-y-3">
              {checks.map((c) => (
                <li key={c.q} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300",
                      c.ok ? "border-mint-400 bg-mint-400/20 text-mint-300" : "border-ink-600 text-ink-500"
                    )}
                  >
                    {c.ok ? "✓" : "○"}
                  </span>
                  <span>
                    <span className={cn("block text-[12.5px] font-semibold leading-snug", c.ok ? "text-bone-100" : "text-bone-400")}>
                      {c.q}
                    </span>
                    <span className="block text-[11px] leading-snug text-ink-400">{c.a}</span>
                    <span className="mt-0.5 block font-mono text-[9.5px] text-ink-500">{c.ev}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: "voz", label: "Motor de voz" },
            { id: "roteiro", label: "Blocos" },
            { id: "prompter", label: "Teleprompter" },
          ]}
        />
        <span className="ml-auto flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
          <span className={cn("h-1.5 w-1.5 rounded-full", voice.match >= 4 ? "bg-mint-400" : "bg-signal-400")} />
          motor {voice.match >= 4 ? "ativo" : "calibrando"}
        </span>
      </div>

      {tab === "voz" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Amostra de texto ou transcrição" note="~1 min falado" accent="sky" className="lg:col-span-2">
            <Textarea rows={7} value={sample} onChange={(e) => setSample(e.target.value)} placeholder="Cole aqui uma transcrição sua, ou um texto que você escreveria sem revisar" />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: "Palavras", v: String(voice.words) },
                { k: "Frase média", v: voice.avg ? voice.avg.toFixed(1) : "—" },
                { k: "Burstiness", v: voice.variance ? voice.variance.toFixed(1) : "—" },
                { k: "Números crus", v: String(voice.numbers) },
              ].map((m) => (
                <div key={m.k} className="rounded border border-ink-800 bg-ink-950/50 px-3 py-2">
                  <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">{m.k}</div>
                  <div className="font-display text-lg font-bold text-bone-100 tabular-nums">{m.v}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Como o criador provoca?" accent="oxide">
            <Textarea rows={4} value={provoca} onChange={(e) => setProvoca(e.target.value)} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              Define o limite do humor: até onde a provocação vai antes de virar ataque gratuito.
            </p>
          </Card>

          <Card title="CTA recorrente" accent="mint">
            <Textarea rows={4} value={cta} onChange={(e) => setCta(e.target.value)} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              A frase que fecha todo vídeo. Repetição constrói hábito de comentário.
            </p>
          </Card>

          <Card title="Ritmo de fala" note="referência" accent="signal" className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { l: "Palavras por minuto", v: 145, m: 145, max: 200, a: "signal" as const },
                { l: "2ª pessoa × 1ª pessoa", v: voice.second, m: Math.max(voice.first, voice.second), max: Math.max(6, voice.first + voice.second), a: "sky" as const },
                { l: "Perguntas retóricas", v: voice.questions, m: voice.questions, max: 6, a: "mint" as const },
              ].map((r) => (
                <div key={r.l}>
                  <Meter value={r.v} max={r.max} accent={r.a} label={r.l} suffix="" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "roteiro" && (
        <div className="space-y-4">
          {SCRIPT_BLOCKS.map((b, i) => (
            <Card
              key={b.id}
              title={`${i + 1}. ${b.label}`}
              note={`${b.note} · alvo ${b.target}`}
              accent={(["mint", "sky", "signal", "oxide"] as const)[i]}
            >
              <Textarea
                rows={b.id === "dev" ? 7 : 4}
                value={blocks[b.id]}
                onChange={(e) => setBlocks((prev) => ({ ...prev, [b.id]: e.target.value }))}
                placeholder={`Escreva o bloco: ${b.label}`}
              />
              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
                <span>{blocks[b.id].trim() ? blocks[b.id].trim().split(/\s+/).length : 0} palavras</span>
                <span className="h-3 w-px bg-ink-700" />
                <span>
                  ~{(blocks[b.id].trim().split(/\s+/).filter(Boolean).length / 145).toFixed(1)} min
                </span>
                {EMOJI.test(blocks[b.id]) || /[—–()]/.test(blocks[b.id]) ? (
                  <span className="ml-auto flex items-center gap-1 text-oxide-400">
                    <Icon name="close" className="h-3 w-3" strokeWidth={2.4} /> trava de leitura
                  </span>
                ) : (
                  blocks[b.id].trim() && (
                    <span className="ml-auto flex items-center gap-1 text-mint-400">
                      <Icon name="check" className="h-3 w-3" strokeWidth={2.4} /> legível em voz alta
                    </span>
                  )
                )}
              </div>
            </Card>
          ))}

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-700/70 bg-ink-900/50 p-4">
            <div className="mr-auto">
              <div className="font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                Roteiro montado
              </div>
              <div className="font-display text-lg font-bold text-bone-50 tabular-nums">
                {words} palavras · {duration.toFixed(1)} min
              </div>
            </div>
            <CopyButton text={full} />
            <Button size="sm" variant="outline" icon="wave" onClick={() => onGo("humanizador")}>
              Passar no humanizador
            </Button>
            <Button size="sm" icon="mic" onClick={() => setTab("prompter")}>
              Abrir teleprompter
            </Button>
          </div>
        </div>
      )}

      {tab === "prompter" && (
        <div className="space-y-4">
          <Teleprompter text={full} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card title="Texto em rolagem" note="editável" accent="sky">
              <Textarea rows={8} value={full} readOnly className="font-mono text-[12.5px] text-bone-300" />
              <p className="mt-2 text-[11.5px] text-ink-400">
                O teleprompter lê o roteiro montado na aba Blocos. Edite lá e volte aqui.
              </p>
              <Button size="sm" variant="outline" className="mt-3" icon="arrow" onClick={() => setTab("roteiro")}>
                Editar blocos
              </Button>
            </Card>
            <Card title="Setup de gravação" accent="bone">
              <ul className="space-y-2.5">
                {[
                  "Câmera na altura dos olhos",
                  "Prompter a 40 cm da lente",
                  "Olhe na lente, não na tela",
                  "Grave 3 takes do hook antes do resto",
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2.5 text-[12.5px] leading-snug text-bone-300">
                    <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-400" strokeWidth={2.2} />
                    {s}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-ink-800 pt-3">
                <Label>Chamada de gravação</Label>
                <Input value={takeName} onChange={(event) => setTakeName(event.target.value)} placeholder="Ex.: Take 01 — nome do vídeo" className="font-mono text-[12px]" />
              </div>
            </Card>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
