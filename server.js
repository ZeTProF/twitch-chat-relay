const http = require('http');
const { WebSocketServer } = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Twitch E2EE Native WS Server is running!\n');
});

const wss = new WebSocketServer({ server });

// Mappa per tenere traccia delle stanze e dei client connessi
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoom = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Gestione dell'ingresso in stanza
      if (data.type === 'join' && data.room) {
        currentRoom = data.room;
        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Set());
        }
        rooms.get(currentRoom).add(ws);
        return;
      }

      // Gestione del broadcast dei messaggi cifrati
      if (data.type === 'message' && currentRoom) {
        const roomClients = rooms.get(currentRoom);
        if (roomClients) {
          roomClients.forEach((client) => {
            // Invia il messaggio a tutti gli altri nella stessa stanza (tranne chi lo ha inviato)
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
      }
    } catch (e) {
      console.error('Errore parsing messaggio:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server WebSocket nativo in ascolto sulla porta ${PORT}`);
});
