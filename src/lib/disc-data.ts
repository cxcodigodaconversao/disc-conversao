export interface DISCAdjective {
  text: string;
  factor: 'D' | 'I' | 'S' | 'C';
}

export interface DISCGroup {
  group: number;
  adjectives: DISCAdjective[];
}

export interface ValuePhrase {
  text: string;
  value: 'theoretical' | 'economic' | 'aesthetic' | 'social' | 'political' | 'spiritual';
}

export interface ValueGroup {
  group: number;
  phrases: ValuePhrase[];
}

export interface DISCDescriptor {
  level: number;
  D: string;
  I: string;
  S: string;
  C: string;
}

export interface FactorAnalysis {
  naturalTrait: string;
  naturalDescription: string;
  adaptedDirection: 'crescente' | 'decrescente' | 'equilibrado';
  adaptedAnalysis: string;
  perceptionAnalysis?: string;
  demandAnalysis?: string;
}

export interface DISCProfileFullContent {
  name: string;
  description: string;
  fullDescription: string;
  potentials: string;
  interpersonalRelations: string;
  decisionMaking: string;
  primaryMotivator: { title: string; description: string };
  secondaryMotivator: { title: string; description: string };
  fears: string[];
  organizationalFit: string;
  problemSolving: string[];
  developmentAreas: string[];
  communicationTips: { doList: string[]; dontList: string[] };
}

// Tabela completa de descritores DISC por nível de intensidade (0-100)
export const DISC_DESCRIPTORS: DISCDescriptor[] = [
  { level: 99, D: "Arrogante", I: "Insinuante", S: "Hesitante", C: "Temeroso" },
  { level: 96, D: "Ditador", I: "Encantador", S: "Indeciso", C: "Ansioso" },
  { level: 94, D: "Egocêntrico", I: "Eloquente", S: "Amável", C: "Calculista" },
  { level: 91, D: "Impetuoso", I: "Persuasivo", S: "Pacífico", C: "Questionador" },
  { level: 88, D: "Dominador", I: "Inspirador", S: "Previsível", C: "Reservado" },
  { level: 85, D: "Vigoroso", I: "Entusiasta", S: "Estável", C: "Preciso" },
  { level: 83, D: "Audacioso", I: "Sociável", S: "Leal", C: "Sistemático" },
  { level: 81, D: "Competitivo", I: "Comunicativo", S: "Cooperativo", C: "Organizado" },
  { level: 78, D: "Firme", I: "Expressivo", S: "Paciente", C: "Meticuloso" },
  { level: 76, D: "Decidido", I: "Espontâneo", S: "Calmo", C: "Detalhista" },
  { level: 73, D: "Ativo", I: "Otimista", S: "Sereno", C: "Cuidadoso" },
  { level: 70, D: "Direto", I: "Animado", S: "Gentil", C: "Criterioso" },
  { level: 65, D: "Determinado", I: "Positivo", S: "Consistente", C: "Analítico" },
  { level: 62, D: "Autoconfiante", I: "Caloroso", S: "Acessível", C: "Prudente" },
  { level: 60, D: "Objetivo", I: "Amigável", S: "Receptivo", C: "Reflexivo" },
  { level: 57, D: "Pragmático", I: "Agradável", S: "Harmonioso", C: "Ponderado" },
  { level: 54, D: "Assertivo", I: "Cordial", S: "Moderado", C: "Equilibrado" },
  { level: 50, D: "Equilibrado", I: "Equilibrado", S: "Equilibrado", C: "Equilibrado" },
  { level: 46, D: "Cauteloso", I: "Discreto", S: "Adaptável", C: "Flexível" },
  { level: 44, D: "Conservador", I: "Reservado", S: "Dinâmico", C: "Intuitivo" },
  { level: 41, D: "Calculado", I: "Formal", S: "Ágil", C: "Rápido" },
  { level: 39, D: "Ponderado", I: "Sério", S: "Ativo", C: "Espontâneo" },
  { level: 35, D: "Hesitante", I: "Contido", S: "Inquieto", C: "Independente" },
  { level: 30, D: "Pacífico", I: "Introspectivo", S: "Impaciente", C: "Autônomo" },
  { level: 26, D: "Moderado", I: "Tímido", S: "Multitarefa", C: "Prático" },
  { level: 21, D: "Passivo", I: "Retraído", S: "Versátil", C: "Abstrato" },
  { level: 15, D: "Submisso", I: "Distante", S: "Inquieto", C: "Conceitual" },
  { level: 10, D: "Conformado", I: "Isolado", S: "Impulsivo", C: "Visionário" },
  { level: 5, D: "Acomodado", I: "Silencioso", S: "Instável", C: "Não-convencional" }
];

