# 🧠 Backend — Triple Trouble Trivia

API REST construída com **Flask 3.1** seguindo o padrão **Application Factory**.
Responsável por autenticação (JWT + OAuth2), gerenciamento de usuários e comunicação
em tempo real via WebSocket.

---

## 📁 Estrutura de Pastas

```
backend/
├── run.py                          # Entrypoint (gunicorn / dev server)
├── Dockerfile                      # Imagem Python 3.12-slim
├── .env.example                    # Variáveis de ambiente de referência
├── .gitignore
├── .dockerignore
│
├── app/                            # Pacote Python principal
│   ├── __init__.py                 # Application Factory (create_app)
│   │
│   ├── core/                       # Configuração e extensões
│   │   ├── __init__.py
│   │   ├── config.py               # Classe Config (env vars)
│   │   └── extensions.py           # Instâncias: db, jwt, socketio, migrate
│   │
│   └── auth/                       # Módulo de autenticação
│       ├── __init__.py             # Blueprint auth_bp
│       ├── models.py               # Models: User, OAuthAccount, RevokedToken
│       └── routes.py               # Rotas REST + OAuth callbacks
│
└── tools/                          # Auxiliares (não-Python)
    ├── configs/
    │   └── requirements.txt        # Dependências pip
    └── scripts/
        └── wait-for-db.sh          # Aguarda MySQL antes de iniciar
```

---

## 🔄 Fluxo de Inicialização

```
gunicorn run:app
       │
       ▼
   run.py
   ├── load_dotenv()                    # Carrega .env
   ├── from app import create_app       # Importa a factory
   └── app = create_app()              # Cria a instância Flask
              │
              ▼
       app/__init__.py
       ├── Config carregada             # app.config.from_object(Config)
       ├── Extensions inicializadas     # db, jwt, cors, socketio
       ├── Blueprints registrados       # auth_bp → /api/auth
       ├── Tabelas criadas              # db.create_all()
       └── JWT error handlers           # expired, invalid, unauthorized, revoked
```

---

## 🗄️ Modelagem do Banco de Dados

### Diagrama Entidade-Relacionamento

```
┌──────────────────────────────────┐
│              users               │
├──────────────────────────────────┤
│ id           INTEGER    PK AI    │
│ username     VARCHAR(64)  UQ NN  │
│ email        VARCHAR(120) UQ NN  │
│ password_hash VARCHAR(256)       │◄── NULL para usuários OAuth
│ avatar_url   VARCHAR(512)        │
│ display_name VARCHAR(128)        │
│ bio          VARCHAR(500)        │
│ is_active    BOOLEAN     NN      │
│ is_online    BOOLEAN     NN      │
│ last_seen    DATETIME            │
│ created_at   DATETIME    NN      │
│ updated_at   DATETIME    NN      │
└──────────┬───────────────────────┘
           │ 1
           │
           │ N
┌──────────┴───────────────────────┐
│         oauth_accounts           │
├──────────────────────────────────┤
│ id              INTEGER   PK AI  │
│ user_id         INTEGER   FK NN  │──► users.id
│ provider        VARCHAR(50)  NN  │    ('42' | 'google')
│ provider_user_id VARCHAR(128) NN │
│ access_token    VARCHAR(512)     │
│ refresh_token   VARCHAR(512)     │
│ token_expires_at DATETIME        │
│ created_at      DATETIME  NN     │
├──────────────────────────────────┤
│ UQ (provider, provider_user_id)  │
└──────────────────────────────────┘

           │ 1
           │
           │ N
┌──────────┴───────────────────────┐
│         revoked_tokens           │
├──────────────────────────────────┤
│ id          INTEGER     PK AI    │
│ jti         VARCHAR(120) UQ NN   │◄── JWT Token ID (blocklist)
│ user_id     INTEGER     FK NN    │──► users.id
│ revoked_at  DATETIME    NN       │
└──────────────────────────────────┘
```

### Relacionamentos

| Origem | Destino | Tipo | Cascade |
|--------|---------|------|---------|
| `users` → `oauth_accounts` | 1:N | `all, delete-orphan` |
| `users` → `revoked_tokens` | 1:N | `all, delete-orphan` |

---

## 🌐 API — Endpoints

Base URL: `https://localhost:8443/api`

