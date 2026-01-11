# Progress: мини-Zapier

## Текущий статус: День 2 - Блок 5 завершён (Actions + Credentials)

---

## День 1: Фундамент + Редактор + Engine

### Блок 1: Инфраструктура ✅
- [x] Monorepo (pnpm workspaces + turbo)
- [x] Docker Compose (PostgreSQL, Redis)
- [x] NestJS scaffold + Swagger + Prisma
- [x] Next.js 16 + TailwindCSS 4 + shadcn/ui
- [x] Shared types package
- [ ] Supabase Auth интеграция (отложено)

### Блок 2: Визуальный редактор ✅
- [x] React Flow настройка + Zustand store
- [x] Кастомные ноды: TriggerNode, ActionNode, ConditionNode
- [x] Sidebar с палитрой (drag-and-drop)
- [x] Страница редактора /editor и /editor/[id]
- [x] Сохранение/загрузка workflow API
- [x] CRUD API для workflows (NestJS + Prisma)
- [x] TanStack Query интеграция
- [x] Валидация схемы (frontend) - триггеры, циклы, отключённые ноды, обязательные поля

### Блок 3: Execution Engine ✅
- [x] BullMQ интеграция (workflow queue + processor)
- [x] Workflow executor (обход графа, топологическая сортировка)
- [x] Контекст выполнения (данные между нодами)
- [x] Условные ветвления (if/else) с пропуском веток
- [x] Логирование шагов в БД (StepLog)
- [x] Template resolver ({{trigger.data}} синтаксис)
- [x] Condition evaluator (JavaScript-like expressions)

---

## День 2: Триггеры + Actions + Дебаггер + Деплой

### Блок 4: Триггеры (~2ч)
- [ ] Webhook триггер (уникальный URL)
- [ ] Schedule триггер (cron через BullMQ repeatable)
- [ ] Email триггер (webhook от провайдера)

### Блок 5: Actions + Credentials ✅
- [x] HTTP Request Action (fetch + auth support: basic, bearer, api_key)
- [x] Email Action (Resend API)
- [x] Telegram Action (grammY Bot API)
- [x] Database Action (PostgreSQL pg driver)
- [x] Transform Action (JSONPath-Plus + JavaScript expressions)
- [x] Credentials Module (AES-256-GCM encryption)
- [x] Credentials REST API (CRUD + test connection)
- [x] StepExecutorService интеграция с реальными actions

### Блок 6: Real-time дебаггер (~2ч)
- [ ] WebSocket Gateway
- [ ] Подсветка выполняемых нод
- [ ] Панель input/output
- [ ] Replay с любого шага

### Блок 7: Дашборд + Деплой (~1.5ч)
- [ ] Список workflows + история
- [ ] Статистика выполнений
- [ ] Docker production build
- [ ] Деплой на VPS (Traefik + SSL)

---

## Лог изменений

### 2026-01-11 (продолжение)
- ✅ **Блок 3 завершён**: Execution Engine с BullMQ
  - WorkflowProcessor для обработки заданий
  - GraphTraverserService (топологическая сортировка, определение веток)
  - StepExecutorService (выполнение нод)
  - TemplateResolverService ({{trigger.data}} синтаксис)
  - ConditionEvaluatorService (JavaScript-like expressions)
  - 156 тестов для всех сервисов
- ✅ **Блок 5 завершён**: Actions + Credentials
  - HttpRequestAction (fetch API + auth: basic/bearer/api_key)
  - SendEmailAction (Resend API)
  - SendTelegramAction (grammY Bot API)
  - DatabaseQueryAction (PostgreSQL с pg driver)
  - TransformAction (JSONPath-Plus + JavaScript eval)
  - CryptoService (AES-256-GCM для шифрования credentials)
  - CredentialsService (CRUD + test connection)
  - CredentialsController (REST API endpoints)
  - Интеграция actions в StepExecutorService

### 2026-01-11
- Создан план проекта
- Определён стек: NestJS + Next.js 16 + React Flow + BullMQ
- Выбраны вау-фишки: условные ветвления + визуальный дебаггер
- ✅ **Блок 1 завершён**: Monorepo, Docker, NestJS, Next.js, Prisma, shared types
- ✅ **Блок 2 завершён**: React Flow кастомные ноды, Sidebar с drag-and-drop, страница редактора
- ✅ **API интеграция**: Workflows CRUD API (NestJS), TanStack Query hooks, сохранение/загрузка workflow
- Добавлен WorkflowList компонент на главную страницу
- Настроен Prisma 7 с driver adapter для PostgreSQL
- ✅ **Валидация workflow**: проверка триггеров, циклов (DFS), отключённых нод, обязательных полей
