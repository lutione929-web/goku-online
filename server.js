const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let players = {};

io.on('connection', (socket) => {
  console.log('لاعب متصل:', socket.id);

  socket.on('playerJoin', (data, callback) => {
    let nameExists = Object.values(players).some(p => p.name.toLowerCase() === data.name.toLowerCase());
    
    if (nameExists) {
      callback({ success: false, message: 'هذا الاسم مستخدم من قبل، اختر اسم آخر!' });
      return;
    }

    players[socket.id] = { ...data, coins: 50 }; // يبدأ بـ 50 كوينز هدية لفتح المتجر
    callback({ success: true, coins: players[socket.id].coins });
    io.emit('currentPlayers', players);
  });

  socket.on('playerMove', (data) => {
    if (players[data.id]) {
      players[data.id].x = data.x;
      players[data.id].y = data.y;
      players[data.id].isDev = data.isDev;
      players[data.id].form = data.form;
      socket.broadcast.emit('playerMove', data);
    }
  });

  socket.on('playerAction', (data) => {
    if (players[data.id]) {
      players[data.id].form = data.form;
      socket.broadcast.emit('playerAction', data);
    }
  });

  socket.on('buyTransformation', (data, callback) => {
    if (players[socket.id]) {
      if (players[socket.id].coins >= data.cost) {
        players[socket.id].coins -= data.cost;
        callback({ success: true, coins: players[socket.id].coins });
      } else {
        callback({ success: false, message: 'ليس لديك كوينز كافية!' });
      }
    }
  });

  socket.on('chatMessage', (data) => {
    io.emit('chatMessage', data);
  });

  socket.on('disconnect', () => {
    console.log('لاعب خرج:', socket.id);
    delete players[socket.id];
    io.emit('disconnect', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر شغال على البورت ${PORT}`);
});
