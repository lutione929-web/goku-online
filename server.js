const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
  console.log('لاعب متصل:', socket.id);

  socket.on('createRoom', (data) => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = {
      gameType: data.gameType,
      players: [{ id: socket.id, name: data.name, isDev: data.isDev }]
    };
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, gameType: data.gameType });
  });

  socket.on('joinRoom', (data) => {
    const room = rooms[data.roomCode];
    if (room && room.players.length < 2) {
      room.players.push({ id: socket.id, name: data.name, isDev: data.isDev });
      socket.join(data.roomCode);
      
      // إرسال معلومات اللاعبين وتحديد الأدوار
      io.to(data.roomCode).emit('startGame', { 
        gameType: room.gameType, 
        players: room.players 
      });
    } else {
      socket.emit('errorMsg', 'الغرفة غير موجودة أو ممتلئة!');
    }
  });

  function getRoomCode(id) {
    for (let code in rooms) {
      if (rooms[code].players.some(p => p.id === id)) return code;
    }
    return null;
  }

  // أحداث غوكو
  socket.on('playerMove', (data) => {
    let rCode = getRoomCode(socket.id);
    if (rCode) socket.to(rCode).emit('playerMove', data);
  });
  socket.on('kamehamehaAttack', (data) => {
    let rCode = getRoomCode(socket.id);
    if (rCode) io.to(rCode).emit('spawnBeam', data);
  });

  // أحداث إكس أو (Tic Tac Toe)
  socket.on('makeMove', (data) => {
    let rCode = getRoomCode(socket.id);
    if (rCode) socket.to(rCode).emit('opponentMove', data);
  });

  // أحداث حجر ورق مقص
  socket.on('rpsPlay', (data) => {
    let rCode = getRoomCode(socket.id);
    if (!rCode) return;
    let room = rooms[rCode];
    if (!room.rpsChoices) room.rpsChoices = {};
    room.rpsChoices[socket.id] = data.choice;

    // لما يختار اللاعبين الاثنين
    if (Object.keys(room.rpsChoices).length === 2) {
      let pIds = Object.keys(room.rpsChoices);
      let p1 = pIds[0], p2 = pIds[1];
      let c1 = room.rpsChoices[p1], c2 = room.rpsChoices[p2];
      let winner = 'تعادل';

      if (c1 !== c2) {
        if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'paper' && c2 === 'rock') || (c1 === 'scissors' && c2 === 'paper')) {
          winner = room.players.find(p => p.id === p1).name;
        } else {
          winner = room.players.find(p => p.id === p2).name;
        }
      }
      io.to(rCode).emit('rpsResult', { choices: room.rpsChoices, winner, players: room.players });
      room.rpsChoices = {}; // إعادة ضبط الجولة
    }
  });

  socket.on('disconnect', () => {
    console.log('لاعب خرج:', socket.id);
    for (let code in rooms) {
      rooms[code].players = rooms[code].players.filter(p => p.id !== socket.id);
      if (rooms[code].players.length === 0) delete rooms[code];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر شغال على البورت ${PORT}`);
});
