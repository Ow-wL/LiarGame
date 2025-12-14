// 1. 소켓 자동 연결 끄기 (로그인 성공하면 연결할 것임)
const socket = io({ autoConnect: false });

const bgm = new Audio('/sounds/music.mp3');
bgm.loop = true; bgm.volume = 0.5;

// DOM 요소 선택 (추가된 ID 반영)
const els = {
    screens: { login: $('#login-screen'), lobby: $('#lobby-screen'), game: $('#game-screen') },
    // 입력창들이 많아졌으니 따로 관리
    auth: {
        loginBox: $('#login-form-box'),
        signupBox: $('#signup-form-box'),
        lId: $('#login-id'), lPw: $('#login-pw'),
        rId: $('#reg-id'), rPw: $('#reg-pw'), rNick: $('#reg-nick')
    },
    inputs: { newRoom: $('#new-room-name'), chat: $('#chat-input') },
    btns: { 
        login: $('#login-btn'), register: $('#register-btn'),
        create: $('#create-room-btn'), send: $('#send-btn'), 
        start: $('#start-game-btn'), leave: $('#leave-btn') 
    },
    disp: { /* 기존과 동일 */ 
        room: $('#current-room-name'), chat: $('#chat-box'), circle: $('#circle-players-area'),
        cardContainer: $('#card-area'), cardInner: $('#card-inner'), keyword: $('#keyword'),
        msg: $('#game-status-msg'), gaugeBox: $('#turn-gauge-container'), gaugeBar: $('#gauge-bar'),
        roomList: $('#room-list')
    }
};

// 동적 생성 준비 버튼 (기존 유지)
const readyBtn = document.createElement('button');
readyBtn.id = 'ready-btn'; readyBtn.className = 'ready-btn'; readyBtn.innerText = '준비하기';
document.querySelector('.bottom-panel').appendChild(readyBtn);

let myNickname = '';
let myId = '';

function $(sel) { return document.querySelector(sel); }

// --- [인증(Auth) 로직] ---

// 로그인/회원가입 화면 전환
window.toggleAuthMode = () => {
    els.auth.loginBox.classList.toggle('hidden');
    els.auth.signupBox.classList.toggle('hidden');
    // 입력창 초기화
    els.auth.lId.value = ''; els.auth.lPw.value = '';
    els.auth.rId.value = ''; els.auth.rPw.value = ''; els.auth.rNick.value = '';
};

// 1. 회원가입 요청
els.btns.register.onclick = async () => {
    const username = els.auth.rId.value.trim();
    const password = els.auth.rPw.value.trim();
    const nickname = els.auth.rNick.value.trim();

    if(!username || !password || !nickname) return alert('모든 항목을 입력해주세요.');

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, nickname })
        });
        const data = await res.json();
        
        if (res.ok) {
            alert(data.msg); // 가입 성공
            toggleAuthMode(); // 로그인 화면으로 이동
        } else {
            alert(data.msg); // 가입 실패 (중복 등)
        }
    } catch (e) {
        alert('서버 오류 발생');
    }
};

// 2. 로그인 요청
els.btns.login.onclick = async () => {
    const username = els.auth.lId.value.trim();
    const password = els.auth.lPw.value.trim();

    if(!username || !password) return alert('아이디와 비밀번호를 입력해주세요.');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            // ★ 로그인 성공!
            myNickname = data.nickname;
            
            // ★ 이제 소켓 연결 시작
            socket.connect(); 
            
            switchScreen('lobby');
            $('#welcome-msg').innerText = `환영합니다, ${myNickname}님!`;
            socket.emit('reqRoomList');
        } else {
            alert(data.msg);
        }
    } catch (e) {
        console.error(e);
        alert('로그인 서버 오류');
    }
};

// --- [2. 대기실 (로비)] ---

els.btns.create.onclick = () => {
    const room = els.inputs.newRoom.value.trim();
    if(!room) return alert('방 제목을 입력하세요!');
    socket.emit('joinRoom', { roomName: room, nickname: myNickname });
};

