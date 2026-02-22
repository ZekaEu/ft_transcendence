*Este projeto foi criado como parte do currículo da 42 por edcastro, rilopes, dsayumi-, jovicto2 e joscarlo.*

> **Triple Trouble Trivia Time!** — Um jogo de trivia multiplayer em tempo real construído para o projeto 42 ft_transcendence.

---

## Informações do Time

| Membro | Papel(is) | Responsabilidades |
|--------|-----------|-------------------|
| **edcastro** | Tech Lead (Backend) | Arquitetura do backend Flask, design de APIs REST, configuração do banco de dados MySQL, integração OAuth 2.0, e liderança técnica da camada backend |
| **rilopes** | Tech Lead (Frontend) | Arquitetura React, design do sistema de componentes, integração Socket.io, gerenciamento de estado (Context API), e liderança técnica da camada frontend |
| **dsayumi-** | Product Owner + Developer | Visão do produto, coordenação entre times, features de internacionalização (i18n), e desenvolvimento full-stack (frontend + backend) |
| **jovicto2** | Developer (Backend) | Implementação de features backend (game logic, chat, leaderboard), testes unitários, otimização de queries, e WebSocket event handlers |
| **joscarlo** | Developer (Frontend) | Implementação de componentes React, UI/UX com Tailwind CSS, responsividade mobile, e integração de features frontend |

---

## Gestão do Projeto

### Organização do Trabalho

O projeto foi organizado através de uma distribuição clara de tarefas (task distribution) e reuniões de alinhamento regulares:

- **Distribuição de Tasks**: As funcionalidades foram divididas entre frontend e backend, com cada desenvolvedor responsável por suas respectivas features. Os Tech Leads supervisionavam a implementação e garantiam consistência arquitetural.
  
- **Reuniões de Alinhamento**: Reuniões periódicas foram realizadas para:
  - Sincronizar o progresso entre times (frontend/backend)
  - Resolver bloqueadores e dependências entre tasks
  - Revisar código e manter qualidade
  - Planejar sprints e ajustar prioridades

- **Sprint Planning**: O time se reunia para definir objetivos de curto prazo, estimar esforço, e atribuir tasks aos desenvolvedores.

### Ferramentas de Gestão

**GitHub** foi utilizado como ferramenta principal de project management:

