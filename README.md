# VISÃO ACADEMY

Plataforma de educação corporativa da Orcoma: uma aplicação web full-stack composta por um **frontend SPA em React + TypeScript + Vite** e um **backend em Django REST Framework**. A plataforma oferece cursos, trilhas, eventos, certificados, metas semanais de estudo, notificações e controle de acesso por papel (role-based) com múltiplas academias.

---

## Sumário

1. [Stack Tecnológica](#stack-tecnológica)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Backend — Django (pasta `backend/`)](#backend--django-pasta-backend)
   - [Configuração do projeto (`orcoma_academy/`)](#configuração-do-projeto-orcoma_academy)
   - [App `core/` — Modelos de dados](#app-core--modelos-de-dados)
   - [App `core/` — Views, rotas e serializers](#app-core--views-rotas-e-serializers)
   - [App `core/` — Autenticação, agendador e validações](#app-core--autenticação-agendador-e-validações)
   - [App `core/` — Admin personalizado](#app-core--admin-personalizado)
   - [App `core/` — Serviços](#app-core--serviços)
   - [App `core/` — Management commands](#app-core--management-commands)
   - [App `core/` — Templates, static e migrations](#app-core--templates-static-e-migrations)
   - [Scripts de banco (`scripts/`)](#scripts-de-banco-scripts)
   - [Scripts utilitários (raiz do backend)](#scripts-utilitários-raiz-do-backend)
   - [Deploy — Render (`render.yaml`)](#deploy--render-renderyaml)
4. [Frontend — React (pasta `frontend/`)](#frontend--react-pasta-frontend)
   - [Configuração e build](#configuração-e-build)
   - [Serviços de API e autenticação (`src/services/`)](#serviços-de-api-e-autenticação-srcservices)
   - [Tipos e constantes (`src/types/`)](#tipos-e-constantes-srctypes)
   - [Páginas (`src/pages/`)](#páginas-srcpages)
   - [Componentes gerais (`src/components/`)](#componentes-gerais-srccomponents)
   - [Componentes da área de vídeo (`src/components/video-area/`)](#componentes-da-área-de-vídeo-srccomponentsvideo-area)
   - [Assets (`src/assets/`)](#assets-srcassets)
5. [Documentação de apoio (raiz)](#documentação-de-apoio-raiz)
6. [Como rodar o projeto](#como-rodar-o-projeto)
7. [Notas técnicas e limitações conhecidas](#notas-técnicas-e-limitações-conhecidas)

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| **Frontend** | React (SPA) | 19.2 |
| | TypeScript | 6.0 |
| | Vite (bundler com Rolldown) | 8.1 |
| | Tailwind CSS (via plugin `@tailwindcss/vite`) | 4.3 |
| | React Router DOM | 7.18 |
| | Linter | oxlint |
| **Backend** | Python | 3.12 |
| | Django | 6.0 |
| | Django REST Framework | 3.17 |
| | djangorestframework-simplejwt (JWT) | 5.5 |
| | django-apscheduler (agendador) | ≥ 0.7 |
| | google-genai (Gemini) | 2.10 |
| | reportlab (PDF de certificado) | ≥ 4.0 |
| | cloudinary / django-cloudinary-storage (mídias) | — |
| **Banco** | PostgreSQL (produção/Render) / SQLite (local) | — |
| **Servidores** | Gunicorn + Whitenoise (backend) / Vercel (frontend) | — |

**Autenticação:** JWT com SimpleJWT. O backend aceita token vindo de cookie httpOnly (`access_token`) ou do header `Authorization: Bearer`; o frontend armazena os tokens no `localStorage` e envia pelo header, com refresh automático e fila de requisições.

---

## Estrutura do Projeto

```
├── backend/                     # API Django
│   ├── core/                    # App principal (modelos, views, admin, serviços)
│   ├── orcoma_academy/          # Configuração do projeto Django
│   ├── scripts/                 # Backup/restauração de banco e setup
│   ├── data/                    # Dados auxiliares (ex.: equipe_admin.json)
│   ├── media/                   # Mídias locais (desenvolvimento)
│   ├── staticfiles/             # Estáticos coletados (collectstatic)
│   ├── *.py                     # Scripts utilitários de raiz
│   ├── manage.py
│   ├── requirements.txt
│   └── render.yaml              # Deploy no Render
├── frontend/                    # SPA React
│   ├── src/
│   │   ├── pages/               # 15 páginas (rotas)
│   │   ├── components/          # Componentes de layout e área de vídeo
│   │   ├── services/            # Cliente HTTP e autenticação
│   │   ├── types/               # Tipos TypeScript e constantes de navegação
│   │   └── assets/images/       # Imagens (banners, estados vazios, logos)
│   ├── public/                  # Estáticos públicos
│   ├── package.json
│   └── vercel.json              # Deploy SPA na Vercel
├── requirements.txt             # Dependências Python (raiz, para o Render)
├── template_usuarios_massa.xlsx # Template de importação de usuários
└── *.md                         # Documentações de apoio (ver seção 5)
```

---

## Backend — Django (pasta `backend/`)

### Configuração do projeto (`orcoma_academy/`)

| Arquivo | Função |
|---|---|
| `manage.py` | Ponto de entrada padrão do Django (`DJANGO_SETTINGS_MODULE=orcoma_academy.settings`). |
| `orcoma_academy/settings.py` | Configuração central: lê o `.env` (python-dotenv); **PostgreSQL via `DATABASE_URL`** (com `ssl_require=True`) ou SQLite local; cache `LocMemCache`; mídias no **Cloudinary** (fallback para disco); estáticos via **Whitenoise**; CORS liberado em DEBUG e restrito a domínios conhecidos em produção; `REST_FRAMEWORK` com `CookieJWTAuthentication` + SimpleJWT (access 1 dia, refresh 7 dias); chave da API do Google (Gemini). Inclui signal `post_migrate` que garante a existência do superusuário `admin` **apenas em DEBUG** (não executa em produção). |
| `orcoma_academy/urls.py` | Rotas raiz: redireciona `/` para `/admin/login/`; expõe `/admin/`, `/admin/backup-database/`, `/admin/restore-database/`, `/api/` (inclui `core.urls`), `/api/token/` (login JWT com cookies) e `/api/token/refresh/`. |
| `orcoma_academy/asgi.py` / `wsgi.py` | Entrypoints padrão ASGI/WSGI do Django. |

### App `core/` — Modelos de dados

**`core/models.py`** — 24 modelos (resumo):

**Proxies (visões de `User`/`Group` no admin):**
- `Cliente` — proxy de `User`, visão "Usuários/Clientes".
- `MembroOrcoma` — proxy de `User`, visão "Membros Orcoma".
- `Permissao` — proxy de `Group`, grupos de permissão usados como papéis.

**Modelos concretos:**
- `Ambiente` — "Academy" (nome único, FK `plano`, `ativo`). Ex.: Contábil, Gestão Empresarial, Team, Orcomakers.
- `Plano` — nome, descrição, preço; M2M `ambientes`.
- `AcessoRoleAcademia` — mapeamento papel × academia (`unique_together role+academia`).
- `Curso` — título, slug único, tipo (`curso`/`video`), status (`rascunho`/`publicado`/`arquivado`), FK `ambiente`, `is_gratuito`, `is_recomendado`, `roles_extras` (JSON), `academias_extras` (M2M), thumbnail. `save()` gera slug único; `user_can_access()` delega a `services.acesso`.
- `Video` — FK `curso` (CASCADE), FK `modulo` (SET_NULL), título, arquivo (validador) ou `url_externa`, `ordem`, `ativo`.
- `Modulo` — FK `curso`, título, descrição, `ordem`, `ativo`.
- `Material` — FK `modulo`, título, arquivo ou `url_externa`, modalidade (`pdf`/`xls`/`xlsx`/`zip`/`link`), `ordem`, `ativo`.
- `Trilha` — nome, FK `ambiente`, M2M `cursos`.
- `Evento` — título, descrição, imagem, `data`, `local`, `capacidade` (0 = sem limite), `url`.
- `CursoVisualizacao` — métrica de visualizações (FK `curso` + `usuario`).
- `Matricula` — FK `usuario` + `curso`, `progresso` (0–100), `concluido`, `concluido_em`, `ultimo_segundo_assistido`, `tempo_total_assistido`, `video_corrente`; `unique_together usuario+curso`.
- `Certificado` — OneToOne `matricula`, `codigo` único (formato `ORC-XXXXXXXX` via uuid), `emitido_em`.
- `Novidade` — título, conteúdo, `ativo`.
- `LogAtividade` — FK `usuario`, `acao`, `detalhes`.
- `Notificacao` — FK `usuario`, título, mensagem, tipo (`boas_vindas`/`curso_concluido`/`evento`), `lida`, `link`.
- `Perfil` — OneToOne `usuario` (criado por signal), `role` (8 opções: `admin`, `cliente_premium`, `cliente_orcoma`, `empresario`, `cliente_equipe`, `colaborador_orcoma`, `gestor_orcoma`, `visitor`), M2M `planos`, `empresa`, `unidade`, `is_empresario`, `cpf`, `cnpj`, `regime_federal` (MEI/ME/EPP), `telefone`, `cargo`, `bio`, `avatar`.
- `FormacaoAcademica` — FK `usuario`, instituição, nível, área, períodos.
- `Habilidade` — FK `usuario`, nome.
- `RegraAtribuicaoPlano` — `cnpj` único → `empresa` + FK `plano` (auto-atribui plano pelo CNPJ).
- `MetaSemanal` — FK `usuario`, título, `meta_horas`, `horas_concluidas`, período da semana, `baseline_tempo`; property `percentual`.
- `Avaliacao` — FK `usuario` + `modulo`, `nota` (1–5), comentário.

**Signals:** `criar_perfil_usuario` (cria `Perfil` ao criar `User`) e `atribuir_plano_por_cnpj` (associa plano automaticamente via `RegraAtribuicaoPlano`).

### App `core/` — Views, rotas e serializers

**`core/urls.py`** — Rotas da API:

- **ViewSets (DefaultRouter):** `/api/cursos/`, `/api/modulos/`, `/api/trilhas/`, `/api/eventos/`, `/api/novidades/`, `/api/logs/`, `/api/matriculas/`, `/api/formacoes/`, `/api/habilidades/`, `/api/metas-semanais/`, `/api/notificacoes/`.
- **Customizadas:** `GET /api/ping/` (healthcheck), `GET /api/dashboard/` e `/api/dashboard-data/` (métricas), `GET /api/cursos-recomendados/`, `POST /api/corrigir-texto/` (staff, Gemini), `POST /api/register/`, `GET/PATCH /api/me/`, `POST /api/avatar/`, `GET /api/user-permissions/`, `GET /api/cursos/<slug>/modulos/`, `GET /api/modulos/<pk>/materiais/`, `GET /api/modulos/<pk>/avaliacoes/`, `GET /api/certificados/` + `GET /api/certificados/<pk>/download/`, `GET /api/busca/?q=`, `GET /api/user-stats/`.

**`core/views.py`** — Principais views:

- `CursoViewSet` — catálogo com filtro de acesso (`filtrar_cursos_acessiveis`), cache de 60s para visitantes, `retrieve` valida `user_can_access_curso` (403). Permissão `IsStaffOrReadOnly`.
- `ModuloViewSet` — read-only, exige `?curso=<slug>`, valida acesso.
- `TrilhaViewSet` / `EventoViewSet` / `NovidadeViewSet` — read-only com filtros por academia.
- `MatriculaViewSet` — CRUD da própria matrícula + actions `minhas`, `concluir` (gera `Certificado` e `Notificacao`), `atualizar-progresso`, `status`, `salvar-posicao` (acumula `tempo_total_assistido`, teto de 30s/atualização), `posicao`.
- `MetaSemanalViewSet` — CRUD; grava `baseline_tempo` no create.
- `LogAtividadeViewSet` — read-only autenticado.
- `FormacaoAcademicaViewSet` / `HabilidadeViewSet` — CRUD do usuário.
- `NotificacaoViewSet` — CRUD + `marcar-todas-lidas`, `nao-lidas/count`, `marcar-lida`, `criar-lembrete-eventos`.
- `CustomTokenObtainPairView` — login JWT que também seta cookies httpOnly.
- `RegisterView` — cadastro público (throttle `registro`) com notificação de boas-vindas.
- `MeView` / `AvatarUploadView` — dados do usuário atual e upload de avatar (JPG/PNG/WebP, máx 5 MB).
- `corrigir_texto` — reescrita de texto via Google Gemini (`gemini-2.0-flash-lite`), apenas staff.
- `dashboard_stats` — métricas agregadas com cache de 120s.
- `curso_modulos` / `modulo_materiais` / `modulo_avaliacoes` — conteúdo do curso.
- `user_permissions` — papéis, academias permitidas e links do frontend.
- `busca` — busca em cursos/módulos/materiais com controle de acesso.
- `gerar_pdf_certificado` — gera PDF A4 paisagem (ReportLab) com o certificado; `listar_certificados` / `download_certificado` — listam/baixam PDFs.
- `user_stats` — horas de estudo, certificados, concluídos e meta semanal.
- `admin_backup_database` / `admin_restore_database` — disparam os scripts de backup/restauração via importlib.

> **Obs.:** `logout_view` (limpa cookies JWT) e `modulo_avaliar` (POST de avaliações) existem em `views.py`, mas **não estão registrados** em `urls.py`.

**`core/serializers.py`** — Serializers da API: `CursoSerializer`/`CursoListSerializer` (com `pode_acessar`, RBAC por role/planos/academias, `status_matricula`, `primeiro_video_id` e ocultação de vídeo sem acesso), `MatriculaSerializer`, `RegisterSerializer` (username automático `user_<uuid>`, role `visitor`), `MeSerializer` (atualiza `User` + `Perfil`), `CustomTokenObtainPairSerializer` (login por e-mail `iexact` + payload com dados do usuário), além dos serializers de Trilha, Evento, Novidade, Log, Formação, Habilidade, Meta, Notificação, Avaliação, Certificado e Material (com `arquivo_url`).

### App `core/` — Autenticação, agendador e validações

| Arquivo | Função |
|---|---|
| `core/authentication.py` | `CookieJWTAuthentication` — estende o `JWTAuthentication` do SimpleJWT lendo primeiro o cookie `access_token` e caindo no header `Authorization`. Helpers `set_jwt_cookies()` e `clear_jwt_cookies()`. |
| `core/scheduler.py` | `BackgroundScheduler` (APScheduler + `DjangoJobStore`) que agenda o job `verificar_eventos` (a cada 1h) → chama o management command `enviar_lembretes_evento`. Iniciado no `ready()` do app. |
| `core/validators.py` | `validate_video_file` — aceita `.mp4`, `.webm`, `.mov`, `.m4v`, máx 500 MB. |
| `core/forms.py` | Formulários do admin: `ImportarUsuariosForm` (XLSX ≤ 10 MB), `MembroOrcomaAddForm`, `ClienteAddForm`, `PerfilInlineForm` (valida role × planos), `CursoAdminForm` (MultiSelect de `roles_extras`). |
| `core/apps.py` | `CoreConfig` (verbose_name "Modalidades"); no `ready()` evita rodar o scheduler durante migrações e o inicia no `runserver`. |

### App `core/` — Admin personalizado

**`core/admin.py`** (~1186 linhas) — Rebranding do admin ("Orcoma Academy"), desregistra `User`/`Group` padrão e registra:

- `PermissaoAdmin` — dashboard de grupos, categorias de permissões traduzidas e 7 templates de papéis (Administrador, Conteúdo-Criador/Colaborador/Editor, Comercial, RH, Monitoramento) + action "duplicar grupo".
- `ClienteAdmin` / `MembroOrcomaAdmin` — listagens com busca, criação via forms customizados, **exclusão de cliente manual** (transação atômica, apagando na ordem: certificados → matrículas → formações → habilidades → metas → logs → notificações → visualizações → avaliações → perfil → usuário), **exclusão em massa** e **importação de usuários via Excel** (com progresso em cache, template e relatório).
- `CursoAdmin` — form customizado com inlines de Vídeos e Módulos.
- Demais admins: `ModuloAdmin`, `MaterialAdmin`, `TrilhaAdmin`, `EventoAdmin`, `NovidadeAdmin`, `LogAtividadeAdmin`, `CursoVisualizacaoAdmin`, `MatriculaAdmin`, `AmbienteAdmin`, `PlanoAdmin` (auto-associa academias por tipo de plano), `MetaSemanalAdmin`, `PerfilAdmin`, `AcessoRoleAcademiaAdmin`, `RegraAtribuicaoPlanoAdmin`, `FormacaoAcademicaAdmin`, `HabilidadeAdmin`.

### App `core/` — Serviços

| Arquivo | Função |
|---|---|
| `core/services/acesso.py` | **Núcleo do RBAC**: `ROLES_ACESSO_TOTAL`, `PERMISSOES_PAPEL` (papel → academias), `get_user_role()`, `get_academias_permitidas()`, `user_can_access_curso()` (regra em cascata: publicado → gratuito → autenticado → superuser → role total → roles_extras → academias), `filtrar_cursos_acessiveis()`, `validar_role_planos()`. |
| `core/services/importacao.py` | Importação em massa de usuários por Excel (openpyxl): valida cabeçalho, evita duplicados, `bulk_create` em lotes de 500, senha `Nome.Sobrenome@123`, relatório com sucessos/erros; gera template e relatório XLSX. |
| `core/services/importacao_async.py` | Executa a importação em **thread separada**, reconstruindo o arquivo como `InMemoryUploadedFile`, reportando progresso via callback ao cache e removendo o arquivo temporário ao final. |
| `core/services/progresso_importacao.py` | Rastreia o progresso da importação via Django Cache (`import_<timestamp>`, timeout 1h). |

### App `core/` — Management commands

| Comando | Função |
|---|---|
| `cadastrar_usuarios_massa` | `cadastrar_usuarios_massa --arquivo <xlsx>`: lê planilha, valida e cria usuários em massa com perfil e senha gerada; salva relatório Excel. |
| `enviar_lembretes_evento` | Agendado (1h): cria notificação "Amanhã: {evento}" para usuários ativos sobre eventos em 23h–25h, evitando duplicatas no dia. |
| `importar_admin_equipe` | Lê `data/equipe_admin.json` e cria/atualiza usuários admin (staff+superuser) com senha aleatória. |
| `setup_acesso_role_academia` | Popula `AcessoRoleAcademia` conforme o mapeamento papel → academias. |

### App `core/` — Templates, static e migrations

- **Templates (`core/templates/`, 19 arquivos):** sobrescrevem o admin do Django (login, index, base, change_form/change_list) com a marca Orcoma e telas específicas: dashboard de permissões, `cliente/` (formulários e confirmação de exclusão) e `membro_orcoma/` (importação, progresso, resultado e exclusão em massa).
- **Static (`core/static/`):** CSS do tema (`orcoma-theme.css`, `dashboard.css`, `curso_admin.css`), JS do dashboard e imagens (logo, favicon, métrica).
- **Migrations (`core/migrations/`, 38 arquivos):** evolução completa do schema (Ambientes e suas data migrations, Perfil, Video/Modulo/Material, Certificado, MetaSemanal, Notificação, etc.). Os modelos `AssinaturaPlano` e `Live` foram criados e posteriormente **removidos** (migrations 0033/0034).

### Scripts de banco (`scripts/`)

| Arquivo | Função |
|---|---|
| `backup_db.py` | `backup_postgres()` — exporta tabelas public do Postgres para SQL com INSERTs em `backups/backup_<database>_<data>.sql`. |
| `restore_db.py` | `restore_latest()` — executa o backup `.sql` mais recente dentro de uma transação (BEGIN/COMMIT/ROLLBACK). |
| `setup_acesso_role_academia.py` | Versão standalone (via `manage.py shell <`) que popula `AcessoRoleAcademia` e remove registros residuais de roles de acesso total. |
| `README.md` | Documentação dos scripts de backup/restauração e plano de persistência. |

### Scripts utilitários (raiz do backend)

| Script | Função |
|---|---|
| `create_superuser.py` | Cria superusuário (usuário `admin` por padrão; senha via variável `ADMIN_PASSWORD` ou prompt). |
| `reset_admin.py` | Redefine a senha do `admin` (via `ADMIN_PASSWORD` ou prompt) e garante staff/superuser. |
| `list_users.py` | Lista id/username/email/staff/super de todos os usuários. |
| `keep_alive.py` | Pinga `https://orcoma-academy-backend.onrender.com/api/ping/` com retries; usado pelo cron do Render (5 min). |
| `gerar_template_excel.py` | Gera `template_usuarios_massa.xlsx` com exemplos e abas de roles/unidades/regimes. |
| `consultar_modulos.py` | Script temporário que conta cursos/módulos e imprime módulos de um curso. |
| `testar_exclusao_usuario.py` | Testa (sem executar) a exclusão de usuários, contando registros relacionados de todas as tabelas. |

### Deploy — Render (`render.yaml`)

- **Serviço web `orcoma-academy-api`:** gunicorn (2 workers × 2 threads, timeout 120s), build com `collectstatic` + `migrate`, Python 3.12.0; secrets `SECRET_KEY`, `DATABASE_URL`, Cloudinary.
- **Cron `orcoma-keep-alive`:** roda `keep_alive.py` a cada 5 min para manter o serviço acordado.

---

## Frontend — React (pasta `frontend/`)

### Configuração e build

| Arquivo | Função |
|---|---|
| `package.json` | Scripts: `dev` (vite), `build` (`tsc -b && vite build`), `lint` (oxlint), `preview`. Dependências: React 19.2, React DOM, React Router DOM 7.18, Tailwind CSS 4.3. DevDeps: Vite 8.1, TypeScript 6.0, oxlint, @vitejs/plugin-react. |
| `vite.config.ts` | Plugins `react()` e `tailwindcss()`; sem aliases ou proxy. |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | Configuração TS (target ES2023, `jsx: react-jsx`, strict) dividida entre app e node (para o `vite.config.ts`). |
| `.oxlintrc.json` | Linter oxlint (substitui o ESLint) com plugins react/typescript/oxc. |
| `index.html` | `lang="pt-BR"`, título "Orcoma Academy", Google Fonts (Sora, DM Sans, Inter), Font Awesome 6.5.0 e Tabler Icons via CDN. |
| `vercel.json` | Rewrite genérico `/(.*)` → `/index.html` (fallback SPA para deploy na Vercel). |
| `public/` | `favicon.svg`, `icons.svg`, `orcoma-logo.png`. |
| `.env` | `VITE_API_URL=https://dashboard.orcomacontabilidade.com.br` (base da API). |

**`src/main.tsx`** — ponto de entrada; renderiza `<App />` em `<StrictMode>`.

**`src/App.tsx`** — roteamento global com `BrowserRouter` + dois guards:
- `ProtectedRoute` — exige `AuthService.isLoggedIn()`, senão redireciona para `/login`.
- `RoleGate` — redireciona usuários para a academia correta conforme o papel (`cliente_orcoma`/`empresario` → business; `cliente_equipe`/`colaborador_orcoma` → team).

Rotas protegidas dentro de `<Layout />` (com `<Outlet />`): `/` (home), `/team`, `/business`, `/meus-cursos`, `/eventos`, `/continuar-assistindo`, `/cursos-concluidos`, `/trilhas`, `/curso/:slug`, `/suporte`, `/configuracoes`, `/meu-perfil`, `/certificados`, `/notificacoes`, `/time`, `/orcomakers`, `/contabil`, `/empresarial` e `/video-area/:cursoSlug`. `/login` é pública; `*` redireciona para `/login`.

### Serviços de API e autenticação (`src/services/`)

**`api.ts`** — Cliente HTTP com `fetch` nativo (sem axios). `BASE_URL` de `VITE_API_URL`. Lógica de tokens:
- Tokens `access_token`/`refresh_token` no `localStorage`; header `Authorization: Bearer` em todas as requisições com `credentials: 'include'`.
- Em `401` (fora de `/api/token/`), faz **refresh automático** com fila de requisições (`isRefreshing` + `failedQueue`); se falhar, chama `forceLogout()`.
- Expõe `get/post/patch/put/del` e métodos de domínio: dashboard, cursos, recomendados, matrículas, eventos, trilhas, perfil, avatar (FormData), formações/habilidades, módulos, avaliações, comentários, posição/progresso do vídeo, conclusão de curso, stats, metas semanais, notificações e logout.
- Suporta uma variável global `API` (injeção externa opcional).

**`auth.ts`** — `AuthService`: gerencia login/logout e estado do usuário via `localStorage` (chaves `access_token`, `refresh_token`, `orcoma_user_role`, `orcoma_user_email`, `orcoma_user_name`, `orcoma_user_avatar`, `current_academy`), com fallback para `window.auth`. Não há Context/Redux — "logado" = existência de `access_token`.

### Tipos e constantes (`src/types/`)

**`index.ts`** — Interfaces `User`, `Curso`, `Video`, `Material`, `Modulo`, `CursoModulosResponse`, `Review`, `Comentario`, `AulaProgresso`, `Evento`, `Trilha`, `Notificacao`, `Matricula`, `DashboardData`, `ProgressData`, `AcademyConfig`. Constantes: `ACADEMIES` (6 academias), `MAIN_ACADEMIES`, `getChildAcademies()`, `NAV_ITEMS` (navegação da sidebar), `PLANO_MAP`.

### Páginas (`src/pages/`)

| Página | Função |
|---|---|
| `HomePage.tsx` | Dashboard inicial: `HeroCarousel` (autoplay 5s, touch/teclado, `prefers-reduced-motion`), cursos recomendados, eventos futuros, trilhas, métricas animadas (IntersectionObserver + rAF) e "Continue Assistindo" (do `localStorage`). |
| `LoginPage.tsx` | Login/cadastro/recuperação de senha. Login via `POST /api/token/`; cadastro via `POST /api/register/` (senha ≥ 8); recuperação via modal. Redireciona para `/business` ou `/team` conforme o papel. |
| `CursoPage.tsx` | Página informativa do curso (thumbnail, título, descrição, badge de status). |
| `MeusCursosPage.tsx` | Catálogo de cursos com status por matrícula (Não-Iniciado/Em andamento/Concluído). |
| `CursosConcluidosPage.tsx` | Cursos concluídos com link "Emitir Certificado". |
| `TrilhasPage.tsx` | Lista trilhas de aprendizagem. |
| `EventosPage.tsx` | Eventos futuros ordenados por data, modal de detalhe e link "Adicionar ao Google Calendar". |
| `CertificadosPage.tsx` | Lista de certificados com código e download do PDF. |
| `NotificacoesPage.tsx` | Lista de notificações com ações de marcar lida/todas; navega para `n.link`. |
| `AmbientePage.tsx` | Página de academia (contabil/empresarial/time/orcomakers): hero, estatísticas, continue assistindo, cursos e **modal de meta semanal**. |
| `VideoAreaPage.tsx` | **Área de aula principal** (ver componentes `video-area`): módulos, lição ativa, reviews, comentários, progresso, conclusão de curso e persistência de progresso no `localStorage`. |
| `ContinuarAssistindoPage.tsx` | Cursos em andamento (0–100%) com "Retomar curso". |
| `ConfiguracoesPage.tsx` | Alternância de tema claro/escuro (`localStorage('theme')`). |
| `MeuPerfilPage.tsx` | Perfil do usuário: upload de avatar (JPG/PNG/WebP ≤ 5 MB), bio, dados pessoais com máscaras de CPF/CNPJ, CRUD de formações e habilidades. |
| `SuportePage.tsx` | Página estática com e-mail `suporte@orcoma.com.br`. |

### Componentes gerais (`src/components/`)

| Componente | Função |
|---|---|
| `Layout.tsx` | Shell do app logado: `Sidebar` + `Topbar` + `<Outlet />` + `RightPanel` (apenas `/team` e `/business`). Implementa **busca global** (modal com abas Recomendados/Eventos e navegação para `/video-area/:slug`). |
| `Sidebar.tsx` | Menu lateral com logo, `NAV_ITEMS`, item ativo e seletor de "AMBIENTE ATIVO" (dropdown de academias permitidas). |
| `Topbar.tsx` | Hambúrguer, campo de busca (atalho **Ctrl+K**), sino de notificações (poll 30s; ao abrir chama `criarLembreteEventos()`) e perfil com dropdown. |
| `RightPanel.tsx` | Painel direito (desktop): anel SVG de progresso geral com tiers, próximos eventos e perfil (link "Painel Administrativo" para admin). |
| `NotificationPanel.tsx` | Dropdown de notificações com marcar lida/todas e ícones por tipo. |
| `ChecklistWidget.tsx` | Widget flutuante "Metas do Dia" (não referenciado no Layout atual). |

### Componentes da área de vídeo (`src/components/video-area/`)

| Componente | Função |
|---|---|
| `VideoPlayer.tsx` | **Player multifonte** (YouTube via Iframe API, Vimeo via Player API, HTML5 nativo). Controles completos (play, seek, volume, velocidade 0.5x–2x, fullscreen, teclado, auto-ocultar). **Rastreia tempo assistido** (ignora deltas > 3s — anti-trapaça), persiste no `localStorage` e dispara `markCompleted` a 90%/fim. Inclui overlays anti-pirataria e pause em `visibilitychange`. |
| `LessonSidebar.tsx` | Sidebar de aulas com progresso, contagem concluídas/total e módulos/aulas bloqueados (índice > atual+1). |
| `CommentsSection.tsx` | Comentários com respostas aninhadas (prof. 2), curtir, excluir (autor) e ordenação recentes/curtidos. |
| `LessonInfo.tsx` | Cabeçalho da aula (título, módulo, badge de tipo, descrição expansível). |
| `MaterialsList.tsx` | Materiais baixáveis com ícone por extensão (PDF/XLS/ZIP). |
| `MobileTabs.tsx` | Abas no mobile: Vídeo, Comentários, Aulas, Materiais. |
| `ProgressTracker.tsx` | Barra de progresso fina (role=progressbar). |
| `RatingSystem.tsx` | Avaliações do módulo (média com estrelas, compositor e lista de reviews). |
| `VideoBlockerOverlay.tsx` | Anti-pirataria: bloqueia menu de contexto/atalhos (Ctrl+T/N/W) e cobre botões de compartilhamento do YouTube. |

### Assets (`src/assets/`)

`src/assets/images/` — 32 arquivos: logos, banners (banner1–3, reforma tributária, site Jiquiriça), imagens de estado vazio (`nenhum-curso.png`, `sem-comentários.png`, `trilha-não-encontrada.png`, etc.) e ícones diversos.

---

## Documentação de apoio (raiz)

| Arquivo | Conteúdo |
|---|---|
| `COMO_USAR_CADASTRO_MASSA.md` | Guia completo do cadastro em massa de usuários via Excel (formato da planilha, roles válidas, comando, senhas geradas, solução de problemas). |
| `GUIA_EXCLUSAO_MASSA.md` | Guia de uso da exclusão em massa de clientes pelo admin do Django (checkboxes, confirmação, o que é excluído). |
| `SOLUCAO_EXCLUSAO_USUARIOS.md` | Documento técnico do problema de chaves estrangeiras ao excluir usuários em massa e da solução implementada (`delete_cliente_view`). |
| `requirements.txt` | Dependências Python da raiz (usadas pelo Render): Django 6.0.7, DRF, psycopg2, whitenoise, etc. |
| `template_usuarios_massa.xlsx` | Template de planilha para importação de usuários. |

---

## Como rodar o projeto

### Backend (Django)

```bash
cd backend
python -m venv venv                    # (opcional) criar ambiente virtual
venv\Scripts\activate                  # Windows  (Linux/macOS: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env                 # Windows  (Linux/macOS: cp .env.example .env)
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver             # http://127.0.0.1:8000/
```

### Frontend (React/Vite)

```bash
cd frontend
npm install
npm run dev                            # http://localhost:5173/
```

> O `.env` do frontend aponta para `VITE_API_URL`. Em dev, ajuste para `http://127.0.0.1:8000` e garanta que o CORS do backend esteja liberado (DEBUG=True).

### Utilidades comuns

```bash
# Backup e restauração do banco
python scripts/backup_db.py            # (na pasta backend)
python scripts/restore_db.py

# Cadastro em massa de usuários
python manage.py cadastrar_usuarios_massa --arquivo=usuarios.xlsx

# Reset do admin / criação de superusuário (senha via $ADMIN_PASSWORD ou prompt)
$env:ADMIN_PASSWORD='senha-forte'  # ou omita para digitar no prompt
python reset_admin.py
python create_superuser.py

# Configurar acesso de papéis às academias
python manage.py setup_acesso_role_academia
```

---

## Notas técnicas e limitações conhecidas

- **Autenticação dupla:** o backend aceita JWT via cookie httpOnly ou header Bearer; o frontend usa `localStorage` (tokens expostos a XSS). O `logout` do frontend limpa o `localStorage`, mas a rota `logout_view` que limpa os cookies não está registrada em `urls.py`.
- **Importação em massa:** o progresso usa `LocMemCache`, que **não é compartilhado entre workers** do gunicorn — em produção com 2 workers o progresso pode ficar inconsistente entre requisições.
- **Sem testes automatizados:** `core/tests.py` está vazio.
- **ChecklistWidget** está implementado mas não é usado pelo `Layout`.
- **`core/views.py`** contém `logout_view` e `modulo_avaliar` sem rota registrada (endpoints definidos mas não expostos).
- Modelos `AssinaturaPlano` e `Live` foram removidos (migrations 0033/0034) — referências a eles no código podem causar erros.
- O backend mantém um **repositório git próprio** dentro de `backend/` (repositório aninhado), separado do git da raiz.