socket.on('roomListUpdate', (rooms) => {
    els.disp.roomList.innerHTML = '';
    if(!rooms.length) {
        els.disp.roomList.innerHTML = '<div class="no-room-msg">현재 개설된 방이 없습니다.</div>';
        return;
    }
    rooms.forEach(r => {
        const d = document.createElement('div');
        d.className = `room-card ${r.isPlaying?'playing':''}`;
        d.innerHTML = `
            <div class="room-title">${r.name}</div>
            <div class="room-info"><span>👤 ${r.count}명</span><span class="badge ${r.isPlaying?'play':'wait'}">${r.isPlaying?'게임중':'대기중'}</span></div>
        `;
        if(!r.isPlaying) d.onclick = () => socket.emit('joinRoom', { roomName: r.name, nickname: myNickname });
        els.disp.roomList.appendChild(d);
    });
});


// --- [3. 게임방 로직] ---

readyBtn.onclick = () => socket.emit('toggleReady');
els.btns.start.onclick = () => socket.emit('startGame');

// 유저 목록 업데이트 (방장/준비 상태 표시)
socket.on('updateUserList', ({ users, hostId }) => {
    if(!els.screens.game.classList.contains('hidden') === false) {
        els.disp.room.innerText = 'GAME ROOM';
        els.disp.chat.innerHTML = '';
        switchScreen('game');
    }
    myId = socket.id;

    // 방장/준비 버튼 토글
    if (myId === hostId) {
        els.btns.start.classList.remove('hidden');
        readyBtn.classList.add('hidden');
    } else {
        els.btns.start.classList.add('hidden');
        readyBtn.classList.remove('hidden');
    }

    // 내 준비 상태에 따른 버튼 텍스트
    const me = users.find(u => u.id === myId);
    if (me && me.isReady) {
        readyBtn.innerText = '준비 취소';
        readyBtn.classList.add('cancel');
    } else {
        readyBtn.innerText = '준비하기';
        readyBtn.classList.remove('cancel');
    }

    // 원형 배치
    els.disp.circle.innerHTML = '';
    const r = 200;
    users.forEach((u, i) => {
        const div = document.createElement('div');
        div.className = 'player-avatar';
        div.id = `p-${u.id}`;
        
        // 준비 완료 표시
        if (u.isReady) {
            div.classList.add('ready-state');
            div.innerHTML += `<div class="ready-badge">✔</div>`;
        }

        let nameText = u.nickname + (u.id === myId ? ' (나)' : '');
        div.innerHTML = `<span>${nameText}</span>` + div.innerHTML;

        if (u.id === hostId) div.innerHTML += `<span class="host-icon">👑</span>`;

        const bubble = document.createElement('div');
        bubble.className = 'bubble'; bubble.id = `b-${u.id}`;
        div.appendChild(bubble);

        const deg = (360/users.length)*i;
        div.style.transform = `rotate(${deg}deg) translate(${r}px) rotate(-${deg}deg)`;
        els.disp.circle.appendChild(div);
    });
});

// ★ [수정] 게임 시작 시 준비 상태 UI 제거
socket.on('gameStarted', ({ isLiar, theme, keyword }) => {
    // 1. 버튼 숨기기
    els.btns.start.classList.add('hidden');
    readyBtn.classList.add('hidden');
    
    // 2. ★ 준비 완료 표시(초록 테두리 & 뱃지) 강제 제거
    document.querySelectorAll('.player-avatar').forEach(el => {
        el.classList.remove('ready-state');
        const badge = el.querySelector('.ready-badge');
        if(badge) badge.remove();
    });

    // 3. 게임 UI 표시
    els.disp.cardContainer.classList.remove('hidden');
    els.disp.cardInner.classList.remove('flipped');
    els.disp.keyword.innerText = isLiar ? "LIAR" : keyword;
    els.disp.keyword.style.color = isLiar ? '#ff2e63' : '#222831';
    els.disp.msg.innerText = `주제: ${theme}`;
    
    bgm.currentTime = 0; bgm.play().catch(()=>{});
    setTimeout(()=>els.disp.cardInner.classList.add('flipped'), 500);
});


// --- 채팅, 턴, 투표, 결과 등 (기존 로직 유지) ---

function sendChat() { const t=els.inputs.chat.value.trim(); if(t){socket.emit('chatMessage',t); els.inputs.chat.value=''; els.inputs.chat.disabled=true;} }
els.btns.send.onclick=sendChat; els.inputs.chat.onkeypress=(e)=>{if(e.key==='Enter')sendChat()};

