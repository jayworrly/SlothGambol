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
├── frontend/          # Next.js web application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# React components
│   │   ├── hooks/     # Custom hooks
│   │   ├── lib/       # Utilities & Mental Poker
│   │   └── stores/    # Zustand stores
│   └── package.json
│
├── server/            # WebSocket game server
│   ├── src/
│   │   ├── game/      # Poker engine
│   │   ├── socket/    # Socket.io handlers
│   │   └── mental-poker/
│   └── package.json
│
└── docker-compose.yml # Local development
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Privy account

### 1. Clone & Install

```bash
git clone https://github.com/jayworrly/SlothGambol.git
cd SlothGambol

# Install frontend dependencies
cd frontend && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Environment Setup

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Server
cp server/.env.example server/.env
```

Edit the `.env` files with your credentials:
- **Privy**: Get app ID from https://dashboard.privy.io
- **Supabase**: Get URL and anon key from your project settings

### 3. Run Development Servers

Terminal 1 - Server:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy application ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL |

### Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

## Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel
```

### Server (Railway/Render/Fly.io)

```bash
cd server
# Follow your platform's deployment guide
```

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Links

- [Live Demo](https://slothgambol.com)
- [Documentation](./docs)
- [Discord](https://discord.gg/slothgambol)
- [Twitter](https://twitter.com/slothgambol)