// Perfis completos DISC com todo o conteúdo detalhado
export const FULL_PROFILES: Record<string, DISCProfileFullContent> = {
  'IS': {
    name: "Planejador-Comunicador",
    description: "Pessoa sociável, estável e focada em harmonia. Combina comunicação calorosa com lealdade e consistência.",
    fullDescription: `Você é uma pessoa naturalmente equilibrada entre a necessidade de interação social e a busca por estabilidade. Sua personalidade combina o calor humano e a capacidade de comunicação com a lealdade, paciência e consistência características de quem valoriza ambientes harmoniosos e previsíveis.

Esse perfil é marcado pela habilidade de criar conexões genuínas com as pessoas, mantendo ao mesmo tempo um ritmo de trabalho constante e confiável. Você se destaca por sua capacidade de ouvir, apoiar e colaborar com os outros, sempre buscando manter um clima positivo e evitar conflitos desnecessários.

Sua abordagem ao trabalho privilegia a cooperação e o trabalho em equipe. Você prefere ambientes onde as relações são valorizadas, onde há tempo para construir confiança mútua e onde mudanças são implementadas de forma gradual e bem comunicada. A estabilidade e a previsibilidade são importantes para você, pois permitem que você desenvolva suas tarefas com qualidade e atenção aos detalhes humanos.

No entanto, esse perfil também pode enfrentar desafios em situações que exigem decisões rápidas, confrontos diretos ou mudanças abruptas. Você pode ter dificuldade em dizer "não", em estabelecer limites claros ou em lidar com ambientes de alta pressão e competitividade. O desenvolvimento da assertividade e da capacidade de adaptação a mudanças pode ser um foco importante de crescimento pessoal.`,
    potentials: "Excelente capacidade de relacionamento interpessoal, criando vínculos de confiança duradouros. Habilidade natural para trabalhar em equipe, mediando conflitos e promovendo harmonia. Comunicação empática e calorosa, que inspira cooperação. Lealdade e consistência no cumprimento de compromissos. Paciência para desenvolver projetos de longo prazo com atenção às pessoas envolvidas.",
    interpersonalRelations: "Nas relações interpessoais, você é caloroso, acessível e genuinamente interessado nas pessoas. Busca criar conexões profundas e duradouras, investindo tempo e energia em conhecer bem seus colegas e colaboradores. Prefere ambientes onde a comunicação é aberta, respeitosa e onde há espaço para expressar sentimentos e preocupações. Você é visto como alguém confiável, que está sempre disposto a ajudar e apoiar os outros.",
    decisionMaking: "Sua tomada de decisão é cautelosa e ponderada, levando em consideração o impacto das escolhas nas pessoas envolvidas. Você prefere consultar outros, ouvir diferentes perspectivas e buscar consenso antes de agir. Evita decisões precipitadas ou que possam gerar conflitos. Em situações de pressão, pode ter dificuldade em decidir rapidamente, preferindo ter tempo para avaliar todas as implicações e manter a harmonia do grupo.",
    primaryMotivator: {
      title: "Relações Harmoniosas",
      description: "Seu principal motivador é a qualidade das relações humanas no ambiente de trabalho. Você se sente energizado quando trabalha em equipes colaborativas, onde há respeito mútuo, comunicação aberta e onde as pessoas se apoiam genuinamente. Ambientes onde você pode construir amizades profissionais significativas e contribuir para o bem-estar coletivo são ideais para você. O reconhecimento vindo de pessoas que você respeita e admira tem grande valor. Você se realiza quando pode ajudar outros a crescerem e quando sente que faz parte de algo maior que si mesmo."
    },
    secondaryMotivator: {
      title: "Estabilidade e Previsibilidade",
      description: "Um motivador secundário importante é a segurança e a previsibilidade no ambiente profissional. Você valoriza processos claros, expectativas bem definidas e um ritmo de trabalho consistente. Mudanças constantes ou ambientes caóticos podem ser desmotivadores. Você se sente mais confortável quando há estrutura, quando sabe o que esperar e quando tem tempo adequado para se adaptar a novas situações. A possibilidade de desenvolver expertise e aprofundar conhecimentos em sua área também é motivadora."
    },
    fears: [
      "Conflitos e confrontos diretos que possam prejudicar relacionamentos",
      "Mudanças abruptas sem tempo adequado para adaptação",
      "Ambientes competitivos e hostis onde a cooperação não é valorizada",
      "Ser forçado a tomar decisões rápidas sem poder consultar outros",
      "Isolamento social ou exclusão do grupo",
      "Perda de estabilidade e segurança no trabalho",
      "Decepcionar pessoas importantes ou quebrar sua confiança",
      "Ter que lidar com situações de alta pressão e urgência constante",
      "Ambientes onde as relações são superficiais e transacionais"
    ],
    organizationalFit: `Você se adapta melhor a organizações que valorizam o trabalho em equipe, a colaboração e o desenvolvimento de relações de longo prazo. Ambientes onde há uma cultura de respeito mútuo, comunicação aberta e onde as pessoas são vistas como o ativo mais importante da organização são ideais.

Funções que envolvem atendimento ao cliente, suporte, recursos humanos, educação, trabalho social ou qualquer área onde o relacionamento interpessoal é central tendem a ser muito satisfatórias. Você também se destaca em papéis de suporte a equipes, coordenação de projetos colaborativos ou em posições onde pode atuar como elo entre diferentes grupos.

Organizações com processos estáveis, onde mudanças são implementadas de forma planejada e comunicada, e onde há oportunidade de crescimento gradual e contínuo são as mais adequadas. Evite ambientes altamente competitivos, de ritmo muito acelerado ou onde a rotatividade de pessoas é alta, pois esses contextos podem ser estressantes e desmotivadores para seu perfil.`,
    problemSolving: [
      "Busca soluções consensuais envolvendo todas as partes interessadas",
      "Prefere abordar problemas de forma colaborativa e não competitiva",
      "Valoriza o tempo necessário para encontrar soluções sustentáveis",
      "Considera o impacto humano das decisões tomadas",
      "Procura manter a harmonia enquanto resolve questões técnicas"
    ],
    developmentAreas: [
      "Desenvolver maior assertividade para expressar opiniões divergentes",
      "Aprender a lidar com conflitos de forma mais direta quando necessário",
      "Aumentar a tolerância a mudanças e ambientes dinâmicos",
      "Praticar a tomada de decisões mais rápidas em situações de pressão",
      "Estabelecer limites claros sem temer prejudicar relacionamentos",
      "Desenvolver maior conforto com competição saudável"
    ],
    communicationTips: {
      doList: [
        "Seja caloroso e genuíno, demonstrando interesse pelas pessoas",
        "Reserve tempo adequado para conversas sem pressão",
        "Mostre apreciação por suas contribuições e lealdade",
        "Forneça contexto sobre mudanças com antecedência",
        "Crie ambiente seguro onde podem expressar preocupações",
        "Valorize suas ideias colaborativas e visão de equipe"
      ],
      dontList: [
        "Não seja abrupto ou excessivamente direto",
        "Evite confrontos públicos ou críticas na frente de outros",
        "Não imponha mudanças sem explicação ou preparação",
        "Não crie ambientes de competição acirrada",
        "Evite pressão excessiva por resultados imediatos",
        "Não ignore a importância das relações pessoais"
      ]
    }
  },
  'D': {
    name: "Executor",
    description: "Pessoa direta, focada em resultados e orientada para ação. Assume desafios com confiança e determinação.",
    fullDescription: `Você é uma pessoa naturalmente orientada para resultados, com forte senso de urgência e determinação. Seu perfil é marcado pela capacidade de tomar decisões rápidas, assumir riscos calculados e enfrentar desafios de frente. Você não tem medo de assumir responsabilidades e prefere estar no controle das situações.

Sua abordagem ao trabalho é prática e objetiva. Você se concentra no que precisa ser feito e age rapidamente para alcançar metas. A eficiência e a produtividade são valores centrais, e você tem pouca paciência para processos lentos ou burocráticos que não agregam valor direto aos resultados.

Em ambientes profissionais, você tende a assumir naturalmente posições de liderança, mesmo quando não é formalmente designado. Sua confiança e assertividade inspiram outros a seguirem sua direção. No entanto, pode haver desafios em situações que exigem paciência, diplomacia ou atenção a detalhes que você considera secundários.

Você se motiva por desafios significativos e pela oportunidade de fazer diferença mensurável. Ambientes de alta pressão não apenas não te incomodam, mas podem até energizar você, desde que haja autonomia para agir e clara conexão entre esforço e resultados.`,
    potentials: "Capacidade excepcional de liderança e tomada de decisão rápida. Coragem para assumir riscos e enfrentar situações difíceis. Alta produtividade e foco em resultados. Habilidade para motivar outros através da ação e exemplo. Eficiência em superar obstáculos e resolver problemas práticos rapidamente.",
    interpersonalRelations: "Nas relações interpessoais, você é direto e valoriza transparência. Prefere comunicação objetiva e pode se frustrar com excessiva formalidade ou 'rodeios'. Respeita pessoas que demonstram competência e confiança. Pode ser percebido como intimidador por perfis mais sensíveis, embora sua intenção seja apenas ser eficiente.",
    decisionMaking: "Você toma decisões de forma rápida e confiante, baseando-se em informações disponíveis e intuição. Prefere agir e ajustar depois do que esperar por informações perfeitas. Assume a responsabilidade pelas consequências de suas escolhas sem hesitação.",
    primaryMotivator: {
      title: "Desafios e Conquistas",
      description: "Você se motiva principalmente por desafios significativos e pela oportunidade de alcançar resultados impressionantes. Metas ambiciosas energizam você, especialmente quando há clara medição de sucesso. A possibilidade de superar obstáculos difíceis e provar sua capacidade é extremamente motivadora."
    },
    secondaryMotivator: {
      title: "Autonomia e Controle",
      description: "Ter autonomia para tomar decisões e controlar o próprio destino profissional é crucial para sua satisfação. Você se frustra em ambientes onde precisa pedir permissão constantemente ou onde há excesso de controle sobre como você trabalha."
    },
    fears: [
      "Perder controle sobre situações importantes",
      "Ser visto como fraco ou incompetente",
      "Ambientes que limitam sua capacidade de agir",
      "Processos lentos que impedem progresso",
      "Dependência excessiva de outros para resultados",
      "Estagnação ou falta de desafios",
      "Ser manipulado ou controlado por outros"
    ],
    organizationalFit: `Você se adapta melhor a organizações dinâmicas, orientadas para crescimento e resultados. Ambientes de startup, vendas competitivas, gestão de projetos desafiadores ou qualquer função onde há clara conexão entre desempenho e recompensa são ideais.

Posições de liderança, gestão de mudanças, desenvolvimento de novos negócios ou funções que exigem tomada rápida de decisões são especialmente adequadas. Evite ambientes excessivamente burocráticos ou onde a política organizacional é mais importante que resultados.`,
    problemSolving: [
      "Identifica rapidamente o cerne do problema",
      "Age decisivamente para implementar soluções",
      "Assume riscos calculados quando necessário",
      "Foca em resultados práticos e mensuráveis",
      "Não se intimida com a magnitude dos desafios"
    ],
    developmentAreas: [
      "Desenvolver mais paciência com processos e pessoas",
      "Aprimorar habilidades de escuta ativa",
      "Considerar mais o impacto emocional das decisões nos outros",
      "Dar mais tempo para análise detalhada quando apropriado",
      "Delegar com mais confiança em vez de sempre assumir controle"
    ],
    communicationTips: {
      doList: [
        "Seja direto e objetivo, vá direto ao ponto",
        "Apresente fatos e resultados concretos",
        "Reconheça suas conquistas e competência",
        "Dê autonomia e evite micro-gerenciamento",
        "Forneça desafios significativos",
        "Respeite seu tempo e eficiência"
      ],
      dontList: [
        "Não seja excessivamente emocional ou pessoal",
        "Evite detalhes desnecessários ou explanações longas",
        "Não questione suas decisões publicamente",
        "Evite limitar sua autonomia sem motivo claro",
        "Não demore para dar feedback ou tomar decisões",
        "Não interprete sua assertividade como agressividade"
      ]
    }
  },
  'I': {
    name: "Comunicador",
    description: "Pessoa extrovertida, entusiasta e persuasiva. Inspira e influencia outros através de comunicação calorosa.",
    fullDescription: `Você é uma pessoa naturalmente extrovertida e comunicativa, que se energiza através de interações sociais. Seu perfil é marcado pelo entusiasmo contagiante, otimismo e habilidade natural para influenciar e inspirar outros. Você tem facilidade para criar conexões rapidamente e construir redes amplas de relacionamentos.

Sua abordagem ao trabalho é colaborativa e criativa. Você prefere ambientes dinâmicos onde pode interagir com pessoas diversas e onde suas ideias são valorizadas. A inovação e a criatividade fluem naturalmente quando você está em ambientes estimulantes e sociais.

Em contextos profissionais, você se destaca em papéis que envolvem comunicação, persuasão, apresentações e trabalho em equipe. Sua capacidade de ver o lado positivo das situações e motivar outros é um ativo valioso. No entanto, pode haver desafios em tarefas que exigem trabalho solitário prolongado, atenção excessiva a detalhes ou seguimento rígido de processos.

Você se motiva por reconhecimento, aprovação social e pela oportunidade de fazer diferença na vida das pessoas. Ambientes onde sua criatividade é valorizada e onde há diversidade de atividades e interações são ideais.`,
    potentials: "Excelente comunicador com habilidade natural para persuadir e influenciar. Capacidade de criar entusiasmo e motivar equipes. Networking eficaz e construção rápida de relacionamentos. Criatividade e pensamento inovador. Otimismo que inspira confiança em momentos difíceis.",
    interpersonalRelations: "Você é caloroso, expressivo e genuinamente interessado nas pessoas. Cria conexões facilmente e mantém redes amplas de relacionamentos. Sua energia positiva atrai outros e você é frequentemente o centro de atenção em grupos sociais.",
    decisionMaking: "Tende a tomar decisões baseadas em intuição e sentimentos sobre as pessoas envolvidas. Pode ser impulsivo em decisões que parecem empolgantes. Prefere consultar outros e buscar aprovação antes de compromissos maiores.",
    primaryMotivator: {
      title: "Reconhecimento e Aprovação Social",
      description: "Você se motiva profundamente por reconhecimento público e aprovação de outros. Feedback positivo, elogios sinceros e ser visto como valioso pela equipe são extremamente importantes. Oportunidades de apresentar ideias, liderar discussões e estar em posição de visibilidade energizam você."
    },
    secondaryMotivator: {
      title: "Variedade e Novidade",
      description: "Diversidade de atividades e novos desafios mantêm seu interesse e energia. Rotinas repetitivas rapidamente se tornam entediantes. Você se motiva por projetos que oferecem variedade, oportunidade de conhecer novas pessoas e explorar novas ideias."
    },
    fears: [
      "Rejeição social ou ser excluído do grupo",
      "Perda de aprovação e reconhecimento",
      "Trabalho isolado sem interação humana",
      "Ambientes frios e puramente técnicos",
      "Ser ignorado ou não ouvido",
      "Rotinas monótonas sem variedade",
      "Críticas públicas ou humilhação",
      "Ambientes onde não há espaço para criatividade"
    ],
    organizationalFit: `Você prospera em organizações dinâmicas, inovadoras e socialmente engajadas. Ambientes de marketing, vendas, relações públicas, recursos humanos, treinamento ou qualquer função que envolva comunicação intensa e interação com pessoas são ideais.

Funções que permitem criatividade, colaboração e onde há reconhecimento público de conquistas são especialmente satisfatórias. Startups, empresas de tecnologia com cultura jovem, organizações sem fins lucrativos ou ambientes corporativos que valorizam inovação e pessoas são adequados. Evite ambientes excessivamente formais, burocráticos ou onde o trabalho é principalmente solitário e repetitivo.`,
    problemSolving: [
      "Aborda problemas com criatividade e pensamento inovador",
      "Envolve outros para gerar ideias colaborativas",
      "Mantém otimismo mesmo diante de desafios",
      "Busca soluções que beneficiem relacionamentos",
      "Pode precisar focar mais em detalhes de implementação"
    ],
    developmentAreas: [
      "Desenvolver mais foco e disciplina para tarefas detalhadas",
      "Aprimorar capacidade de trabalho independente",
      "Melhorar follow-through em compromissos assumidos",
      "Desenvolver mais objetividade em decisões",
      "Aprender a lidar com críticas construtivas sem levar para o pessoal",
      "Balancear entusiasmo com análise realista de riscos"
    ],
    communicationTips: {
      doList: [
        "Seja caloroso, amigável e expressivo",
        "Demonstre entusiasmo genuíno por suas ideias",
        "Reconheça publicamente suas contribuições",
        "Permita tempo para socialização e discussões",
        "Valorize sua criatividade e perspectivas únicas",
        "Forneça feedback positivo frequente"
      ],
      dontList: [
        "Não seja excessivamente formal ou frio",
        "Evite isolá-los ou limitar interações sociais",
        "Não critique publicamente ou de forma dura",
        "Evite ambientes monótonos sem estímulos",
        "Não ignore suas ideias ou contribuições",
        "Não espere atenção excessiva a detalhes sem suporte"
      ]
    }
  },
  'S': {
    name: "Planejador",
    description: "Pessoa paciente, leal e estável. Valoriza harmonia, consistência e relacionamentos duradouros.",
    fullDescription: `Você é uma pessoa naturalmente paciente e estável, que valoriza consistência e previsibilidade. Seu perfil é marcado pela lealdade, confiabilidade e capacidade de manter ritmo constante de trabalho. Você é o tipo de pessoa em quem outros podem confiar para estar presente e entregar resultados de forma consistente.

Sua abordagem ao trabalho privilegia qualidade sobre velocidade. Você prefere ter tempo adequado para fazer as coisas bem feitas, seguindo processos testados e comprovados. A estabilidade e a harmonia no ambiente de trabalho são importantes para você, e você contribui ativamente para criar atmosfera cooperativa.

Em contextos profissionais, você se destaca em papéis que exigem paciência, atenção cuidadosa e desenvolvimento de relacionamentos de longo prazo. Sua capacidade de manter a calma sob pressão e apoiar outros durante mudanças é valiosa. No entanto, pode haver desafios em situações que exigem mudanças rápidas, confrontos diretos ou tomada de decisões sob pressão extrema.

Você se motiva por segurança, pertencimento a um grupo coeso e pela oportunidade de contribuir de forma significativa para objetivos compartilhados. Ambientes onde há respeito mútuo, processos claros e reconhecimento da importância de cada contribuição são ideais.`,
    potentials: "Extremamente confiável e consistente na entrega de resultados. Habilidade natural para criar harmonia e estabilidade em equipes. Paciência para desenvolver projetos de longo prazo com qualidade. Lealdade que constrói relacionamentos duradouros. Capacidade de ouvir e apoiar outros de forma genuína.",
    interpersonalRelations: "Você é acessível, paciente e genuinamente interessado no bem-estar dos outros. Constrói relacionamentos profundos baseados em confiança mútua. É visto como pessoa confiável e solidária, sempre disposto a ajudar colegas.",
    decisionMaking: "Prefere tomar decisões de forma ponderada, consultando outros e considerando impactos de longo prazo. Evita mudanças precipitadas. Pode ter dificuldade em decidir rapidamente sob pressão, preferindo ter tempo para avaliar adequadamente.",
    primaryMotivator: {
      title: "Segurança e Estabilidade",
      description: "Você se motiva por ambientes previsíveis onde há segurança e estabilidade. Processos claros, expectativas bem definidas e ritmo consistente de trabalho são importantes. A possibilidade de desenvolver expertise profunda em sua área e construir carreira sólida é motivadora."
    },
    secondaryMotivator: {
      title: "Pertencimento e Contribuição",
      description: "Sentir-se parte de um grupo coeso e contribuir para objetivos compartilhados é fundamental. Você valoriza ambientes onde as pessoas se apoiam mutuamente e onde sua lealdade e dedicação são reconhecidas e apreciadas."
    },
    fears: [
      "Mudanças abruptas sem tempo para adaptação",
      "Conflitos e confrontos que perturbem a harmonia",
      "Instabilidade e incerteza no trabalho",
      "Pressão excessiva por resultados imediatos",
      "Ambientes competitivos e hostis",
      "Perda de relacionamentos importantes",
      "Ser forçado a tomar decisões rápidas sem reflexão",
      "Isolamento ou exclusão do grupo"
    ],
    organizationalFit: `Você prospera em organizações estáveis com processos bem estabelecidos e cultura de respeito mútuo. Ambientes de educação, saúde, serviço público, administração, operações ou qualquer função onde consistência e confiabilidade são valorizadas são ideais.

Funções que envolvem suporte a longo prazo, desenvolvimento de relacionamentos duradouros com clientes ou colegas, ou trabalho em equipes colaborativas são especialmente satisfatórias. Organizações maduras com valores fortes e baixa rotatividade são adequadas. Evite ambientes de mudanças constantes, alta pressão ou competição acirrada.`,
    problemSolving: [
      "Aborda problemas de forma sistemática e cuidadosa",
      "Busca soluções que mantenham harmonia e estabilidade",
      "Consulta outros e busca consenso",
      "Prefere métodos testados e comprovados",
      "Considera impactos de longo prazo das soluções"
    ],
    developmentAreas: [
      "Desenvolver maior conforto com mudanças e incertezas",
      "Aprimorar capacidade de assertividade e estabelecer limites",
      "Aumentar velocidade na tomada de decisões quando necessário",
      "Aprender a lidar com conflitos de forma mais direta",
      "Desenvolver maior flexibilidade para adaptar a novas situações",
      "Aumentar disposição para assumir riscos calculados"
    ],
    communicationTips: {
      doList: [
        "Seja paciente, gentil e respeitoso",
        "Forneça tempo adequado para mudanças e decisões",
        "Demonstre apreciação por lealdade e consistência",
        "Crie ambiente seguro para expressar preocupações",
        "Explique mudanças com antecedência e contexto",
        "Valorize contribuições estáveis e confiáveis"
      ],
      dontList: [
        "Não seja abrupto ou excessivamente direto",
        "Evite mudanças sem explicação ou preparação",
        "Não crie ambientes de alta pressão desnecessária",
        "Evite confrontos públicos",
        "Não force decisões rápidas sem necessidade",
        "Não ignore a importância da harmonia do grupo"
      ]
    }
  },
  'C': {
    name: "Analista",
    description: "Pessoa meticulosa, precisa e sistemática. Valoriza qualidade, exatidão e processos bem definidos.",
    fullDescription: `Você é uma pessoa naturalmente orientada para qualidade e precisão. Seu perfil é marcado pela atenção excepcional a detalhes, pensamento analítico e preferência por processos sistemáticos e bem estruturados. Você valoriza exatidão e tem padrões elevados para seu próprio trabalho.

Sua abordagem ao trabalho é metódica e cuidadosa. Você prefere ter tempo adequado para analisar informações, considerar diferentes perspectivas e garantir que cada aspecto seja tratado com a devida atenção. A qualidade do resultado é mais importante que velocidade, e você se orgulha de entregar trabalho impecável.

Em contextos profissionais, você se destaca em funções que exigem análise profunda, precisão técnica e pensamento crítico. Sua capacidade de identificar problemas potenciais e desenvolver soluções robustas é valiosa. No entanto, pode haver desafios em situações que exigem decisões rápidas com informações incompletas ou em ambientes muito dinâmicos e imprevisíveis.

Você se motiva pela oportunidade de desenvolver expertise profunda, resolver problemas complexos e produzir trabalho de alta qualidade. Ambientes onde há padrões claros, processos bem definidos e reconhecimento pela excelência técnica são ideais.`,
    potentials: "Atenção excepcional a detalhes e precisão técnica. Capacidade analítica para identificar problemas e desenvolver soluções robustas. Pensamento crítico e questionamento construtivo. Padrões elevados que garantem qualidade superior. Habilidade para processos sistemáticos e documentação completa.",
    interpersonalRelations: "Você é reservado e cuidadoso em relacionamentos, preferindo qualidade sobre quantidade. Constrói confiança gradualmente através de demonstração de competência e confiabilidade. Valoriza honestidade intelectual e comunicação precisa.",
    decisionMaking: "Toma decisões baseadas em análise cuidadosa de dados e informações disponíveis. Prefere ter tempo adequado para pesquisar e considerar todas as opções. Pode ser perfeccionista, buscando a decisão 'ideal' em vez de simplesmente adequada.",
    primaryMotivator: {
      title: "Excelência e Qualidade",
      description: "Você se motiva profundamente pela oportunidade de produzir trabalho de altíssima qualidade. Resolver problemas complexos, desenvolver soluções elegantes e ser reconhecido por expertise técnica são extremamente importantes. A possibilidade de aprofundar conhecimentos e dominar áreas especializadas energiza você."
    },
    secondaryMotivator: {
      title: "Autonomia e Processos Claros",
      description: "Ter autonomia para trabalhar de forma independente, seguindo processos bem definidos, é crucial. Você valoriza ambientes onde há padrões claros de qualidade e onde pode trabalhar sem interrupções desnecessárias para produzir resultados precisos."
    },
    fears: [
      "Cometer erros ou produzir trabalho de baixa qualidade",
      "Ser criticado por incompetência técnica",
      "Ambientes caóticos sem processos claros",
      "Pressão para tomar decisões precipitadas",
      "Falta de informações adequadas para decisões",
      "Padrões inconsistentes ou mal definidos",
      "Ser forçado a 'cortar caminho' comprometendo qualidade",
      "Ambientes onde detalhes são ignorados"
    ],
    organizationalFit: `Você prospera em organizações que valorizam excelência técnica, qualidade e precisão. Ambientes de engenharia, finanças, pesquisa, controle de qualidade, compliance, TI ou qualquer função técnica especializada são ideais.

Funções que exigem análise profunda, documentação detalhada, desenvolvimento de processos ou trabalho especializado são especialmente satisfatórias. Organizações maduras com processos bem estabelecidos, padrões claros de qualidade e respeito por expertise técnica são adequadas. Evite ambientes excessivamente dinâmicos, onde decisões são tomadas sem análise adequada ou onde qualidade é sacrificada por velocidade.`,
    problemSolving: [
      "Analisa problemas de forma sistemática e completa",
      "Identifica causas raízes em vez de apenas sintomas",
      "Desenvolve soluções robustas e bem fundamentadas",
      "Documenta processos e raciocínios detalhadamente",
      "Antecipa problemas potenciais através de análise cuidadosa"
    ],
    developmentAreas: [
      "Desenvolver maior conforto com decisões baseadas em informações incompletas",
      "Aprimorar velocidade de tomada de decisão quando apropriado",
      "Balancear perfeccionismo com pragmatismo",
      "Melhorar habilidades de comunicação interpessoal",
      "Desenvolver maior tolerância para ambiguidade",
      "Aprender a delegar confiando em padrões de outros"
    ],
    communicationTips: {
      doList: [
        "Seja preciso, factual e bem preparado",
        "Forneça dados e lógica para suportar argumentos",
        "Respeite necessidade de tempo para análise",
        "Reconheça expertise técnica e qualidade do trabalho",
        "Estabeleça padrões claros e processos definidos",
        "Permita trabalho independente sem micro-gerenciamento"
      ],
      dontList: [
        "Não seja vago ou impreciso na comunicação",
        "Evite pressionar por decisões sem dados adequados",
        "Não ignore detalhes importantes",
        "Evite mudanças de padrões sem justificativa clara",
        "Não critique trabalho sem base técnica sólida",
        "Não force interações sociais desnecessárias"
      ]
    }
  }
};