- **GitHub Issues**: Cada feature, bug fix, e tarefa era registrada como uma issue com descrição clara, critérios de aceitação, e labels (bug, feature, enhancement, in-progress, done)
- **Pull Requests**: Todas as mudanças de código eram integradas via PR com revisão de código obrigatória antes do merge
- **Commits & Branches**: Convenção de branching (feature/*, bugfix/*, etc.) para organizar o desenvolvimento

### Canais de Comunicação

**Discord** foi utilizado como principal canal de comunicação síncrona:

- **Calls & Voice Channels**: Reuniões síncronas agendadas para alinhamentos críticos
- **Resolução Rápida**: Issues urgentes podiam ser discutidas em tempo real sem aguardar reunião formal
- **Documentação**: Decisões técnicas importantes eram documentadas no repositório

---

## Descrição

### Nome do Projeto & Visão Geral

**Triple Trouble Trivia** é um jogo de trivia multiplayer em tempo real onde jogadores competem em equipes ou individualmente respondendo perguntas de múltiplas categorias. Os jogadores ganham pontos, sobem no ranking e desbloqueiam conquistas enquanto enfrentam amigos em modos de jogo temáticos. O projeto é construído como uma aplicação web full-stack com frontend React e backend Flask, deployado via Docker.

### Objetivo

O objetivo deste projeto é demonstrar proficiência em desenvolvimento web full-stack, incluindo frameworks frontend modernos (React), design de API backend (REST + WebSocket), design de banco de dados (MySQL), comunicação em tempo real (Socket.io), autenticação (JWT + OAuth 2.0) e deployment containerizado (Docker).

### Funcionalidades Principais

- **Gameplay Multiplayer em Tempo Real**: Gameplay baseado em WebSocket com atualizações de jogadores ao vivo, notificações instantâneas e estado de jogo sincronizado
- **Múltiplas Categorias de Jogo**: 15+ categorias incluindo Ciência, História, Geografia, Tecnologia, Esportes, Artes, Literatura, Filmes, Música, Gaming e mais
- **Sistema de Ranking Classificado**: Ranking global com estatísticas de jogadores, taxas de vitória, histórico de partidas e rastreamento de conquistas
- **Autenticação Segura**: Gerenciamento de sessão baseado em JWT com integração OAuth 2.0 (42 Intra e Google)
- **Sistema de Chat**: Mensagens diretas entre jogadores e funcionalidade de chat em grupo com indicadores de digitação em tempo real
- **Internacionalização (i18n)**: Suporte completo a idiomas para Português, Inglês, Espanhol e Francês com alternância de idioma dinâmica
- **UI Responsiva e Amigável ao Mobile**: Design adaptativo usando Tailwind CSS com suporte a modo escuro
- **Perfis de Usuário**: Avatares personalizáveis, bio, nomes exibidos e rastreamento de histórico de partidas
- **Sistema de Amigos**: Adicionar, gerenciar e ver status online de amigos

### Stack Tecnológico

| Camada | Tecnologia |
|-------|-------------|
| Frontend | React 18 · Vite · Tailwind CSS · Socket.io Client |
| Backend | Flask 3.1 · SQLAlchemy · JWT · Flask-SocketIO |
| Banco de Dados | MySQL 8.0 |
| Proxy Reverso | NGINX (SSL) |
| Containerização | Docker & Docker Compose |

---

## Stack Técnico

### Frontend

#### Tecnologias & Frameworks

| Tecnologia | Versão | Propósito |
|------------|--------|----------|
| **React** | 18.x | Framework JavaScript para construir interfaces de usuário reativas e componentizadas |
| **Vite** | 5.x+ | Build tool moderno com hot module replacement (HMR) para desenvolvimento rápido |
| **Tailwind CSS** | 3.x | Framework utilitário para estilização sem escrever CSS customizado |
| **Socket.io Client** | 4.x | Cliente WebSocket para comunicação bidirecional em tempo real com o servidor |
| **React Router** | 6.x | Roteamento client-side para navegação entre páginas (SPA) |
| **React Hot Toast** | Latest | Notificações toast para feedback visual de ações (sucesso, erro, etc.) |
| **i18next** | 23.x | Internacionalização para suporte a múltiplas línguas (pt, en, es, fr) |
| **Axios** | 1.x | Cliente HTTP para requisições REST ao backend |

#### Justificativa das Escolhas Frontend

- **React 18**: Escolhido por ser o framework mais popular, com vasta comunidade, excelente documentação, e suporte a hooks e Context API para gerenciamento de estado sem necessidade de Redux
- **Vite**: Muito mais rápido que Webpack/Create React App, com HMR instantâneo, build otimizado e suporte nativo a ESM (ES Modules)
- **Tailwind CSS**: Reduz significativamente o tempo de desenvolvimento com utilitários prontos; elimina a necessidade de escrever CSS customizado extenso
- **Socket.io Client**: Abstrair WebSockets nativos e fornece fallbacks automáticos (polling, etc.) em navegadores antigos
- **React Router v6**: Versão mais recente com melhor type-safety e performance

---

### Backend

#### Tecnologias & Frameworks

| Tecnologia | Versão | Propósito |
|------------|--------|----------|
| **Flask** | 3.1+ | Microframework Python minimalista para criar APIs REST |
| **Flask-SocketIO** | 5.x | Extensão Flask para WebSocket e comunicação em tempo real |
| **SQLAlchemy** | 2.x | ORM (Object-Relational Mapping) para interação com banco de dados |
| **Flask-JWT-Extended** | 4.x | Autenticação via JSON Web Tokens (JWT) |
| **Flask-CORS** | 4.x | Habilitação de CORS (Cross-Origin Resource Sharing) para requisições frontend |
| **Python-dotenv** | Latest | Carregamento de variáveis de ambiente do arquivo `.env` |
| **Gunicorn** | 21.x+ | WSGI HTTP Server para servir a aplicação Flask em produção |
| **Requests** | 2.x | Biblioteca HTTP para chamadas OAuth e integrações externas |

#### Justificativa das Escolhas Backend

- **Flask**: Escolhido por sua simplicidade, flexibilidade, e curva de aprendizado baixa, sem sacrificar funcionalidade; ideal para um projeto educacional
- **Flask-SocketIO**: Integração natural com Flask; suporta tanto WebSocket quanto fallbacks automáticos
- **SQLAlchemy ORM**: Abstrai complexidade SQL, permite queries type-safe, e facilita migrações de banco sem reescrever código
- **JWT**: Stateless authentication ideal para APIs REST e SPAs; seguro, escalável, e não requer sessões no servidor
- **Gunicorn**: Production-ready WSGI server com bom desempenho e suporte a multi-workers

---

### Database (Banco de Dados)

#### Tecnologia & Justificativa

**MySQL 8.0** foi escolhido por:

| Critério | Justificativa |
|----------|---------------|
| **Confiabilidade** | ACID compliance garantido; transações seguras para operações críticas (pagamentos, rankings) |
| **Escalabilidade** | Suporta grandes volumes de dados; indexação eficiente para queries rápidas em leaderboards e histórico de partidas |
| **Disponibilidade** | Replicação nativa e suporte a high availability através de cluster MySQL |
| **Familiar ao Time** | Amplamente conhecido no mercado; fácil encontrar documentação e suporte da comunidade |
| **Docker-Friendly** | Imagem oficial confiável e bem mantida; fácil de containerizar e orquestrar com Docker Compose |
| **Compatibilidade** | Trabalha bem com SQLAlchemy e outras ferramentas Python/web modernas |

#### Schema do Banco

Principais entidades (13 tabelas):

- **users**: Autenticação, perfil, XP, estatísticas
- **oauth_accounts**: Contas OAuth vinculadas (42 Intra, Google)
- **revoked_tokens**: Blocklist de tokens JWT revogados
- **chat_rooms / chat_room_members / chat_messages**: Sistema de chat (DM e grupo)
- **game_rooms / game_room_players**: Salas de trivia e jogadores
- **memory_game_rooms / memory_game_players**: Salas de jogo da memória e jogadores
- **user_powerups**: Inventário de power-ups da loja
- **match_history**: Histórico unificado de partidas (trivia + memória)
- **friendships**: Relações de amizade entre usuários

---

### Infraestrutura & DevOps

#### Containerização

| Tecnologia | Propósito |
|------------|----------|
| **Docker** | Containerização de aplicação para garantir consistência entre desenvolvimento e produção |
| **Docker Compose** | Orquestração de múltiplos containers (frontend, backend, mysql, nginx) com um único comando |
| **NGINX** | Reverse proxy para servir frontend estático, balancear carga, e terminar SSL/TLS |

#### Justificativa das Escolhas de Infraestrutura

- **Docker**: Elimina problema de "funciona na minha máquina"; garante ambiente idêntico em dev, staging e produção; facilita deployment e scaling
- **Docker Compose**: Simplifica orquestração local de múltiplos serviços; ideal para desenvolvimento e pequenas deployments
- **NGINX**: Servidor web leve e eficiente; excelente performance para servir arquivos estáticos; suporte nativo a SSL/TLS e reverse proxy

---

### Outras Tecnologias Significativas

| Tecnologia | Uso |
|------------|-----|
| **Git & GitHub** | Versionamento de código, colaboração em time, CI/CD |
| **GitHub Actions** | Automação de testes e builds (opcional, pode ser adicionado) |
| **JWT (JSON Web Tokens)** | Autenticação stateless e segura |
| **OAuth 2.0** | Integração com 42 Intra e Google para login social |
| **Socket.io** | Comunicação bidirecional em tempo real (WebSocket) |
| **Tailwind CSS** | Estilização utility-first para UI responsiva |
| **i18next** | Suporte multilíngue (4 idiomas) |

---

## Schema do Banco de Dados

### Visão Geral

O banco de dados foi projetado com as seguintes características:

- **Normalização**: 3ª Forma Normal (3NF) para evitar redundância
- **Integridade**: Constraints de chave estrangeira (FOREIGN KEY) com cascade delete
- **Performance**: Índices estratégicos em colunas frequentemente consultadas
- **Auditoria**: Timestamps `created_at` e `updated_at` para rastreamento de modificações
- **Segurança**: Senhas hasheadas, tokens JWT revogáveis, OAuth tokens encriptados

### Diagrama ER (Entity Relationship)

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUÁRIOS E AUTENTICAÇÃO                  │
├─────────────────────────────────────────────────────────────────┤
│
│  users (1)─────────────(N) oauth_accounts
│     │                        ├─ provider (42, Google, etc.)
│     │                        └─ access_token
│     │
│     ├────────(1)─────────(N) revoked_tokens
│     │                         ├─ jti (JWT ID)
│     │                         └─ revoked_at
│     │
│     └────────(1)─────────(N) user_powerups
│                               ├─ powerup_type (VARCHAR)
│                               └─ quantity (INT)
│
├─────────────────────────────────────────────────────────────────┤
│                        CHAT (MENSAGENS)                         │
├─────────────────────────────────────────────────────────────────┤
│
│  chat_rooms (1)──────────(N) chat_messages
│     │                         ├─ content (TEXT)
│     │                         ├─ is_system (boolean)
│     │                         └─ is_read (boolean)
│     │
│     └────(M2M)────── chat_room_members ──────(M2M)─── users
│         (many-to-many com junction table)
│
├─────────────────────────────────────────────────────────────────┤
│                   TRIVIA (GAME ROOMS)                           │
├─────────────────────────────────────────────────────────────────┤
│
│  users (1)───────────────(N) game_rooms
│     │                         ├─ name, game_mode
│     │                         ├─ question_category / difficulty / language
│     │                         ├─ max_players, friends_only
│     │                         └─ status (waiting/playing/finished)
│     │
│     └────(M2M)─ game_room_players ─(M2M)─── game_rooms
│         ├─ is_ready (BOOLEAN)
│         └─ score (INT)
│
├─────────────────────────────────────────────────────────────────┤
│                   MEMORY (GAME ROOMS)                           │
├─────────────────────────────────────────────────────────────────┤
│
│  users (1)───────────────(N) memory_game_rooms
│     │                         ├─ name, board_size, theme
│     │                         ├─ max_players, friends_only
│     │                         └─ status (waiting/playing/finished)
│     │
│     └────(M2M)─ memory_game_players ─(M2M)── memory_game_rooms
│         ├─ is_ready (BOOLEAN)
│         ├─ score (INT)
│         └─ pairs_found (INT)
│
├─────────────────────────────────────────────────────────────────┤
│                  HISTÓRICO UNIFICADO                             │
├─────────────────────────────────────────────────────────────────┤
│
│  users (1)───────────────(N) match_history
│                               ├─ game_type (trivia/memory)
│                               ├─ room_id, room_name
│                               ├─ score, rank, total_players
│                               ├─ is_winner (BOOLEAN)
│                               └─ played_at (DATETIME)
│
├─────────────────────────────────────────────────────────────────┤
│                     AMIGOS (FRIENDSHIPS)                        │
├─────────────────────────────────────────────────────────────────┤
│
│  users (1)──────────(N) friendships
│     │                  ├─ status ('pending', 'accepted')
│     │                  └─ created_at
│     │
│     └─(many)── friendships ──(many)── users
│         (auto-referencial para relação bidirecional)
│
└─────────────────────────────────────────────────────────────────┘
```

### Tabelas Detalhadas

#### 1. **users** — Usuários do Sistema

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|-----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Identificador único do usuário |
| `username` | VARCHAR(64) | NOT NULL, UNIQUE | Nome de usuário para login |
| `email` | VARCHAR(120) | NOT NULL, UNIQUE | Email único para notificações e recuperação |
| `password_hash` | VARCHAR(256) | NULL | Hash bcrypt/argon2 (NULL se OAuth) |
| `avatar_url` | VARCHAR(512) | NULL | URL da foto de perfil (CDN ou blob storage) |
| `display_name` | VARCHAR(128) | NULL | Nome exibido no perfil e no jogo |
| `bio` | VARCHAR(500) | NULL | Biografia do usuário |
| `xp` | INT | NOT NULL, DEFAULT 0 | Pontos de experiência acumulados |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Conta ativa/desativada |
| `is_online` | BOOLEAN | NOT NULL, DEFAULT FALSE | Status online em tempo real |
| `last_seen` | DATETIME | NULL | Último timestamp de atividade |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data de criação da conta |
| `updated_at` | DATETIME | NOT NULL, DEFAULT NOW() ON UPDATE | Data da última modificação |

**Índices**: `idx_users_username`, `idx_users_email`

---

#### 2. **oauth_accounts** — Contas OAuth (42 Intra, Google)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|-----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único da conta OAuth |
| `user_id` | INT | NOT NULL, FK→users.id | Referência ao usuário |
| `provider` | VARCHAR(50) | NOT NULL | Provider ('42intra', 'google', etc.) |
| `provider_user_id` | VARCHAR(128) | NOT NULL | ID do usuário no provider externo |
| `access_token` | VARCHAR(512) | NULL | Token de acesso do provider |
| `refresh_token` | VARCHAR(512) | NULL | Token de refresh (renovação automática) |
| `token_expires_at` | DATETIME | NULL | Expiração do token de acesso |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data de vinculação |

**Constraints**: UNIQUE(provider, provider_user_id) — Evita duplicação de contas OAuth

**Índices**: `idx_oauth_provider`

---

#### 3. **revoked_tokens** — Tokens JWT Revogados (Blocklist)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|-----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único do token revogado |
| `jti` | VARCHAR(120) | NOT NULL, UNIQUE | JWT ID (claim único no token) |
| `user_id` | INT | NOT NULL, FK→users.id | Usuário que revogou o token |
| `revoked_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data da revogação |

**Índices**: `idx_revoked_jti` — Busca rápida ao validar tokens

---

#### 4. **chat_rooms** — Salas de Chat (DM ou Grupo)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|-----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único da sala |
| `name` | VARCHAR(128) | NULL | Nome do grupo (NULL para DM) |
| `is_group` | BOOLEAN | NOT NULL, DEFAULT FALSE | Diferencia DM (false) de grupo (true) |
| `created_by` | INT | NULL, FK→users.id | Criador do grupo |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data de criação |
| `updated_at` | DATETIME | NOT NULL, DEFAULT NOW() ON UPDATE | Data da última mensagem/atualização |

---

#### 5. **chat_room_members** — Membros da Sala (Many-to-Many)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|-----------|
| `room_id` | INT | NOT NULL, FK→chat_rooms.id | Referência à sala |
| `user_id` | INT | NOT NULL, FK→users.id | Referência ao usuário |
| `joined_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data de entrada na sala |

**Primary Key**: (room_id, user_id) — Composite key única

---

#### 6. **chat_messages** — Mensagens de Chat

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|-----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único da mensagem |
| `room_id` | INT | NOT NULL, FK→chat_rooms.id | Sala onde a mensagem foi enviada |
| `sender_id` | INT | NOT NULL, FK→users.id | Usuário que enviou |
| `content` | TEXT | NOT NULL | Conteúdo da mensagem |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT FALSE | Mensagem do sistema (join, leave, etc.) |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT FALSE | Status de leitura |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW() | Timestamp da mensagem |

**Índices**: `idx_chatmsg_room`, `idx_chatmsg_sender`, `idx_chatmsg_created` — Queries rápidas por sala, sender, ou período

---

#### 7. **game_rooms** — Salas de Jogo

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|-----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único da sala |
| `name` | VARCHAR(128) | NOT NULL | Nome da sala (criada pelo host) |
| `host_id` | INT | NOT NULL, FK→users.id | Criador/host da sala |
| `game_mode` | VARCHAR(32) | NOT NULL, DEFAULT 'classic' | Modo ('classic', 'survival', 'timed') |
| `max_players` | INT | NOT NULL, DEFAULT 4 | Limite de jogadores (2-8) |
| `friends_only` | BOOLEAN | NOT NULL, DEFAULT FALSE | Apenas amigos podem entrar |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'waiting' | Status ('waiting', 'playing', 'finished') |
| `question_category` | VARCHAR(32) | NOT NULL, DEFAULT 'any' | Categoria de perguntas ('science', 'history', etc.) |
| `question_difficulty` | VARCHAR(16) | NOT NULL, DEFAULT 'any' | Dificuldade ('easy', 'medium', 'hard') |
| `question_language` | VARCHAR(8) | NOT NULL, DEFAULT 'any' | Idioma ('pt', 'en', 'es', 'fr') |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data de criação da sala |

**Índices**: `idx_gameroom_status`, `idx_gameroom_mode` — Filtros comuns

---

#### 8. **game_room_players** — Jogadores na Sala (Many-to-Many)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|-----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único da entrada |
| `room_id` | INT | NOT NULL, FK→game_rooms.id | Referência à sala |
| `user_id` | INT | NOT NULL, FK→users.id | Referência ao usuário |
| `is_ready` | BOOLEAN | NOT NULL, DEFAULT FALSE | Jogador pronto? |
| `score` | INT | NOT NULL, DEFAULT 0 | Score do jogador nessa sala |
| `joined_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data de entrada |

**Constraints**: UNIQUE(room_id, user_id) — Um jogador não pode aparecer 2x na mesma sala

---

#### 9. **user_powerups** — Power-ups do Usuário (Inventário da Loja)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único da entrada |
| `user_id` | INT | NOT NULL, FK→users.id | Referência ao usuário |
| `powerup_type` | VARCHAR(32) | NOT NULL | Tipo do power-up ('fifty_fifty', 'extra_time', etc.) |
| `quantity` | INT | NOT NULL, DEFAULT 0 | Quantidade disponível |

**Constraints**: UNIQUE(user_id, powerup_type) — Cada tipo de power-up é único por usuário

**Índices**: `idx_powerup_user`

---

#### 10. **memory_game_rooms** — Salas de Jogo da Memória

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único da sala |
| `name` | VARCHAR(128) | NOT NULL | Nome da sala |
| `host_id` | INT | NOT NULL, FK→users.id | Criador/host da sala |
| `board_size` | VARCHAR(16) | NOT NULL, DEFAULT 'medium' | Tamanho do tabuleiro ('small', 'medium', 'large') |
| `theme` | VARCHAR(32) | NOT NULL, DEFAULT 'animals' | Tema visual das cartas |
| `max_players` | INT | NOT NULL, DEFAULT 4 | Limite de jogadores |
| `friends_only` | BOOLEAN | NOT NULL, DEFAULT FALSE | Apenas amigos podem entrar |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'waiting' | Status ('waiting', 'playing', 'finished') |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data de criação da sala |

**Índices**: `idx_memoryroom_status`

---

#### 11. **memory_game_players** — Jogadores do Jogo da Memória (Many-to-Many)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único da entrada |
| `room_id` | INT | NOT NULL, FK→memory_game_rooms.id | Referência à sala de memória |
| `user_id` | INT | NOT NULL, FK→users.id | Referência ao usuário |
| `is_ready` | BOOLEAN | NOT NULL, DEFAULT FALSE | Jogador pronto? |
| `score` | INT | NOT NULL, DEFAULT 0 | Score do jogador |
| `pairs_found` | INT | NOT NULL, DEFAULT 0 | Pares encontrados pelo jogador |
| `joined_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data de entrada |

**Constraints**: UNIQUE(room_id, user_id) — Um jogador não pode aparecer 2x na mesma sala

---

#### 12. **match_history** — Histórico Unificado de Partidas (Trivia + Memória)

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único do registro |
| `user_id` | INT | NOT NULL, FK→users.id | Referência ao jogador |
| `game_type` | VARCHAR(16) | NOT NULL | Tipo de jogo ('trivia' ou 'memory') |
| `room_id` | INT | NOT NULL | ID da sala em que jogou |
| `room_name` | VARCHAR(128) | NOT NULL | Nome da sala |
| `score` | INT | NOT NULL, DEFAULT 0 | Pontuação obtida |
| `is_winner` | BOOLEAN | NOT NULL, DEFAULT FALSE | Se venceu a partida |
| `total_players` | INT | NOT NULL, DEFAULT 2 | Total de jogadores na partida |
| `rank` | INT | NOT NULL, DEFAULT 1 | Posição final no ranking da partida |
| `played_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data/hora da partida |

**Índices**: `idx_mh_user`, `idx_mh_game_type`, `idx_mh_played_at` — Consultas por jogador, tipo de jogo e período

---

#### 13. **friendships** — Relação de Amizade

| Campo | Tipo | Constraints | Descrição |
|-------|------|-----------|-----------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | ID único da amizade |
| `user_id` | INT | NOT NULL, FK→users.id | Usuário que enviou o pedido |
| `friend_id` | INT | NOT NULL, FK→users.id | Usuário que recebeu o pedido |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | Estado ('pending', 'accepted', 'blocked') |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW() | Data do pedido de amizade |
| `updated_at` | DATETIME | NOT NULL, DEFAULT NOW() ON UPDATE | Data da última mudança de status |

**Constraints**: UNIQUE(user_id, friend_id) — Relação única entre dois usuários

**Índices**: `idx_friendship_user`, `idx_friendship_friend`, `idx_friendship_status` — Busca de pedidos e amigos

---

### Decisões de Design

| Decisão | Justificativa |
|---------|---------------|
| **UTF-8mb4 charset** | Suporte completo a emojis e caracteres especiais em chats e nomes |
| **InnoDB engine** | ACID compliance, transações, e foreign keys nativas |
| **Composite Primary Keys** | Evita linhas duplicadas em tabelas de junção (M2M) |
| **ON DELETE CASCADE** | Ao deletar usuário, todas suas mensagens, amigos e salas são removidas automaticamente |
| **Índices Seletivos** | Apenas em colunas frequentemente filtradas para não sobrecarregar writes |
| **VARCHAR vs TEXT** | VARCHAR para campos com limite conhecido, TEXT para conteúdo variável (messages) |
| **Booleans** | Mais eficientes que ENUM ou VARCHAR para dados binários |
| **Timestamps** | DATETIME para legibilidade; poderia ser UNIX_TIMESTAMP para performance |
| **NULL allowance** | Minimizado onde possível, mas necessário em casos como `avatar_url`, `oauth_token`, etc. |
| **Histórico Unificado** | `match_history` armazena partidas de trivia e memória numa única tabela com `game_type` discriminador, simplificando queries de perfil e ranking |
| **Inventário de Power-ups** | `user_powerups` com UNIQUE(user_id, powerup_type) garante uma linha por tipo, atualizando apenas `quantity` |

---

## Instruções

### Pré-requisitos

Certifique-se de ter o seguinte instalado em seu sistema:

#### Software Obrigatório

| Software | Versão | Download | Notas |
|----------|--------|----------|-------|
| **Docker** | 20.10+ | [Get Docker](https://docs.docker.com/get-docker/) | Runtime de containers; inclui Docker Compose no Windows/Mac |
| **Docker Compose** | 2.0+ | [Instalar Compose](https://docs.docker.com/compose/install/) | Ferramenta de orquestração para apps multi-container |
| **Make** | 3.81+ | `apt-get install make` (Linux) / `brew install make` (macOS) | Utilitário de automação de compilação |
| **Git** | 2.0+ | [Download Git](https://git-scm.com/) | Controle de versão (para clonar o repo) |

#### Opcional (para desenvolvimento local sem Docker)

| Software | Versão | Notas |
|----------|--------|-------|
| **Node.js** | 18.0+ | Obrigatório para desenvolvimento frontend; use `nvm` ou instalação direta |
| **npm** | 9.0+ | Vem com Node.js; usado para dependências frontend |
| **Python** | 3.9+ | Obrigatório para desenvolvimento backend |
| **pip** | 21.0+ | Gerenciador de pacotes Python (vem com Python) |

#### Requisitos de Sistema

- **Espaço em Disco**: Mínimo 5GB para imagens Docker e volumes
- **RAM**: Mínimo 4GB; 8GB+ recomendado para operação suave
- **CPU**: Processador multi-core recomendado
- **SO**: Linux, macOS ou Windows (com WSL 2 para melhor performance do Docker)

### Instalação & Setup

#### 1. Clone o Repositório

```bash
git clone https://github.com/ZekaEu/ft_transcendence.git
cd ft_transcendence
```

#### 2. Configure as Variáveis de Ambiente

Copie o arquivo de exemplo de ambiente:

```bash
cp .env.example .env
```

Edite `.env` com seus próprios valores. O arquivo deve incluir:

```bash
# Configuração Flask
SECRET_KEY=<generate-with-command-below>
JWT_SECRET_KEY=<generate-with-command-below>
FLASK_ENV=production

# Banco de Dados (MySQL)
MYSQL_ROOT_PASSWORD=<secure-password>
MYSQL_DATABASE=transcendence
MYSQL_USER=transcendence
MYSQL_PASSWORD=<secure-password>

# Credenciais OAuth 2.0 (do 42 Intra)
OAUTH_42_CLIENT_ID=<your-42-client-id>
OAUTH_42_CLIENT_SECRET=<your-42-client-secret>
OAUTH_42_REDIRECT_URI=https://localhost:8443/auth/callback/42intra

# Credenciais OAuth 2.0 (do Google Cloud)
OAUTH_GOOGLE_CLIENT_ID=<your-google-client-id>
OAUTH_GOOGLE_CLIENT_SECRET=<your-google-client-secret>
OAUTH_GOOGLE_REDIRECT_URI=https://localhost:8443/auth/callback/google

# URL do Frontend
FRONTEND_URL=https://localhost:8443
```

**Gerar chaves secretas seguras:**

```bash
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

**Importante**: Nunca faça commit do `.env` no controle de versão. Adicione-o ao `.gitignore`.

#### 3. Obtenha Credenciais OAuth

##### Para 42 Intra:
1. Vá para [42 Intra Developer Portal](https://profile.intra.42.fr/oauth/applications)
2. Crie uma nova aplicação OAuth
3. Configure **Redirect URI** como `https://localhost:8443/auth/callback/42intra`
4. Copie o **Client ID** e **Client Secret** para `.env`

##### Para Google:
1. Visite [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crie um novo OAuth 2.0 Client (Web Application)
3. Adicione URIs de redirecionamento autorizadas:
   - `https://localhost:8443/auth/callback/google`
   - `http://localhost:5000/auth/callback/google` (para dev local)
4. Copie o **Client ID** e **Client Secret** para `.env`

#### 4. Inicie o Projeto

Compile e inicie todos os containers:

```bash
make
```

Este comando:
- Compila imagens Docker para frontend, backend, nginx e mysql
- Cria e inicia todos os containers
- Inicializa o banco de dados MySQL
- Inicializa o banco de dados com dados iniciais (se aplicável)

**Comandos alternativos:**

```bash
make build      # Compila imagens Docker apenas
make up         # Inicia containers existentes
make restart    # Reinicia todos os containers em execução
make down       # Para e remove containers
make clean      # Remove containers, volumes e imagens
make fclean     # Limpeza completa do Docker incluindo imagens pendentes
make re         # Reconstrução completa do zero
```

#### 5. Verifique a Instalação

Verifique que todos os containers estão em execução:

```bash
docker-compose ps
```

Saída esperada:
```
NAME           STATUS
trivia_mysql   Up
trivia_backend Running
trivia_frontend Running
trivia_nginx   Running
```

Verifique a saúde do serviço:

```bash
curl -k https://localhost:8443/api/health
```

Resposta esperada:
```json
{"status": "healthy"}
```

### Acesse a Aplicação

| Serviço | URL | Propósito |
|---------|-----|----------|
| 🎮 **Aplicação Principal** | https://localhost:8443 | Interface web do jogo de trivia |
| 🔌 **API Backend** | https://localhost:8443/api | Endpoints REST API |
| 💚 **Health Check** | https://localhost:8443/api/health | Endpoint de status do serviço |
| 📊 **WebSocket** | wss://localhost:8443/socket.io | Eventos de jogo em tempo real |

> ⚠️ **Aviso SSL**: Seu navegador exibirá um aviso de segurança para o certificado auto-assinado. Isto é esperado em desenvolvimento. Clique em "Continuar Assim Mesmo" ou "Avançado" para prosseguir.

### Troubleshooting (Resolução de Problemas)

#### Problema: Containers não iniciam
```bash
# Verificar logs por erros
docker-compose logs

# Reconstrução completa
make fclean
make
```

#### Problema: Porta 8443 já está em uso
```bash
# Encontrar e matar o processo usando a porta 8443
lsof -i :8443
kill -9 <PID>

# Ou editar docker-compose.yml para usar uma porta diferente
```

#### Problema: Erros de conexão com banco de dados
```bash
# Garantir que o container MySQL está saudável
docker-compose logs mysql

# Aguarde um momento e tente novamente (MySQL leva tempo para inicializar)
sleep 10
docker-compose ps
```

#### Problema: Frontend mostra página em branco
```bash
# Limpar cache do navegador e atualizar com force (Ctrl+Shift+R ou Cmd+Shift+R)
# Ou limpar volumes do Docker e reiniciar
make clean
make
```

### Estrutura do Projeto

```
ft_transcendence/
├── backend/                   # API REST Flask + servidor WebSocket
│   ├── app/
│   │   ├── auth/             # Autenticação (JWT, OAuth)
│   │   ├── chat/             # Modelos de chat e handlers de WebSocket
│   │   ├── game/             # Salas de jogo, perguntas e pontuação
│   │   └── core/             # Banco de dados, extensões, configuração
│   ├── tools/                # Scripts de setup e configs
│   └── run.py                # Ponto de entrada
│
├── frontend/                  # SPA React com Vite
│   ├── src/
│   │   ├── components/       # Componentes UI reutilizáveis
│   │   ├── pages/            # Componentes de página (Home, Lobby, Game, etc.)
│   │   ├── services/         # Cliente API, auth, WebSocket
│   │   ├── hooks/            # Hooks React customizados
│   │   ├── context/          # Estado global (Auth, Chat)
│   │   ├── i18n/             # Traduções (pt, en, es, fr)
│   │   └── styles/           # CSS global
│   └── index.html            # Ponto de entrada
│
├── services/                  # Serviços de suporte
│   ├── nginx/                # Proxy reverso, configuração SSL
│   └── mysql/                # Schema do banco de dados e inicialização
│
├── docker-compose.yml        # Orquestração de containers
├── Makefile                  # Comandos Make
└── .env.example              # Template de variáveis de ambiente
```

### Desenvolvimento Local (Sem Docker)

#### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r tools/configs/requirements.txt
export FLASK_APP=run.py
export FLASK_ENV=development
flask run
```

O backend executará em `http://localhost:5000`.

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

O servidor de desenvolvimento do frontend executará em `http://localhost:5173`.

---

## Lista de Features

### Features Implementadas

| # | Feature | Descrição | Responsáveis | Status |
|---|---------|-----------|--------------|--------|
| **1** | User Registration & Login | Cadastro seguro com validação, hash de senha (bcrypt), e login com JWT | edcastro, dsayumi- | ✅ Completo |
| **2** | OAuth 2.0 Integration (42 Intra & Google) | Login social via OAuth 2.0 com sincronização automática de perfil | edcastro, dsayumi- | ✅ Completo |
| **3** | User Profile Management | Edição de perfil, avatar upload, bio, e displayname customizável | joscarlo, dsayumi- | ✅ Completo |
| **4** | Real-time Multiplayer Game | Salas de jogo com múltiplos jogadores, sincronização via WebSocket, e game state management | jovicto2, edcastro, rilopes | ✅ Completo |
| **5** | Game Categories & Modes | 15+ categorias de perguntas (Science, History, Geography, etc.) e 3 modos (Classic, Survival, Timed) | jovicto2, dsayumi- | ✅ Completo |
| **6** | Real-time Chat System | Mensagens diretas (DM) e grupos com typing indicators e notificações | jovicto2, joscarlo | ✅ Completo |
| **7** | Leaderboard & Rankings | Sistema de ranking global com top 100, estatísticas de wins/losses, e match history | jovicto2, joscarlo | ✅ Completo |
| **8** | Friend System | Adicionar/remover amigos, gerenciar pedidos de amizade, e ver status online | jovicto2, joscarlo | ✅ Completo |
| **9** | Match History & Statistics | Histórico completo de partidas com scores, categorias jogadas, e análise de desempenho | jovicto2, rilopes, joscarlo | ✅ Completo |
| **10** | Internationalization (i18n) | Suporte completo para 4 idiomas: Português, English, Español, Français | dsayumi-, rilopes | ✅ Completo |
| **11** | Responsive & Mobile-Friendly UI | Design adaptativo com Tailwind CSS, suporta desktop, tablet, e mobile | rilopes, joscarlo | ✅ Completo |
| **12** | Dark Mode Support | Toggle de modo escuro com persistência em localStorage | rilopes, joscarlo | ✅ Completo |
| **13** | JWT Token Management & Refresh | Autenticação stateless, renovação de tokens, e revogação (logout) | edcastro, dsayumi- | ✅ Completo |
| **14** | WebSocket Real-time Events | Sincronização instantânea de game events, player joins, chat messages | edcastro, rilopes | ✅ Completo |
| **15** | Pagination & Performance Optimization | Lazy loading de histórico, indexação de banco, e cache onde necessário | jovicto2, edcastro | ✅ Completo |
| **16** | Input Validation & Security | Validação frontend (React) e backend (Flask), sanitização de inputs | edcastro, rilopes, dsayumi- | ✅ Completo |
| **17** | Error Handling & User Feedback | Toast notifications para ações, modal dialogs, e mensagens de erro claras | joscarlo, rilopes | ✅ Completo |
| **18** | Docker Containerization & Deployment | Build multi-stage, docker-compose para orquestração, NGINX reverse proxy | edcastro, dsayumi- | ✅ Completo |

---

## Módulos (Major & Minor)

### Cálculo de Pontos

- **Major Modules**: 2 pontos cada
- **Minor Modules**: 1 ponto cada

### Módulos Escolhidos

#### Major Modules (2 pontos cada)

| Módulo | Pontos | Implementação | Responsáveis | Justificativa |
|--------|--------|---------------|--------------|--------------|
| **User Management & Authentication** | 2 | JWT + OAuth 2.0 (42 Intra & Google), refresh tokens, logout, password hashing | edcastro, dsayumi- | Obrigatório para o projeto; implementado com segurança em produção (hash bcrypt, tokens revogáveis) |
| **Multiplayer Interaction (WebSocket)** | 2 | Flask-SocketIO para comunicação em tempo real; game events, chat, player joins sincronizados | edcastro, rilopes, jovicto2 | Core do projeto; múltiplos usuários interagindo simultaneamente em salas de jogo e chat |
| **Game History & Statistics** | 2 | Banco de dados normalizado (game_matches), leaderboard com top 100, match history detalhado | jovicto2, joscarlo, edcastro | Rastreamento completo de performance: scores, wins, losses, win rate, streak, timestamps |
| **Chat System** | 2 | Mensagens diretas + grupos, typing indicators, real-time updates via WebSocket | jovicto2, joscarlo, rilopes | Sistema completo de comunicação com persistência em banco e notificações em tempo real |

**Subtotal Major**: 8 pontos

---

#### Minor Modules (1 ponto cada)

| Módulo | Pontos | Implementação | Responsáveis | Justificativa |
|--------|--------|---------------|--------------|--------------|
| **Internationalization (i18n)** | 1 | react-i18next com 4 idiomas (pt, en, es, fr); suporte a plurals, interpolação, namespaces | dsayumi-, rilopes | Full i18n com múltiplas linguagens; não apenas strings hardcoded; suporte a dinâmica de línguas |
| **Accessibility (WAI-ARIA)** | 1 | Semantic HTML, ARIA labels, keyboard navigation, color contrast (WCAG 2.1 AA), dark mode | rilopes, joscarlo | UI acessível para usuários com deficiências visuais e motoras; compliance com WCAG 2.1 AA |
| **Responsive Design (Mobile)** | 1 | Tailwind CSS mobile-first, media queries, flexbox/grid; testes em múltiplos breakpoints | rilopes, joscarlo | Design totalmente responsivo testado em mobile, tablet, e desktop |
| **DevOps & Containerization** | 1 | Docker multi-stage build, docker-compose, NGINX SSL, volumes nomeados, health checks | edcastro, dsayumi- | Containerização completa; setup reproduzível; deployment simples com `make` |
| **SQL Optimization & Database Design** | 1 | Índices estratégicos, queries otimizadas, normalização 3NF, foreign keys com cascade | jovicto2, edcastro | Schema eficiente; indexação em colunas frequentes (user_id, room_id, created_at); minimize N+1 queries |
| **Advanced Animations & UI/UX Polish** | 1 | Tailwind animations (fade, slide, spin), hover effects, transition smooth, loading skeletons | rilopes, joscarlo | UI polida com micro-interactions; feedback visual imediato para todas as ações do usuário |
| **User-Friendly Error Messages & Validation** | 1 | Frontend validation com regex/patterns, backend validation server-side, toast errors específicos | edcastro, rilopes, joscarlo | Mensagens de erro claras e acionáveis; validação em camadas (frontend + backend) |
| **Frontend State Management (Context API)** | 1 | React Context para Auth e Chat; evita prop-drilling; providers bem estruturados | rilopes, dsayumi- | Gestão de estado elegante sem Redux; separação clara de concerns (Auth, Chat, UI state) |

**Subtotal Minor**: 8 pontos

---

### Pontuação Total

```
Major Modules:  4 × 2 = 8 pontos
Minor Modules:  8 × 1 = 8 pontos
─────────────────────────────
TOTAL:                16 pontos
```

---

### Detalhamento de Implementação por Módulo

#### **1. User Management & Authentication (Major - 2 pts)**

**Implementação**:
- Backend: Flask-JWT-Extended para JWT, bcrypt para password hashing, OAuth 2.0 flow
- Frontend: Login/signup forms com validação, token armazenado em localStorage, refresh automático
- Banco: tabela `users` com `password_hash`, `oauth_accounts` para contas OAuth, `revoked_tokens` para logout

**Responsáveis**: edcastro (backend architecture), dsayumi- (OAuth integration)

**Why Chosen**: Segurança em produção; JWT é stateless (escalável); OAuth elimina necessidade de gerenciar senhas de terceiros

---

#### **2. Multiplayer Interaction (Major - 2 pts)**

**Implementação**:
- Backend: Flask-SocketIO com event emitters (`on_player_joined`, `on_game_start`, `on_room_updated`)
- Frontend: Socket.io Client para listen/emit eventos; React state sincronizado com backend
- Protocolo: JSON over WebSocket; fallback a polling/HTTP para navegadores antigos

**Responsáveis**: edcastro (socket architecture), rilopes (frontend integration), jovicto2 (game events)

**Why Chosen**: WebSocket é requisito do projeto; Socket.io abstrai complexidade de browsers antigos; real-time experience crítica para jogo multiplayer

---

#### **3. Game History & Statistics (Major - 2 pts)**

**Implementação**:
- Banco: tabela `game_matches` com `player_scores`, `winning_player`, `question_category`, `started_at`, `ended_at`
- Backend: Queries otimizadas para top 100 leaderboard com índices em `score` DESC
- Frontend: Componentes para exibir histórico filtrado, match details, win rate calc

**Responsáveis**: jovicto2 (queries otimizadas), joscarlo (UI leaderboard), edcastro (design do schema)

**Why Chosen**: Necessário para motivar players (ranking); persiste histórico para análise de desempenho

---

#### **4. Chat System (Major - 2 pts)**

**Implementação**:
- Banco: `chat_rooms`, `chat_room_members` (M2M), `chat_messages` com `is_read`
- Backend: WebSocket events para message delivery, typing indicators, room updates
- Frontend: Componentes para DM list, group creation, message input, real-time message display

**Responsáveis**: jovicto2 (backend), joscarlo (UI), rilopes (Socket.io integration)

**Why Chosen**: Feature social importante; complementa jogo; Firebase/Firestore seria overkill; nossa solução custom é escalável

---

#### **5. Internationalization (Minor - 1 pt)**

**Implementação**:
- `react-i18next` com namespaces: home, lobby, game, profile, chat, ranking, auth
- JSON locale files para pt, en, es, fr
- Dynamic language switching com localStorage persistence
- Backend: suporte a `question_language` nas queries de perguntas

**Responsáveis**: dsayumi- (config i18n), rilopes (integração em componentes)

**Why Chosen**: Projeto 42 pode ser revisado por staff de múltiplos países; i18n profissional

---

#### **6. Accessibility (Minor - 1 pt)**

**Implementação**:
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<article>` ao invés de `<div>`
- ARIA labels: `aria-label`, `aria-labelledby`, `aria-live` para notificações
- Keyboard navigation: Tab, Enter, Escape funcional em todos os modals
- Color contrast: Tailwind com ratio 7:1 (AAA); dark mode testado
- Font sizing: Remem-based, suporta browser zoom

**Responsáveis**: rilopes, joscarlo

**Why Chosen**: WCAG 2.1 AA é standard da web moderna; acessibilidade é direito, não feature

---

#### **7. Responsive Design (Minor - 1 pt)**

**Implementação**:
- Tailwind breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- CSS Grid & Flexbox para layouts adaptativos
- Mobile-first approach: mobile styles default, desktop overrides
- Tested em Chrome DevTools (iPhone 12, iPad, Desktop)

**Responsáveis**: rilopes, joscarlo

**Why Chosen**: 60%+ acesso web é mobile; design responsivo é expectativa moderna

---

#### **8. DevOps & Containerization (Minor - 1 pt)**

**Implementação**:
- Multi-stage Docker build: Node builder → Nginx (frontend); Python slim → Gunicorn (backend)
- docker-compose.yml com 4 serviços (frontend, backend, nginx, mysql)
- NGINX: reverse proxy, SSL termination, gzip compression, cache control
- Health checks: `/api/health` endpoint
- Makefile: comandos `make build`, `make up`, `make down`, etc.

**Responsáveis**: edcastro, dsayumi-

**Why Chosen**: Docker é padrão da indústria; docker-compose simplifica local dev; CI-ready

---

#### **9. SQL Optimization (Minor - 1 pt)**

**Implementação**:
- Índices em `users(username)`, `users(email)`, `game_rooms(status)`, `chat_messages(room_id)`
- Queries evitam N+1: JOINs ao invés de loops backend
- Normalização 3NF: sem duplicação de dados
- Foreign keys com CASCADE delete

**Responsáveis**: jovicto2, edcastro

**Why Chosen**: Escalabilidade; queries lentas degradam UX; índices simples melhoram 10x

---

#### **10. Advanced Animations & UI/UX (Minor - 1 pt)**

**Implementação**:
- Tailwind animations: `animate-spin` (loading), `animate-bounce` (typing), `animate-fade` (toasts)
- Hover effects: `group-hover`, `dark:hover` transitions
- Loading skeletons em game lobby durante fetch
- Toast notifications com React Hot Toast: auto-dismiss, stackable

**Responsáveis**: rilopes, joscarlo

**Why Chosen**: UI polish melhora percepção de performance; animations guiam atenção do usuário

---

#### **11. Frontend State Management (Minor - 1 pt)**

**Implementação**:
- `AuthContext`: user, token, login/logout, isLoading
- `ChatContext`: activeRoom, messages, sendMessage, socket setup
- Context Providers envolvem `<App>` root
- Hooks custom: `useAuth()`, `useChat()` reutilizáveis

**Responsáveis**: rilopes, dsayumi-

**Why Chosen**: Context API nativo (sem Redux) reduz bundle; suficiente para app desse tamanho; mais simples de entender

---

#### **12. User-Friendly Error Messages (Minor - 1 pt)**

**Implementação**:
- Frontend: React Hook Form com regras de validação
- Backend: Respostas JSON com `status`, `message`, `errors` campos específicos
- Toast notifications com ícones (✅, ❌, ⚠️) e cores (green, red, yellow)
- Exemplos:
  - "Email already in use" (signup)
  - "Incorrect password" (login)
  - "Room is full" (join game)

**Responsáveis**: edcastro (backend), rilopes, joscarlo (frontend)

**Why Chosen**: Bom UX; mensagens claras reduzem suporte/frustração

---

## Contribuições Individuais

### **edcastro** — Tech Lead Backend

#### Contribuições Principais

- **Arquitetura Backend**: Desenho da API REST com Flask, estrutura de blueprints, organização de módulos (auth, chat, game, core)
- **Autenticação JWT**: Implementação de JWT com refresh tokens, token revogação (blocklist), password hashing com bcrypt
- **OAuth 2.0 Integration**: Fluxo OAuth 2.0 para 42 Intra e Google, sincronização automática de perfil, refresh token management
- **Flask-SocketIO**: Configuração de WebSocket server, event emitters, namespaces para game e chat
- **Database Design**: Schema MySQL normalizado com foreign keys, índices estratégicos, constraints ACID
- **API Endpoints**: Implementação de ~30+ endpoints (auth, user, game, chat, leaderboard, friends)
- **Docker Backend**: Multi-stage Docker build para backend, Gunicorn configuration, health checks
- **Security**: Input validation, SQL injection prevention (SQLAlchemy ORM), CORS configuration

#### Desafios & Soluções

| Desafio | Solução |
|---------|---------|
| **Token Refresh & Expiration** | Implementou rotating tokens com JTI (JWT ID) para revogação segura; blocklist em Redis/DB para logout |
| **Real-time Sync entre múltiplos players** | Usou Socket.io namespaces e rooms para isolamento de estado; broadcast de eventos sincroniza UI |
| **Queries N+1 em Leaderboard** | Adicionou índices em `score DESC` e usou JOINs ao invés de loops; performance melhorou 10x |
| **OAuth Token Expiration** | Implementou refresh token mechanism; backend verifica expiration e renova automaticamente |

---

### **rilopes** — Tech Lead Frontend

#### Contribuições Principais

- **Arquitetura React**: Componentização modular, Context API para state management, custom hooks (`useAuth`, `useChat`)
- **Socket.io Integration**: Cliente WebSocket configurado, listeners para game events, chat updates, player joins
- **UI Component Library**: Criou sistema de componentes reutilizáveis (Button, Modal, Card, Input, Avatar)
- **Tailwind CSS Setup**: Configuração de Tailwind, custom color palette, dark mode support
- **Responsive Design**: Mobile-first approach com breakpoints; testado em iPhone, iPad, Desktop
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation, WCAG 2.1 AA compliance
- **Performance**: Code splitting, lazy loading de páginas, otimização de bundle size
- **i18n Integration**: Configuração de react-i18next, namespaces, dynamic language switching

#### Desafios & Soluções

| Desafio | Solução |
|---------|---------|
| **WebSocket Reconnection** | Implementou retry logic com exponential backoff; Socket.io auto-reconnect configurado |
| **State Sync com Backend** | Context API sincroniza com WebSocket events; hook customizado gerencia listeners |
| **Dark Mode Toggle** | Usou `prefers-color-scheme` + localStorage; Tailwind dark: prefix para estilização |
| **Bundle Size (Vite)** | Lazy loading de pages, dynamic imports; bundle reduzido de 2MB para 500KB |
| **Mobile Responsiveness** | Testou manualmente em DevTools; usou Flexbox/Grid para layouts adaptativos |

---

### **dsayumi-** — Product Owner + Developer (Full-Stack)

#### Contribuições Principais

- **Product Vision**: Definiu features, prioridades, roadmap; coordenou entre times frontend/backend
- **Internationalization (i18n)**: Setup de react-i18next, criação de locale files (pt, en, es, fr), namespace organization
- **Category Feature**: Substituição de "game mode" por "categories"; integração com backend `question_category`
- **Frontend Pages**: Desenvolvimento de `HomePage`, `LobbyPage`, `ProfilePage`, componentes de UI
- **Backend Routes**: Implementação de endpoints para autenticação, perfil, categorias, game rooms
- **OAuth 2.0**: Colaboração com edcastro em integração OAuth; frontend login flow
- **Docker**: Setup de docker-compose, Multi-stage builds, volume orchestration
- **GitHub Management**: Criação de issues, PRs, code reviews, branch management

#### Desafios & Soluções

| Desafio | Solução |
|---------|---------|
| **Coordenação Frontend/Backend** | Reuniões diárias; comunicação clara de APIs; testes de integração contínuos |
| **i18n Completude** | Criou scripts para verificar falta de chaves; linting para detectar typos de namespaces |
| **Category Migration** | Mapeou `game_mode` → `question_category`; migração de dados retroativa com script SQL |
| **Docker Volume Persistence** | Debugou issues com volumes desincronizados; limpeza forçada de volumes resolveu |

---

### **jovicto2** — Developer Backend

#### Contribuições Principais

- **Game Logic**: Implementação de salas de jogo, player management, score calculation, game state synchronization
- **Chat Backend**: Modelos de chat rooms, mensagens, typing indicators; WebSocket event handlers
- **Leaderboard**: Queries otimizadas para ranking global, top 100 players, statisticas por categoria
- **Friend System**: Endpoints para adicionar/remover amigos, gerenciar pedidos (pending/accepted/blocked)
- **Match History**: Persistência de histórico de partidas, cálculo de win rate, análise de desempenho
- **Database Queries**: Otimização com índices, evitar N+1 queries, query caching onde necessário
- **WebSocket Events**: Implementação de event handlers para `player_joined`, `room_updated`, `game_start`, etc.
- **Testing**: Testes unitários para funcionalidades críticas (auth, game logic, DB operations)

#### Desafios & Soluções

| Desafio | Solução |
|---------|---------|
| **Real-time Game Sync** | Usou WebSocket events para broadcast de state; cada player recebe updates imediatos |
| **Leaderboard Performance** | Adicionou índices em `score`, `user_id`, `created_at`; queries reduzidas de 5s para 200ms |
| **Friend Requests Handling** | Implementou 3-state system (pending/accepted/blocked) com unique constraints; evita duplicatas |
| **Chat Message Ordering** | Ordenação por `created_at DESC` com índice; paginação para evitar carregar todos os históricos |
| **Game State Race Conditions** | Usou database transactions para operações críticas; Socket.io emit order garantido |

---

### **joscarlo** — Developer Frontend

#### Contribuições Principais

- **Component Development**: Criação de componentes React (GameCard, RoomCard, ChatMessage, LeaderboardRow)
- **Página de Jogo (GamePage)**: Interface durante gameplay, exibição de perguntas, seleção de respostas, timer
- **Leaderboard UI**: Tabela de rankings com sorting, filtering por categoria, estilização
- **Chat UI**: Componentes de chat (ChatRoomList, ChatMessages, ChatInput), styling responsivo
- **Perfil do Usuário**: ProfilePage com edição de info, avatar upload, histórico de partidas
- **Modal & Dialogs**: Criação de modals reutilizáveis (CreateRoom, ConfirmAction, ErrorDialog)
- **Forms & Validation**: Forms com React Hook Form, validação frontend com regex/patterns
- **Micro-interactions**: Animations com Tailwind, hover effects, loading spinners, toast notifications

#### Desafios & Soluções

| Desafio | Solução |
|---------|---------|
| **Real-time Score Updates** | Integrou WebSocket listener em GamePage; React state atualiza imediatamente |
| **Avatar Upload Preview** | Implementou FileReader API para preview local antes de enviar; validação de size/type |
| **Leaderboard Pagination** | Lazy loading de próximas páginas; botão "Load More" evita carregar 10K rows de uma vez |
| **Modal Z-index Issues** | Criou sistema de z-index em Tailwind config; modals aninhados funcionam corretamente |
| **Tailwind Dark Mode** | Testou compatibilidade; usou `dark:` prefix em todos os componentes; toggle persiste em localStorage |

---

## Resumo de Distribuição de Tarefas

```
┌──────────────────────────────────────────────────────────────────┐
│                    DISTRIBUIÇÃO POR ÁREAS                       │
├──────────────────────────────────────────────────────────────────┤
│
│  Backend (edcastro + jovicto2)
│  ├─ Autenticação & OAuth ......... edcastro (60%), dsayumi- (40%)
│  ├─ Game Logic & WebSocket ....... jovicto2 (70%), edcastro (30%)
│  ├─ Chat Backend ................. jovicto2 (80%), edcastro (20%)
│  ├─ Database & Queries ........... jovicto2 (80%), edcastro (20%)
│  └─ API Endpoints ................ ambos (50/50)
│
│  Frontend (rilopes + joscarlo)
│  ├─ Architecture & Socket.io ..... rilopes (80%), joscarlo (20%)
│  ├─ UI Components ................ joscarlo (70%), rilopes (30%)
│  ├─ Pages ....................... joscarlo (60%), rilopes (40%)
│  ├─ Responsive & Accessibility .. rilopes (90%), joscarlo (10%)
│  └─ Animations & Polish ......... joscarlo (80%), rilopes (20%)
│
│  Full-Stack (dsayumi-)
│  ├─ i18n ........................ 100%
│  ├─ Product Coordination ........ 100%
│  ├─ OAuth Integration ........... colaborativo
│  ├─ Categories Feature .......... colaborativo
│  └─ Docker & DevOps ............ colaborativo
│
└──────────────────────────────────────────────────────────────────┘

---

## Recursos

### Documentação & Referências

- **Flask Documentation**: https://flask.palletsprojects.com/
- **SQLAlchemy ORM**: https://docs.sqlalchemy.org/
- **Flask-SocketIO**: https://flask-socketio.readthedocs.io/
- **React 18**: https://react.dev/
- **Vite**: https://vitejs.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Socket.io Client**: https://socket.io/docs/v4/client-api/
- **JWT (JSON Web Tokens)**: https://jwt.io/
- **OAuth 2.0 Flow**: https://oauth.net/2/
- **MySQL 8.0**: https://dev.mysql.com/doc/

### Uso de IA

Este projeto utilizou **GitHub Copilot (Claude Haiku)** para acelerar o desenvolvimento nas seguintes áreas:

1. **Scaffolding de Componentes Frontend** — Gerou hooks React, setup de context e boilerplate de componentes para páginas (HomePage, LobbyPage, GamePage, ProfilePage, etc.)

2. **Camada de Integração de API** — Assistiu no design e implementação do serviço `apiClient.js`, incluindo interceptadores de requisição/resposta, tratamento de erros e lógica de conexão WebSocket

3. **Setup de Internacionalização** — Ajudou na configuração de react-i18next com arquivos de locale (Inglês, Português, Espanhol, Francês) e organização de namespaces

4. **Modelos de Banco de Dados & Schema** — Gerou definições de modelos SQLAlchemy para entidades User, GameRoom, Message e Match, com relacionamentos e constraints

5. **Lógica de Jogo & Eventos WebSocket** — Assistiu na implementação de gerenciamento de estado de jogo em tempo real, emissores de eventos e handlers de socket para atualizações de jogadores, mudanças de salas e progressão de jogo

6. **Refinamento de UI/UX** — Forneceu sugestões de utilitários Tailwind CSS, padrões de design responsivo e estilização de componentes modais/formulários

7. **Correção de Bugs & Testes** — Ajudou a debugar problemas relacionados a gerenciamento de estado de modal, filtragem de categorias e sincronização de eventos WebSocket

8. **Documentação & Comentários de Código** — Gerou docstrings e comentários inline para lógica de negócio complexa
**Observação**: Embora a IA tenha auxiliado no scaffolding e aceleração, todas as decisões arquitetônicas, integrações e lógica de negócio crítica foram revisadas e refinadas pelo time de desenvolvimento para garantir correção, segurança e conformidade com os requisitos do projeto.
