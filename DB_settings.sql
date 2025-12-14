-- DB 생성 
create database liargame;
use liargame;

-- 1. 사용자 테이블
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 주제(카테고리) 테이블
CREATE TABLE Themes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    theme_name VARCHAR(50) NOT NULL COMMENT '예: 음식, 동물, 직업'
);

-- 3. 제시어 테이블 (주제와 1:N 관계)
CREATE TABLE Keywords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    theme_id INT NOT NULL,
    word VARCHAR(100) NOT NULL COMMENT '실제 제시어',
    FOREIGN KEY (theme_id) REFERENCES Themes(id) ON DELETE CASCADE
);

-- 4. 게임 이력 (한 판의 전체 정보)
CREATE TABLE GameHistory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    theme_id INT NOT NULL,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    winner_role ENUM('LIAR', 'CITIZEN') NOT NULL COMMENT '승리한 팀 (라이어팀 vs 시민팀)',
    FOREIGN KEY (theme_id) REFERENCES Themes(id)
);

-- 5. 게임 결과 상세 (유저별 역할 및 승패)
CREATE TABLE GameResult (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    user_id INT NOT NULL,
    is_liar BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'true면 라이어, false면 시민',
    is_win BOOLEAN NOT NULL COMMENT '개인 승리 여부',
    FOREIGN KEY (game_id) REFERENCES GameHistory(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- 확인 
desc users;
desc themes;
desc keywords;
desc gamehistory;
desc gameresult; 
select * from users;
select * from themes;
select * from keywords;
select * from gamehistory;
select * from gameresult;

SELECT t.theme_name, k.word 
FROM Themes t 
JOIN Keywords k ON t.id = k.theme_id;