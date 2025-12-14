const Sequelize = require('sequelize');

class GameResult extends Sequelize.Model {
  static initiate(sequelize) {
    GameResult.init({
      is_liar: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_win: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
    }, {
      sequelize,
      timestamps: false,
      modelName: 'GameResult',
      tableName: 'GameResult',
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.GameResult.belongsTo(db.GameHistory, { foreignKey: 'game_id', targetKey: 'id' });
    db.GameResult.belongsTo(db.User, { foreignKey: 'user_id', targetKey: 'id' });
  }
}

module.exports = GameResult;