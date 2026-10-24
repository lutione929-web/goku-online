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
    let initialKills = (data.name.toUpperCase() === 'EPIKDEV' || data.name.toUpperCase() === 'MOHAMMED') ? 999999 : 0;

    players[socket.id] = { 
      ...data, 
      hp: 100,
      maxHp: 100,
      coins: players[socket.id]?.coins || 50, 
      kills: players[socket.id]?.kills || initialKills 
    };

    if (typeof callback === 'function') {
      callback({ success: true, coins: players[socket.id].coins, kills: players[socket.id].kills });
    }
    
    io.emit('currentPlayers', players);
    updateLeaderboard();
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

  // نظام إطلاق الكاميهااميها والضرر على اللاعبين القريبين
  socket.on('kamehamehaAttack', (data) => {
    let attacker = players[socket.id];
    if (!attacker) return;

    // بث تأثير الكاميهااميها لجميع اللاعبين
    io.emit('spawnBeam', { x: data.x, y: data.y, id: socket.id });

    // فحص المسافة بين المهاجم وبقية اللاعبين لإلحاق الضرر
    for (let id in players) {
      if (id !== socket.id) {
        let target = players[id];
        let dist = Math.hypot(target.x - attacker.x, target.y - attacker.y);
        
        if (dist < 60) { // مسافة الضربة
          target.hp -= 25;
          if (target.hp <= 0) {
            target.hp = 100; // إعادة إحياء
            target.x = 140;
            target.y = 70;
            // زيادة قتلات المهاجم (إلا لو كان المطور قتلاته فلكية)
            if (attacker.kills < 999999) attacker.kills += 1;
            attacker.coins += 10;
          }
        }
      }
    }
    io.emit('currentPlayers', players);
    updateLeaderboard();
  });

  socket.on('buyTransformation', (data, callback) => {
    if (players[socket.id]) {
      if (players[socket.id].coins >= data.cost) {
        players[socket.id].coins -= data.cost;
        callback({ success: true, coins: players[socket.id].coins });
        updateLeaderboard();
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
    updateLeaderboard();
  });
});

function updateLeaderboard() {
  let leaderboardList = Object.values(players).map(p => ({
    name: p.name,
    isDev: p.isDev,
    kills: p.kills || 0,
    coins: p.coins || 0
  })).sort((a, b) => b.kills - a.kills || b.coins - a.coins);

  io.emit('updateLeaderboard', leaderboardList);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر شغال على البورت ${PORT}`);
});
