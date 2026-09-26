const http = require('http');
const { WebSocketServer } = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Twitch E2EE Native WS Server is running!\n');
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoom = null;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Risposta al keep-alive
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      // Gestione ingresso stanza
      if (data.type === 'join' && data.room) {
        currentRoom = data.room;
        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Set());
        }
        rooms.get(currentRoom).add(ws);
        console.log(`[SERVER] Client entrato nella stanza: ${currentRoom} (Totale client: ${rooms.get(currentRoom).size})`);
        return;
      }

      // Gestione invio messaggio
      if (data.type === 'message') {
        const targetRoom = data.room || currentRoom;
        if (targetRoom && rooms.has(targetRoom)) {
          const roomClients = rooms.get(targetRoom);
          console.log(`[SERVER] Broadcast messaggio nella stanza ${targetRoom} a ${roomClients.size} client.`);
          roomClients.forEach((client) => {
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
      }
    } catch (e) {
      console.error('[SERVER] Errore parsing messaggio:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
      console.log(`[SERVER] Client disconnesso dalla stanza: ${currentRoom}`);
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

// Intervallo per chiudere i client morti ed evitare timeout di Render
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server WebSocket nativo in ascolto sulla porta ${PORT}`);
});
