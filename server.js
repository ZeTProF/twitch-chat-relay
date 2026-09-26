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
  console.log('[SERVER] Nuovo client connesso.');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Gestione ingresso stanza
      if (data.type === 'join' && data.room) {
        currentRoom = data.room;
        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Set());
        }
        rooms.get(currentRoom).add(ws);
        console.log(`[SERVER] Client entrato nella stanza: ${currentRoom} (Totale client in stanza: ${rooms.get(currentRoom).size})`);
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
        } else {
          console.warn(`[SERVER] Ricevuto messaggio per stanza sconosciuta o vuota: ${targetRoom}`);
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

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server WebSocket nativo in ascolto sulla porta ${PORT}`);
});