// Função para obter análise detalhada de fator individual DISC
export function getFactorAnalysis(
  factor: 'D' | 'I' | 'S' | 'C',
  naturalValue: number,
  adaptedValue: number,
  perceptionValue?: number,
  demandValue?: number
): FactorAnalysis {
  const factorNames = {
    D: { trait: getTraitName('D', naturalValue), description: getFactorDescription('D', naturalValue) },
    I: { trait: getTraitName('I', naturalValue), description: getFactorDescription('I', naturalValue) },
    S: { trait: getTraitName('S', naturalValue), description: getFactorDescription('S', naturalValue) },
    C: { trait: getTraitName('C', naturalValue), description: getFactorDescription('C', naturalValue) }
  };

  const diff = adaptedValue - naturalValue;
  const adaptedDirection: 'crescente' | 'decrescente' | 'equilibrado' = 
    diff > 5 ? 'crescente' : diff < -5 ? 'decrescente' : 'equilibrado';

  const adaptedAnalyses = {
    D: {
      crescente: `Você está se adaptando para ser mais assertivo e direto do que sua natureza. Isso pode indicar que seu ambiente atual exige mais liderança, tomada rápida de decisões e enfrentamento de desafios. Embora essa adaptação possa ser eficaz no curto prazo, pode gerar tensão se mantida por períodos prolongados.`,
      decrescente: `Você está moderando sua assertividade natural. Isso pode ocorrer em ambientes onde a colaboração e a diplomacia são mais valorizadas que a assertividade direta. Essa adaptação pode ajudá-lo a trabalhar melhor em equipe, embora você possa sentir frustração por não poder agir tão diretamente quanto gostaria.`,
      equilibrado: `Seu nível de assertividade adaptado está alinhado com sua natureza. Você está atuando de forma autêntica, sem necessidade de ajustar significativamente seu estilo de lidar com problemas e desafios.`
    },
    I: {
      crescente: `Você está se esforçando para ser mais comunicativo e sociável do que naturalmente se sente. Isso pode indicar que seu ambiente valoriza networking, apresentações e interações frequentes. Essa adaptação pode expandir suas habilidades, mas também pode ser cansativa se mantida constantemente.`,
      decrescente: `Você está contendo sua extroversão natural. Isso pode ocorrer em ambientes mais formais, técnicos ou onde há menos ênfase em interações sociais. Essa adaptação pode ajudá-lo a focar em trabalho individual, embora você possa sentir falta de mais interação social.`,
      equilibrado: `Seu nível de sociabilidade adaptado está alinhado com sua natureza. Você pode se expressar autenticamente sem necessidade de forçar ou reprimir suas tendências comunicativas.`
    },
    S: {
      crescente: `Você está desenvolvendo mais paciência e estabilidade do que sua natureza sugere. Isso pode indicar que você está em um ambiente que requer mais consistência, processos estabelecidos e ritmo mais constante. Essa adaptação pode melhorar sua confiabilidade, embora possa limitar sua versatilidade.`,
      decrescente: `Você está sendo mais flexível e dinâmico do que sua preferência natural. Isso pode ocorrer em ambientes de mudanças frequentes ou que exigem maior adaptabilidade. Essa mudança pode expandir sua zona de conforto, mas também pode gerar estresse se as mudanças forem muito intensas.`,
      equilibrado: `Seu ritmo de trabalho adaptado está alinhado com suas preferências naturais. Você pode trabalhar em um ritmo que se sente confortável e autêntico.`
    },
    C: {
      crescente: `Você está aumentando seu foco em detalhes, precisão e processos além de sua inclinação natural. Isso pode indicar que seu papel exige maior rigor técnico, compliance ou atenção a padrões. Essa adaptação pode melhorar a qualidade do seu trabalho, mas pode também tornar você excessivamente cauteloso.`,
      decrescente: `Você está sendo mais flexível com processos e padrões do que sua natureza prefere. Isso pode ocorrer em ambientes mais dinâmicos onde velocidade é mais importante que perfeição. Essa adaptação pode aumentar sua agilidade, embora você possa se sentir desconfortável com padrões mais baixos.`,
      equilibrado: `Seu nível de atenção a detalhes e processos está alinhado com sua natureza. Você pode trabalhar com o nível de precisão que se sente confortável.`
    }
  };

  const perceptionAnalyses = {
    D: `${perceptionValue && perceptionValue > naturalValue ? 'Outros tendem a vê-lo como mais assertivo e dominante do que você realmente se sente.' : perceptionValue && perceptionValue < naturalValue ? 'Outros podem não perceber toda a sua assertividade e determinação interna.' : 'A percepção externa está alinhada com sua natureza.'}`,
    I: `${perceptionValue && perceptionValue > naturalValue ? 'Outros o veem como mais extrovertido e comunicativo do que você se sente internamente.' : perceptionValue && perceptionValue < naturalValue ? 'Sua sociabilidade pode não ser tão evidente aos outros quanto você a sente.' : 'A percepção externa está alinhada com sua natureza.'}`,
    S: `${perceptionValue && perceptionValue > naturalValue ? 'Outros o percebem como mais paciente e estável do que você se sente.' : perceptionValue && perceptionValue < naturalValue ? 'Sua necessidade de estabilidade pode não ser tão aparente aos outros.' : 'A percepção externa está alinhada com sua natureza.'}`,
    C: `${perceptionValue && perceptionValue > naturalValue ? 'Outros veem você como mais detalhista e preciso do que você se sente internamente.' : perceptionValue && perceptionValue < naturalValue ? 'Seu foco em qualidade pode não ser tão evidente aos outros.' : 'A percepção externa está alinhada com sua natureza.'}`
  };

  const demandAnalyses = {
    D: `${demandValue && demandValue > naturalValue ? 'Seu ambiente exige mais assertividade e tomada de decisões do que sua inclinação natural.' : demandValue && demandValue < naturalValue ? 'Seu ambiente permite menos assertividade do que você naturalmente possui.' : 'As demandas do ambiente estão alinhadas com sua natureza.'}`,
    I: `${demandValue && demandValue > naturalValue ? 'Seu ambiente exige mais comunicação e interação social do que você naturalmente prefere.' : demandValue && demandValue < naturalValue ? 'Seu ambiente oferece menos oportunidades de interação do que você desejaria.' : 'As demandas do ambiente estão alinhadas com sua natureza.'}`,
    S: `${demandValue && demandValue > naturalValue ? 'Seu ambiente exige mais paciência e estabilidade do que sua natureza fornece naturalmente.' : demandValue && demandValue < naturalValue ? 'Seu ambiente é mais dinâmico do que sua preferência natural por estabilidade.' : 'As demandas do ambiente estão alinhadas com sua natureza.'}`,
    C: `${demandValue && demandValue > naturalValue ? 'Seu ambiente exige mais atenção a detalhes e processos do que sua inclinação natural.' : demandValue && demandValue < naturalValue ? 'Seu ambiente permite mais flexibilidade do que você naturalmente prefere.' : 'As demandas do ambiente estão alinhadas com sua natureza.'}`
  };

  return {
    naturalTrait: factorNames[factor].trait,
    naturalDescription: factorNames[factor].description,
    adaptedDirection,
    adaptedAnalysis: adaptedAnalyses[factor][adaptedDirection],
    perceptionAnalysis: perceptionValue !== undefined ? perceptionAnalyses[factor] : undefined,
    demandAnalysis: demandValue !== undefined ? demandAnalyses[factor] : undefined
  };
}

