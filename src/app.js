// src/app.js 전체 수정본 (기존 imports 유지)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt'); // ★ 암호화 모듈
const { sequelize, User } = require('./models'); // User 모델 추가

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 미들웨어 설정
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json()); // JSON 데이터 파싱용

// DB 연결
sequelize.sync({ force: false })
    .then(() => console.log('✅ DB 연결 성공'))
    .catch(err => console.error(err));

// 에러 발생 시 아래 코드로 실행 한 번 하고 위의 코드로 복구 
/*
sequelize.sync({ force: true }) 
    .then(() => console.log('✅ DB 연결 및 테이블 재생성 성공'))
    .catch(err => console.error(err));
*/


// --- [API Routes] ---

// 1. 회원가입 API
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, nickname } = req.body;

        // 중복 체크
        const existId = await User.findOne({ where: { username } });
        if (existId) return res.status(400).json({ msg: '이미 존재하는 아이디입니다.' });

        const existNick = await User.findOne({ where: { nickname } });
        if (existNick) return res.status(400).json({ msg: '이미 존재하는 닉네임입니다.' });

        // 비밀번호 암호화 (해싱)
        const hashedPassword = await bcrypt.hash(password, 10);

        // DB 저장
        await User.create({
            username,
            password: hashedPassword,
            nickname
        });

        res.status(201).json({ msg: '회원가입 성공! 로그인해주세요.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: '서버 오류 발생' });
    }
});

// 2. 로그인 API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 유저 찾기
        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(400).json({ msg: '아이디가 존재하지 않습니다.' });

        // 비밀번호 확인 (입력값 vs DB암호값 비교)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: '비밀번호가 틀렸습니다.' });

        // 로그인 성공 (닉네임 전달)
        res.json({ msg: '로그인 성공', nickname: user.nickname });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: '서버 오류' });
    }
});


// --- [Socket.io 로직] ---
const gameSocket = require('./sockets/gameSocket');
gameSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});