export type Accent = "signal" | "oxide" | "mint" | "sky" | "plum" | "bone";

export const accentText: Record<Accent, string> = {
  signal: "text-signal-400",
  oxide: "text-oxide-400",
  mint: "text-mint-400",
  sky: "text-sky-400",
  plum: "text-plum-400",
  bone: "text-bone-300",
};

export const accentBg: Record<Accent, string> = {
  signal: "bg-signal-400",
  oxide: "bg-oxide-400",
  mint: "bg-mint-400",
  sky: "bg-sky-400",
  plum: "bg-plum-400",
  bone: "bg-bone-200",
};

export const accentSoft: Record<Accent, string> = {
  signal: "bg-signal-400/12 text-signal-300 border-signal-400/25",
  oxide: "bg-oxide-400/12 text-oxide-400 border-oxide-400/25",
  mint: "bg-mint-400/12 text-mint-300 border-mint-400/25",
  sky: "bg-sky-400/12 text-sky-400 border-sky-400/25",
  plum: "bg-plum-400/12 text-plum-400 border-plum-400/25",
  bone: "bg-bone-200/10 text-bone-200 border-bone-200/20",
};

export type Tool = {
  id: string;
  name: string;
  kicker: string;
  desc: string;
  group: "Criação" | "Publicação" | "Estratégia" | "Painel";
  accent: Accent;
  span: string;
  icon: string;
};

