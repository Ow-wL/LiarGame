const sequelize = require('../config/db'); // DB 연결 객체 가져오기

// 모델 클래스 가져오기
const User = require('./User');
const Theme = require('./Theme');
const Keyword = require('./Keyword');
const GameHistory = require('./GameHistory');
const GameResult = require('./GameResult');

const db = {};

// DB 객체에 모델 넣기
db.sequelize = sequelize;
db.User = User;
db.Theme = Theme;
db.Keyword = Keyword;
db.GameHistory = GameHistory;
db.GameResult = GameResult;

// 1. 모델 초기화 (initiate)
User.initiate(sequelize);
Theme.initiate(sequelize);
Keyword.initiate(sequelize);
GameHistory.initiate(sequelize);
GameResult.initiate(sequelize);

// 2. 관계 설정 (associate)
User.associate(db);
Theme.associate(db);
Keyword.associate(db);
GameHistory.associate(db);
GameResult.associate(db);

module.exports = db;