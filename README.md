# 📬 Notification Service

Микросервис для отправки уведомлений через Email, Telegram и SMS с поддержкой шаблонов, очередей и retry-логики.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Fastify](https://img.shields.io/badge/Fastify-4.25-white?logo=fastify)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.12-orange?logo=rabbitmq)

## ✨ Возможности

- 📧 **Мультиканальность** — Email (SMTP), Telegram Bot API, SMS (Twilio)
- 📝 **Шаблоны** — Handlebars с переменными и хелперами
- ⚡ **Приоритеты** — critical, high, normal, low
- 🔄 **Retry с Exponential Backoff** — автоматические повторные попытки
- 📅 **Отложенная отправка** — планирование уведомлений
- 🔗 **Webhooks** — уведомления о статусе доставки
- 📊 **REST API** — полный CRUD с пагинацией
- 📖 **Swagger UI** — интерактивная документация
- 🐳 **Docker Ready** — готовые конфигурации

## 🏗️ Архитектура

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Fastify    │────▶│  PostgreSQL │
│             │     │   API       │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │   RabbitMQ    │
                   │   Exchanges   │
                   └───────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Email Worker  │  │Telegram Worker│  │  SMS Worker   │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│     SMTP      │  │  Telegram API │  │    Twilio     │
└───────────────┘  └───────────────┘  └───────────────┘
```

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- PostgreSQL 15+
- RabbitMQ 3.12+

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/your-username/notification-service.git
cd notification-service

# Установка зависимостей
npm install

# Копирование конфигурации
cp .env.example .env
# Отредактируйте .env под свои настройки
```

### Запуск с Docker

```bash
# Запуск PostgreSQL и RabbitMQ
cd docker
docker-compose up -d postgres rabbitmq

# Возврат в корень проекта
cd ..

# Миграции
npm run migrate

# Запуск API (терминал 1)
npm run dev

# Запуск Worker (терминал 2)
npm run worker
```

### Проверка

- Health Check: http://localhost:3000/health
- Swagger UI: http://localhost:3000/docs

## 📚 API

### Аутентификация

Все запросы требуют заголовок `X-API-Key`:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/notifications
```

### Создание API ключа

```sql
INSERT INTO api_keys (key, name, webhook_url)
VALUES ('my-secret-key', 'My App', 'https://myapp.com/webhook');
```

### Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `POST` | `/api/v1/notifications` | Создать уведомление |
| `POST` | `/api/v1/notifications/bulk` | Массовое создание |
| `GET` | `/api/v1/notifications` | Список уведомлений |
| `GET` | `/api/v1/notifications/:id` | Детали уведомления |
| `DELETE` | `/api/v1/notifications/:id` | Отменить уведомление |
| `POST` | `/api/v1/templates` | Создать шаблон |
| `GET` | `/api/v1/templates` | Список шаблонов |
| `GET` | `/api/v1/templates/:id` | Получить шаблон |
| `PUT` | `/api/v1/templates/:id` | Обновить шаблон |
| `DELETE` | `/api/v1/templates/:id` | Удалить шаблон |
| `POST` | `/api/v1/templates/:id/preview` | Превью шаблона |
| `GET` | `/health` | Health check |

### Примеры

#### Отправка Email

```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "channel": "email",
    "recipient": "user@example.com",
    "subject": "Привет!",
    "body": "<h1>Добро пожаловать!</h1>",
    "priority": "high"
  }'
```

#### Отправка через шаблон

```bash
# 1. Создание шаблона
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "code": "order-confirmation",
    "name": "Order Confirmation",
    "channel": "email",
    "subject": "Заказ #{{orderId}} подтверждён",
    "body": "<p>Спасибо, {{customerName}}! Ваш заказ на сумму {{total}} ₽ принят.</p>"
  }'

# 2. Отправка уведомления
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "channel": "email",
    "recipient": "customer@example.com",
    "templateCode": "order-confirmation",
    "templateVariables": {
      "orderId": "12345",
      "customerName": "Иван",
      "total": "2500"
    }
  }'
```

#### Отложенная отправка

```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "channel": "telegram",
    "recipient": "123456789",
    "body": "Напоминание о встрече через час!",
    "scheduledAt": "2024-12-25T10:00:00Z"
  }'
```

## ⚙️ Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт сервера | `3000` |
| `DATABASE_HOST` | Хост PostgreSQL | `localhost` |
| `DATABASE_PORT` | Порт PostgreSQL | `5432` |
| `DATABASE_NAME` | Имя базы данных | `notifications` |
| `DATABASE_USER` | Пользователь БД | `postgres` |
| `DATABASE_PASSWORD` | Пароль БД | `postgres` |
| `RABBITMQ_URL` | URL RabbitMQ | `amqp://guest:guest@localhost:5672` |
| `SMTP_HOST` | SMTP сервер | — |
| `SMTP_PORT` | SMTP порт | `587` |
| `SMTP_USER` | SMTP пользователь | — |
| `SMTP_PASSWORD` | SMTP пароль | — |
| `SMTP_FROM` | Email отправителя | `noreply@example.com` |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота | — |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | — |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | — |
| `TWILIO_FROM_NUMBER` | Twilio номер телефона | — |

## 🔄 Retry Strategy

Сервис использует экспоненциальный backoff:

| Попытка | Задержка |
|---------|----------|
| 1 | Немедленно |
| 2 | 1 секунда |
| 3 | 5 секунд |
| 4 | 30 секунд |

После 4-й неудачной попытки уведомление помечается как `failed` и отправляется в Dead Letter Queue.

## 📊 Статусы уведомлений

| Статус | Описание |
|--------|----------|
| `pending` | Создано, ожидает отправки |
| `scheduled` | Запланировано на будущее |
| `queued` | В очереди RabbitMQ |
| `processing` | Обрабатывается worker'ом |
| `sent` | Успешно отправлено |
| `failed` | Ошибка после всех попыток |
| `cancelled` | Отменено пользователем |

## 🔗 Webhooks

При изменении статуса уведомления на `sent` или `failed`, сервис отправит POST запрос на `webhook_url` из API ключа:

```json
{
  "event": "notification.sent",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "notificationId": "uuid",
    "channel": "email",
    "recipient": "user@example.com",
    "status": "sent",
    "sentAt": "2024-01-15T10:30:00Z"
  }
}
```

Заголовок `X-Webhook-Signature` содержит HMAC-SHA256 подпись тела запроса.

## 🛠️ Разработка

```bash
# Запуск в dev режиме с hot reload
npm run dev

# Запуск worker
npm run worker

# Проверка типов
npm run typecheck

# Линтинг
npm run lint

# Сборка
npm run build

# Запуск в production
npm start
npm run worker:start
```

## 📁 Структура проекта

```
src/
├── config/           # Конфигурация
├── db/
│   ├── migrations/   # SQL миграции
│   └── repositories/ # Data Access Layer
├── modules/
│   ├── notifications/# API уведомлений
│   ├── templates/    # API шаблонов
│   ├── health/       # Health checks
│   └── webhooks/     # Webhook delivery
├── queue/
│   ├── workers/      # Queue consumers
│   ├── connection.ts # RabbitMQ connection
│   └── publisher.ts  # Message publishing
├── channels/         # Email, Telegram, SMS
├── middleware/       # Auth, Rate limit
├── plugins/          # Fastify plugins
├── templates/        # Handlebars engine
├── types/            # TypeScript types
├── utils/            # Logger, retry
├── app.ts            # Fastify setup
├── server.ts         # HTTP entry point
└── worker.ts         # Worker entry point
```

## 📄 Лицензия

MIT

## 🤝 Contributing

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request
