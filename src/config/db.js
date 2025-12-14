const Sequelize = require('sequelize');
require('dotenv').config(); // .env 파일 불러오기

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: process.env.DB_PORT,
    logging: false, // 콘솔에 SQL 로그 너무 많이 찍히는 것 방지
    timezone: "+09:00", // 한국 시간 설정
  }
);

module.exports = sequelize;