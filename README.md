# 🕵️‍♂️ Real-time Liar Game (Dockerized)

Node.js, Socket.io, MySQL을 활용하여 개발한 실시간 멀티플레이어 라이어 게임입니다.
**AWS EC2 (Amazon Linux 2023)** 환경에서 **Docker & Docker Compose**를 사용하여 배포되었습니다.

## 🛠 Tech Stack

  * **Frontend:** HTML5, CSS3, Vanilla JavaScript
  * **Backend:** Node.js, Express, Socket.io
  * **Database:** MySQL (8.0), Sequelize ORM
  * **DevOps:** Docker, Docker Compose, AWS EC2

-----

## 📋 Database Schema (ERD)

  * **Users:** 사용자 정보 (아이디, 비밀번호, 닉네임)
  * **Themes:** 게임 주제 (예: 음식, 동물)
  * **Keywords:** 주제별 제시어 (1:N 관계)

-----

## 🚀 Installation & Deployment (AWS EC2 + Docker)

이 가이드는 **Amazon Linux 2023** 환경을 기준으로 작성되었습니다.

### 1\. 사전 준비 (Prerequisites)

서버에 접속하여 필수 패키지(Git, Docker, Docker Compose)를 설치하고, **Buildx 최신 버전**을 수동으로 업데이트해야 합니다. (Amazon Linux 기본 패키지 버전 호환성 문제 해결)

```bash
# 1. 시스템 업데이트 및 Git/Docker 설치
sudo yum update -y
sudo yum install git docker -y

# 2. Docker 실행 및 권한 부여
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# 3. Docker Compose 설치 (최신 버전)
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Docker Buildx 플러그인 수동 업데이트 (중요: v0.19.3 이상 필수)
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/buildx/releases/download/v0.19.3/buildx-v0.19.3.linux-amd64 -o ~/.docker/cli-plugins/docker-buildx
chmod +x ~/.docker/cli-plugins/docker-buildx

# (권한 적용을 위해 터미널 재접속 권장)
```

### 2\. 프로젝트 설정 (Setup)

```bash
# 1. 프로젝트 클론
git clone <YOUR_GITHUB_REPO_URL>
cd LiarGame

# 2. 설정 파일 생성
nano src/config/config.json
```

**`src/config/config.json`** 내용을 아래와 같이 작성합니다.

> **주의:** Docker 내부 통신이므로 host는 반드시 `"db"`여야 합니다.

```json
{
  "development": {
    "username": "root",
    "password": "1234",
    "database": "liargame",
    "host": "db",
    "dialect": "mysql",
    "timezone": "+09:00"
  }
}
```

### 3\. 서버 실행 (Run with Docker)

```bash
# 빌드 및 백그라운드 실행
docker-compose up -d --build

# 실행 상태 확인
docker-compose ps
```

### 4\. 데이터베이스 초기화 (Data Seeding)

컨테이너가 실행된 상태에서 초기 데이터(주제, 제시어)를 삽입합니다.

```bash
# 실행 중인 app 컨테이너 내부에서 스크립트 실행
docker-compose exec app node src/seed.js
```

### 5\. 접속 확인

브라우저에서 `http://[EC2-Public-IP]:3000` 으로 접속합니다.

-----

## ⚠️ Troubleshooting (이슈 해결 기록)

개발 및 배포 과정에서 발생했던 주요 이슈와 해결 방법입니다.

### 1\. AWS Security Group (접속 불가)

  * **증상:** 서버는 켜져 있으나 브라우저에서 `Connection refused` 또는 무한 로딩 발생.
  * **해결:** AWS EC2 보안 그룹(Security Group) 인바운드 규칙에 **TCP 3000 (0.0.0.0/0)** 추가.

### 2\. Docker Buildx Version Error

  * **증상:** `docker-compose up` 시 `compose build requires buildx 0.17 or later` 에러 발생.
  * **원인:** Amazon Linux yum 저장소의 기본 buildx 버전이 낮음.
  * **해결:** GitHub 릴리즈에서 최신 바이너리를 직접 다운로드하여 `~/.docker/cli-plugins/`에 설치함.

### 3\. Case Sensitivity (대소문자 구분)

  * **증상:** 로컬(Windows)에서는 잘 되는데, Docker/EC2(Linux)에서 `Cannot find module './user'` 에러 발생.
  * **원인:** Windows는 대소문자를 구분하지 않지만, Linux는 구분함 (`User.js` \!= `user.js`).
  * **해결:** `src/models/` 내부의 파일명을 모두 소문자(`user.js`, `theme.js` 등)로 통일하고 코드의 `require` 경로도 소문자로 수정.

### 4\. Database Connection

  * **증상:** Docker 실행 시 DB 연결 실패.
  * **해결:** `config.json`의 host를 `localhost`가 아닌 Docker Service Name인 \*\*`"db"`\*\*로 설정.