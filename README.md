# SlothGambol

On-chain poker platform with trustless card dealing via Mental Poker cryptography, built on Avalanche.

## Features

- **Trustless Gameplay**: Mental Poker protocol ensures no one (not even the server) can see cards they shouldn't
- **Avalanche Powered**: Sub-second finality with minimal gas fees
- **Non-Custodial**: Your funds stay in smart contracts you control
- **Multiple Game Types**: Cash games and tournaments
- **Real-time Multiplayer**: WebSocket-based for instant updates

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Auth | Privy (wallet + email + social) |
| State | Zustand |
| Backend | Node.js, Socket.io |
| Database | Supabase (PostgreSQL) |
| Blockchain | Avalanche C-Chain |

## Project Structure

```
SlothGambol/
├── src/               # Next.js frontend source
│   ├── app/          # App router pages
│   ├── components/   # React components
│   ├── config/       # Configuration
│   ├── hooks/        # Custom hooks
│   ├── lib/          # Utilities & Mental Poker
│   └── stores/       # Zustand stores
├── public/           # Static assets
├── server/           # WebSocket game server
│   ├── src/
│   │   ├── game/     # Poker engine
│   │   └── socket/   # Socket.io handlers
│   └── package.json
├── supabase/         # Database migrations
├── package.json      # Frontend dependencies
├── Dockerfile        # Frontend container
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- Privy account

### 1. Clone & Install

```bash
git clone https://github.com/jayworrly/SlothGambol.git
cd SlothGambol

# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..
```

### 2. Environment Setup

```bash
# Frontend
cp .env.example .env.local

# Server
cp server/.env.example server/.env
```

Edit the `.env` files with your credentials:
- **Privy**: Get app ID from https://dashboard.privy.io
- **Supabase**: Get URL and anon key from your project settings

### 3. Run Development Servers

Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Server:
```bash
cd server && npm run dev
```

Open http://localhost:3000

## Environment Variables

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy application ID |
| `PRIVY_SECRET` | Privy secret key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL |
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID (43113 for Fuji) |

### Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `CORS_ORIGIN` | Frontend URL for CORS |
| `NODE_ENV` | Environment (development/production) |

## Deployment

### Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Add environment variables in dashboard
3. Deploy (auto-detects Next.js at root)

### Server (Railway/Render/Fly.io)

1. Deploy the `server/` directory
2. Set environment variables
3. Update `NEXT_PUBLIC_WS_URL` in Vercel

### Docker

```bash
docker-compose up -d
```

## Game Rules

### Texas Hold'em
- 2-9 players per table
- Small blind / Big blind structure
- 30 second action timer
- All-in protection with side pots

### Mental Poker Protocol

1. **Commitment Phase**: All players submit encrypted shuffle commitments
2. **Shuffle Phase**: Each player encrypts and shuffles the deck sequentially
3. **Deal Phase**: Cards are dealt by collecting decryption keys
4. **Play Phase**: Standard poker with cryptographic verification
5. **Showdown**: All keys revealed to verify fair play

## License

MIT License
