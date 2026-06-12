# uberhacker

A multiplayer fake-"hacking" party game. Spin up the server on one machine,
your friends connect from their browsers, everyone joins a **gameroom**, and
you race through "computer-y" challenges. Each round everyone gets the **same**
challenge — the **first to solve it scores the point**. First player to the
target score wins.

Look like all those ridiculous hackers on TV. (Except Mr. Robot.)

## Challenges

| type            | task                                            |
|-----------------|-------------------------------------------------|
| network addr    | given `IP/CIDR`, give the network address       |
| broadcast addr  | given `IP/CIDR`, give the broadcast address     |
| hex → dec       | convert a hex byte to decimal                   |
| dec → hex       | convert a decimal byte to hex                   |
| bin → dec       | convert a binary byte to decimal                |
| bitwise xor     | XOR two bytes                                    |
| fast type       | type the word as fast as you can                |

The host picks which challenge types are in play and the target score.

## Client config

`client/src/config.js` holds hardcoded client-side defaults:

- `config.calculatorOpenByDefault` (`true`) — the desktop's calculator window
  starts open. The `calc` taskbar button toggles it.
- `disabledByDefault` — a `Set` of challenge `type` values that start
  **deselected** in the lobby. The host can still click them back on before
  starting; they're just off by default. Keys must match the server challenge
  `type` strings (`fastType`, `getNet`, `broadcast`, `hexToDec`, `decToHex`,
  `binToDec`, `xor`). Remove a type to have it selected by default.

  ⚠️ If the host starts with **zero** challenge types selected, the lobby falls
  back to enabling **all** of them — so don't disable every type by default
  unless you also expect the host to pick at least one.

## Stack

- **Server** — Node + Express + [socket.io](https://socket.io) (`server/`)
- **Client** — Vite + React + socket.io-client (`client/`)

The server serves the built client and the websocket on the **same port**, so
friends just hit one URL.

## Run it

Requires Node 18+ (the server uses `node --watch` in dev).

```sh
# 1. install deps for both server and client
npm run install:all

# 2. build the client and start the server (serves everything on :3000)
npm start
```

Then everyone on the same network opens:

```
http://<your-machine-ip>:3000
```

Enter a handle and a gameroom name. Share the gameroom name with your friends so
you land in the same room. The first person in a room is the **host** (★) and
starts the game.

Change the port with `PORT=4000 npm start`.

## Develop

Two terminals, with hot reload on both sides (Vite proxies the websocket to the
Node server):

```sh
npm run dev:server   # node --watch on :3000
npm run dev:client   # vite dev server on :5173  <- open this
```

## How it works

- `server/src/challenges.js` — pure generators. Each makes a challenge with a
  prompt and a server-only answer; answers are normalized (case/whitespace) on
  check.
- `server/src/rooms.js` — `Room` holds players, scores, the current challenge,
  and the competitive game loop (first correct answer wins the round, next
  challenge after a short delay, game ends at the target score). `RoomManager`
  creates/destroys rooms on demand.
- `server/src/server.js` — Express static serving + socket.io wiring.
- `client/src/` — React screens: `Join` → `Lobby` → `Game`, a live
  `Scoreboard`, talking to the server over socket.io.

## License

MIT
