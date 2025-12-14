# 🕵️‍♂️ Real-time Liar Game (Node.js & Socket.io)

Node.js, Express, Socket.io, MySQL을 활용하여 개발한 실시간 멀티플레이어 라이어 게임입니다.
이 가이드는 **AWS EC2 (Ubuntu 24.04/22.04 LTS)** 환경에서 배포하고 실행하는 방법을 다룹니다.

## 📋 사전 요구 사항 (Prerequisites)

  * AWS EC2 인스턴스 (OS: Ubuntu 권장)
  * EC2 보안 그룹(Security Group) 설정: **3000번 포트(Custom TCP)** 개방 필수

-----

## 🚀 1. 서버 환경 설정 (EC2 접속 후)

터미널(Putty, Termius 등)로 EC2에 접속한 뒤, 아래 명령어를 순서대로 입력하여 환경을 구축합니다.

### 1-1. 시스템 업데이트 및 필수 패키지 설치

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install git -y
```

### 1-2. MySQL 설치 및 설정

```bash
# MySQL 서버 설치
sudo apt install mysql-server -y

# MySQL 접속 (비밀번호 없이 접속됨)
sudo mysql

# --- [MySQL 내부 SQL 명령어] ---
-- 1. root 계정 비밀번호 설정 ('1234' 부분에 원하는 비밀번호 입력)
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '1234';

-- 2. 데이터베이스 생성
CREATE DATABASE liargame;

-- 3. 적용 및 종료
FLUSH PRIVILEGES;
EXIT;
```

### 1-3. Node.js 설치 (NVM 사용 권장)

```bash
# NVM (Node Version Manager) 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 환경변수 적용 (또는 터미널 재접속)
source ~/.bashrc

# Node.js 최신 LTS 버전 설치
nvm install --lts

# 설치 확인
node -v
npm -v
```

-----

## 📥 2. 프로젝트 설치 (Installation)

### 2-1. 소스 코드 다운로드 (Git Clone)

```bash
# 깃허브에서 프로젝트 클론
git clone https://github.com/Ow-wL/LiarGame.git

# 프로젝트 폴더로 이동
cd LiarGame
```

### 2-2. 라이브러리 설치

```bash
npm install
```

-----

## ⚙️ 3. 설정 파일 수정 (Configuration)

GitHub에는 보안상 `config.json`이 올라가지 않거나, 로컬 설정으로 되어 있을 수 있습니다. EC2 환경에 맞게 수정해야 합니다.

### 3-1. config.json 생성/수정

```bash
# 편집기로 파일 열기
nano src/config/config.json
```

### 3-2. 내용 입력 (MySQL 비밀번호 일치시키기)

아래 내용을 복사해서 붙여넣고, **password** 부분을 아까 설정한 MySQL 비밀번호(예: 1234)로 변경하세요.

```json
{
  "development": {
    "username": "root",
    "password": "1234",
    "database": "liargame",
    "host": "127.0.0.1",
    "dialect": "mysql",
    "timezone": "+09:00"
  }
}
```

*(수정 후 저장: `Ctrl + O` 엔터 -\> `Ctrl + X` 종료)*

-----

## 🗄️ 4. 데이터베이스 초기화 (DB Setup)

서버 코드를 이용하여 테이블을 생성하고, 초기 데이터(주제, 제시어)를 넣습니다.

```bash
# 1. 서버를 잠시 실행하여 테이블 자동 생성 (Sequelize Sync)
# ("Executing (default): CREATE TABLE..." 로그가 뜨면 Ctrl+C로 종료)
node src/app.js

# 2. 초기 데이터(주제/제시어) 삽입 (Seed 실행)
node src/seed.js
```

-----

## ▶️ 5. 서버 실행 (Run Server)

### 5-1. 개발 모드 실행 (테스트용)

로그를 실시간으로 확인하고 싶을 때 사용합니다. 터미널을 끄면 서버도 꺼집니다.

```bash
npm start
```

### 5-2. 배포 모드 실행 (PM2 사용 - 추천)

터미널을 종료해도 서버가 계속 돌아가게 하려면 **PM2**를 사용합니다.

```bash
# PM2 전역 설치
npm install -g pm2

# 서버 실행 (app.js는 진입점 파일)
pm2 start src/app.js --name "liargame"

# 상태 확인
pm2 status

# (선택) 서버 재부팅 시 자동 실행 설정
pm2 startup
pm2 save
```

-----

## ❓ 문제 해결 (Troubleshooting)

1.  **접속이 안 돼요\!**

      * EC2 대시보드 -\> 보안 그룹(Security Group) -\> 인바운드 규칙 편집에서 **TCP 3000** 포트가 열려있는지 확인하세요. (소스: 0.0.0.0/0)
      * 브라우저 주소: `http://[EC2_퍼블릭_IP]:3000`

2.  **MySQL 에러 (`ER_NOT_SUPPORTED_AUTH_MODE` 등)**

      * `src/config/config.json`의 비밀번호가 맞는지 확인하세요.
      * MySQL 접속 후 `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '비밀번호';` 명령어를 다시 실행해보세요.

3.  **수정사항 업데이트**

      * 로컬에서 수정 후 GitHub에 Push -\> EC2에서 `git pull` -\> `pm2 restart liargame`