function getTraitName(factor: 'D' | 'I' | 'S' | 'C', value: number): string {
  const traits = {
    D: value > 70 ? 'DOMINANTE' : value > 50 ? 'ASSERTIVO' : value > 30 ? 'MODERADO' : 'CAUTELOSO',
    I: value > 70 ? 'INFLUENTE' : value > 50 ? 'COMUNICATIVO' : value > 30 ? 'DISCRETO' : 'RESERVADO',
    S: value > 70 ? 'ESTÁVEL' : value > 50 ? 'PACIENTE' : value > 30 ? 'ADAPTÁVEL' : 'DINÂMICO',
    C: value > 70 ? 'ANALÍTICO' : value > 50 ? 'CUIDADOSO' : value > 30 ? 'FLEXÍVEL' : 'INDEPENDENTE'
  };
  return traits[factor];
}

function getFactorDescription(factor: 'D' | 'I' | 'S' | 'C', value: number): string {
  const descriptions = {
    D: {
      high: 'Você naturalmente assume controle de situações, busca desafios e toma decisões rapidamente. Prefere estar em posição de liderança e não tem medo de enfrentar problemas de frente. Sua assertividade é uma característica central.',
      medium: 'Você demonstra assertividade quando necessário, mas não precisa estar sempre no controle. Consegue equilibrar liderança com colaboração, adaptando seu estilo conforme a situação exige.',
      low: 'Você prefere abordagens mais diplomáticas e menos diretas. Tende a evitar confrontos e valoriza consenso. Sua força está em mediar e facilitar, não em impor decisões.'
    },
    I: {
      high: 'Você é naturalmente sociável, expressivo e se energiza através de interações com pessoas. Comunicação é sua força, e você tem facilidade para influenciar e inspirar outros. Ambientes sociais são onde você prospera.',
      medium: 'Você consegue ser sociável quando necessário, mas também valoriza momentos de trabalho mais focado. Sua comunicação é eficaz sem ser excessivamente expansiva.',
      low: 'Você prefere interações mais limitadas e profundas a networking amplo. Tende a ser mais reservado e reflexivo. Sua força está em comunicação escrita ou em grupos pequenos, não em grandes apresentações.'
    },
    S: {
      high: 'Você valoriza estabilidade, consistência e ambientes previsíveis. É paciente, leal e prefere processos estabelecidos. Mudanças abruptas podem ser desconfortáveis. Sua confiabilidade é um ativo importante.',
      medium: 'Você aprecia estabilidade mas consegue adaptar-se a mudanças quando necessário. Equilibra necessidade de previsibilidade com flexibilidade razoável.',
      low: 'Você é naturalmente adaptável e confortável com mudanças. Prefere variedade a rotina e pode se sentir entediado em ambientes muito estáveis. Sua versatilidade é uma força.'
    },
    C: {
      high: 'Você valoriza precisão, qualidade e processos sistemáticos. Atenção a detalhes é natural para você, e você tem padrões elevados. Prefere tempo adequado para análise e documentação completa.',
      medium: 'Você presta atenção a detalhes importantes mas não se perde em minúcias desnecessárias. Consegue equilibrar qualidade com pragmatismo.',
      low: 'Você prefere visão geral a detalhes minuciosos. Trabalha de forma mais intuitiva e flexível, não se prendendo excessivamente a processos. Sua força está em adaptabilidade e pensamento conceitual.'
    }
  };

  const level = value > 60 ? 'high' : value > 40 ? 'medium' : 'low';
  return descriptions[factor][level];
}

