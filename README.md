# Battleship Online 🚢

A real-time multiplayer Battleship game built with React and Node.js.

---

## Getting Started

### Prerequisites
- Node.js (v20+)
- MongoDB Atlas or local MongoDB

### Installation

```bash
# Install server
cd server
npm install

# Install client
cd ../client
npm install
```

### Environment Variables

Create `.env` file in `server` folder:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_gemini_api_key  # Optional - for AI banter
```

### Run the App

```bash
# Terminal 1 - Server
cd server
node index.js
# Runs on http://localhost:3001

# Terminal 2 - Client
cd client
npm run dev
# Runs on http://localhost:5173
```

---

## Project Structure

```
battleship-game/
├── client/src/
│   ├── components/    # UI components (Board, Header)
│   ├── context/       # React Context (Auth, Game)
│   ├── hooks/         # Custom Hooks
│   ├── pages/         # Page components
│   ├── services/      # API and Socket
│   └── styles/        # CSS
│
└── server/
    ├── config/        # Database connection
    ├── handlers/      # Socket.io handlers
    ├── models/        # Mongoose models
    ├── routes/        # Express routes
    └── services/      # Business logic
```

---

## Features

- User authentication with JWT
- Real-time multiplayer (Socket.io)
- AI opponent with Hunt & Target algorithm
- Turn timer (60 seconds)
- Leaderboard
- AI banter (Gemini API)

---


## 1. React Code Quality

**Small, focused components:**
- `PlayerBoard.jsx`, `OpponentBoard.jsx` - separate board components
- `Header.jsx` - reusable header component

**State Management:**
- Local state: form inputs in `AuthPage.jsx`
- Global state: `AuthContext` for user, `GameContext` for game
- No duplicate state

**Data Fetching:**
- API calls centralized in `services/api.js`
- Handles loading, error, and empty states


---

## 2. Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useLocalStorage` | `hooks/useLocalStorage.js` | Sync state with localStorage |
| `useSocket` | `hooks/useSocket.js` | Manage Socket.io connection |
| `useAuth` | `context/AuthContext.jsx` | Access auth context |
| `useGame` | `context/GameContext.jsx` | Access game context |

---

## 3. Local Storage

- Save token: `AuthContext.jsx` with `useLocalStorage`
- Read token for API: `services/api.js`
- Check token on load: `AuthContext.jsx` useEffect
- Safe JSON parsing with try/catch: `useLocalStorage.js`

---

## 4. Routing & Navigation

```
/auth   → AuthPage      (login/register)
/       → HomePage      (main menu)
/lobby  → LobbyPage     (create/join game)
/game   → GamePage      (gameplay)
*       → NotFoundPage  (404)
```

Protected routes in `App.jsx` - unauthenticated users redirect to `/auth`

---

## 5. Forms & Validation

**Client-side (`AuthPage.jsx`):**
- Username: `required`, `minLength={3}`, `maxLength={20}`
- Email: `required`, `type="email"`
- Password: `required`, `minLength={6}`
- User-friendly error messages
- Loading state on submit button

**Server-side (`routes/auth.js`):**
- Check if email/username already exists
- Return clear error codes

---

## 6. Server + Database

**API Endpoints:**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `GET /api/auth/leaderboard` - Get top players

**Database:**
- MongoDB with Mongoose
- User model: username, email, password (hashed), wins

**Authentication:**
- JWT tokens with 1 hour expiration
- Password hashing with bcryptjs
- Middleware for Authorization header

**Layer Separation:**
- Routes → Handlers → Services → Models

---

## 7. Error Handling

- Server down: `api.js` throws, `AuthPage.jsx` catches and displays
- Empty leaderboard: shows "No winners yet"
- Page refresh: checks token in localStorage
- Distinguishes network errors from auth errors

---

## Author

Reut Uzan

