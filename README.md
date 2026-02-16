# 🎮 ft_transcendence

> **Triple Trouble Trivia Time!** :D

Jogo de Quiz/Trivia multiplayer em tempo real, desenvolvido como projeto da 42.

---

## 🛠️ Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 · Vite · Tailwind CSS |
| Backend | Flask 3.1 · SQLAlchemy · JWT · SocketIO |
| Banco de dados | MySQL 8.0 |
| Proxy reverso | NGINX (SSL autoassinado) |
| Deploy | Docker Compose |

---

## ⚡ Início Rápido

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/)
- [Make](https://www.gnu.org/software/make/) (opcional, já vem no macOS/Linux)

### 1. Clonar o repositório

```bash
gh repo clone ZekaEu/ft_transcendence
cd ft_transcendence
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas chaves:

```bash
# Gerar chaves seguras para SECRET_KEY e JWT_SECRET_KEY:
python3 -c "import secrets; print(secrets.token_hex(32))"
```

> ⚠️ Para OAuth funcionar, configure os Client ID/Secret no [42 Intra](https://profile.intra.42.fr/oauth/applications) e/ou [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

### 3. Subir o projeto

```bash
make
```

Isso vai buildar as imagens e subir todos os containers.

### 4. Acessar

| Serviço | URL |
|---------|-----|
| 🎮 Aplicação | https://localhost:8443 |
| 🔌 API Backend | https://localhost:8443/api |
| ❤️ Health Check | https://localhost:8443/api/health |

> O navegador vai alertar sobre o certificado SSL autoassinado — aceite para continuar.

---

## 📋 Comandos

| Comando | Ação |
|---------|------|
| `make` | Build + subir tudo |
| `make build` | Buildar imagens Docker |
| `make up` | Subir containers |
| `make down` | Derrubar containers |
| `make restart` | Reiniciar tudo |
| `make logs` | Logs de todos os containers |
| `make logs-backend` | Logs do backend |
| `make logs-nginx` | Logs do NGINX |
| `make logs-mysql` | Logs do MySQL |
| `make clean` | Down + remover volumes e imagens |
| `make fclean` | Clean + prune total do Docker |
| `make re` | Rebuild completo do zero |

---

## 📁 Estrutura do Projeto

```
ft_transcendence/
├── backend/               # API Flask (auth, JWT, OAuth, WebSocket)
│   ├── app/               # Pacote Python principal
│   │   ├── auth/          # Módulo de autenticação
│   │   └── core/          # Config e extensões (db, jwt, socketio)
│   ├── tools/             # Scripts e configs auxiliares
│   └── README.md          # 📖 Documentação detalhada do backend
│
├── frontend/              # SPA React + Vite + Tailwind
│   └── src/
│       ├── components/    # Componentes reutilizáveis
│       ├── pages/         # Páginas da aplicação
│       ├── context/       # AuthContext (estado global)
│       ├── services/      # API client, auth, socket
│       ├── hooks/         # Custom hooks
│       └── i18n/          # Internacionalização (pt, en, es, fr)
│
├── services/              # Infraestrutura
│   ├── nginx/             # Reverse proxy + SSL
│   └── mysql/             # Schema e config do banco
│
├── docker-compose.yml     # Orquestração dos containers
├── Makefile               # Comandos de conveniência
└── .env.example           # Modelo de variáveis de ambiente
```

---

## 👥 Equipe

Projeto desenvolvido para o currículo da [42](https://42.fr).