export const DISC_GROUPS: DISCGroup[] = [
  {
    group: 1,
    adjectives: [
      { text: 'PRECISO(A)', factor: 'C' },
      { text: 'DETERMINADO(A)', factor: 'D' },
      { text: 'CONFIANTE', factor: 'I' },
      { text: 'CONSISTENTE', factor: 'S' }
    ]
  },
  {
    group: 2,
    adjectives: [
      { text: 'CONVINCENTE', factor: 'I' },
      { text: 'LEAL', factor: 'S' },
      { text: 'CONTROLADO(A)', factor: 'C' },
      { text: 'OUSADO(A)', factor: 'D' }
    ]
  },
  {
    group: 3,
    adjectives: [
      { text: 'CUIDADOSO(A)', factor: 'C' },
      { text: 'ANIMADO(A)', factor: 'I' },
      { text: 'AMIGÁVEL', factor: 'S' },
      { text: 'DIRETO(A)', factor: 'D' }
    ]
  },
  {
    group: 4,
    adjectives: [
      { text: 'FIRME', factor: 'D' },
      { text: 'ESTÁVEL', factor: 'S' },
      { text: 'OTIMISTA', factor: 'I' },
      { text: 'METÓDICO(A)', factor: 'C' }
    ]
  },
  {
    group: 5,
    adjectives: [
      { text: 'PACIENTE', factor: 'S' },
      { text: 'DECIDIDO(A)', factor: 'D' },
      { text: 'CORRETO(A)', factor: 'C' },
      { text: 'SOCIÁVEL', factor: 'I' }
    ]
  },
  {
    group: 6,
    adjectives: [
      { text: 'EXPRESSIVO(A)', factor: 'I' },
      { text: 'DIPLOMÁTICO(A)', factor: 'S' },
      { text: 'EXIGENTE', factor: 'D' },
      { text: 'SISTEMÁTICO(A)', factor: 'C' }
    ]
  },
  {
    group: 7,
    adjectives: [
      { text: 'LÓGICO(A)', factor: 'C' },
      { text: 'COMPETITIVO(A)', factor: 'D' },
      { text: 'RECEPTIVO(A)', factor: 'S' },
      { text: 'PERSUASIVO(A)', factor: 'I' }
    ]
  },
  {
    group: 8,
    adjectives: [
      { text: 'ENTUSIASMADO(A)', factor: 'I' },
      { text: 'CALMO(A)', factor: 'S' },
      { text: 'INDEPENDENTE', factor: 'D' },
      { text: 'ANALÍTICO(A)', factor: 'C' }
    ]
  },
  {
    group: 9,
    adjectives: [
      { text: 'COMPETITIVO(A)', factor: 'D' },
      { text: 'ANIMADO(A)', factor: 'I' },
      { text: 'MODERADO(A)', factor: 'S' },
      { text: 'CRITERIOSO(A)', factor: 'C' }
    ]
  },
  {
    group: 10,
    adjectives: [
      { text: 'ÁGIL', factor: 'D' },
      { text: 'SOCIÁVEL', factor: 'I' },
      { text: 'ESTÁVEL', factor: 'S' },
      { text: 'METICULOSO(A)', factor: 'C' }
    ]
  }
];

export const VALUES_GROUPS: ValueGroup[] = [
  {
    group: 1,
    phrases: [
      { text: 'CONSTRUIR UM NEGÓCIO LUCRATIVO', value: 'economic' },
      { text: 'LIDERAR UM TIME VENCEDOR', value: 'political' },
      { text: 'FAZER DESCOBERTAS CIENTÍFICAS', value: 'theoretical' },
      { text: 'CRIAR EXPERIÊNCIAS ESTÉTICAS', value: 'aesthetic' },
      { text: 'AJUDAR PESSOAS NECESSITADAS', value: 'social' },
      { text: 'VIVER EM HARMONIA ESPIRITUAL', value: 'spiritual' }
    ]
  },
  {
    group: 2,
    phrases: [
      { text: 'MAXIMIZAR LUCROS E INVESTIMENTOS', value: 'economic' },
      { text: 'INFLUENCIAR DECISÕES IMPORTANTES', value: 'political' },
      { text: 'ENTENDER COMO AS COISAS FUNCIONAM', value: 'theoretical' },
      { text: 'APRECIAR ARTE E BELEZA', value: 'aesthetic' },
      { text: 'CONTRIBUIR PARA A SOCIEDADE', value: 'social' },
      { text: 'BUSCAR PROPÓSITO E SIGNIFICADO', value: 'spiritual' }
    ]
  },
  {
    group: 3,
    phrases: [
      { text: 'ALCANÇAR INDEPENDÊNCIA FINANCEIRA', value: 'economic' },
      { text: 'TER AUTORIDADE E CONTROLE', value: 'political' },
      { text: 'RESOLVER PROBLEMAS COMPLEXOS', value: 'theoretical' },
      { text: 'CRIAR COISAS BELAS', value: 'aesthetic' },
      { text: 'FAZER DIFERENÇA NA VIDA DAS PESSOAS', value: 'social' },
      { text: 'CONECTAR-SE COM ALGO MAIOR', value: 'spiritual' }
    ]
  },
  {
    group: 4,
    phrases: [
      { text: 'AUMENTAR PATRIMÔNIO E RECURSOS', value: 'economic' },
      { text: 'CONQUISTAR POSIÇÕES DE LIDERANÇA', value: 'political' },
      { text: 'ADQUIRIR CONHECIMENTO PROFUNDO', value: 'theoretical' },
      { text: 'EXPRESSAR CRIATIVIDADE', value: 'aesthetic' },
      { text: 'PROMOVER IGUALDADE E JUSTIÇA', value: 'social' },
      { text: 'DESENVOLVER PAZ INTERIOR', value: 'spiritual' }
    ]
  },
  {
    group: 5,
    phrases: [
      { text: 'TER SEGURANÇA FINANCEIRA', value: 'economic' },
      { text: 'EXERCER PODER E INFLUÊNCIA', value: 'political' },
      { text: 'DESCOBRIR VERDADES FUNDAMENTAIS', value: 'theoretical' },
      { text: 'CULTIVAR BELEZA E HARMONIA', value: 'aesthetic' },
      { text: 'SERVIR AO BEM COMUM', value: 'social' },
      { text: 'ALCANÇAR ILUMINAÇÃO ESPIRITUAL', value: 'spiritual' }
    ]
  },
  {
    group: 6,
    phrases: [
      { text: 'OTIMIZAR RETORNO SOBRE INVESTIMENTO', value: 'economic' },
      { text: 'COMPETIR E VENCER', value: 'political' },
      { text: 'ANALISAR E COMPREENDER SISTEMAS', value: 'theoretical' },
      { text: 'APRECIAR EXPERIÊNCIAS SENSORIAIS', value: 'aesthetic' },
      { text: 'CUIDAR DOS VULNERÁVEIS', value: 'social' },
      { text: 'PRATICAR FÉ E DEVOÇÃO', value: 'spiritual' }
    ]
  },
  {
    group: 7,
    phrases: [
      { text: 'GERAR RIQUEZA E PROSPERIDADE', value: 'economic' },
      { text: 'ASSUMIR PAPÉIS DE COMANDO', value: 'political' },
      { text: 'INVESTIGAR E PESQUISAR', value: 'theoretical' },
      { text: 'DESFRUTAR DE ARTE E CULTURA', value: 'aesthetic' },
      { text: 'TRABALHAR POR CAUSAS NOBRES', value: 'social' },
      { text: 'MEDITAR E REFLETIR', value: 'spiritual' }
    ]
  },
  {
    group: 8,
    phrases: [
      { text: 'CONSTRUIR PATRIMÔNIO DURADOURO', value: 'economic' },
      { text: 'MOLDAR OPINIÕES E ATITUDES', value: 'political' },
      { text: 'APRENDER CONTINUAMENTE', value: 'theoretical' },
      { text: 'CRIAR AMBIENTES INSPIRADORES', value: 'aesthetic' },
      { text: 'APOIAR COMUNIDADES', value: 'social' },
      { text: 'BUSCAR TRANSCENDÊNCIA', value: 'spiritual' }
    ]
  },
  {
    group: 9,
    phrases: [
      { text: 'MAXIMIZAR EFICIÊNCIA E PRODUTIVIDADE', value: 'economic' },
      { text: 'GANHAR RECONHECIMENTO E STATUS', value: 'political' },
      { text: 'QUESTIONAR E DESAFIAR IDEIAS', value: 'theoretical' },
      { text: 'VALORIZAR ELEGÂNCIA E ESTILO', value: 'aesthetic' },
      { text: 'PROMOVER INCLUSÃO E DIVERSIDADE', value: 'social' },
      { text: 'VIVER COM INTEGRIDADE MORAL', value: 'spiritual' }
    ]
  },
  {
    group: 10,
    phrases: [
      { text: 'ALCANÇAR SUCESSO MATERIAL', value: 'economic' },
      { text: 'DOMINAR DESAFIOS E COMPETIÇÕES', value: 'political' },
      { text: 'BUSCAR SABEDORIA E VERDADE', value: 'theoretical' },
      { text: 'CELEBRAR FORMAS E SONS', value: 'aesthetic' },
      { text: 'FORTALECER LAÇOS HUMANOS', value: 'social' },
      { text: 'HONRAR PRINCÍPIOS SAGRADOS', value: 'spiritual' }
    ]
  }
];

