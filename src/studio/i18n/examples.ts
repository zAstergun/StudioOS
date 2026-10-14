import type { Language } from "./types";
import type { Calib } from "../calibration";

export interface ToolExamples {
  rankIdea: string;
  titulosTema: string;
  titulosTops: string;
  titulosFlops: string;
  titulosCtr: string;
  hooksTheme: string;
  hooksPromise: string;
  roteiroSample: string;
  roteiroProvoca: string;
  roteiroCta: string;
  thumbnailTopic: string;
  thumbnailStyle: string;
  receitaViralText: string;
  humanizadorRaw: string;
  scorePostCopy: string;
  mentorDoubt: string;
  membrosGoal: string;
}

export interface LocalizedSeedIdea {
  id: string;
  text: string;
  ts: number;
}

export interface LocalizedFallbackCreator {
  id: string;
  full_name: string;
  channel: string;
  avatar_url: string | null;
  bio: string;
  likes_count: number;
  completed_projects: number;
  total_projects: number;
  ideias_ranqueadas: number;
  total_runs: number;
  streak: number;
  is_vip?: boolean;
}

const BASE_TS = 1775836800000;

export const LOCALIZED_EXAMPLES: Record<string, {
  calib: Calib;
  seeds: LocalizedSeedIdea[];
  creators: LocalizedFallbackCreator[];
  tools: ToolExamples;
}> = {
  "pt-BR": {
    calib: {
      niche: "Finanças pessoais para quem começa com pouco dinheiro e quer investir sem jargão de banco.",
      answers: [
        "Pessoas entre 22 e 35 anos que querem organizar o primeiro salário e têm medo de perder dinheiro.",
        "Explicações diretas, com extratos reais na tela e decisões financeiras do dia a dia.",
        "Comparações com números, testes por algumas semanas e erros que eu mesmo cometi.",
        "Promessas de enriquecimento rápido, siglas sem explicação e recomendações sem mostrar dados.",
      ],
      tops: "Como saí de R$0 para R$10 mil em 2 anos\nParei de ouvir gerente de banco\n3 erros que me custaram R$8.000",
      flops: "O que são fundos imobiliários\nMinha carteira completa de FIIs\nComo funciona a bolsa de valores",
      ctr: "4.8",
      prova: "Extrato da corretora, planilha de aportes e comparação com a poupança.",
      historias: "Meu primeiro aporte de R$100; a vez em que segui uma dica sem pesquisar; Psicologia Financeira.",
    },
    seeds: [
      { id: "s1", text: "Eu parei de investir R$100 por mês em FIIs e mostrei o extrato na tela", ts: Date.now() - 86400000 * 3 },
      { id: "s2", text: "Testei a carteira recomendada por 3 gerentes de banco durante 90 dias", ts: Date.now() - 86400000 * 8 },
      { id: "s3", text: "Explicando o que é duration para iniciantes", ts: Date.now() - 86400000 * 12 },
    ],
    creators: [
      {
        id: "creator-dirwen",
        full_name: "Diruen",
        channel: "dirwen",
        avatar_url: null,
        bio: "Criador audiovisual & estrategista de canais no StudioOS.",
        likes_count: 12,
        completed_projects: 4,
        total_projects: 6,
        ideias_ranqueadas: 28,
        total_runs: 45,
        streak: 8,
      },
      {
        id: "creator-astertest",
        full_name: "Aster Test",
        channel: "astertest",
        avatar_url: null,
        bio: "Testando fluxos de produção, retenção e roteiros neurais.",
        likes_count: 8,
        completed_projects: 3,
        total_projects: 4,
        ideias_ranqueadas: 19,
        total_runs: 32,
        streak: 5,
      },
      {
        id: "creator-ratoratulho",
        full_name: "Rato Ratulho",
        channel: "ratoratulho",
        avatar_url: null,
        bio: "Explorando novos formatos e calibrações de nicho.",
        likes_count: 5,
        completed_projects: 2,
        total_projects: 3,
        ideias_ranqueadas: 14,
        total_runs: 18,
        streak: 3,
      },
    ],
    tools: {
      rankIdea: "Eu parei de investir R$100 por mês em FIIs e mostrei o extrato na tela",
      titulosTema: "investir R$100 por mês em FIIs",
      titulosTops: "Como saí de R$0 para R$10 mil em 2 anos\nParei de ouvir gerente de banco\n3 erros que me custaram R$8.000",
      titulosFlops: "O que são fundos imobiliários\nMinha carteira completa de FIIs",
      titulosCtr: "4.8",
      hooksTheme: "investir R$100 por mês em FIIs",
      hooksPromise: "o rendimento real com o extrato na tela",
      roteiroSample: "Parei de investir R$100 por mês em FIIs. E o motivo não é que eu perdi dinheiro: é que depois de 14 meses fazendo isso religiosamente, eu abri o extrato e percebi que a conta não fecha quando você considera o custo de oportunidade.",
      roteiroProvoca: "O que o gerente do banco não te conta",
      roteiroCta: "Comente quantos FIIs você tem",
      thumbnailTopic: "Extrato bancário com saldo negativo vs positivo",
      thumbnailStyle: "Contraste cinematográfico, tipografia suíça impactante e recorte nítido",
      receitaViralText: "Eu passei 30 dias analisando os 10 maiores canais de finanças do Brasil e percebi que todos usam a mesma estrutura nos primeiros 15 segundos: um número impossível de ignorar, uma acusação contra um vilão comum e uma prova em tela antes da vinheta.",
      humanizadorRaw: "Neste post, vamos mergulhar na fascinante jornada para desbloquear o potencial dos seus investimentos. É importante ressaltar que otimizar seus rendimentos no mundo moderno exige um passo a passo completo.",
      scorePostCopy: "Parei de investir R$100 por mês em fundos imobiliários. Aqui está o extrato real de 14 meses e o motivo pelo qual mudei de estratégia.",
      mentorDoubt: "Como aumentar a retenção nos primeiros 30 segundos de um vídeo explicativo sem soar sensacionalista?",
      membrosGoal: "Comunidade fechada para investidores iniciantes com análises semanais de carteira e encontros ao vivo.",
    },
  },
  "en": {
    calib: {
      niche: "Personal finance for beginners starting with little money and wanting to invest without bank jargon.",
      answers: [
        "People between 22 and 35 who want to organize their first paycheck and fear losing money.",
        "Direct breakdowns with real statements on screen and daily financial choices.",
        "Side-by-side data comparisons, real tests over several weeks, and honest mistakes I made.",
        "Get-rich-quick hype, unexplained acronyms, and claims without showing verifiable data.",
      ],
      tops: "How I went from $0 to $10k in 2 years\nWhy I stopped listening to bank managers\n3 mistakes that cost me $8,000",
      flops: "What is an index fund\nMy full portfolio breakdown\nHow the stock market works",
      ctr: "5.2",
      prova: "Brokerage statement, deposit ledger, and benchmark comparison against index.",
      historias: "My very first $100 deposit; the time I took a blind tip; The Psychology of Money.",
    },
    seeds: [
      { id: "s1", text: "I stopped investing $100/mo into REITs and showed the actual statement on screen", ts: Date.now() - 86400000 * 3 },
      { id: "s2", text: "I tested the portfolio recommended by 3 private bankers for 90 days", ts: Date.now() - 86400000 * 8 },
      { id: "s3", text: "Explaining duration and yield curves for absolute beginners", ts: Date.now() - 86400000 * 12 },
    ],
    creators: [
      {
        id: "creator-dirwen",
        full_name: "Diruen",
        channel: "dirwen",
        avatar_url: null,
        bio: "Audiovisual creator & channel strategist on StudioOS.",
        likes_count: 12,
        completed_projects: 4,
        total_projects: 6,
        ideias_ranqueadas: 28,
        total_runs: 45,
        streak: 8,
      },
      {
        id: "creator-astertest",
        full_name: "Aster Test",
        channel: "astertest",
        avatar_url: null,
        bio: "Testing production workflows, viewer retention, and neural scripting.",
        likes_count: 8,
        completed_projects: 3,
        total_projects: 4,
        ideias_ranqueadas: 19,
        total_runs: 32,
        streak: 5,
      },
      {
        id: "creator-ratoratulho",
        full_name: "Rato Ratulho",
        channel: "ratoratulho",
        avatar_url: null,
        bio: "Exploring new video formats and niche calibrations.",
        likes_count: 5,
        completed_projects: 2,
        total_projects: 3,
        ideias_ranqueadas: 14,
        total_runs: 18,
        streak: 3,
      },
    ],
    tools: {
      rankIdea: "I stopped investing $100/mo into REITs and showed the actual statement on screen",
      titulosTema: "investing $100 per month into index funds",
      titulosTops: "How I went from $0 to $10k in 2 years\nWhy I stopped listening to bank advisors\n3 mistakes that cost me $8,000",
      titulosFlops: "What is an index fund\nMy complete ETF portfolio",
      titulosCtr: "5.2",
      hooksTheme: "investing $100 per month into index funds",
      hooksPromise: "the actual return on screen with verified statements",
      roteiroSample: "I stopped putting $100 a month into REITs. And the reason isn't that I lost money: it's that after 14 months of doing this religiously, I pulled up the statement and realized the math doesn't work when you factor in opportunity cost.",
      roteiroProvoca: "What bank advisors never tell you upfront",
      roteiroCta: "Comment how many dividend funds you own",
      thumbnailTopic: "Bank statement with red vs green balance and highlight",
      thumbnailStyle: "Cinematic contrast, bold Swiss typography, sharp cutout isolation",
      receitaViralText: "I spent 30 days analyzing the top 10 finance channels and noticed they all use the exact same formula in the first 15 seconds: an undeniable number, an accusation against a common villain, and hard proof on screen before the title card.",
      humanizadorRaw: "In this article, we will delve deep into the transformative journey of unlocking your investment potential. It is crucial to remember that optimizing returns in today's world requires a comprehensive guide.",
      scorePostCopy: "I stopped putting $100/month into real estate funds. Here is the actual 14-month statement and why I pivoted my strategy.",
      mentorDoubt: "How do I maximize retention in the first 30 seconds of an educational video without resorting to cheap clickbait?",
      membrosGoal: "Private community for beginner investors featuring weekly portfolio breakdowns and live Q&A sessions.",
    },
  },
  "es": {
    calib: {
      niche: "Finanzas personales para quienes empiezan con poco dinero y quieren invertir sin tecnicismos bancarios.",
      answers: [
        "Personas entre 22 y 35 años que quieren organizar su primer salario y temen perder dinero.",
        "Explicaciones directas con extractos reales en pantalla y decisiones financieras del día a día.",
        "Comparativas con números, pruebas reales durante semanas y errores que yo mismo cometí.",
        "Promesas de dinero rápido, siglas sin explicar y recomendaciones sin mostrar datos comprobables.",
      ],
      tops: "Cómo pasé de $0 a $10.000 en 2 años\nPor qué dejé de escuchar a los gestores de banco\n3 errores que me costaron $8.000",
      flops: "Qué son los fondos indexados\nMi cartera completa de ETFs\nCómo funciona la bolsa de valores",
      ctr: "5.0",
      prova: "Extracto del bróker, hoja de aportes y comparativa frente a depósitos.",
      historias: "Mi primera inversión de $100; cuando seguí un consejo a ciegas; Psicología del dinero.",
    },
    seeds: [
      { id: "s1", text: "Dejé de invertir $100 al mes en fondos inmobiliarios y mostré el extracto en pantalla", ts: Date.now() - 86400000 * 3 },
      { id: "s2", text: "Probé la cartera recomendada por 3 banqueros durante 90 días", ts: Date.now() - 86400000 * 8 },
      { id: "s3", text: "Explicando qué es la duración y la curva de tipos para principiantes", ts: Date.now() - 86400000 * 12 },
    ],
    creators: [
      {
        id: "creator-dirwen",
        full_name: "Diruen",
        channel: "dirwen",
        avatar_url: null,
        bio: "Creador audiovisual y estratega de canales en StudioOS.",
        likes_count: 12,
        completed_projects: 4,
        total_projects: 6,
        ideias_ranqueadas: 28,
        total_runs: 45,
        streak: 8,
      },
      {
        id: "creator-astertest",
        full_name: "Aster Test",
        channel: "astertest",
        avatar_url: null,
        bio: "Probando flujos de producción, retención de audiencia y guiones neuronales.",
        likes_count: 8,
        completed_projects: 3,
        total_projects: 4,
        ideias_ranqueadas: 19,
        total_runs: 32,
        streak: 5,
      },
      {
        id: "creator-ratoratulho",
        full_name: "Rato Ratulho",
        channel: "ratoratulho",
        avatar_url: null,
        bio: "Explorando nuevos formatos y calibraciones de nicho.",
        likes_count: 5,
        completed_projects: 2,
        total_projects: 3,
        ideias_ranqueadas: 14,
        total_runs: 18,
        streak: 3,
      },
    ],
    tools: {
      rankIdea: "Dejé de invertir $100 al mes en fondos inmobiliarios y mostré el extracto en pantalla",
      titulosTema: "invertir $100 al mes en fondos indexados",
      titulosTops: "Cómo pasé de $0 a $10.000 en 2 años\nPor qué dejé de escuchar a los asesores del banco\n3 errores que me costaron $8.000",
      titulosFlops: "Qué son los fondos indexados\nMi cartera completa de ETFs",
      titulosCtr: "5.0",
      hooksTheme: "invertir $100 al mes en fondos indexados",
      hooksPromise: "la rentabilidad real con el extracto bancario en pantalla",
      roteiroSample: "Dejé de meter $100 al mes en fondos inmobiliarios. Y el motivo no es que perdiera dinero: es que tras 14 meses haciéndolo religiosamente, abrí el extracto y me di cuenta de que las cuentas no salen al considerar el coste de oportunidad.",
      roteiroProvoca: "Lo que el gestor del banco nunca te cuenta",
      roteiroCta: "Comenta cuántos fondos tienes en cartera",
      thumbnailTopic: "Extracto bancario con balance rojo vs verde destacado",
      thumbnailStyle: "Contraste cinematográfico, tipografía suiza potente y recorte limpio",
      receitaViralText: "Pasé 30 días analizando los 10 mayores canales de finanzas y descubrí que todos usan la misma fórmula en los primeros 15 segundos: un número impactante, una acusación contra un enemigo común y una prueba irrefutable en pantalla.",
      humanizadorRaw: "En este artículo nos sumergiremos en el fascinante viaje de desbloquear su potencial de inversión. Es importante destacar que optimizar sus rendimientos en el mundo moderno requiere una guía paso a paso.",
      scorePostCopy: "Dejé de invertir $100 al mes en fondos inmobiliarios. Aquí está el extracto real de 14 meses y por qué cambié de estrategia.",
      mentorDoubt: "¿Cómo retener a la audiencia en los primeros 30 segundos sin caer en el clickbait fácil?",
      membrosGoal: "Comunidad privada para inversores principiantes con análisis semanales y directos de preguntas.",
    },
  },
};

/**
 * Returns localized default example data for any supported language.
 * Falls back to Spanish or English if a specific language is not yet in the map.
 */
export function getLocalizedExamples(lang: Language = "pt-BR") {
  if (LOCALIZED_EXAMPLES[lang]) {
    return LOCALIZED_EXAMPLES[lang];
  }
  // Try language code prefix (e.g. "pt-PT" -> "pt-BR")
  if (lang.startsWith("pt")) {
    return LOCALIZED_EXAMPLES["pt-BR"];
  }
  if (lang === "es") {
    return LOCALIZED_EXAMPLES["es"];
  }
  return LOCALIZED_EXAMPLES["en"];
}

export function getLocalizedExampleCalib(lang: Language = "pt-BR"): Calib {
  return getLocalizedExamples(lang).calib;
}

export function getLocalizedSeedIdeas(lang: Language = "pt-BR"): LocalizedSeedIdea[] {
  return getLocalizedExamples(lang).seeds;
}

export function getLocalizedFallbackCreators(lang: Language = "pt-BR"): LocalizedFallbackCreator[] {
  return getLocalizedExamples(lang).creators;
}

export function getLocalizedToolExamples(lang: Language = "pt-BR"): ToolExamples {
  return getLocalizedExamples(lang).tools;
}
