import { useState, useEffect } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Textarea } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { THUMB_COLOR, THUMB_COMPOSITION } from "../data";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";

const SWATCHES = [
  { name: "Âmbar sinal", hex: "#f7b733" },
  { name: "Óxido", hex: "#dc4a30" },
  { name: "Menta", hex: "#43d9a3" },
  { name: "Céu", hex: "#3f8ae0" },
  { name: "Ameixa", hex: "#b98cf0" },
  { name: "Osso", hex: "#f2ede2" },
];

export function Thumbnail({
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
  const [tema, setTema] = useState(examples ? "FIIs com R$100 não valem mais a pena" : calib?.niche ? calib.niche.slice(0, 50) : "");
  const [ctr, setCtr] = useState(examples ? "4.8" : calib?.ctr || "");
  const [appearance, setAppearance] = useState(examples ? "Meio-corpo, lado direito, expressão de susto contido" : "");
  const [brand, setBrand] = useState(examples ? "Âmbar + grafite, logo circular no centro" : "");
  const [topThumbs, setTopThumbs] = useState(
    examples
      ? "Print de extrato + rosto à direita\nGráfico caindo + expressão neutra"
      : calib?.tops && calib.tops.length > 0
      ? calib.tops.slice(0, 3).map((t) => `Estilo do top: ${t}`).join("\n")
      : ""
  );
  const [bg, setBg] = useState("#f7b733");
  const [fg, setFg] = useState("#0d0f13");
  const [slot, setSlot] = useState(calib?.prova ? calib.prova.slice(0, 30) : "extrato");

  useEffect(() => {
    if (calib) {
      if (!ctr && calib.ctr) setCtr(calib.ctr);
      if (!tema && calib.niche) setTema(calib.niche.slice(0, 50));
      if (!topThumbs && calib.tops && calib.tops.length > 0) {
        setTopThumbs(calib.tops.slice(0, 3).map((t) => `Estilo do top: ${t}`).join("\n"));
      }
    }
  }, [calib]);

  useToolRestore("thumbnail", (payload) => {
    if (payload.metadata?.tema !== undefined) {
      setTema(payload.metadata.tema);
      if (payload.metadata.ctr) setCtr(payload.metadata.ctr);
      if (payload.metadata.appearance) setAppearance(payload.metadata.appearance);
      if (payload.metadata.brand) setBrand(payload.metadata.brand);
      if (payload.metadata.topThumbs) setTopThumbs(payload.metadata.topThumbs);
      if (payload.metadata.bg) setBg(payload.metadata.bg);
      if (payload.metadata.fg) setFg(payload.metadata.fg);
      if (payload.metadata.slot) setSlot(payload.metadata.slot);
    } else if (payload.content) {
      const matchTema = payload.content.match(/BRIEFING DE THUMBNAIL — (.*)/);
      const matchSlot = payload.content.match(/Elemento:\s*([^\s(]+)/);
      const matchBg = payload.content.match(/Fundo da pauta:\s*([#\w]+)/);
      const matchFg = payload.content.match(/Elemento gráfico:\s*([#\w]+)/);
      if (matchTema) setTema(matchTema[1].trim());
      if (matchSlot) setSlot(matchSlot[1].trim());
      if (matchBg) setBg(matchBg[1].trim());
      if (matchFg) setFg(matchFg[1].trim());
    }
  });

  const brief = `BRIEFING DE THUMBNAIL — ${tema}

COMPOSIÇÃO
${THUMB_COMPOSITION.map((c) => `- ${c}`).join("\n")}

COR E ACABAMENTO
${THUMB_COLOR.map((c) => `- ${c}`).join("\n")}
- Fundo da pauta: ${bg} | Elemento gráfico: ${fg}

SLOT DA PAUTA
- Elemento: ${slot} (deve se entender em 1 segundo, sem ler nada)
- Aparência do apresentador: ${appearance}
- Marca: ${brand}
- CTR médio do canal: ${ctr}%

REGRA DE OURO
Nunca regenerar o rosto. Sempre compor por cima da foto real, preservando rosto e expressão.`;

  const friendlySummary = `Briefing visual planejado na regra 45/45 (destaque: ${slot}) · Paleta e acabamentos prontos para designer`;

  useAutosave(
    () => ({
      tool: "thumbnail",
      toolName: "Briefing Thumbnail",
      title: tema.trim() ? `Thumb — ${tema}` : "",
      summary: friendlySummary,
      tag: "45/45",
      content: brief,
    }),
    [brief, tema, friendlySummary],
    8
  );

  return (
    <ToolShell
      id="thumbnail"
      title="Briefing Thumbnail"
      accent="plum"
      lede="Composição, cor e slot de pauta em um briefing que o designer executa sem reunião. A prévia abaixo é a planta baixa da capa: 45% apresentador, 45% pauta, marca cruzando o centro."
      meta={[
        { k: "Proporção", v: "16:9" },
        { k: "Regra", v: "45 / 45" },
        { k: "Texto na capa", v: "0" },
        { k: "CTR base", v: `${ctr}%` },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        tema.trim()
          ? {
              type: "thumbnail",
              group: "Criação",
              toolName: "Briefing Thumbnail",
              title: `Thumb — ${tema}`,
              summary: friendlySummary,
              tag: "45/45",
              content: brief,
              metadata: {
                tema,
                ctr,
                appearance,
                brand,
                topThumbs,
                bg,
                fg,
                slot,
              },
            }
          : null
      }
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          <Card title="Composição" note="padrão do canal" accent="plum">
            <ul className="space-y-2">
              {THUMB_COMPOSITION.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-[12.5px] leading-snug text-bone-300">
                  <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-plum-400" strokeWidth={2.2} />
                  {c}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Cor e acabamento" accent="signal">
            <ul className="space-y-2">
              {THUMB_COLOR.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-[12.5px] leading-snug text-bone-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-400" />
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-ink-800 pt-3">
              <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                Paleta do briefing
              </div>
              <div className="flex gap-1.5">
                {[bg, fg, "#1f242c", "#f2ede2"].map((c) => (
                  <span
                    key={c}
                    className="h-7 flex-1 rounded border border-ink-700 transition-transform duration-200 hover:scale-105"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </Card>

          <div className="rounded-lg border border-oxide-400/30 bg-oxide-400/[0.07] p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Icon name="eye" className="h-4 w-4 text-oxide-400" />
              <span className="font-mono text-[9.5px] tracking-[0.18em] text-oxide-400 uppercase">
                Regra de ouro
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-bone-200">
              Nunca regenerar o rosto. Sempre compor por cima da foto real, preservando rosto e
              expressão.
            </p>
          </div>
        </div>
      }
    >
      <CalibrationNotice
        calib={calib}
        profileName={profileName}
        profileColor={profileColor}
        toolName="Briefing Thumbnail"
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      {/* live preview */}
      <Card title="Planta baixa da capa" note="prévia ao vivo" accent="plum">
        <div className="relative aspect-video w-full overflow-hidden rounded-md border border-ink-700 bg-ink-950">
          {/* pauta side */}
          <div
            className="absolute inset-y-0 left-0 w-[45%] transition-colors duration-500"
            style={{
              background: `radial-gradient(120% 90% at 30% 20%, ${bg}dd, ${bg}55 55%, #0d0f13 100%)`,
            }}
          >
            <div className="scanlines absolute inset-0 opacity-30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
              <div
                className="rounded border-2 px-3 py-2 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors duration-500"
                style={{ borderColor: fg, color: fg, background: `${fg}14` }}
              >
                slot: {slot}
              </div>
              <span className="font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: fg, opacity: 0.7 }}>
                1s para entender
              </span>
            </div>
          </div>

          {/* apresentador side */}
          <div className="absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-ink-850 via-ink-900 to-transparent">
            <div className="absolute inset-y-0 right-[8%] flex w-[46%] items-end justify-center">
              <svg viewBox="0 0 120 180" className="h-full w-full opacity-90">
                <defs>
                  <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a88a" />
                    <stop offset="100%" stopColor="#8c6f57" />
                  </linearGradient>
                </defs>
                <ellipse cx="60" cy="176" rx="52" ry="10" fill="#000" opacity="0.45" />
                <path d="M20 180c0-32 18-52 40-52s40 20 40 52z" fill="#1b2028" />
                <circle cx="60" cy="72" r="30" fill="url(#skin)" />
                <path d="M32 66c0-20 12-32 28-32s28 12 28 32c-6-8-16-12-28-12s-22 4-28 12z" fill="#151a20" />
                <circle cx="50" cy="74" r="2.6" fill="#151a20" />
                <circle cx="70" cy="74" r="2.6" fill="#151a20" />
                <path d="M52 88c4 3 12 3 16 0" stroke="#151a20" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div className="absolute left-2 top-3 font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">
              apresentador 45%
            </div>
          </div>

          {/* brand crossing center */}
          <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-500"
              style={{ borderColor: bg, background: fg }}
            >
              <span style={{ color: bg }} className="flex items-center">
                <Icon name="logo" className="h-5 w-5" strokeWidth={1.8} />
              </span>
            </span>
          </div>

          {/* guides */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-[45%] w-px bg-bone-100/15" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-bone-100/10" />
            <div className="absolute bottom-2 right-3 font-mono text-[9px] tracking-[0.16em] text-bone-100/40 uppercase">
              1280 × 720
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label>Cor da pauta</Label>
            <div className="flex flex-wrap gap-1.5">
              {SWATCHES.map((s) => (
                <button
                  key={s.hex}
                  onClick={() => setBg(s.hex)}
                  className={cn(
                    "h-8 w-8 rounded border-2 transition-all duration-200 hover:scale-110",
                    bg === s.hex ? "border-bone-100" : "border-ink-700"
                  )}
                  style={{ background: s.hex }}
                  title={s.name}
                  aria-label={s.name}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Cor do elemento</Label>
            <div className="flex flex-wrap gap-1.5">
              {["#0d0f13", "#f2ede2", "#dc4a30", "#1fb783"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFg(s)}
                  className={cn(
                    "h-8 w-8 rounded border-2 transition-all duration-200 hover:scale-110",
                    fg === s ? "border-bone-100" : "border-ink-700"
                  )}
                  style={{ background: s }}
                  aria-label={s}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Slot da pauta</Label>
            <div className="flex flex-wrap gap-1.5">
              {["extrato", "gráfico", "print", "objeto", "logo"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={cn(
                    "rounded border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.1em] uppercase transition-all duration-200",
                    slot === s
                      ? "border-plum-400/60 bg-plum-400/15 text-plum-400"
                      : "border-ink-700 bg-ink-950/60 text-bone-400 hover:border-ink-500 hover:text-bone-100"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Dados do canal" accent="signal">
          <div className="space-y-4">
            <div>
              <Label>Tema do vídeo para gerar briefing</Label>
              <Input value={tema} onChange={(e) => setTema(e.target.value)} />
            </div>
            <div>
              <Label hint="em %">CTR médio do canal</Label>
              <Input value={ctr} onChange={(e) => setCtr(e.target.value)} inputMode="decimal" className="w-28 font-mono tabular-nums" />
            </div>
            <div>
              <Label hint="1 por linha">3 thumbs que performaram acima da média</Label>
              <Textarea rows={3} value={topThumbs} onChange={(e) => setTopThumbs(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card title="Identidade visual" accent="mint">
          <div className="space-y-4">
            <div>
              <Label>Como você aparece nas thumbs?</Label>
              <Textarea rows={3} value={appearance} onChange={(e) => setAppearance(e.target.value)} />
            </div>
            <div>
              <Label>Cores e elementos de marca</Label>
              <Textarea rows={3} value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="rounded-md border border-ink-800 bg-ink-950/50 p-3">
              <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                Checklist de entrega
              </div>
              <ul className="space-y-1.5">
                {["Sem texto na capa", "Pauta legível em 1 segundo", "Rosto real preservado", "Contraste alto com o fundo"].map((c) => (
                  <li key={c} className="flex items-center gap-2 text-[12px] text-bone-300">
                    <Icon name="check" className="h-3.5 w-3.5 text-mint-400" strokeWidth={2.4} />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Briefing gerado" note="copiar para o designer" accent="plum" className="mt-6">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/70 p-4 font-mono text-[12px] leading-relaxed text-bone-200">
          {brief}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={brief} />
          <Button size="sm" variant="outline" icon="mic" onClick={() => onGo("roteiro")}>
            Ir para roteiro
          </Button>
        </div>
      </Card>
    </ToolShell>
  );
}
