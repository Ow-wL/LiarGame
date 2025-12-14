# 프로젝트 초기 설정 
npm init -y
npm install express socket.io mysql2 sequelize dotenv cors 
    express: 웹 서버 프레임워크
    socket.io: 실시간 통신 (라이어 게임의 핵심)
    mysql2: MySQL 드라이버
    sequelize: DB를 코드로 쉽게 다루기 위한 ORM 
    dotenv: 환경 변수 관리
    cors: 다른 도메인 간 통신 허용

# 노드몬 (수정 시 서버 자동 재실행)
npm install -D nodemon 

# 기본 Data Set 
node src/seed.js

# DB 설정 및 .env 설정!!

-----

# 개발용 실행 
npm run dev 

# 일반 배포용 실행 
npm run start 

