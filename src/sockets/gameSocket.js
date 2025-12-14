// src/sockets/gameSocket.js
const { Theme, Keyword, sequelize } = require('../models');

const rooms = {};
const TURN_TIME_LIMIT = 10;
const MAX_ROUNDS = 2;

module.exports = (io) => {

    const broadcastRoomList = () => {
        const roomList = Object.values(rooms).map(r => ({
            name: r.roomName,
            count: r.users.length,
            isPlaying: r.isPlaying
        }));
        io.emit('roomListUpdate', roomList);
    };

    io.on('connection', (socket) => {

        // 0. 로비
        socket.on('reqRoomList', () => broadcastRoomList());

        // 1. 방 입장 (방장 설정 및 준비 상태 초기화)
        socket.on('joinRoom', ({ roomName, nickname }) => {
            if (!rooms[roomName]) {
                rooms[roomName] = {
                    roomName, users: [], isPlaying: false,
                    hostId: socket.id, // ★ 첫 입장 유저가 방장
                    turnIndex: 0, timerId: null, turnCount: 0, 
                    votes: {}, isVoting: false, deadUsers: []
                };
            }

            const room = rooms[roomName];
            if (room.isPlaying) return socket.emit('errorMessage', '이미 게임 중입니다.');

            socket.join(roomName);
            socket.roomName = roomName;
            socket.nickname = nickname;

            if (!room.users.find(u => u.id === socket.id)) {
                room.users.push({ 
                    id: socket.id, 
                    nickname, 
                    isReady: false // ★ 준비 상태 추가
                });
            }

            // 방 정보(방장 누구인지 등) 전체 전송
            io.to(roomName).emit('updateUserList', { 
                users: room.users, 
                hostId: room.hostId 
            });
            broadcastRoomList();
        });

        // ★ [신규] 준비 상태 토글 (Ready)
        socket.on('toggleReady', () => {
            const room = rooms[socket.roomName];
            if (!room || room.isPlaying) return;

            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isReady = !user.isReady; // 상태 반전
                // 상태 갱신 알림
                io.to(room.roomName).emit('updateUserList', { 
                    users: room.users, 
                    hostId: room.hostId 
                });
            }
        });

        // 2. 게임 시작 (방장만 가능 & 전원 준비 체크)
        socket.on('startGame', async () => {
            const room = rooms[socket.roomName];
            if (!room || room.isPlaying) return;

            // A. 방장 체크
            if (socket.id !== room.hostId) {
                return socket.emit('errorMessage', '방장만 게임을 시작할 수 있습니다.');
            }

            // B. 인원 체크
            if (room.users.length < 2) {
                return socket.emit('errorMessage', '최소 2명이 필요합니다.');
            }

            // C. 준비 상태 체크 (방장 제외하고 모두가 Ready여야 함)
            const others = room.users.filter(u => u.id !== room.hostId);
            const allReady = others.every(u => u.isReady);
            if (!allReady) {
                return socket.emit('errorMessage', '모든 플레이어가 준비해야 합니다!');
            }

            // 게임 초기화
            room.isPlaying = true;
            room.isVoting = false;
            room.deadUsers = [];
            room.votes = {};
            room.turnIndex = -1;
            room.turnCount = 0;
            
            // 준비 상태 리셋 (게임 시작하면 준비 풀림)
            room.users.forEach(u => u.isReady = false);

            try {
                const theme = await Theme.findOne({ order: sequelize.random() });
                const keyword = await Keyword.findOne({ where: { theme_id: theme.id }, order: sequelize.random() });
                room.theme = theme.theme_name;
                room.keyword = keyword.word;

                const liarIndex = Math.floor(Math.random() * room.users.length);
                room.liarId = room.users[liarIndex].id;
                room.liarName = room.users[liarIndex].nickname;

                room.users.forEach(u => {
                    const isLiar = u.id === room.liarId;
                    io.to(u.id).emit('gameStarted', { isLiar, theme: room.theme, keyword: isLiar ? '라이어' : room.keyword });
                });
                
                io.to(room.roomName).emit('message', { text: `🎮 게임 시작!` });
                broadcastRoomList();
                setTimeout(() => startNextTurn(io, room.roomName), 2000);

            } catch (e) {
                console.error(e);
                room.isPlaying = false;
            }
        });

        // 3. 채팅 (기존 동일)
        socket.on('chatMessage', (msg) => {
            const room = rooms[socket.roomName];
            if (!room) return;

            // 게임 중이 아닐 땐 대기실 채팅으로 처리
            if (!room.isPlaying) {
                 io.to(socket.roomName).emit('message', { nickname: socket.nickname, text: msg, userId: socket.id });
                 return;
            }

            // 게임 중 로직 (기존과 동일)
            if (room.deadUsers.includes(socket.id)) return;
            const currentUser = room.users[room.turnIndex];
            if (currentUser && currentUser.id === socket.id) {
                io.to(socket.roomName).emit('message', { nickname: socket.nickname, text: msg, userId: socket.id });
                if(room.timerId) clearTimeout(room.timerId);
                startNextTurn(io, socket.roomName);
            }
        });

        // 4. 투표 (기존 동일)
        socket.on('submitVote', (targetId) => {
            const room = rooms[socket.roomName];
            if (!room || !room.isVoting) return;
            room.votes[socket.id] = targetId;
            const liveUsers = room.users.filter(u => !room.deadUsers.includes(u.id));
            if (Object.keys(room.votes).length >= liveUsers.length) finishVoting(io, socket.roomName);
            else io.to(socket.roomName).emit('message', { text: `🗳️ 투표 진행 중..` });
        });

        // 5. 정답 (기존 동일 + 종료 방식 변경)
        socket.on('liarGuess', (ans) => {
            const room = rooms[socket.roomName];
            const isCorrect = ans.trim() === room.keyword;
            const result = {
                winner: isCorrect ? 'LIAR' : 'CITIZEN',
                msg: isCorrect ? '라이어 정답! 라이어 승!' : '틀렸습니다! 시민 승!',
                keyword: room.keyword, liarName: room.liarName
            };
            io.to(socket.roomName).emit('gameResult', result);
            resetGame(io, room); // ★ 게임 초기화 함수 호출
        });

        // 6. 퇴장 (방장 승계 로직 추가)
        socket.on('disconnect', () => {
            const room = rooms[socket.roomName];
            if (room) {
                room.users = room.users.filter(u => u.id !== socket.id);
                
                // 사람이 0명이면 방 삭제
                if (room.users.length === 0) {
                    delete rooms[socket.roomName];
                } else {
                    // ★ 방장이 나갔으면 다음 사람에게 방장 위임
                    if (socket.id === room.hostId) {
                        room.hostId = room.users[0].id;
                        io.to(room.roomName).emit('message', { text: `👑 방장이 ${room.users[0].nickname}님으로 변경되었습니다.` });
                    }
                    
                    // 게임 중 인원 부족 시 종료
                    if (room.isPlaying && room.users.length < 2) {
                        io.to(room.roomName).emit('message', { text: '🛑 인원 부족으로 게임이 종료됩니다.' });
                        resetGame(io, room);
                    }
                    
                    io.to(room.roomName).emit('updateUserList', { users: room.users, hostId: room.hostId });
                }
                broadcastRoomList();
            }
        });
    });
};

