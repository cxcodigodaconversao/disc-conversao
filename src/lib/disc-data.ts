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
    fullDescription: 'Pessoas com perfil D são diretas, decididas e orientadas para resultados. São naturalmente competitivas, gostam de desafios e assumir o controle de situações. Focam em realizar tarefas rapidamente e superar obstáculos. Tendem a ser assertivos, independentes e orientados para a ação.',
    strengths: ['Tomada de decisão rápida', 'Foco em resultados', 'Iniciativa', 'Liderança natural', 'Confiança'],
    challenges: ['Impaciência', 'Pode ser muito direto', 'Dificuldade em delegar', 'Pouca atenção aos detalhes'],
    idealEnvironment: 'Ambientes dinâmicos com autonomia, desafios constantes e oportunidades de liderança'
  },
  I: {
    name: 'Influência',
    description: 'Comunicativo, entusiasta e persuasivo',
    fullDescription: 'Pessoas com perfil I são comunicativas, entusiastas e persuasivas. São naturalmente sociáveis, otimistas e gostam de estar rodeadas de pessoas. Focam em relacionamentos, colaboração e inspirar outros. Tendem a ser expressivos, criativos e energéticos.',
    strengths: ['Comunicação eficaz', 'Entusiasmo', 'Capacidade de persuasão', 'Criatividade', 'Networking'],
    challenges: ['Pode ser excessivamente otimista', 'Dificuldade com detalhes', 'Desorganização', 'Dificuldade em manter o foco'],
    idealEnvironment: 'Ambientes colaborativos com interação social frequente, reconhecimento e liberdade criativa'
  },
  S: {
    name: 'Estabilidade',
    description: 'Paciente, leal e bom ouvinte',
    fullDescription: 'Pessoas com perfil S são pacientes, leais e bons ouvintes. São naturalmente calmas, confiáveis e preferem ambientes estáveis e previsíveis. Focam em manter a harmonia, apoiar outros e trabalhar em equipe. Tendem a ser consistentes, dedicados e cooperativos.',
    strengths: ['Paciência', 'Lealdade', 'Trabalho em equipe', 'Escuta ativa', 'Calma sob pressão'],
    challenges: ['Resistência a mudanças', 'Dificuldade em dizer não', 'Evita conflitos', 'Pode ser muito passivo'],
    idealEnvironment: 'Ambientes estáveis com processos claros, trabalho em equipe e baixo nível de conflito'
  },
  C: {
    name: 'Conformidade',
    description: 'Analítico, preciso e orientado para qualidade',
    fullDescription: 'Pessoas com perfil C são analíticas, precisas e orientadas para qualidade. São naturalmente metódicas, detalhistas e valorizam a exatidão. Focam em seguir procedimentos, garantir qualidade e evitar erros. Tendem a ser sistemáticos, cautelosos e objetivos.',
    strengths: ['Atenção aos detalhes', 'Análise criteriosa', 'Qualidade no trabalho', 'Precisão', 'Organização'],
    challenges: ['Perfeccionismo', 'Pode ser muito crítico', 'Dificuldade com prazos apertados', 'Resistência a mudanças'],
    idealEnvironment: 'Ambientes organizados com padrões de qualidade bem definidos e tempo para análise'
  }
};
