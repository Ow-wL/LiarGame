const Sequelize = require('sequelize');

class Keyword extends Sequelize.Model {
  static initiate(sequelize) {
    Keyword.init({
      word: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
    }, {
      sequelize,
      timestamps: false,
      modelName: 'Keyword',
      tableName: 'Keywords',
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.Keyword.belongsTo(db.Theme, { foreignKey: 'theme_id', targetKey: 'id' });
  }
}

module.exports = Keyword;