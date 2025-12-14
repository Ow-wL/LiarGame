// src/sockets/gameSocket.js
const { Theme, Keyword, sequelize } = require('../models');

// 방 데이터 저장소
// 구조: { '방이름': { roomName, users: [], isPlaying, ... } }
const rooms = {};

// 게임 설정 상수
const TURN_TIME_LIMIT = 10; // 턴 제한 시간 (초)
const MAX_ROUNDS = 2;       // 인당 발언 기회 (2바퀴)

module.exports = (io) => {
    
    // [Helper] 모든 클라이언트에게 최신 방 목록 전송
    const broadcastRoomList = () => {
        const roomList = Object.values(rooms).map(r => ({
            name: r.roomName,
            count: r.users.length,
            isPlaying: r.isPlaying
        }));
        io.emit('roomListUpdate', roomList);
    };

    io.on('connection', (socket) => {
        
        // [0. 로비: 방 목록 요청]
        socket.on('reqRoomList', () => {
            broadcastRoomList();
        });

        // [1. 방 입장 & 생성]
        socket.on('joinRoom', ({ roomName, nickname }) => {
            // 방이 없으면 생성
            if (!rooms[roomName]) {
                rooms[roomName] = { 
                    roomName: roomName, // ★ 타이머에서 참조하기 위해 저장 필수
                    users: [], 
                    isPlaying: false, 
                    turnIndex: 0, 
                    timerId: null,
                    turnCount: 0, 
                    votes: {}, 
                    isVoting: false, 
                    liarChance: false, 
                    deadUsers: [] 
                };
            }

            const room = rooms[roomName];

            // 게임 중인 방 입장 차단
            if (room.isPlaying) {
                return socket.emit('errorMessage', '이미 게임이 진행 중입니다.');
            }

            socket.join(roomName);
            socket.roomName = roomName;
            socket.nickname = nickname;

            // 유저 목록에 추가 (중복 방지)
            if (!room.users.find(u => u.id === socket.id)) {
                room.users.push({ id: socket.id, nickname });
            }

            // 해당 방 사람들에게 유저 목록 갱신
            io.to(roomName).emit('updateUserList', room.users);
            io.to(roomName).emit('message', { text: `👋 ${nickname}님 입장!` });

            // ★ 전체 대기실에 방 목록 갱신 (인원수 변경 반영)
            broadcastRoomList();
        });

        // [2. 게임 시작]
        socket.on('startGame', async () => {
            const room = rooms[socket.roomName];
            if (!room || room.isPlaying) return;
            if (room.users.length < 2) {
                return io.to(socket.id).emit('message', { text: '⚠️ 최소 2명이 필요합니다.' });
            }

            // 게임 상태 초기화
            room.isPlaying = true; 
            room.isVoting = false; 
            room.deadUsers = []; 
            room.votes = {}; 
            room.turnIndex = -1; 
            room.turnCount = 0;

            try {
                // DB 데이터 조회
                const theme = await Theme.findOne({ order: sequelize.random() });
                const keyword = await Keyword.findOne({ where: { theme_id: theme.id }, order: sequelize.random() });
                
                room.theme = theme.theme_name;
                room.keyword = keyword.word;

                // 라이어 선정
                const liarIndex = Math.floor(Math.random() * room.users.length);
                room.liarId = room.users[liarIndex].id;
                room.liarName = room.users[liarIndex].nickname;

                // 역할 분배 전송
                room.users.forEach(u => {
                    const isLiar = u.id === room.liarId;
                    io.to(u.id).emit('gameStarted', {
                        isLiar,
                        theme: room.theme,
                        keyword: isLiar ? '라이어' : room.keyword
                    });
                });

                io.to(room.roomName).emit('message', { text: `🎮 게임 시작! 주제: [${room.theme}]` });

                // ★ 방 목록 갱신 (대기 중 -> 게임 중)
                broadcastRoomList();

                // 첫 턴 시작
                setTimeout(() => startNextTurn(io, room.roomName), 2000);

            } catch (e) {
                console.error(e);
                room.isPlaying = false;
            }
        });

        // [3. 채팅 (턴 진행)]
        socket.on('chatMessage', (msg) => {
            const room = rooms[socket.roomName];
            if (!room || !room.isPlaying) return;
            
            // 탈락자 채팅 금지
            if (room.deadUsers.includes(socket.id)) return;

            const currentUser = room.users[room.turnIndex];
            
            // 내 턴일 때만 채팅 가능
            if (currentUser && currentUser.id === socket.id) {
                io.to(socket.roomName).emit('message', { nickname: socket.nickname, text: msg, userId: socket.id });
                
                // 말을 했으면 타이머 멈추고 다음 턴으로
                if(room.timerId) clearTimeout(room.timerId);
                startNextTurn(io, socket.roomName);
            }
        });

        // [4. 투표]
        socket.on('submitVote', (targetId) => {
            const room = rooms[socket.roomName];
            if(!room || !room.isVoting) return;

            room.votes[socket.id] = targetId;
            
            const liveUsers = room.users.filter(u => !room.deadUsers.includes(u.id));
            const voteCount = Object.keys(room.votes).length;

            if (voteCount >= liveUsers.length) {
                finishVoting(io, socket.roomName);
            } else {
                io.to(socket.roomName).emit('message', { text: `🗳️ 투표 ${voteCount}/${liveUsers.length}` });
            }
        });

        // [5. 라이어 정답]
        socket.on('liarGuess', (ans) => {
            const room = rooms[socket.roomName];
            const isCorrect = ans.trim() === room.keyword;
            const result = {
                winner: isCorrect ? 'LIAR' : 'CITIZEN',
                msg: isCorrect ? '라이어 정답! 라이어 승!' : '틀렸습니다! 시민 승!',
                keyword: room.keyword,
                liarName: room.liarName
            };
            io.to(socket.roomName).emit('gameResult', result);
            endGame(io, room);
        });

        // [퇴장]
        socket.on('disconnect', () => {
             const room = rooms[socket.roomName];
             if(room) {
                 room.users = room.users.filter(u => u.id !== socket.id);
                 io.to(room.roomName).emit('updateUserList', room.users);
                 
                 // 빈 방 삭제
                 if(room.users.length === 0) {
                     delete rooms[socket.roomName];
                 } else if (room.users.length < 2 && room.isPlaying) {
                     // 게임 중 인원 부족 시 종료
                     io.to(room.roomName).emit('message', { text: '🛑 인원 부족으로 게임 종료' });
                     endGame(io, room);
                 }

                 // ★ 방 목록 갱신 (인원 변경 반영)
                 broadcastRoomList();
             }
        });
    });
};

