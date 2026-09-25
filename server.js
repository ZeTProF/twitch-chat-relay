const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get('/', (req, res) => {
  res.send('Twitch E2EE Relay Server is running!');
});

io.on('connection', (socket) => {
  socket.on('join', (room) => {
    socket.join(room);
  });

  socket.on('message', (data) => {
    if (data && data.channel) {
      socket.to(data.channel).emit('message', data);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
