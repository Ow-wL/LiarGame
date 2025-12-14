const Sequelize = require('sequelize');

class GameHistory extends Sequelize.Model {
  static initiate(sequelize) {
    GameHistory.init({
      played_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      winner_role: {
        type: Sequelize.ENUM('LIAR', 'CITIZEN'),
        allowNull: false,
      },
    }, {
      sequelize,
      timestamps: false, // played_at을 직접 관리하므로 false
      modelName: 'GameHistory',
      tableName: 'GameHistory',
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.GameHistory.belongsTo(db.Theme, { foreignKey: 'theme_id', targetKey: 'id' });
    db.GameHistory.hasMany(db.GameResult, { foreignKey: 'game_id', sourceKey: 'id' });
  }
}

module.exports = GameHistory;