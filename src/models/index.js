const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config.json')[env];
const db = {};

// 1. Sequelize 연결 객체 생성
const sequelize = new Sequelize(config.database, config.username, config.password, config);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// 2. 모델 불러오기 (제가 드린 User.js와 호환되는 방식)
db.User = require('./User')(sequelize, Sequelize);
db.Theme = require('./Theme')(sequelize, Sequelize);
db.Keyword = require('./Keyword')(sequelize, Sequelize);
// db.GameHistory = require('./gameHistory')(sequelize, Sequelize);
// db.GameResult = require('./gameResult')(sequelize, Sequelize);

// 3. 관계 설정 (associate)
// 각 모델 파일 안에 associate 함수가 있다면 실행
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.Theme.hasMany(db.Keyword, { foreignKey: 'theme_id', sourceKey: 'id' });
db.Keyword.belongsTo(db.Theme, { foreignKey: 'theme_id', targetKey: 'id' });

module.exports = db;