export const TOOLS: Tool[] = [
  {
    id: "rank",
    name: "Rank de Ideia",
    kicker: "Score 0–10",
    desc: "Avalie ideias de vídeo com régua calibrada no seu canal.",
    group: "Criação",
    accent: "signal",
    span: "lg:col-span-5",
    icon: "gauge",
  },
  {
    id: "titulos",
    name: "Gerador de Títulos",
    kicker: "Padrões",
    desc: "Títulos que vencem, calibrados com os dados do canal.",
    group: "Criação",
    accent: "oxide",
    span: "lg:col-span-4",
    icon: "type",
  },
  {
    id: "hooks",
    name: "Gerador de Hooks",
    kicker: "6 Variações",
    desc: "Hooks de 2 linhas com 6 ângulos diferentes.",
    group: "Criação",
    accent: "mint",
    span: "lg:col-span-3",
    icon: "bolt",
  },
  {
    id: "roteiro",
    name: "Roteiro & Gravação",
    kicker: "Teleprompter",
    desc: "Roteiros na voz do criador, prontos pro teleprompter.",
    group: "Criação",
    accent: "sky",
    span: "lg:col-span-5",
    icon: "mic",
  },
  {
    id: "thumbnail",
    name: "Briefing Thumbnail",
    kicker: "Composição",
    desc: "Composição e briefing de arte calibrados no canal.",
    group: "Criação",
    accent: "plum",
    span: "lg:col-span-4",
    icon: "frame",
  },
  {
    id: "receita",
    name: "Receita Viral",
    kicker: "Replicar",
    desc: "Capture a fórmula de posts que performaram e replique.",
    group: "Publicação",
    accent: "signal",
    span: "lg:col-span-3",
    icon: "flask",
  },
  {
    id: "humanizador",
    name: "Humanizador",
    kicker: "Anti-IA",
    desc: "Reescreva textos que soam como IA com ritmo humano.",
    group: "Publicação",
    accent: "oxide",
    span: "lg:col-span-4",
    icon: "wave",
  },
  {
    id: "score",
    name: "Score de Post",
    kicker: "Score 0–50",
    desc: "Nota de 0 a 50 em 5 critérios antes de publicar.",
    group: "Publicação",
    accent: "mint",
    span: "lg:col-span-4",
    icon: "check",
  },
  {
    id: "mentor",
    name: "Mentor AI",
    kicker: "24 Frameworks",
    desc: "Pensamento de criador profissional com 24 modelos mentais.",
    group: "Estratégia",
    accent: "sky",
    span: "lg:col-span-4",
    icon: "brain",
  },
  {
    id: "membros",
    name: "Área de Membros",
    kicker: "Monetização",
    desc: "Planeje a arquitetura de cursos, aulas e entregáveis.",
    group: "Estratégia",
    accent: "plum",
    span: "lg:col-span-3",
    icon: "layers",
  },
  {
    id: "calibracao",
    name: "Calibração do Canal",
    kicker: "Base de dados",
    desc: "O painel só acerta se conhecer o seu canal de verdade.",
    group: "Painel",
    accent: "bone",
    span: "lg:col-span-4",
    icon: "dial",
  },
  {
    id: "wiki",
    name: "Wiki do Painel",
    kicker: "Ajuda",
    desc: "Aprenda a usar cada ferramenta e extrair o máximo.",
    group: "Painel",
    accent: "bone",
    span: "lg:col-span-5",
    icon: "book",
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<string, Tool>;

export type Framework = {
  n: string;
  title: string;
  group: string;
  question: string;
  lens: string;
  output: string[];
};

export const FRAMEWORKS: Framework[] = [
  { n: "01", title: "Curva de confiança", group: "Posicionamento", question: "Quanto o público já confia em você — e o que essa curva permite pedir agora?", lens: "Confiança é capital. Gaste um pouco por vídeo, reponha com prova.", output: ["Mapa do nível atual de confiança", "Próxima promessa segura", "Prova a mostrar no vídeo"] },
  { n: "02", title: "Teto de espectadores", group: "Diagnóstico", question: "Quantas pessoas no mundo se interessariam por esse tema, no máximo?", lens: "Se o teto é baixo, o vídeo é nichado demais para o algoritmo empurrar.", output: ["Estimativa do teto", "Como ampliar o apelo", "Quando aceitar o teto baixo"] },
  { n: "03", title: "O algoritmo mudou", group: "Diagnóstico", question: "O que caiu no seu canal: distribuição, empacotamento ou interesse?", lens: "Algoritmo é espelho de audiência. Não brigue com o espelho.", output: ["Diagnóstico das 3 camadas", "Teste de 2 semanas", "Métrica de saída"] },
  { n: "04", title: "Vídeo flopou: diagnóstico", group: "Diagnóstico", question: "Foi clique (CTR) ou foi retenção?", lens: "CTR baixo = empacotamento. Retenção baixa = promessa não cumprida.", output: ["Leitura CTR × retenção", "Causa raiz", "Correção aplicável"] },
  { n: "05", title: "Medidor de views I", group: "Diagnóstico", question: "Quantas views esse tema teria em um canal 10× maior que o seu?", lens: "Compare com o teto do nicho, não com a sua média.", output: ["Benchmark de nicho", "Gap de execução", "Meta realista"] },
  { n: "06", title: "Medidor de views II", group: "Diagnóstico", question: "Qual foi a melhor performance recente — e o que ela tem em comum?", lens: "Seu outlier é o melhor briefing que existe.", output: ["Padrão dos outliers", "Filha direta do outlier", "Régua de aprovação"] },
  { n: "07", title: "Efeito multiplicador", group: "Estratégia", question: "Qual vídeo pode virar 5 outros vídeos sem esforço extra?", lens: "Um pilar bem gravado rende cortes, Shorts, post e aula.", output: ["Pilar escolhido", "5 derivações", "Ordem de publicação"] },
  { n: "08", title: "Curva de especialização", group: "Posicionamento", question: "Você está espalhado demais para ser lembrado por algo?", lens: "Autoridade nasce da repetição com variação.", output: ["Território central", "3 fronteiras seguras", "Temas a abandonar"] },
  { n: "09", title: "Variáveis de um vídeo", group: "Criação", question: "Tema, ângulo, formato e prova — quais você mudou dessa vez?", lens: "Mude uma variável por vez ou não aprende nada.", output: ["Variável do teste", "Controle", "Leitura de resultado"] },
  { n: "10", title: "YouTube Ikigai", group: "Posicionamento", question: "O que você ama, sabe, o mundo quer ver e paga — onde cruza?", lens: "Fora do cruzamento, o canal morre por tédio ou por falta de demanda.", output: ["Os 4 círculos preenchidos", "Cruzamento viável", "Formato do cruzamento"] },
  { n: "11", title: "Vídeo Ikigai", group: "Criação", question: "Esse vídeo específico está no cruzamento dos 4 círculos?", lens: "Aplique o Ikigai por vídeo, não só por canal.", output: ["Nota por círculo", "Ajuste de ângulo", "Sinal verde/vermelho"] },
  { n: "12", title: "Creator Ikigai", group: "Posicionamento", question: "Qual rotina de criação você sustenta por 3 anos sem queimar?", lens: "Consistência é consequência de desenho, não de disciplina.", output: ["Ritmo sustentável", "Gargalos de produção", "Corte de etapas"] },
  { n: "13", title: "Marca Ikigai", group: "Posicionamento", question: "Que promessa a sua marca faz quando você não está na sala?", lens: "Marca é o que sobra quando o vídeo acaba.", output: ["Promessa em 1 frase", "Prova recorrente", "Tom de voz"] },
  { n: "14", title: "Aura, os 4 A", group: "Posicionamento", question: "Autoridade, Afinidade, Autenticidade e Alcance — qual está fraco?", lens: "Os 4 A explicam por que uns crescem e outros só acumulam views.", output: ["Diagnóstico dos 4", "A prioritário", "Ação de 30 dias"] },
  { n: "15", title: "Anatomia de um hook", group: "Criação", question: "Nos 3 primeiros segundos existe tese, número e tensão?", lens: "Hook não é introdução. Hook é a entrega imediata do ouro.", output: ["Tese na linha 1", "Número cru", "Tensão aberta"] },
  { n: "16", title: "Ordem de importância", group: "Criação", question: "Empacotamento, retenção ou produção — onde investir agora?", lens: "Ordem errada de investimento é o motivo nº 1 de canal estagnado.", output: ["Prioridade atual", "O que não fazer", "Sequência de 60 dias"] },
  { n: "17", title: "Melhor rede social", group: "Estratégia", question: "Onde o seu formato rende mais com o mesmo esforço?", lens: "Uma rede principal, uma de corte, uma de texto. Nada além.", output: ["Rede principal", "Rede de reaproveitamento", "Rede a largar"] },
  { n: "18", title: "Bloqueio criativo", group: "Criação", question: "É falta de ideia, falta de repertório ou medo de julgamento?", lens: "Bloqueio quase nunca é criativo. É de decisão ou de exposição.", output: ["Tipo de bloqueio", "Destravador imediato", "Banco de 10 ideias"] },
  { n: "19", title: "Estrutura de três atos", group: "Criação", question: "Tese, escalada e entregável estão claros no seu roteiro?", lens: "Três atos funcionam até em vídeo de 60 segundos.", output: ["Ato 1 (tese)", "Ato 2 (escalada)", "Ato 3 (entregável)"] },
  { n: "20", title: "4 alavancas de vídeos", group: "Estratégia", question: "Ideia, título, thumb ou ritmo — qual alavanca puxar primeiro?", lens: "Puxe uma alavanca por ciclo e meça.", output: ["Alavanca do ciclo", "Como puxar", "Métrica de leitura"] },
  { n: "21", title: "Trindade do conteúdo", group: "Criação", question: "O vídeo educa, entretém ou inspira — e faz os três?", lens: "Conteúdo que só faz um dos três tem teto baixo.", output: ["Peso de cada pilar", "O que falta", "Cena a adicionar"] },
  { n: "22", title: "Método científico", group: "Estratégia", question: "Qual hipótese você está testando neste vídeo?", lens: "Canal é laboratório: hipótese, teste, leitura, ajuste.", output: ["Hipótese", "Experimento", "Critério de sucesso"] },
  { n: "23", title: "Fórmula do valor", group: "Criação", question: "Densidade × relevância ÷ esforço do espectador — quanto dá?", lens: "Valor é o que sobra depois que o custo de assistir foi pago.", output: ["Nota de densidade", "Nota de relevância", "Corte de esforço"] },
  { n: "24", title: "Nicho dentro de nicho", group: "Posicionamento", question: "Qual sub-território você pode dominar antes de ampliar?", lens: "Ser o nº 1 de um nicho pequeno rende mais que o nº 40 de um grande.", output: ["Sub-nicho alvo", "Série de 5 vídeos", "Ponte de expansão"] },
];

export const FRAMEWORK_GROUPS = [
  "Ideação & Tema",
  "Título & Hook",
  "Diagnóstico",
  "Posicionamento",
];

export type WikiEntry = {
  id: string;
  cat: string;
  title: string;
  lede: string;
  how: string;
  bullets: string[];
};

export const WIKI: WikiEntry[] = [
  {
    id: "rank",
    cat: "Criação",
    title: "Rank de Ideia",
    lede: "Sistema de pontuação de 0 a 10 para validar ideias de vídeos antes de gravar.",
    how: "Primeiro você calibra a ferramenta informando o nicho do canal. Depois digite sua ideia de vídeo. O painel avalia 5 critérios essenciais.",
    bullets: ["Pool de Atenção", "Prova Visual", "Conexão Pessoal", "Fit com o Canal", "Fator Outlier"],
  },
  {
    id: "titulos",
    cat: "Criação",
    title: "Gerador de Títulos",
    lede: "Criação de títulos otimizados para clique (CTR) baseados em padrões virais.",
    how: "Você insere o assunto principal do vídeo e a ferramenta aplica frameworks comprovados no YouTube. O resultado são opções focadas em curiosidade, benefício claro ou quebra de expectativa.",
    bullets: ["Número na frente", "Contrário", "Transformação", "Autoridade emprestada", "Confissão", "Choque de futuro"],
  },
  {
    id: "hooks",
    cat: "Criação",
    title: "Gerador de Hooks",
    lede: "Scripts para os primeiros segundos do vídeo que prendem a atenção instantaneamente.",
    how: "Oferece 6 abordagens diferentes em até 2 linhas. Ideais para Shorts, Reels, TikTok ou para garantir retenção na introdução de vídeos longos.",
    bullets: ["Número na frente", "Contrário", "Transformação", "Autoridade emprestada", "Confissão", "Choque de futuro"],
  },
  {
    id: "thumbnail",
    cat: "Criação",
    title: "Briefing Thumbnail",
    lede: "Direcionamento visual para designers ou para você mesmo criar capas magnéticas.",
    how: "A ferramenta estrutura a composição visual da miniatura: elementos da cena, personagens e expressões, paleta, fontes e o texto exato que vai na imagem.",
    bullets: ["Composição 45/45", "Cor e acabamento", "Slot da pauta", "Regra de ouro: nunca regenerar o rosto"],
  },
  {
    id: "roteiro",
    cat: "Criação",
    title: "Roteiro & Teleprompter",
    lede: "Módulo completo para escrever e gravar com leitura fluida na tela.",
    how: "Dividido em abas: primeiro você define a Voz do Canal (ritmo, tom, jargões). Depois estrutura o roteiro em blocos — Hook, Contexto, Desenvolvimento e CTA. Ao final, abra o Teleprompter, ajuste a velocidade e grave.",
    bullets: ["Motor de voz calibrado", "4 blocos de roteiro", "Checklist de qualidade", "Teleprompter com velocidade ajustável"],
  },
  {
    id: "humanizador",
    cat: "Publicação",
    title: "Humanizador",
    lede: "Filtro anti-robô para textos gerados por IA.",
    how: "Se o texto saiu engessado do ChatGPT ou do Claude, cole aqui. O Humanizador detecta palavras batidas de IA, analisa a variação do tamanho das frases (burstiness) e sugere cortes para deixar a leitura natural e rítmica.",
    bullets: ["Dicionário anti-IA", "Índice de burstiness", "Marcação linha a linha", "Sugestões de reescrita"],
  },
  {
    id: "receita",
    cat: "Publicação",
    title: "Receita Viral",
    lede: "Engenharia reversa de conteúdos que já deram certo no seu nicho ou fora dele.",
    how: "Você fornece o texto de um post que performou muito bem. A ferramenta extrai a estrutura base, o tom emocional e o padrão, e permite aplicar a mesma receita no seu tema sem parecer cópia.",
    bullets: ["Estrutura em 5 partes", "Tom emocional", "Insu­mo que só você tem", "Guardrail: espelhe, não copie"],
  },
  {
    id: "score",
    cat: "Publicação",
    title: "Score de Post",
    lede: "Avaliação final de 0 a 50 antes de apertar o botão Publicar.",
    how: "Analisa seu rascunho e dá uma pontuação objetiva em 5 critérios. Acima de 40, está pronto para publicação.",
    bullets: ["Hook (0–10)", "Voz / burstiness (0–10)", "Valor e densidade (0–10)", "Estrutura (0–10)", "Prontidão anti-clichê (0–10)"],
  },
  {
    id: "mentor",
    cat: "Estratégia",
    title: "Mentor AI (24 FW)",
    lede: "Consultoria 24h com base em 24 modelos mentais de criação e negócios.",
    how: "Diferente de um chat normal, o Mentor AI avalia suas dúvidas usando frameworks de grandes estrategistas de conteúdo. Peça ajuda para destrinchar uma linha editorial, resolver empacotamento ou diagnosticar retenção.",
    bullets: ["24 frameworks navegáveis", "Filtro por grupo", "Lente + pergunta-gatilho", "Entregáveis por framework"],
  },
  {
    id: "membros",
    cat: "Estratégia",
    title: "Área de Membros",
    lede: "Planejamento e estruturação de cursos e entregáveis fechados.",
    how: "Seção focada na arquitetura de ensino: organizar conteúdo de infoprodutos, planejar módulos, roteirizar aulas densas, listar materiais de apoio e garantir que a jornada do aluno cumpra a promessa de transformação.",
    bullets: ["Meta e situação", "Tamanho real da audiência", "Conteúdo e formato", "Precificação e promessa"],
  },
];

export const AI_CLICHES = [
  "jornada",
  "mergulhar",
  "mergulhe",
  "neste post",
  "neste artigo",
  "otimizar",
  "otimize",
  "desbloquear",
  "destravar",
  "game changer",
  "revolucionar",
  "elevar",
  "alavancar",
  "potencializar",
  "no mundo de hoje",
  "em um mundo",
  "cada vez mais",
  "sem mais delongas",
  "vale lembrar",
  "é importante notar",
  "importante ressaltar",
  "em resumo",
  "conclusão",
  "abraçar",
  "transformador",
  "incrível",
  "poderoso",
  "dicas práticas",
  "passo a passo completo",
  "segredos",
  "além disso",
  "por outro lado",
  "em suma",
  "maximizar",
  "aproveitar ao máximo",
  "levando em consideração",
  "no cenário atual",
  "de forma eficiente",
  "robusto",
  "inovador",
];

export const CALIBRATION_QUESTIONS = [
  "Qual o nicho do canal, em 1 frase?",
  "Cite 3 vídeos que performaram acima da média e 3 que flopparam.",
  "Qual tipo de vídeo você grava com prova visível na tela?",
  "Histórias próprias ou livros que costuma contar?",
];

export const CALIBRATION_TITLES = [
  { kind: "top", text: "5 títulos que mais performaram" },
  { kind: "flop", text: "5 que flopparam" },
  { kind: "ctr", text: "CTR médio do canal" },
];

export const MEMBERSHIP_SECTIONS = [
  {
    title: "Meta e Situação",
    questions: [
      "Quanto quer ganhar/mês com membros?",
      "Membros atuais e renda?",
      "Já teve área antes?",
    ],
  },
  {
    title: "Tamanho Real da Audiência",
    questions: [
      "Quantos inscritos?",
      "Views por mês (total)?",
      "Espectadores únicos/mês?",
      "% novos / casuais / recorrentes?",
    ],
  },
  {
    title: "Conteúdo",
    questions: [
      "% views de Shorts?",
      "Nicho (1 frase)",
      "Vídeos/mês e tempo cada?",
      "Faz live? Frequência e pico?",
      "3 vídeos top + 3 flops",
      "Assunto que o público ama mas não performa?",
      "Já vende algo?",
    ],
  },
];

export const VOICE_PATTERNS = [
  "Abre com a tese ou resultado, antes do contexto",
  "Segunda pessoa direta, conselho de amigo",
  "Provocação com humor, nunca ataque gratuito",
  "Confissão como prova de honestidade",
  "Número cru no gancho",
  "Promessa de entregável no começo",
];

export const SCRIPT_BLOCKS = [
  { id: "hook", label: "Hook", note: "Tese + número cru", target: "15s" },
  { id: "contexto", label: "Contexto Curto", note: "Máx. 30s", target: "30s" },
  { id: "dev", label: "Desenvolvimento", note: "2 a 4 blocos", target: "6–10min" },
  { id: "cta", label: "Entregável e CTA", note: "CTA recorrente", target: "45s" },
];

export const QUALITY_CHECKS = [
  { q: "Tese na primeira frase?", a: "Zero aquecimento. Entregue o ouro no 1º segundo." },
  { q: "Tem número cru no gancho?", a: "Resultados reais geram curiosidade." },
  { q: "Lê em voz alta como humano?", a: "Sem travessão, sem parênteses, sem emoji." },
  { q: "Vídeo abaixo de 15 minutos?", a: "Público abandona rápido. Corte a gordura." },
];

export const THUMB_COMPOSITION = [
  "Apresentador à direita ocupando 45% da largura",
  "Slot da pauta à esquerda com 45%",
  "Olhar direcionado para o lado da pauta",
  "Elemento de marca central cruzando a linha central",
  "Sem texto na thumb",
];

export const THUMB_COLOR = [
  "Lado da pauta com cor e profundidade (bokeh ou textura)",
  "Contraste alto entre apresentador e fundo",
  "Pele natural, saturação alta só nas luzes de fundo",
];

export const HOOK_ANGLES = [
  { id: "numero", name: "Número na frente", desc: "Dado cru primeiro, contexto depois." },
  { id: "contrario", name: "Contrário", desc: "Afirma o senso comum e quebra em seguida." },
  { id: "transformacao", name: "Transformação", desc: "De um estado para outro, com prazo." },
  { id: "autoridade", name: "Autoridade emprestada", desc: "Nome grande + descoberta pessoal." },
  { id: "confissao", name: "Confissão", desc: "Erro próprio como prova de honestidade." },
  { id: "futuro", name: "Choque de futuro", desc: "Mudança próxima + quem sente primeiro." },
];

export const TITLE_PATTERNS = [
  { id: "numero", name: "Número na frente", tag: "1ª pessoa + verbo de ação + consequência" },
  { id: "mudanca", name: "Mudança + urgência", tag: "Padrão: mudança + urgência" },
  { id: "confissao", name: "Confissão com humor", tag: "Padrão: confissão com humor" },
  { id: "lista", name: "Número específico + sistema", tag: "Padrão: número específico + sistema" },
  { id: "contrario", name: "Contrário / Quebra", tag: "Padrão: quebra de expectativa" },
];
