const Sequelize = require('sequelize');

class User extends Sequelize.Model {
  static initiate(sequelize) {
    User.init({
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      nickname: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
    }, {
      sequelize,
      timestamps: true, // created_at, updated_at 자동 생성
      modelName: 'User',
      tableName: 'Users',
      paranoid: false, // 삭제 시 진짜로 지움 (soft delete 아님)
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    // 유저 1명은 여러 게임 결과(GameResult)를 가짐
    db.User.hasMany(db.GameResult, { foreignKey: 'user_id', sourceKey: 'id' });
  }
}

module.exports = User;