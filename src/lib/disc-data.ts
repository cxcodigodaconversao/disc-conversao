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
O CIS Assessment® utiliza a metodologia DISC, desenvolvida pelo psicólogo William Moulton Marston em 1928. 
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
