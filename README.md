# Форма — фитнес-трекер

Адаптивное приложение для планирования и учёта тренировок. Клиент: React, Vite и декларативный React Router (`BrowserRouter`, `Routes`, `Route`, `Outlet`). API: Express 5, SQLite, bcrypt и JWT.

## Структура

```text
src/
  components/   общая навигация и оболочка
  context/      контекст сессии и профиля
  pages/        главная, каталог, журнал, формы и Explore
  routes/       защищённые маршруты
  services/     HTTP API, шаблоны и рекомендации
  styles/       адаптивная дизайн-система
server/
  db.js         схема SQLite и подключение
  index.js      Express API и middleware
tests/          интеграционная проверка API и прав владельца
.data/          локальная SQLite база (создаётся автоматически)
```

## Запуск для разработки

Требуются Node.js 20.19+ или 22.12+ и npm.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Клиент доступен на `http://localhost:5173`, API — на `http://localhost:3001`. Vite проксирует `/api` на Express. Перед публикацией замените `JWT_SECRET` в `.env` на длинное случайное значение и задайте `CLIENT_ORIGIN`.

## Проверки и production

```powershell
npm test
npm run lint
npm run build
$env:NODE_ENV = "production"
npm start
```

В production Express отдаёт собранный `dist/` и API с одного origin. SQLite хранит данные в `.data/fitnesstracker.sqlite` (путь можно изменить через `DB_PATH`); при развёртывании подключите persistent volume. `PORT`, `CLIENT_ORIGIN` и `JWT_SECRET` задаются через окружение.

## Данные и безопасность

- Пользователи и тренировки хранятся в SQLite; упражнения сериализуются в JSON в записи тренировки.
- Пароли хешируются bcrypt (12 раундов). API выдаёт JWT на 7 дней; клиент хранит только токен сессии в `localStorage`, не бизнес-данные.
- Все операции с тренировками ограничены `user_id` из проверенного JWT. Чужая или несуществующая запись отвечает `404`.
- Express использует Helmet, ограничение частоты запросов авторизации, ограничения тела запроса и проверку полей.
- Каталог публичных планов — стартовые шаблоны в коде, личные записи — отдельные данные аккаунта.
- `/explore` загружает DummyJSON с `AbortController`, поиском, повтором и состояниями загрузки/ошибки/пустой выдачи.
- ИМТ отображается как справочный ориентир, не как медицинский диагноз.