### Auth (`/api/auth`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/auth/register` | ❌ | Criar conta (username, email, password) |
| `POST` | `/auth/login` | ❌ | Login com email + password |
| `GET`  | `/auth/me` | 🔒 JWT | Dados do usuário logado |
| `POST` | `/auth/logout` | 🔒 JWT | Logout (revoga token) |
| `POST` | `/auth/refresh` | 🔒 Refresh | Renovar access token |

### OAuth 42 (`/api/auth/oauth/42`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET`  | `/auth/oauth/42/authorize` | ❌ | Retorna URL de autorização 42 |
| `GET`  | `/auth/oauth/42/callback` | ❌ | Callback do 42 (redireciona para frontend com tokens) |

### OAuth Google (`/api/auth/oauth/google`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET`  | `/auth/oauth/google/authorize` | ❌ | Retorna URL de autorização Google |
| `GET`  | `/auth/oauth/google/callback` | ❌ | Callback do Google (redireciona para frontend com tokens) |

### OAuth Genérico (`/api/auth/oauth`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/auth/oauth/callback` | ❌ | Callback genérico via frontend `{ provider, code }` |

### Health Check

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET`  | `/health` | ❌ | Status da API `{ status: "ok" }` |

---

## 🔐 Autenticação

### JWT (JSON Web Tokens)

- **Access Token**: enviado no header `Authorization: Bearer <token>`
- **Refresh Token**: usado para renovar o access token via `POST /auth/refresh`
- **Blocklist**: tokens revogados são armazenados na tabela `revoked_tokens`
- **Expiração padrão**: Access = 1h, Refresh = 30 dias

### Fluxo OAuth2

```
┌──────────┐     1. GET /oauth/{provider}/authorize     ┌──────────┐
│          │ ──────────────────────────────────────────► │          │
│ Frontend │     ◄── { authorization_url }               │ Backend  │
│          │                                             │          │
│          │     2. Redirect para o provider             │          │
│          │ ──────────► 42 / Google ──────────────────► │          │
│          │                                             │          │
│          │     3. Provider redireciona de volta         │          │
│          │     GET /oauth/{provider}/callback?code=X   │          │
│          │                                             │          │
│          │     4. Backend troca code por token,         │          │
│          │        cria/atualiza usuário,                │          │
│          │        redireciona para frontend             │          │
│          │     ◄── /login?token=JWT&refresh_token=JWT  │          │
└──────────┘                                             └──────────┘
```

**Providers suportados:**
- **42 Intra** — scope: `public`
- **Google** — scope: `openid email profile`

---

## ⚙️ Padrão Application Factory

O `extensions.py` cria instâncias **sem app** para evitar importações circulares:

```python
# app/core/extensions.py
db = SQLAlchemy()          # ORM
migrate = Migrate()        # Migrações de banco
jwt = JWTManager()         # Autenticação JWT
socketio = SocketIO()      # WebSocket em tempo real
```

O `create_app()` em `app/__init__.py` conecta tudo via `.init_app(app)`.
Qualquer módulo pode importar `db`, `jwt`, etc. sem importar o `app` diretamente.

---

## 🐳 Docker

### Dockerfile

- Base: `python:3.12-slim`
- WORKDIR: `/app`
- Entrypoint: `wait-for-db.sh` (aguarda MySQL via `netcat`)
- Comando: `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 run:app`

### Infraestrutura (docker-compose)

```
                    ┌─────────────────────────┐
                    │    NGINX (port 8443)     │
                    │    SSL termination       │
                    │    /           → frontend │
                    │    /api        → backend  │
                    │    /socket.io  → backend  │
                    └─────┬──────────┬─────────┘
                          │          │
              ┌───────────┘          └───────────┐
              ▼                                  ▼
   ┌─────────────────────┐           ┌─────────────────────┐
   │   Flask Backend      │           │   React Frontend    │
   │   (port 5000)        │           │   (build estático)  │
   │   gunicorn+eventlet  │           │   Vite + Tailwind   │
   └──────────┬───────────┘           └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │   MySQL 8.0          │
   │   (port 3306)        │
   │   trivia_db          │
   └─────────────────────┘
