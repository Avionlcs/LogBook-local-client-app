const fs = require('fs');
const https = require('https');
const express = require('express');
const WebSocket = require('ws');
const selfsigned = require('selfsigned');
const { getNetworkInterfaces } = require('../../utils/networkUtils');
const { URL } = require('url');

const app = express();
const port = 3001;

// 1) Generate a self-signed cert for your LAN IP
const LAN_IP = getNetworkInterfaces(port)[0].address.split(':')[0];
const attrs = [{ name: 'commonName', value: LAN_IP }];
const pems = selfsigned.generate(attrs, { days: 365 });

// 2) Create HTTPS server
const server = https.createServer({
    key: pems.private,
    cert: pems.cert,
}, app);

// 3) Create a WebSocket server on top of that HTTPS server
const wss = new WebSocket.Server({ noServer: true });
const rooms = new Map();  // Maps room IDs to arrays of clients

wss.on('connection', (ws, req) => {
    // Parse roomId from query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    if (!roomId) {
        ws.close(4000, 'Room ID required');
        return;
    }

    // Get or create the room
    let room = rooms.get(roomId);
    if (!room) {
        room = [];
        rooms.set(roomId, room);
    }

    // Check if room is full
    if (room.length >= 2) {
        ws.close(4001, 'Room is full');
        return;
    }

    // Add client to the room
    room.push(ws);
    //console.log(`Client joined room ${roomId}`);

    // Notify clients when room is ready
    if (room.length === 2) {
        room[0].send(JSON.stringify({ type: 'ready', initiator: true }));
        room[1].send(JSON.stringify({ type: 'ready', initiator: false }));
    }

    // Relay messages to other peer in the room
    ws.on('message', msg => {
        room.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    });

    // Handle client disconnection
    ws.on('close', () => {
        const index = room.indexOf(ws);
        if (index !== -1) {
            room.splice(index, 1);
            //console.log(`Client left room ${roomId}`);
            // Notify remaining peer about disconnection
            room.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'peerDisconnected' }));
                }
            });
            // Cleanup empty rooms
            if (room.length === 0) {
                rooms.delete(roomId);
                //console.log(`Room ${roomId} deleted`);
            }
        }
    });
});

// 4) Serve static files from `public/`
app.use(express.static('src/apps/intercom/public'));

// 5) Hook into the HTTPS server’s “upgrade” event
server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});

// 6) Start listening
server.listen(port, () => {
    //console.log(`🔒 HTTPS/WSS server running at https://${LAN_IP}:${port}`);
    //console.log('⚠️  You’ll see a certificate warning—just “Proceed”.');
});