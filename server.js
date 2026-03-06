require("dotenv").config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Track clients and rooms
const clients = new Map();      // ws -> room

// Store drawing state per room
const roomStrokes = new Map();  // room -> stroke[]
const roomTexts = new Map();  // room -> Map(id -> textData)

const MAX_STROKES = 5000;       // cap to avoid unbounded memory growth


// ─── Helper: initialise room storage if first visitor ────────
function ensureRoom(room) {
    if (!roomStrokes.has(room)) roomStrokes.set(room, []);
    if (!roomTexts.has(room)) roomTexts.set(room, new Map());
}

// ─── Helper: is anyone still in this room? ───────────────────
function roomIsEmpty(room) {
    return ![...clients.values()].some(r => r === room);
}


// ─── WebSocket connection ─────────────────────────────────────
wss.on('connection', (ws, req) => {

    // Parse room from URL query string
    const urlParams = new URLSearchParams((req.url.split('?')[1]) || '');
    const room = urlParams.get('room') || 'default';

    clients.set(ws, room);
    ensureRoom(room);

    // Send full current state to the new joiner
    ws.send(JSON.stringify({
        type: 'init',
        strokes: roomStrokes.get(room),
        texts: [...roomTexts.get(room).values()]   // ← text objects included
    }));


    // ─── Incoming messages ────────────────────────────────────
    ws.on('message', (message) => {

        let data;
        try {
            data = JSON.parse(message.toString());
        } catch (err) {
            console.error('Invalid message format:', err.message);
            return;
        }

        const senderRoom = clients.get(ws);
        ensureRoom(senderRoom);   // safety: room should always exist here

        // ── Persist draw events ──────────────────────────────
        if (data.type === 'draw') {
            const strokes = roomStrokes.get(senderRoom);
            strokes.push(data);

            // Trim oldest strokes if cap exceeded
            if (strokes.length > MAX_STROKES) {
                strokes.splice(0, 500);
            }
        }

        // ── Clear: wipe stored strokes so new joiners start fresh
        if (data.type === 'clear') {
            roomStrokes.set(senderRoom, []);
            roomTexts.get(senderRoom).clear();   // also clear text objects
        }

        // ── Persist text object events ───────────────────────
        if (data.type === 'text') {
            const texts = roomTexts.get(senderRoom);

            if (data.subType === 'create') {
                texts.set(data.id, data);
            } else if (data.subType === 'update' || data.subType === 'move') {
                // Merge into existing record
                const existing = texts.get(data.id) || {};
                texts.set(data.id, { ...existing, ...data });
            } else if (data.subType === 'delete') {
                texts.delete(data.id);
            }
        }

        // ── Broadcast to every other client in the same room ─
        wss.clients.forEach((client) => {
            if (
                client !== ws &&
                client.readyState === WebSocket.OPEN &&
                clients.get(client) === senderRoom
            ) {
                client.send(JSON.stringify(data));
            }
        });

    });


    // ─── Disconnect: clean up empty rooms ────────────────────
    ws.on('close', () => {
        const room = clients.get(ws);
        clients.delete(ws);

        // Free memory once the last person leaves the room
        if (room && roomIsEmpty(room)) {
            roomStrokes.delete(room);
            roomTexts.delete(room);
            console.log(`Room "${room}" is empty – state cleared.`);
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
    });

});


// ─── Server start ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`drw·collab server listening on port ${PORT}`);
});