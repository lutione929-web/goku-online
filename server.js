const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('لاعب متصل:', socket.id);

  socket.on('playerMove', (data) => {
    socket.broadcast.emit('playerMove', data);
  });

  // استقبال رسائل الشات وإرسالها للجميع
  socket.on('chatMessage', (data) => {
    io.emit('chatMessage', data);
  });

  // استقبال حركة الضرب
  socket.on('playerAttack', (data) => {
    socket.broadcast.emit('playerAttack', data);
  });

  socket.on('disconnect', () => {
    console.log('لاعب خرج:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر شغال على البورت ${PORT}`);
});