export const DISC_PROFILES = {
  D: {
    name: 'Dominância',
    description: 'Direto, decidido e orientado para resultados',
    fullDescription: 'Pessoas com perfil D são diretas, decididas e orientadas para resultados. São naturalmente competitivas, gostam de desafios e assumir o controle de situações. Focam em realizar tarefas rapidamente e superar obstáculos. Tendem a ser assertivos, independentes e orientados para a ação. No ambiente de trabalho, demonstram iniciativa, tomam decisões rapidamente e assumem riscos calculados. Preferem ambientes dinâmicos onde possam exercer autonomia e liderar projetos desafiadores.',
    howDealsWithProblems: 'Encara problemas como desafios a serem superados rapidamente. Age de forma decisiva e direta, buscando soluções imediatas e resultados tangíveis. Prefere assumir o controle da situação e tomar decisões sem hesitação. Pode subestimar a complexidade de alguns problemas em sua busca por resoluções rápidas. Tende a focar mais na solução do que no impacto emocional do problema nas pessoas envolvidas.',
    developmentPoints: [
      'Desenvolver paciência e tolerância com processos mais lentos',
      'Melhorar capacidade de escuta ativa e consideração de diferentes perspectivas',
      'Reduzir impulsividade nas tomadas de decisão importantes',
      'Dar maior atenção aos detalhes e procedimentos estabelecidos',
      'Considerar mais o impacto emocional das decisões nas pessoas',
      'Praticar delegação efetiva e confiança na equipe',
      'Desenvolver empatia e sensibilidade interpessoal'
    ],
    communicationTips: 'Ao comunicar-se com perfis D: Seja direto e objetivo. Vá direto ao ponto sem rodeios. Foque em resultados e eficiência. Apresente opções e permita que tome decisões. Use dados concretos e fatos. Evite detalhes desnecessários ou conversas prolongadas. Respeite seu tempo e necessidade de autonomia. Não leve para o lado pessoal se parecer impaciente ou brusco.',
    strengths: ['Tomada de decisão rápida', 'Foco em resultados', 'Iniciativa', 'Liderança natural', 'Confiança'],
    challenges: ['Impaciência', 'Pode ser muito direto', 'Dificuldade em delegar', 'Pouca atenção aos detalhes'],
    idealEnvironment: 'Ambientes dinâmicos com autonomia, desafios constantes e oportunidades de liderança'
  },
  I: {
    name: 'Influência',
    description: 'Comunicativo, entusiasta e persuasivo',
    fullDescription: 'Pessoas com perfil I são comunicativas, entusiastas e persuasivas. São naturalmente sociáveis, otimistas e gostam de estar rodeadas de pessoas. Focam em relacionamentos, colaboração e inspirar outros. Tendem a ser expressivos, criativos e energéticos. No ambiente de trabalho, trazem entusiasmo contagiante, criam redes de relacionamentos valiosas e motivam equipes através de sua energia positiva. Preferem ambientes colaborativos onde possam interagir frequentemente e expressar sua criatividade.',
    howDealsWithProblems: 'Aborda problemas de forma otimista e colaborativa. Busca envolver outras pessoas na busca por soluções criativas e inovadoras. Pode subestimar a complexidade de situações difíceis devido ao seu otimismo natural. Prefere soluções que envolvam trabalho em equipe e comunicação aberta. Às vezes, pode evitar confrontar problemas desagradáveis ou difíceis, preferindo manter o clima positivo.',
    developmentPoints: [
      'Melhorar organização e gestão de tempo',
      'Focar mais em detalhes importantes e precisão',
      'Ser mais objetivo e menos emocional em decisões de negócio',
      'Cumprir prazos consistentemente e honrar compromissos',
      'Ouvir mais e falar menos, dando espaço para outros',
      'Desenvolver capacidade de trabalho individual e autônomo',
      'Lidar melhor com dados e tarefas administrativas'
    ],
    communicationTips: 'Ao comunicar-se com perfis I: Seja amigável e entusiasta. Demonstre interesse genuíno na pessoa. Permita interação social e troca de ideias. Reconheça suas contribuições e celebre sucessos. Use histórias e exemplos práticos. Mantenha o tom positivo e energético. Evite ser muito formal, frio ou excessivamente crítico. Dê feedback de forma construtiva e encorajadora.',
    strengths: ['Comunicação eficaz', 'Entusiasmo', 'Capacidade de persuasão', 'Criatividade', 'Networking'],
    challenges: ['Pode ser excessivamente otimista', 'Dificuldade com detalhes', 'Desorganização', 'Dificuldade em manter o foco'],
    idealEnvironment: 'Ambientes colaborativos com interação social frequente, reconhecimento e liberdade criativa'
  },
  S: {
    name: 'Estabilidade',
    description: 'Paciente, leal e bom ouvinte',
    fullDescription: 'Pessoas com perfil S são pacientes, leais e bons ouvintes. São naturalmente calmas, confiáveis e preferem ambientes estáveis e previsíveis. Focam em manter a harmonia, apoiar outros e trabalhar em equipe. Tendem a ser consistentes, dedicados e cooperativos. No ambiente de trabalho, são a base estável das equipes, oferecendo suporte contínuo e criando atmosfera de colaboração. Preferem ambientes harmoniosos com processos bem estabelecidos e baixo nível de mudanças bruscas.',
    howDealsWithProblems: 'Analisa problemas com calma e paciência. Busca soluções que mantenham harmonia e estabilidade no grupo. Considera cuidadosamente todas as opções antes de agir. Pode demorar para tomar decisões em situações que requerem mudanças rápidas ou confronto. Prefere consultar outros antes de implementar mudanças significativas. Tende a evitar conflitos e buscar consenso.',
    developmentPoints: [
      'Ser mais assertivo e expressar opiniões claramente',
      'Aceitar e adaptar-se mais facilmente a mudanças',
      'Tomar decisões mais rápidas quando necessário',
      'Lidar melhor com conflitos ao invés de evitá-los',
      'Sair da zona de conforto e experimentar novas abordagens',
      'Aprender a dizer "não" quando apropriado',
      'Desenvolver urgência em situações que requerem ação rápida'
    ],
    communicationTips: 'Ao comunicar-se com perfis S: Seja paciente e cordial. Mantenha tom amigável e respeitoso. Dê tempo para processar informações e tomar decisões. Mostre apoio e segurança. Explique mudanças gradualmente com antecedência. Evite pressão ou mudanças abruptas. Reconheça seu trabalho consistente e lealdade. Crie ambiente seguro para expressão de preocupações.',
    strengths: ['Paciência', 'Lealdade', 'Trabalho em equipe', 'Escuta ativa', 'Calma sob pressão'],
    challenges: ['Resistência a mudanças', 'Dificuldade em dizer não', 'Evita conflitos', 'Pode ser muito passivo'],
    idealEnvironment: 'Ambientes estáveis com processos claros, trabalho em equipe e baixo nível de conflito'
  },
  C: {
    name: 'Conformidade',
    description: 'Analítico, preciso e orientado para qualidade',
    fullDescription: 'Pessoas com perfil C são analíticas, precisas e orientadas para qualidade. São naturalmente metódicas, detalhistas e valorizam a exatidão. Focam em seguir procedimentos, garantir qualidade e evitar erros. Tendem a ser sistemáticos, cautelosos e objetivos. No ambiente de trabalho, garantem altos padrões de qualidade através de análise cuidadosa e atenção meticulosa aos detalhes. Preferem ambientes organizados com expectativas claras e tempo adequado para fazer as coisas corretamente.',
    howDealsWithProblems: 'Analisa problemas com precisão e lógica sistemática. Busca entender todas as variáveis e possíveis consequências antes de agir. Foca em encontrar a solução mais correta e precisa, mesmo que demore mais tempo. Pode ficar paralisado pela necessidade de ter todas as informações antes de decidir. Prefere seguir procedimentos estabelecidos e testados ao invés de improvisar.',
    developmentPoints: [
      'Ser menos perfeccionista e aceitar "bom o suficiente"',
      'Tomar decisões mais rápidas com informação suficiente, não perfeita',
      'Aceitar que erros fazem parte do processo de aprendizado',
      'Ser mais flexível e adaptável a mudanças imprevistas',
      'Melhorar habilidades sociais e expressar emoções',
      'Confiar mais na intuição além de dados e fatos',
      'Desenvolver tolerância à ambiguidade e incerteza'
    ],
    communicationTips: 'Ao comunicar-se com perfis C: Seja lógico e preciso. Apresente dados, fatos e evidências concretas. Dê tempo adequado para análise e reflexão. Respeite a necessidade de qualidade e precisão. Seja organizado na apresentação de informações. Evite pressão por decisões rápidas. Forneça documentação detalhada quando possível. Mantenha formalidade e profissionalismo.',
    strengths: ['Atenção aos detalhes', 'Análise criteriosa', 'Qualidade no trabalho', 'Precisão', 'Organização'],
    challenges: ['Perfeccionismo', 'Pode ser muito crítico', 'Dificuldade com prazos apertados', 'Resistência a mudanças'],
    idealEnvironment: 'Ambientes organizados com padrões de qualidade bem definidos e tempo para análise'
  }
};

