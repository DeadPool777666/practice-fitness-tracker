# форма. (FitTrack)

Персональный фитнес-трекер: журнал тренировок, планировщик, аналитика, цели, достижения, XP и уровни, челленджи, друзья, админ-панель и демо-монетизация (Free / Pro).

## Стек
- **Frontend:** React 19 (функциональные компоненты, hooks), React Router 7, Vite, lucide-react, чистый CSS (CSS-переменные, светлая/тёмная тема).
- **Backend:** Node.js, Express 5, SQLite (better-sqlite3), JWT, bcryptjs, helmet, express-rate-limit.
- **Тесты:** `node --test` (API-интеграционные + unit-тесты логики), линтер oxlint.

## Установка и запуск
```bash
npm install
cp .env.example .env      # при необходимости поменяй JWT_SECRET и ADMIN_EMAIL
npm run dev               # frontend (Vite) + backend (Express) вместе
```
Если frontend и backend запускаются отдельно: `npm run dev:client` (http://localhost:5173) и `npm run dev:server` (http://localhost:3001). Vite проксирует `/api` на backend.

Другие команды: `npm test`, `npm run lint`, `npm run build`, `NODE_ENV=production npm start` (backend отдаёт собранный `dist`; нужен `JWT_SECRET`).

### Демо-данные для защиты
```bash
npm run seed:demo
```
Создаст администратора `admin@fittrack.demo` / `demo-admin-123`, 40 демо-пользователей (`demo0..demo39@fittrack.demo` / `demo-pass-123`) с тренировками за 90 дней, часть из них с Pro-подпиской. Повторный запуск ничего не дублирует.

## Переменные окружения (`.env`)
| Переменная | Назначение |
|---|---|
| `PORT` | порт backend (по умолчанию 3001) |
| `CLIENT_ORIGIN` | origin frontend для CORS |
| `JWT_SECRET` | секрет подписи токенов (обязателен в production) |
| `DB_PATH` | путь к файлу SQLite (по умолчанию `.data/fitnesstracker.sqlite`) |
| `ADMIN_EMAIL` | аккаунт с этим email получает роль `admin` |

## База данных
SQLite создаётся и **мигрирует автоматически** при запуске (старые данные сохраняются, новые колонки добавляются через `ALTER TABLE`).
Таблицы: `users` (+ `role`, `blocked`, `is_public`), `workouts` (+ `type`, `mood`, `shared`), `exercises`, `favorites`, `goals`, `user_achievements`, `challenges`, `challenge_progress`, `notifications`, `quest_claims`, `workout_templates`, `planner`, `friends`, `subscriptions`, `payments`.
XP, уровень, достижения и прогресс целей **вычисляются из реальных тренировок** на сервере; в БД хранится только факт разблокировки.

## Авторизация и роли
- Регистрация, вход, выход, восстановление сессии (`GET /api/auth/me` по JWT).
- Роли `user` и `admin`. Роль и блокировка **читаются из БД при каждом запросе** (middleware `requireAuth` → `requireAdmin`), поэтому блокировка действует сразу, а подделать роль на frontend нельзя.
- Frontend: `ProtectedRoute` и `AdminRoute` — только удобство интерфейса, защита данных на сервере.
- `localStorage` используется только для токена сессии и темы оформления; все данные хранятся на сервере.

## API (кратко)
| Область | Эндпоинты |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Тренировки | `GET/POST /api/workouts`, `GET/PUT/DELETE /api/workouts/:id`, `PUT /api/workouts/:id/share` |
| Прогресс | `GET /api/progress`, `GET/POST /api/goals`, `PUT/DELETE /api/goals/:id`, `GET /api/notifications`, `POST /api/notifications/read` |
| Упражнения | `GET /api/exercises`, `GET /api/exercises/:id`, `GET/POST /api/favorites`, `DELETE /api/favorites/:id` |
| Челленджи | `GET /api/challenges`, `POST/DELETE /api/challenges/:id/join` |
| Планирование | `GET/POST /api/templates`, `PUT/DELETE /api/templates/:id`, `GET /api/planner`, `PUT/DELETE /api/planner/:weekday` |
| Соцслой | `GET /api/users?q=`, `GET /api/users/:id`, `GET/POST /api/friends`, `DELETE /api/friends/:id`, `GET /api/public/workouts/:id` |
| Аккаунт | `PUT /api/me`, `POST /api/me/password` |
| Монетизация (демо) | `GET /api/billing`, `POST /api/billing/subscribe`, `POST /api/billing/cancel` |
| Админ (только `admin`) | `GET /api/admin/stats`, `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `GET /api/admin/workouts`, CRUD `/api/admin/exercises`, CRUD `/api/admin/challenges` |

Внешний GET-запрос: DummyJSON (`/todos` на странице «Исследовать», `/quotes/random` на дашборде) — с загрузкой, ошибкой и запасным текстом.

## Страницы (маршруты)
`/` · `/login` · `/register` · `/forgot-password` · `/dashboard` · `/workouts` · `/workouts/new` · `/workouts/:id` · `/workouts/:id/edit` · `/workouts/:id/start` (таймер) · `/calendar` · `/analytics` · `/goals` · `/achievements` · `/challenges` · `/planner` · `/explore` · `/exercises` · `/exercises/:id` · `/exercises/:id/progress` · `/friends` · `/users/:id` · `/profile` · `/settings` · `/notifications` · `/pricing` · `/share/workout/:id` · `/admin` (+ `/users`, `/exercises`, `/challenges`, `/workouts`) · `/403` · `/404`.

## Монетизация (демо)
- **Free:** журнал, календарь, аналитика, достижения, XP, библиотека; до 3 целей, 2 шаблонов, 1 активного челленджа.
- **Pro:** $4.99 / мес или $39.99 / год — без лимитов. Оплата имитируется записью в `subscriptions` и `payments`.
- Лимиты Free проверяются **на сервере** (ответ `402 PRO_REQUIRED`).
- Партнёрские карточки на странице «Исследовать» (демо-заглушки).
- Админка → «Выручка (демо)»: Pro-пользователи, MRR, конверсия Free→Pro, ARPU, сумма оплат — по реальным данным БД.

## Структура проекта
```
server/        index.js, auth.js, billing.js, progress.js, validate.js, db.js, seed-data.js, seed-demo.js, routes/*
src/           App.jsx, components/, context/, pages/ (+ admin/), routes/, services/, styles/
tests/         api.test.js, features.test.js, stats.test.js, coach.test.js
```

## Основные возможности
Dashboard (приветствие, серия, тренировка на сегодня, неделя, heatmap, цель, уровень, тренер, восстановление, задания дня) · CRUD тренировок, быстрая запись, повтор, шаблоны, планировщик · таймер тренировки и таймер отдыха, заметки и настроение · личные рекорды и график прогресса упражнения · аналитика · календарь · цели · достижения, XP, уровни · челленджи · уведомления · друзья и рейтинг среди друзей · публичная ссылка на тренировку · профиль и настройки · тёмная тема · мобильная нижняя навигация · skeleton-загрузка, toast, пустые состояния и состояния ошибок · админ-панель.