```

| Serviço | Container | Porta |
|---------|-----------|-------|
| MySQL 8.0 | `trivia_mysql` | 3306 |
| Flask Backend | `trivia_backend` | 5000 (interna) |
| React Frontend | `trivia_frontend` | — (build only) |
| NGINX | `trivia_nginx` | 80, 8443 |

---

## 📦 Dependências

| Pacote | Versão | Função |
|--------|--------|--------|
| Flask | 3.1.0 | Framework web |
| Flask-SQLAlchemy | 3.1.1 | ORM (SQLAlchemy) |
| Flask-Migrate | 4.0.7 | Migrações de banco (Alembic) |
| Flask-JWT-Extended | 4.7.1 | Autenticação JWT |
| Flask-CORS | 5.0.1 | Cross-Origin Resource Sharing |
| Flask-SocketIO | 5.4.1 | WebSocket em tempo real |
| PyMySQL | 1.1.1 | Driver MySQL |
| cryptography | 44.0.0 | Criptografia (PyMySQL SSL) |
| Authlib | 1.4.1 | OAuth client library |
| requests | 2.32.3 | HTTP client (OAuth flows) |
| python-dotenv | 1.0.1 | Carregar .env |
| Werkzeug | 3.1.3 | Utilitários WSGI + password hashing |
| gunicorn | 23.0.0 | WSGI HTTP Server (produção) |
| eventlet | 0.37.0 | Async worker (WebSocket) |

---

## 🔧 Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `FLASK_ENV` | `development` | Ambiente Flask |
| `SECRET_KEY` | `dev-secret-key` | Chave secreta do Flask |
| `DB_HOST` | `localhost` | Host do MySQL |
| `DB_PORT` | `3306` | Porta do MySQL |
| `DB_NAME` | `trivia_db` | Nome do banco |
| `DB_USER` | `trivia_user` | Usuário do banco |
| `DB_PASSWORD` | `trivia_pass` | Senha do banco |
| `JWT_SECRET_KEY` | `jwt-dev-secret` | Chave secreta JWT |
| `JWT_ACCESS_TOKEN_EXPIRES` | `3600` | Expiração access token (segundos) |
| `JWT_REFRESH_TOKEN_EXPIRES` | `2592000` | Expiração refresh token (segundos) |
| `OAUTH_42_CLIENT_ID` | — | Client ID da API 42 |
| `OAUTH_42_CLIENT_SECRET` | — | Client Secret da API 42 |
| `OAUTH_42_REDIRECT_URI` | `https://localhost:8443/api/auth/oauth/42/callback` | Callback URL 42 |
| `OAUTH_GOOGLE_CLIENT_ID` | — | Client ID Google |
| `OAUTH_GOOGLE_CLIENT_SECRET` | — | Client Secret Google |
| `OAUTH_GOOGLE_REDIRECT_URI` | `https://localhost:8443/api/auth/oauth/google/callback` | Callback URL Google |
| `FREEFORM_AI_PROVIDER` | `openai` | Provedor de IA para o modo FreeForm (`openai` ou `mock`) |
| `FREEFORM_AI_MODEL` | `gpt-5-mini` | Modelo de IA usado no FreeForm |
| `OPENAI_API_KEY` | — | Chave da API OpenAI |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Base URL da API OpenAI |
| `FRONTEND_URL` | `https://localhost:8443` | URL do frontend |

> 💡 Gerar chaves seguras: `python3 -c "import secrets; print(secrets.token_hex(32))"`

---

## 🚀 Comandos

| Comando | Ação |
|---------|------|
| `make` | Build + up |
| `make build` | Build das imagens Docker |
| `make up` | Subir containers |
| `make down` | Derrubar containers |
| `make restart` | Reiniciar tudo |
| `make logs` | Logs de todos os containers |
| `make logs-backend` | Logs do backend |
| `make clean` | Down + remove volumes e imagens |
| `make fclean` | Clean + prune total do Docker |
| `make re` | fclean + build + up |

---

## 📝 Exemplos de Requisição

### Registro
```bash
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "player1", "email": "player1@test.com", "password": "12345678"}'
```

### Login
```bash
curl -k -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "player1@test.com", "password": "12345678"}'
```

### Dados do usuário
```bash
curl -k https://localhost:8443/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### Refresh token
```bash
curl -k -X POST https://localhost:8443/api/auth/refresh \
  -H "Authorization: Bearer <refresh_token>"
```

### Logout
```bash
curl -k -X POST https://localhost:8443/api/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

### OAuth (obter URL de autorização)
```bash
curl -k https://localhost:8443/api/auth/oauth/42/authorize
curl -k https://localhost:8443/api/auth/oauth/google/authorize
```