// --- Helper Functions ---

// ★ [신규] 게임 종료 후 방 상태만 리셋 (방 안깨짐)
function resetGame(io, room) {
    room.isPlaying = false;
    room.isVoting = false;
    room.votes = {};
    if (room.timerId) clearTimeout(room.timerId);

    // 모든 유저의 준비 상태 초기화
    room.users.forEach(u => u.isReady = false);

    // 클라이언트에 리셋 신호 전송
    io.to(room.roomName).emit('resetGameUI', { hostId: room.hostId });
    
    // 방 목록 갱신 (게임중 -> 대기중)
    const roomList = Object.values(rooms).map(r => ({
        name: r.roomName, count: r.users.length, isPlaying: r.isPlaying
    }));
    io.emit('roomListUpdate', roomList);
}

// (나머지 턴, 투표 함수는 기존과 로직 동일하므로 resetGame 호출 부분만 신경쓰면 됨)
function startNextTurn(io, roomName) {
    const room = rooms[roomName];
    if(!room || !room.isPlaying) return;
    room.turnCount++;
    const liveUsers = room.users.filter(u => !room.deadUsers.includes(u.id));
    if (room.turnCount > liveUsers.length * MAX_ROUNDS) { startVotingPhase(io, roomName); return; }
    
    let nextIndex = room.turnIndex;
    let loop=0;
    do { nextIndex=(nextIndex+1)%room.users.length; loop++; if(loop>20){resetGame(io,room);return;} } 
    while(room.deadUsers.includes(room.users[nextIndex].id));
    
    room.turnIndex = nextIndex;
    io.to(roomName).emit('turnChange', { userId: room.users[nextIndex].id, nickname: room.users[nextIndex].nickname, duration: TURN_TIME_LIMIT });
    
    room.timerId = setTimeout(() => handleTimeoutDefeat(io, room, room.users[nextIndex]), TURN_TIME_LIMIT * 1000);
}

