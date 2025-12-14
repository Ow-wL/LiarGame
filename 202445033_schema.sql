DROP DATABASE liargame;

-- 테이블 만들기
CREATE DATABASE IF NOT EXISTS liargame;
USE liargame;

-- 1. Users 테이블 (사용자 정보)
CREATE TABLE IF NOT EXISTS Users (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(20) NOT NULL,
    password VARCHAR(100) NOT NULL,
    nickname VARCHAR(20) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY username_unique (username),
    UNIQUE KEY nickname_unique (nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Themes 테이블 (게임 주제)
CREATE TABLE IF NOT EXISTS Themes (
    id INT NOT NULL AUTO_INCREMENT,
    theme_name VARCHAR(20) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Keywords 테이블 (게임 제시어)
CREATE TABLE IF NOT EXISTS Keywords (
    id INT NOT NULL AUTO_INCREMENT,
    word VARCHAR(20) NOT NULL,
    theme_id INT NOT NULL,
    PRIMARY KEY (id),
    KEY theme_id_idx (theme_id),
    CONSTRAINT fk_theme_id FOREIGN KEY (theme_id) 
        REFERENCES Themes (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;