// Perfis combinados detalhados
export const COMBINED_PROFILES: Record<string, {
  name: string;
  description: string;
  fullDescription: string;
  howDealsWithProblems: string[];
  developmentPoints: string[];
  communicationTips: { do: string[]; dont: string[] };
  strengths: string[];
  idealEnvironment: string;
  motivators: string[];
}> = {
  'Executor': {
    name: 'Executor',
    description: 'Orientado para resultados, decisivo e focado em conquistas',
    fullDescription: 'O perfil Executor combina alta dominância com foco em realização. São profissionais que transformam visão em ação, superando obstáculos com determinação. Demonstram forte capacidade de liderança, tomada de decisão rápida e foco intenso em resultados tangíveis. No ambiente corporativo, destacam-se por assumir responsabilidades desafiadoras e entregar resultados consistentemente.',
    howDealsWithProblems: [
      'Age rapidamente diante de desafios, buscando soluções práticas',
      'Assume controle das situações problemáticas com confiança',
      'Foca em resolver ao invés de analisar excessivamente',
      'Pode subestimar complexidade em favor de velocidade',
      'Prefere ação direta a longas discussões sobre o problema'
    ],
    developmentPoints: [
      'Desenvolver paciência com processos e pessoas mais lentas',
      'Melhorar escuta ativa antes de tomar decisões',
      'Considerar impacto emocional das decisões na equipe',
      'Dar mais atenção a detalhes importantes',
      'Equilibrar velocidade com qualidade',
      'Praticar empatia e considerar perspectivas diferentes',
      'Aprender a delegar efetivamente',
      'Reduzir tendência a microgerenciar resultados'
    ],
    communicationTips: {
      do: [
        'Seja direto e objetivo na comunicação',
        'Apresente soluções e opções claras',
        'Foque em resultados e benefícios tangíveis',
        'Respeite o tempo e vá direto ao ponto',
        'Use dados concretos para suportar argumentos',
        'Reconheça conquistas e resultados alcançados'
      ],
      dont: [
        'Evite rodeios ou excesso de detalhes',
        'Não tome decisões por ele sem consultar',
        'Evite conversas muito longas sem propósito',
        'Não seja excessivamente emocional',
        'Evite questionar sua competência publicamente',
        'Não imponha processos sem justificativa clara'
      ]
    },
    strengths: [
      'Forte foco em resultados e conquistas',
      'Capacidade de tomar decisões rápidas',
      'Liderança natural e iniciativa',
      'Alta produtividade e eficiência',
      'Coragem para assumir riscos calculados'
    ],
    idealEnvironment: 'Ambientes dinâmicos com metas desafiadoras, autonomia para tomar decisões e oportunidades claras de crescimento baseadas em mérito e resultados',
    motivators: [
      'Reconhecimento por conquistas e resultados',
      'Autonomia e poder de decisão',
      'Desafios e metas ambiciosas',
      'Oportunidades de liderança',
      'Competição saudável e mérito'
    ]
  },
  'Comunicador': {
    name: 'Comunicador',
    description: 'Entusiasta, persuasivo e focado em relacionamentos',
    fullDescription: 'O perfil Comunicador combina alta influência com energia social. São profissionais que inspiram e motivam através de sua comunicação carismática e entusiasmo contagiante. Destacam-se em construir relacionamentos, trabalhar em equipe e criar ambientes positivos. No ambiente corporativo, são catalisadores de colaboração e inovação através de networking efetivo.',
    howDealsWithProblems: [
      'Busca soluções colaborativas envolvendo a equipe',
      'Mantém otimismo mesmo em situações desafiadoras',
      'Usa criatividade para encontrar alternativas inovadoras',
      'Pode subestimar gravidade por excesso de otimismo',
      'Prefere resolver através de diálogo e persuasão'
    ],
    developmentPoints: [
      'Melhorar organização e gestão de tempo',
      'Focar mais em detalhes e precisão',
      'Cumprir prazos de forma mais consistente',
      'Ser mais objetivo em decisões de negócio',
      'Desenvolver capacidade de trabalho independente',
      'Ouvir mais ativamente e falar menos',
      'Dar mais atenção a tarefas administrativas',
      'Manter foco em projetos de longo prazo'
    ],
    communicationTips: {
      do: [
        'Seja amigável e entusiasta',
        'Demonstre interesse genuíno na pessoa',
        'Permita interação e troca de ideias',
        'Reconheça contribuições publicamente',
        'Use histórias e exemplos práticos',
        'Mantenha tom positivo e energético'
      ],
      dont: [
        'Evite ser excessivamente formal ou frio',
        'Não seja muito crítico ou negativo',
        'Evite ignorar suas ideias ou contribuições',
        'Não force trabalho isolado por longos períodos',
        'Evite reuniões longas sem interação',
        'Não seja impessoal na comunicação'
      ]
    },
    strengths: [
      'Excelente comunicação e persuasão',
      'Capacidade de motivar e inspirar equipes',
      'Forte networking e construção de relacionamentos',
      'Criatividade e pensamento inovador',
      'Energia positiva e entusiasmo contagiante'
    ],
    idealEnvironment: 'Ambientes colaborativos com forte interação social, reconhecimento público, liberdade criativa e oportunidades de trabalho em equipe',
    motivators: [
      'Reconhecimento e apreciação pública',
      'Trabalho em equipe e colaboração',
      'Variedade e novos desafios',
      'Liberdade de expressão criativa',
      'Ambiente social e dinâmico'
    ]
  },
  'Planejador': {
    name: 'Planejador',
    description: 'Paciente, leal e focado em estabilidade',
    fullDescription: 'O perfil Planejador combina alta estabilidade com forte senso de lealdade e compromisso. São profissionais que trazem consistência, confiabilidade e harmonia para equipes. Destacam-se em manter processos funcionando suavemente, apoiar colegas e criar ambientes de trabalho estáveis. No ambiente corporativo, são a fundação confiável que garante continuidade e qualidade consistente.',
    howDealsWithProblems: [
      'Analisa calmamente antes de agir',
      'Busca soluções que mantenham harmonia do grupo',
      'Consulta outros antes de fazer mudanças',
      'Considera impacto de longo prazo das decisões',
      'Prefere abordagens testadas a experimentações arriscadas',
      'Pode demorar em decisões que exigem mudança rápida'
    ],
    developmentPoints: [
      'Ser mais assertivo ao expressar opiniões',
      'Adaptar-se mais rapidamente a mudanças',
      'Tomar decisões com mais velocidade quando necessário',
      'Lidar melhor com conflitos ao invés de evitá-los',
      'Sair da zona de conforto com mais frequência',
      'Aprender a dizer "não" quando apropriado',
      'Desenvolver senso de urgência em situações críticas',
      'Aceitar que mudanças podem ser positivas'
    ],
    communicationTips: {
      do: [
        'Seja paciente e cordial',
        'Mantenha tom amigável e respeitoso',
        'Dê tempo para processar informações',
        'Mostre apoio e crie ambiente seguro',
        'Explique mudanças com antecedência',
        'Reconheça lealdade e trabalho consistente'
      ],
      dont: [
        'Evite pressão por decisões imediatas',
        'Não imponha mudanças abruptas',
        'Evite criar conflitos desnecessários',
        'Não ignore suas preocupações',
        'Evite ambiente de alta pressão constante',
        'Não desvalorize a importância da estabilidade'
      ]
    },
    strengths: [
      'Paciência e consistência excepcionais',
      'Alta lealdade e confiabilidade',
      'Excelente trabalho em equipe',
      'Escuta ativa e empatia',
      'Calma sob pressão e situações estressantes'
    ],
    idealEnvironment: 'Ambientes estáveis com processos claros, trabalho em equipe colaborativo, baixo nível de conflito e mudanças graduais e bem comunicadas',
    motivators: [
      'Estabilidade e segurança',
      'Reconhecimento por lealdade',
      'Trabalho em equipe harmônico',
      'Processos claros e previsíveis',
      'Ambiente de baixo conflito'
    ]
  },
  'Analista': {
    name: 'Analista',
    description: 'Preciso, metódico e focado em qualidade',
    fullDescription: 'O perfil Analista combina alta conformidade com foco intenso em qualidade e precisão. São profissionais que garantem excelência através de análise cuidadosa e atenção meticulosa aos detalhes. Destacam-se em seguir procedimentos, evitar erros e manter altos padrões. No ambiente corporativo, são guardiões da qualidade que asseguram que processos sejam executados corretamente.',
    howDealsWithProblems: [
      'Analisa sistematicamente todas as variáveis',
      'Busca a solução mais correta e precisa',
      'Segue procedimentos estabelecidos e testados',
      'Considera todas as consequências possíveis',
      'Pode demorar buscando informação perfeita',
      'Prefere dados concretos a intuição'
    ],
    developmentPoints: [
      'Ser menos perfeccionista, aceitar "bom o suficiente"',
      'Tomar decisões mais rápidas com informação suficiente',
      'Aceitar que erros fazem parte do aprendizado',
      'Ser mais flexível com mudanças imprevistas',
      'Melhorar habilidades sociais e expressão emocional',
      'Confiar mais na intuição além de dados',
      'Desenvolver tolerância à ambiguidade',
      'Balancear qualidade com velocidade quando necessário'
    ],
    communicationTips: {
      do: [
        'Seja lógico e preciso',
        'Apresente dados e evidências concretas',
        'Dê tempo adequado para análise',
        'Respeite necessidade de qualidade',
        'Seja organizado na apresentação',
        'Forneça documentação detalhada'
      ],
      dont: [
        'Evite pressão por decisões rápidas',
        'Não apresente informações incompletas',
        'Evite ser excessivamente emocional',
        'Não critique trabalho sem fundamento',
        'Evite mudanças sem justificativa clara',
        'Não desrespeite a importância da precisão'
      ]
    },
    strengths: [
      'Atenção excepcional aos detalhes',
      'Análise criteriosa e profunda',
      'Alta qualidade no trabalho entregue',
      'Precisão e exatidão consistentes',
      'Organização e metodologia eficaz'
    ],
    idealEnvironment: 'Ambientes organizados com padrões de qualidade bem definidos, tempo adequado para análise, processos claros e expectativas precisas',
    motivators: [
      'Qualidade e excelência no trabalho',
      'Precisão e exatidão',
      'Processos bem estruturados',
      'Reconhecimento pela qualidade',
      'Tempo adequado para fazer certo'
    ]
  }
};

export const METHODOLOGY_TEXT = `
O DISC da Conversão utiliza a metodologia DISC, desenvolvida pelo psicólogo William Moulton Marston em 1928.
Marston identificou quatro dimensões principais do comportamento humano:

• DOMINÂNCIA (D): Como a pessoa enfrenta problemas e desafios
• INFLUÊNCIA (I): Como a pessoa interage e influencia outras pessoas  
• ESTABILIDADE (S): Como a pessoa responde a mudanças e ao ritmo do ambiente
• CONFORMIDADE (C): Como a pessoa responde a regras e procedimentos estabelecidos

Esta metodologia é amplamente utilizada em processos de recrutamento, desenvolvimento de liderança, 
formação de equipes e coaching profissional. O assessment fornece insights valiosos sobre como cada 
pessoa naturalmente se comporta e como adapta seu comportamento em ambientes de trabalho.

O relatório compara dois perfis importantes:
• Perfil Natural: Como você realmente é - seu comportamento espontâneo e natural
• Perfil Adaptado: Como você se comporta no trabalho - ajustes que faz no ambiente profissional

A diferença entre esses perfis indica o nível de tensão que você pode estar experimentando.
`;