socket.on('message', (d)=>{
    if(d.userId){
        const b=$(`#b-${d.userId}`); if(b){b.innerText=d.text; b.style.opacity=1; setTimeout(()=>b.style.opacity=0,3000);}
        const p=document.createElement('div'); p.innerText=`${d.nickname}: ${d.text}`; els.disp.chat.appendChild(p); els.disp.chat.scrollTop=els.disp.chat.scrollHeight;
    } else { els.disp.msg.innerText=d.text; els.disp.msg.style.transform="scale(1.2)"; setTimeout(()=>els.disp.msg.style.transform="scale(1)",200); }
});

socket.on('turnChange', ({userId, nickname, duration})=>{
    document.querySelectorAll('.player-avatar').forEach(e=>e.classList.remove('active-turn'));
    const t=$(`#p-${userId}`); if(t) t.classList.add('active-turn');
    const isMe=(userId===socket.id);
    if(isMe){els.inputs.chat.disabled=false; els.btns.send.disabled=false; els.inputs.chat.placeholder="📢 당신 차례입니다!"; els.inputs.chat.focus();}
    else{els.inputs.chat.disabled=true; els.btns.send.disabled=true; els.inputs.chat.placeholder=`🔇 ${nickname}님이 발언 중...`;}
    els.disp.gaugeBox.classList.remove('hidden'); els.disp.gaugeBar.style.transition='none'; els.disp.gaugeBar.style.width='100%'; void els.disp.gaugeBar.offsetWidth; els.disp.gaugeBar.style.transition=`width ${duration}s linear`; els.disp.gaugeBar.style.width='0%';
});

socket.on('playerDied', (uid)=>{ const e=$(`#p-${uid}`); if(e){e.classList.add('dead-player'); e.classList.remove('active-turn');}});

socket.on('startVoting', (d)=>{
    els.disp.msg.innerText=d.msg; els.inputs.chat.disabled=true; els.disp.gaugeBox.classList.add('hidden');
    document.querySelectorAll('.player-avatar').forEach(el=>{
        el.classList.remove('active-turn');
        if(el.classList.contains('dead-player') || el.id===`p-${socket.id}`) return;
        el.classList.add('voting-target');
        el.onclick=function(){if(confirm(`[${this.innerText}]님을 지목하시겠습니까?`)){socket.emit('submitVote',this.id.replace('p-','')); document.querySelectorAll('.player-avatar').forEach(p=>{p.onclick=null; p.classList.remove('voting-target'); p.style.opacity=0.5;});}}
    });
});

socket.on('liarGuessTurn', ()=>{ setTimeout(()=>socket.emit('liarGuess', prompt('라이어 정답 입력')||""),500); });
socket.on('gameResult', ({msg, keyword, liarName})=>{ bgm.pause(); alert(`${msg}\n정답:${keyword}\n라이어:${liarName}`); });

// 게임 리셋 (대기실 상태 복귀)
socket.on('resetGameUI', ({ hostId }) => {
    els.disp.cardContainer.classList.add('hidden');
    els.disp.gaugeBox.classList.add('hidden');
    els.disp.msg.innerText = "다음 게임을 준비하세요";
    els.inputs.chat.disabled = true; els.inputs.chat.placeholder = "게임 대기 중..."; els.inputs.chat.value = "";
    
    document.querySelectorAll('.player-avatar').forEach(el => {
        el.classList.remove('dead-player', 'active-turn', 'voting-target', 'ready-state'); // ready-state도 제거
        const badge = el.querySelector('.ready-badge'); if(badge) badge.remove(); // 뱃지 제거
        el.style.opacity = 1; el.style.border = 'none'; el.onclick = null;
    });

    if (socket.id === hostId) {
        els.btns.start.classList.remove('hidden');
        readyBtn.classList.add('hidden');
    } else {
        els.btns.start.classList.add('hidden');
        readyBtn.classList.remove('hidden');
        readyBtn.innerText = '준비하기';
        readyBtn.classList.remove('cancel');
    }
});

socket.on('errorMessage', (msg)=>alert(msg));
els.btns.leave.onclick = () => location.reload();
function switchScreen(id) { Object.values(els.screens).forEach(s=>s.classList.add('hidden')); els.screens[id].classList.remove('hidden'); }