// --- [Game Logic Helper Functions] ---

function startNextTurn(io, roomName) {
    const room = rooms[roomName];
    if (!room || !room.isPlaying) return;

    room.turnCount++;
    const liveUsers = room.users.filter(u => !room.deadUsers.includes(u.id));

    // 투표 단계 진입 체크
    if (room.turnCount > liveUsers.length * MAX_ROUNDS) {
        startVotingPhase(io, roomName);
        return;
    }

    // 다음 생존자 찾기
    let nextIndex = room.turnIndex;
    let loop = 0;
    do {
        nextIndex = (nextIndex + 1) % room.users.length;
        loop++;
        if(loop > room.users.length + 1) { endGame(io, room); return; }
    } while (room.deadUsers.includes(room.users[nextIndex].id));

    room.turnIndex = nextIndex;
    const nextUser = room.users[nextIndex];

    io.to(roomName).emit('turnChange', {
        userId: nextUser.id,
        nickname: nextUser.nickname,
        duration: TURN_TIME_LIMIT
    });

    // 시간 초과 처리 (패배 로직)
    room.timerId = setTimeout(() => {
        handleTimeoutDefeat(io, room, nextUser);
    }, TURN_TIME_LIMIT * 1000);
}

function handleTimeoutDefeat(io, room, user) {
    io.to(room.roomName).emit('message', { text: `☠️ ${user.nickname} 침묵하여 탈락!` });
    
    room.deadUsers.push(user.id);
    io.to(room.roomName).emit('playerDied', user.id);

    // 승패 판정
    if (user.id === room.liarId) {
        io.to(room.roomName).emit('gameResult', {
            winner: 'CITIZEN', msg: '라이어 탈락! 시민 승!', keyword: room.keyword, liarName: room.liarName
        });
        endGame(io, room);
        return;
    }

    const survivors = room.users.filter(u => !room.deadUsers.includes(u.id));
    if (survivors.length < 2) {
         io.to(room.roomName).emit('gameResult', {
            winner: 'LIAR', msg: '생존자 부족 종료. 라이어 승!', keyword: room.keyword, liarName: room.liarName
        });
        endGame(io, room);
        return;
    }

    startNextTurn(io, room.roomName);
}

