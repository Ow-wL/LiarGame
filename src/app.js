const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();
const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app); // Express와 http 서버 연결
const io = socketIo(server); // Socket.io 연결

const gameSocket = require('./sockets/gameSocket'); // 소켓 로직 불러오기

sequelize.sync({ force: false }) // force: true면 실행할 때마다 테이블 다 지우고 다시 만듦 (주의!)
  .then(() => {
    console.log('✨ 데이터베이스 연결 성공! ✨');
  })
  .catch((err) => {
    console.error(err);
  });

// 미들웨어 설정
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // 정적 파일(프론트) 제공

// 기본 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 소켓 로직 실행
gameSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});