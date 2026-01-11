# Progress: мини-Zapier

## Текущий статус: День 1 - Начало

---

## День 1: Фундамент + Редактор + Engine

### Блок 1: Инфраструктура (~2ч)
- [ ] Monorepo (pnpm workspaces + turbo)
- [ ] Docker Compose (PostgreSQL, Redis)
- [ ] NestJS scaffold + Swagger + Prisma
- [ ] Next.js 16 + TailwindCSS 4 + shadcn/ui
- [ ] Supabase Auth интеграция

### Блок 2: Визуальный редактор (~3ч)
- [ ] React Flow настройка
- [ ] Кастомные ноды: TriggerNode, ActionNode, ConditionNode
- [ ] Sidebar с палитрой (drag-and-drop)
- [ ] Сохранение/загрузка workflow API
- [ ] Валидация схемы

### Блок 3: Execution Engine (~3ч)
- [ ] BullMQ интеграция
- [ ] Workflow executor (обход графа, топологическая сортировка)
- [ ] Контекст выполнения (данные между нодами)
- [ ] Условные ветвления (if/else)
- [ ] Логирование шагов в БД

---

## День 2: Триггеры + Actions + Дебаггер + Деплой

### Блок 4: Триггеры (~2ч)
- [ ] Webhook триггер (уникальный URL)
- [ ] Schedule триггер (cron через BullMQ repeatable)
- [ ] Email триггер (webhook от провайдера)

### Блок 5: Actions (~2.5ч)
- [ ] HTTP Request Action
- [ ] Email Action (Resend API)
- [ ] Telegram Action (Bot API)
- [ ] Database Action (SQL запросы)
- [ ] Transform Action (JSONPath, JS expressions)

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

### 2026-01-11
- Создан план проекта
- Определён стек: NestJS + Next.js 16 + React Flow + BullMQ
- Выбраны вау-фишки: условные ветвления + визуальный дебаггер