export const JUNGIAN_TYPES = {
  ESTJ: 'Executivo - Organizado, prático e decisivo',
  ISTJ: 'Inspetor - Responsável, leal e trabalhador',
  ESFJ: 'Provedor - Prestativo, leal e organizado',
  ISFJ: 'Protetor - Caloroso, responsável e consciente',
  ESTP: 'Empreendedor - Energético, pragmático e espontâneo',
  ISTP: 'Artesão - Observador, prático e independente',
  ESFP: 'Animador - Espontâneo, entusiasta e amigável',
  ISFP: 'Compositor - Gentil, sensível e adaptável',
  ENTJ: 'Comandante - Estratégico, lógico e eficiente',
  INTJ: 'Arquiteto - Independente, estratégico e determinado',
  ENTP: 'Visionário - Inovador, engenhoso e desafiador',
  INTP: 'Pensador - Lógico, analítico e criativo',
  ENFJ: 'Professor - Carismático, inspirador e idealista',
  INFJ: 'Conselheiro - Idealista, organizado e perspicaz',
  ENFP: 'Campeão - Entusiasta, criativo e sociável',
  INFP: 'Curador - Idealista, leal e criativo'
};

// ============= DADOS PARA ANÁLISE DE CONTRATAÇÃO =============

export interface ProfileBaseDescription {
  characteristics: string;
  motivatingLanguage: string;
  attentionPoint: string;
}

export const PROFILE_BASE_DESCRIPTIONS: Record<string, ProfileBaseDescription> = {
  D: {
    characteristics: 'Rápido, competitivo, direto, orientado a resultados',
    motivatingLanguage: 'Desafios, metas e autonomia',
    attentionPoint: 'Impaciência, pouca escuta'
  },
  I: {
    characteristics: 'Comunicativo, inspirador, otimista, social',
    motivatingLanguage: 'Reconhecimento, entusiasmo, ambiente leve',
    attentionPoint: 'Falta de foco e disciplina'
  },
  S: {
    characteristics: 'Calmo, cooperativo, empático, persistente',
    motivatingLanguage: 'Segurança, previsibilidade, pertencimento',
    attentionPoint: 'Resistência a mudanças'
  },
  C: {
    characteristics: 'Analítico, detalhista, metódico, racional',
    motivatingLanguage: 'Estrutura, clareza, perfeição',
    attentionPoint: 'Excesso de crítica e lentidão na decisão'
  }
};

export interface RoleMapping {
  mostIndicated: string[];
  requiresAdaptation: string[];
  developmentRecommendations: string;
}

export const ROLE_MAPPINGS: Record<string, RoleMapping> = {
  'SDR': {
    mostIndicated: ['D', 'I', 'DI', 'ID'],
    requiresAdaptation: ['C', 'S', 'SC', 'CS'],
    developmentRecommendations: 'Treinar ritmo, improviso e entusiasmo em contato frio. Desenvolver confiança na abordagem inicial.'
  },
  'Closer': {
    mostIndicated: ['D', 'C', 'DC', 'CD', 'DI'],
    requiresAdaptation: ['I', 'S', 'IS', 'SI'],
    developmentRecommendations: 'Desenvolver escuta ativa e leitura de perfil; treinar assertividade e técnica de fechamento estruturado.'
  },
  'Suporte/Atendimento': {
    mostIndicated: ['S', 'C', 'SC', 'CS', 'IS'],
    requiresAdaptation: ['D', 'I'],
    developmentRecommendations: 'Praticar empatia e paciência; criar checklists e rotinas de atendimento consistentes.'
  },
  'Gestor Comercial': {
    mostIndicated: ['D', 'S', 'DS', 'DI'],
    requiresAdaptation: ['I', 'C'],
    developmentRecommendations: 'Treinar liderança situacional, equilibrando pressão por resultados com empatia pela equipe.'
  },
  'Head/Estratégico': {
    mostIndicated: ['D', 'C', 'DC', 'CD'],
    requiresAdaptation: ['I', 'IS'],
    developmentRecommendations: 'Focar em visão analítica, delegar mais e dominar gestão de indicadores estratégicos.'
  }
};

export interface StrategicInterpretation {
  potential: string;
  limitations: string;
  hiringRecommendation: string;
}

export const STRATEGIC_INTERPRETATIONS: Record<string, StrategicInterpretation> = {
  'DI': {
    potential: 'Alta performance em metas e execução; ótimo para ambiente de pressão',
    limitations: 'Impulsividade e tendência à centralização de decisões',
    hiringRecommendation: 'Ideal para SDR ou Closer sob liderança experiente que canalize sua energia'
  },
  'ID': {
    potential: 'Excelente em networking e influência; fecha vendas com carisma',
    limitations: 'Pode perder foco em processos estruturados',
    hiringRecommendation: 'Perfeito para vendas consultivas e expansão de mercado'
  },
  'IS': {
    potential: 'Comunicação humanizada, ótimo relacionamento interpessoal',
    limitations: 'Dificuldade com cobrança direta e confronto',
    hiringRecommendation: 'Bom para pós-venda, inside sales ou customer success'
  },
  'SI': {
    potential: 'Estabilidade com sociabilidade; mantém clientes por longo prazo',
    limitations: 'Ritmo mais lento em prospecção ativa',
    hiringRecommendation: 'Excelente para gestão de contas e retenção'
  },
  'DC': {
    potential: 'Visão estratégica, foco em processos e resultados mensuráveis',
    limitations: 'Pouca adaptabilidade e baixa empatia natural',
    hiringRecommendation: 'Excelente para gestor de performance, controle e analytics'
  },
  'CD': {
    potential: 'Precisão técnica com capacidade de execução',
    limitations: 'Pode ser inflexível em mudanças rápidas',
    hiringRecommendation: 'Ideal para implementação de processos e gestão de qualidade'
  },
  'SC': {
    potential: 'Metódico, confiável, disciplinado e detalhista',
    limitations: 'Evita conflitos, baixa velocidade de decisão',
    hiringRecommendation: 'Indicado para funções de suporte, operação e análise'
  },
  'CS': {
    potential: 'Organização com empatia; cria processos humanizados',
    limitations: 'Resistência a mudanças abruptas',
    hiringRecommendation: 'Perfeito para suporte técnico e treinamento'
  },
  'D': {
    potential: 'Foco extremo em resultados e liderança natural',
    limitations: 'Pode atropelar processos e pessoas',
    hiringRecommendation: 'Líder comercial ou gestor de expansão em ambientes desafiadores'
  },
  'I': {
    potential: 'Facilidade em inspirar e engajar equipes',
    limitations: 'Inconstância e dispersão em tarefas operacionais',
    hiringRecommendation: 'Potencial de liderança de equipe criativa ou social selling'
  },
  'S': {
    potential: 'Lealdade extrema e consistência operacional',
    limitations: 'Baixa adaptabilidade a mudanças',
    hiringRecommendation: 'Operações de suporte, atendimento ao cliente de longo prazo'
  },
  'C': {
    potential: 'Excelência técnica e atenção a detalhes',
    limitations: 'Lentidão na tomada de decisões práticas',
    hiringRecommendation: 'Analista de processos, controle de qualidade, compliance'
  }
};

export interface DecisionMatrix {
  question: string;
  highInterpretation: string;
}

export const DECISION_MATRIX: Record<string, DecisionMatrix> = {
  detailAttention: {
    question: 'O candidato tende a revisar antes de enviar?',
    highInterpretation: 'Alta = Conforme / Sólido para processos'
  },
  pressureDecision: {
    question: 'Reage rápido em situações de incerteza?',
    highInterpretation: 'Alta = Dominante / Ideal para metas agressivas'
  },
  energyLevel: {
    question: 'Demonstra entusiasmo e ritmo constante?',
    highInterpretation: 'Alta = Influente / Boa presença comercial'
  },
  interpersonalRelationship: {
    question: 'Conecta e mantém vínculos facilmente?',
    highInterpretation: 'Alta = Estável / Ideal para retenção de clientes'
  },
  changeFlexibility: {
    question: 'Adapta-se rápido a novas estratégias?',
    highInterpretation: 'Alta = Influente ou Dominante / útil em times dinâmicos'
  }
};

export interface EvolutionLevel {
  description: string;
  application: string;
}

export const EVOLUTION_SCALE: Record<string, EvolutionLevel> = {
  'Básico': {
    description: 'Possui habilidades iniciais, requer acompanhamento',
    application: 'SDR em formação'
  },
  'Intermediário': {
    description: 'Já executa com autonomia e aprende rápido',
    application: 'Closer ou líder júnior'
  },
  'Avançado': {
    description: 'Alta adaptabilidade e visão sistêmica',
    application: 'Gestor Comercial'
  },
  'Sênior/Head': {
    description: 'Capacidade de multiplicar performance e treinar outros',
    application: 'Head Comercial ou Diretor de Expansão'
  }
};

// Função auxiliar para determinar o perfil combinado
export const getCombinedProfile = (naturalD: number, naturalI: number, naturalS: number, naturalC: number): string => {
  const scores = [
    { factor: 'D', score: naturalD },
    { factor: 'I', score: naturalI },
    { factor: 'S', score: naturalS },
    { factor: 'C', score: naturalC }
  ].sort((a, b) => b.score - a.score);
  
  // Threshold para considerar um fator significativo (60% da escala 0-40 = 24)
  const threshold = 24;
  
  if (scores[0].score >= threshold && scores[1].score >= threshold) {
    return scores[0].factor + scores[1].factor;
  }
  
  return scores[0].factor;
};

// Função para gerar conclusão automática
export const generateHiringConclusion = (
  combinedProfile: string,
  naturalD: number,
  naturalI: number,
  naturalS: number,
  naturalC: number,
  tensionLevel: string
): string => {
  const interpretation = STRATEGIC_INTERPRETATIONS[combinedProfile] || STRATEGIC_INTERPRETATIONS['DI'];
  
  const profileFactors = combinedProfile.split('');
  const dominantTraits = profileFactors.map(f => {
    switch(f) {
      case 'D': return 'resultado';
      case 'I': return 'influência social';
      case 'S': return 'estabilidade';
      case 'C': return 'conformidade';
      default: return '';
    }
  }).join(' e ');
  
  const tensionText = tensionLevel === 'high' 
    ? 'Alta tensão entre perfil natural e adaptado sugere ambiente de pressão. Requer monitoramento de bem-estar.' 
    : tensionLevel === 'moderate'
    ? 'Tensão moderada indica adaptação controlada ao ambiente.'
    : 'Baixa tensão indica alinhamento entre perfil natural e demandas do ambiente.';
  
  return `O perfil identificado é ${combinedProfile}, com energia voltada a ${dominantTraits}. ${interpretation.hiringRecommendation} ${tensionText} Recomenda-se acompanhamento nos primeiros 90 dias com metas curtas e feedback semanal.`;
};
