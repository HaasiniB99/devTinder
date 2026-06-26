# DevConnect Backend

Express and MongoDB backend for DevConnect, a developer networking app with profile matching, connection requests, chat, file uploads, Google authentication, and AI-assisted features.

## Tech Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT and cookie-based authentication
- Passport Google OAuth
- Socket.IO
- Cloudinary uploads
- OpenAI / Gemini powered AI features

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env` file in `devtinder-backend` and add the required environment variables.

```env
PORT=7777
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CLIENT_URLS=http://localhost:5173
SERVER_URL=http://localhost:7777

DB_CONNECTION_SECRET=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
JWT_EXPIRES_IN=7d
COOKIE_MAX_AGE_MS=604800000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:7777/auth/google/callback

CLOUD_NAME=your_cloudinary_cloud_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret

OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
```

Run the backend in development:

```bash
npm run dev
```

Run the backend in production mode:

```bash
npm start
```

Seed demo users:

```bash
npm run seed:demo
```

## API Overview

### Auth

- `POST /signup`
- `POST /login`
- `POST /logout`
- `GET /auth/google`
- `GET /auth/google/callback`

### Profile

- `GET /profile/view`
- `PATCH /profile/edit`
- `PATCH /profile/password`

### Requests

- `POST /request/send/:status/:toUserId`
- `POST /request/review/:status/:requestId`

Allowed request statuses:

- `ignored`
- `interested`
- `accepted`
- `rejected`

### Users

- `GET /user/requests/received`
- `GET /user/connections`
- `GET /feed`
- `GET /user/:id`

### Chat

- `GET /chat/:targetUserId`

### Uploads

- `POST /upload`

Requires authentication and accepts a single multipart file field named `file`.

### AI

- `POST /ai/drafts`
- `POST /rightnow/search`
- `PATCH /rightnow/status`
- `GET /rightnow/history`
- `GET /field/matches`
- `GET /field/myfield`
- `POST /field/reanalyze`

## Project Structure

```text
src/
  app.js                 Express app entry point
  config/                Database and OAuth configuration
  controllers/           Route controller logic
  middlewares/           Auth, upload, rate limit, and security middleware
  models/                Mongoose models
  routes/                Express route modules
  services/              AI and matching services
  utils/                 Shared helpers, sockets, email, Cloudinary
scripts/
  seedDemoUsers.js       Demo data seeding script
```

## Notes

- The server defaults to port `7777`.
- Cookies are configured as secure cross-site cookies in production.
- CORS origins come from `CLIENT_URLS` or `CLIENT_URL`.
- Do not commit real `.env` values or API keys.
