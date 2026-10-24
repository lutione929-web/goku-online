const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let rooms = {}; // تخزين الغرف والألعاب

io.on('connection', (socket) => {
  console.log('لاعب متصل:', socket.id);

  // إنشاء غرفة برمز خاص
  socket.on('createRoom', (data) => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = {
      gameType: data.gameType,
      players: [{ id: socket.id, name: data.name, isDev: data.isDev }]
    };
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, gameType: data.gameType });
  });

  // الانضمام لغرفة عبر الرمز
  socket.on('joinRoom', (data) => {
    const room = rooms[data.roomCode];
    if (room && room.players.length < 2) {
      room.players.push({ id: socket.id, name: data.name, isDev: data.isDev });
      socket.join(data.roomCode);
      
      // إخبار اللاعبين أن الغرفة اكتملت وبدأت اللعبة
      io.to(data.roomCode).emit('startGame', { 
        gameType: room.gameType, 
        players: room.players 
      });
    } else {
      socket.emit('errorMsg', 'الغرفة غير موجودة أو ممتلئة!');
    }
  });

  // أحداث لعبة غوكو
  function getRoomCode(id) {
    for (let code in rooms) {
      if (rooms[code].players.some(p => p.id === id)) return code;
    }
    return null;
  }

  socket.on('playerMove', (data) => {
    let rCode = getRoomCode(socket.id);
    if (rCode) socket.to(rCode).emit('playerMove', data);
  });

  socket.on('playerAction', (data) => {
    let rCode = getRoomCode(socket.id);
    if (rCode) socket.to(rCode).emit('playerAction', data);
  });

  socket.on('kamehamehaAttack', (data) => {
    let rCode = getRoomCode(socket.id);
    if (rCode) io.to(rCode).emit('spawnBeam', data);
  });

  // أحداث لعبة إكس أو (Tic Tac Toe)
  socket.on('makeMove', (data) => {
    let rCode = getRoomCode(socket.id);
    if (rCode) io.to(rCode).emit('opponentMove', data);
  });

  // أحداث حجر ورق مقص
  socket.on('rpsPlay', (data) => {
    let rCode = getRoomCode(socket.id);
    if (rCode) io.to(rCode).emit('rpsResult', data);
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
  console.log(`منصة الألعاب شغالّة على البورت ${PORT}`);
});