function startVotingPhase(io, roomName) {
    const room = rooms[roomName];
    if (room.timerId) clearTimeout(room.timerId);
    room.isVoting = true;
    io.to(roomName).emit('startVoting', { msg: '투표 시작! 라이어를 지목하세요.' });
}

function finishVoting(io, roomName) {
    const room = rooms[roomName];
    // room.isVoting = false; // 재투표 가능성이 있으므로 아직 끄지 않음

    // 1. 개표 로직
    const voteCounts = {};
    Object.values(room.votes).forEach(vid => {
        voteCounts[vid] = (voteCounts[vid] || 0) + 1;
    });
    
    // 2. 최다 득표수 계산
    let maxVotes = 0;
    for (const count of Object.values(voteCounts)) {
        if (count > maxVotes) maxVotes = count;
    }

    // 3. 최다 득표자들(후보) 찾기 - 동점자 확인용
    const candidates = Object.keys(voteCounts).filter(vid => voteCounts[vid] === maxVotes);

    // [예외 처리] 투표가 하나도 없을 때
    if (candidates.length === 0) {
        io.to(roomName).emit('message', { text: '🗳️ 투표가 없어 재투표합니다.' });
        resetVoting(io, room);
        return;
    }

    // ★ [핵심] 동점자 처리 (재투표)
    if (candidates.length > 1) {
        io.to(roomName).emit('message', { text: `⚖️ ${candidates.length}명 동점! 재투표를 진행합니다.` });
        
        // 투표 기록 초기화 후 다시 투표 알림 보내기
        resetVoting(io, room);
        return;
    }

    // 4. 단독 당선자 확정
    room.isVoting = false; // 이제 투표 종료
    const targetId = candidates[0];
    const targetUser = room.users.find(u => u.id === targetId);

    if (targetId === room.liarId) {
        room.liarChance = true;
        io.to(room.liarId).emit('liarGuessTurn');
        io.to(roomName).emit('message', { text: '🔥 라이어 발각! 최후의 변론 기회!' });
    } else {
        io.to(roomName).emit('gameResult', {
            winner: 'LIAR',
            msg: `😇 ${targetUser.nickname}님은 시민이었습니다... 라이어 승!`,
            keyword: room.keyword,
            liarName: room.liarName
        });
        endGame(io, room);
    }
}

function resetVoting(io, room) {
    room.votes = {}; // 투표함 비우기
    // 클라이언트에 재투표 신호 전송 (기존 startVoting 재사용)
    io.to(room.roomName).emit('startVoting', { msg: '📢 동점입니다! 다시 투표해주세요.' });
}

function endGame(io, room) {
    room.isPlaying = false;
    room.isVoting = false;
    if(room.timerId) clearTimeout(room.timerId);

    // ★ 게임 종료 시 방 목록 갱신 (게임 중 -> 대기 중)
    const roomList = Object.values(rooms).map(r => ({
        name: r.roomName, count: r.users.length, isPlaying: r.isPlaying
    }));
    io.emit('roomListUpdate', roomList);
}