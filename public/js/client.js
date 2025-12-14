// public/js/client.js
const socket = io();

// --- [BGM 설정] ---
const bgm = new Audio('/sounds/music.mp3');
bgm.loop = true; 
bgm.volume = 0.5;

// --- [DOM 요소 선택] ---
const els = {
    screens: { 
        login: document.querySelector('#login-screen'), 
        lobby: document.querySelector('#lobby-screen'), 
        game: document.querySelector('#game-screen') 
    },
    inputs: { 
        nick: document.querySelector('#nickname-input'), 
        newRoom: document.querySelector('#new-room-name'), 
        chat: document.querySelector('#chat-input') 
    },
    btns: { 
        login: document.querySelector('#login-btn'), 
        create: document.querySelector('#create-room-btn'), 
        send: document.querySelector('#send-btn'), 
        start: document.querySelector('#start-game-btn'), 
        leave: document.querySelector('#leave-btn') 
    },
    disp: { 
        room: document.querySelector('#current-room-name'), 
        chat: document.querySelector('#chat-box'), 
        circle: document.querySelector('#circle-players-area'),
        cardContainer: document.querySelector('#card-area'),
        cardInner: document.querySelector('#card-inner'),
        keyword: document.querySelector('#keyword'),
        msg: document.querySelector('#game-status-msg'),
        gaugeBox: document.querySelector('#turn-gauge-container'),
        gaugeBar: document.querySelector('#gauge-bar'),
        roomList: document.querySelector('#room-list')
    }
};

let myNickname = '';

// --- [1. 로그인 & 대기실] ---

els.btns.login.onclick = () => {
    const nick = els.inputs.nick.value.trim();
    if (!nick) return alert('닉네임을 입력하세요!');
    if (nick.length < 2 || nick.length > 8) return alert('닉네임은 2~8글자로 해주세요.');
    
    myNickname = nick;
    switchScreen('lobby');
    document.querySelector('#welcome-msg').innerText = `환영합니다, ${myNickname}님!`;
    socket.emit('reqRoomList');
};

els.btns.create.onclick = () => {
    const roomName = els.inputs.newRoom.value.trim();
    if (!roomName) return alert('방 제목을 입력하세요!');
    socket.emit('joinRoom', { roomName, nickname: myNickname });
};

socket.on('roomListUpdate', (rooms) => {
    els.disp.roomList.innerHTML = ''; 

    if (rooms.length === 0) {
        els.disp.roomList.innerHTML = '<div class="no-room-msg">현재 개설된 방이 없습니다.</div>';
        return;
    }

    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = `room-card ${room.isPlaying ? 'playing' : ''}`;
        div.innerHTML = `
            <div class="room-title">${room.name}</div>
            <div class="room-info">
                <span>👤 ${room.count}명</span>
                <span class="badge ${room.isPlaying ? 'play' : 'wait'}">
                    ${room.isPlaying ? '게임 중' : '대기 중'}
                </span>
            </div>
        `;
        if (!room.isPlaying) {
            div.onclick = () => {
                socket.emit('joinRoom', { roomName: room.name, nickname: myNickname });
            };
        }
        els.disp.roomList.appendChild(div);
    });
});

socket.on('errorMessage', (msg) => alert(msg));


// --- [2. 게임방 로직] ---

// ★ [수정] 내 이름 표시 로직 추가
socket.on('updateUserList', (users) => {
    if (!els.screens.game.classList.contains('hidden') === false) {
        els.disp.room.innerText = `GAME ROOM`; 
        els.disp.chat.innerHTML = '';
        switchScreen('game');
    }

    els.disp.circle.innerHTML = '';
    const r = 200; 
    
    users.forEach((u, i) => {
        const isMe = (u.id === socket.id);
        const div = document.createElement('div');
        
        div.className = 'player-avatar';
        if (isMe) div.classList.add('is-me'); // 나 자신 표시용 클래스
        div.id = `p-${u.id}`;
        
        // 닉네임 표시: 나인 경우 '(나)' 추가
        div.innerText = u.nickname + (isMe ? ' (나)' : '');
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.id = `b-${u.id}`;
        div.appendChild(bubble);

        const deg = (360 / users.length) * i;
        div.style.transform = `rotate(${deg}deg) translate(${r}px) rotate(-${deg}deg)`;
        
        els.disp.circle.appendChild(div);
    });
});

els.btns.start.onclick = () => socket.emit('startGame');

socket.on('gameStarted', ({ isLiar, theme, keyword }) => {
    els.btns.start.classList.add('hidden');
    els.disp.cardContainer.classList.remove('hidden');
    els.disp.cardInner.classList.remove('flipped');

    els.disp.keyword.innerText = isLiar ? "YOU ARE LIAR" : keyword;
    els.disp.keyword.style.color = isLiar ? '#ff2e63' : '#222831';
    els.disp.msg.innerText = `주제: ${theme}`;

    bgm.currentTime = 0;
    bgm.play().catch(() => {});

    setTimeout(() => {
        els.disp.cardInner.classList.add('flipped');
    }, 500);
});

