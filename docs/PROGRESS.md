# Progress: мини-Zapier

## Текущий статус: День 2 - Уведомления об ошибках завершены

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

### Блок 4: Триггеры ✅
- [x] Webhook триггер (уникальный URL, HMAC-SHA256 подпись)
- [x] Schedule триггер (cron через BullMQ repeatable jobs)
- [x] Email триггер (webhook от SendGrid/Mailgun)
- [x] TriggersModule (CRUD API + интеграция с ExecutionEngine)
- [x] WebhooksController (публичные endpoints без авторизации)

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

### Блок 7: Дашборд + Деплой
- [x] Список workflows + история выполнений (UI)
- [x] Статистика выполнений (компонент ExecutionStats)
- [x] Уведомления об ошибках (email через Resend API)
- [ ] Docker production build
- [ ] Деплой на VPS (Traefik + SSL)

---

## Лог изменений

### 2026-01-11 (продолжение 4)
- ✅ **Уведомления об ошибках**: Email notifications при падении workflow
  - NotificationsModule с Resend API интеграцией
  - HTML + text email при статусе FAILED
  - notificationEmail поле в Workflow модели и DTOs
  - Интеграция в WorkflowProcessor
  - 11 unit тестов для NotificationsService

### 2026-01-11 (продолжение 3)
- ✅ **Блок 7 (частично)**: История выполнений UI
  - ExecutionStats компонент (метрики: total, success, failed, avg duration)
  - ExecutionList компонент (таблица с фильтрацией и пагинацией)
  - ExecutionDetails диалог (просмотр шагов, input/output)
  - Обновлена главная страница с табами (Workflows/Executions)
  - API клиент для executions endpoints
  - React Query хуки для данных выполнений
  - 78 тестов (включая use-executions, components)
  - Добавлены shadcn/ui: table, tabs, select, scroll-area, skeleton

### 2026-01-11 (продолжение 2)
- ✅ **Блок 4 завершён**: Triggers Module
  - WebhookTriggerService (уникальные URL, токены, HMAC-SHA256 подпись)
  - ScheduleTriggerService (BullMQ repeatable jobs, 6-field cron, timezone)
  - EmailTriggerService (парсинг SendGrid/Mailgun webhooks)
  - TriggersService (CRUD, интеграция с BullMQ)
  - TriggersController (REST API с JWT auth)
  - WebhooksController (публичные endpoints для приёма webhooks)
  - Обновлён WorkflowProcessor для scheduled jobs
  - 98 тестов для всех сервисов

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