function handleTimeoutDefeat(io, room, user) {
    io.to(room.roomName).emit('message', { text: `☠️ ${user.nickname} 탈락!` });
    room.deadUsers.push(user.id);
    io.to(room.roomName).emit('playerDied', user.id);
    
    if (user.id === room.liarId) {
        io.to(room.roomName).emit('gameResult', { winner: 'CITIZEN', msg: '라이어 탈락! 시민 승!', keyword: room.keyword, liarName: room.liarName });
        resetGame(io, room); return;
    }
    const survivors = room.users.filter(u => !room.deadUsers.includes(u.id));
    if (survivors.length < 2) {
         io.to(room.roomName).emit('gameResult', { winner: 'LIAR', msg: '생존자 부족. 라이어 승!', keyword: room.keyword, liarName: room.liarName });
         resetGame(io, room); return;
    }
    startNextTurn(io, room.roomName);
}

function startVotingPhase(io, roomName) {
    const room = rooms[roomName];
    if(room.timerId) clearTimeout(room.timerId);
    room.isVoting = true;
    io.to(roomName).emit('startVoting', { msg: '투표 시작!' });
}

function finishVoting(io, roomName) {
    const room = rooms[roomName];
    // 동점 처리 및 개표 로직 (이전 답변과 동일) ...
    // ...
    // 결과 전송 후에는 항상 resetGame(io, room) 호출
    // 예: 
    // io.to(roomName).emit('gameResult', ...);
    // resetGame(io, room);
    
    // (간략화를 위해 동점 처리 포함된 전체 코드는 이전 답변 참조, 끝부분만 resetGame으로 변경)
    const voteCounts = {};
    Object.values(room.votes).forEach(vid => voteCounts[vid] = (voteCounts[vid]||0)+1);
    let maxVotes = 0;
    for(const c of Object.values(voteCounts)) if(c>maxVotes) maxVotes=c;
    const candidates = Object.keys(voteCounts).filter(vid => voteCounts[vid]===maxVotes);
    
    if(candidates.length === 0 || candidates.length > 1) {
        io.to(roomName).emit('startVoting', { msg: '재투표 진행!' });
        room.votes = {};
        return;
    }
    
    const targetId = candidates[0];
    const targetUser = room.users.find(u => u.id === targetId);
    
    if (targetId === room.liarId) {
        room.liarChance = true;
        io.to(room.liarId).emit('liarGuessTurn');
    } else {
        io.to(roomName).emit('gameResult', { winner: 'LIAR', msg: `${targetUser.nickname}님은 시민. 라이어 승!`, keyword: room.keyword, liarName: room.liarName });
        resetGame(io, room);
    }
}