// 채팅
function sendChat() {
    const t = els.inputs.chat.value.trim();
    if (t) { 
        socket.emit('chatMessage', t); 
        els.inputs.chat.value = ''; 
        els.inputs.chat.disabled = true; 
    }
}
els.btns.send.onclick = sendChat;
els.inputs.chat.onkeypress = (e) => { if (e.key === 'Enter') sendChat(); };

socket.on('message', (data) => {
    if (data.userId) { 
        const bubble = document.getElementById(`b-${data.userId}`);
        if (bubble) {
            bubble.innerText = data.text;
            bubble.style.opacity = 1;
            setTimeout(() => bubble.style.opacity = 0, 3000);
        }
        const p = document.createElement('div');
        p.innerText = `${data.nickname}: ${data.text}`;
        els.disp.chat.appendChild(p);
        els.disp.chat.scrollTop = els.disp.chat.scrollHeight;
    } else { 
        els.disp.msg.innerText = data.text;
        els.disp.msg.style.transform = "scale(1.2)";
        setTimeout(() => els.disp.msg.style.transform = "scale(1)", 200);
    }
});

socket.on('turnChange', ({ userId, nickname, duration }) => {
    document.querySelectorAll('.player-avatar').forEach(e => e.classList.remove('active-turn'));
    
    const target = document.getElementById(`p-${userId}`);
    if (target) target.classList.add('active-turn');

    const isMe = (userId === socket.id);

    if (isMe) {
        els.inputs.chat.disabled = false;
        els.btns.send.disabled = false;
        els.inputs.chat.placeholder = "📢 당신 차례입니다! 말씀하세요!";
        setTimeout(() => els.inputs.chat.focus(), 100);
    } else {
        els.inputs.chat.disabled = true;
        els.btns.send.disabled = true;
        els.inputs.chat.placeholder = `🔇 ${nickname}님이 발언 중...`;
    }

    els.disp.gaugeBox.classList.remove('hidden');
    els.disp.gaugeBar.style.transition = 'none';
    els.disp.gaugeBar.style.width = '100%';
    void els.disp.gaugeBar.offsetWidth; 

    els.disp.gaugeBar.style.transition = `width ${duration}s linear`;
    els.disp.gaugeBar.style.width = '0%';
});

socket.on('playerDied', (uid) => {
    const el = document.getElementById(`p-${uid}`);
    if (el) {
        el.classList.add('dead-player');
        el.classList.remove('active-turn');
        el.innerText += " (☠️)";
    }
});

// ★ [수정] 투표 시작 로직 (클릭 문제 해결)
socket.on('startVoting', (data) => {
    els.disp.msg.innerText = data.msg || "🗣 토론 종료! 라이어를 클릭하세요.";
    els.inputs.chat.disabled = true;
    els.inputs.chat.placeholder = "투표 진행 중...";
    els.disp.gaugeBox.classList.add('hidden');

    document.querySelectorAll('.player-avatar').forEach(el => {
        el.classList.remove('active-turn'); // 턴 강조 확실히 제거

        // 1. 탈락자 제외
        if (el.classList.contains('dead-player')) return;

        // 2. 본인은 투표 대상에서 제외 (클릭 불가)
        if (el.id === `p-${socket.id}`) {
            el.classList.add('voting-mode'); // 흐리게 처리
            return;
        }
        
        // 3. 투표 대상 활성화
        el.classList.add('voting-target');
        
        // 4. 클릭 이벤트 (중복 방지 위해 onclick 사용)
        el.onclick = function() {
            if (confirm(`[${this.innerText}]님을 라이어로 지목하시겠습니까?`)) {
                const targetId = this.id.replace('p-', '');
                socket.emit('submitVote', targetId);
                
                // 투표 후 모든 클릭 막기
                document.querySelectorAll('.player-avatar').forEach(p => {
                    p.onclick = null; 
                    p.classList.remove('voting-target');
                    p.classList.remove('voting-mode');
                    p.style.opacity = 0.5;
                    p.style.cursor = 'default';
                });
                els.disp.msg.innerText = "투표 완료. 집계 중...";
            }
        }
    });
});

socket.on('liarGuessTurn', () => {
    setTimeout(() => {
        const ans = prompt("당신은 라이어입니다! 제시어를 맞춰 역전하세요!");
        socket.emit('liarGuess', ans || "");
    }, 500);
});

socket.on('gameResult', ({ msg, keyword, liarName }) => {
    bgm.pause();
    setTimeout(() => {
        alert(`${msg}\n\n[정답] ${keyword}\n[라이어] ${liarName}`);
        location.reload(); 
    }, 500);
});

els.btns.leave.onclick = () => location.reload();

function switchScreen(id) {
    Object.values(els.screens).forEach(s => s.classList.add('hidden'));
    els.screens[id].classList.remove('hidden');
}