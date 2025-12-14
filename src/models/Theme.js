const Sequelize = require('sequelize');

class Theme extends Sequelize.Model {
  static initiate(sequelize) {
    Theme.init({
      theme_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
    }, {
      sequelize,
      timestamps: false, // 주제는 생성 시간 불필요
      modelName: 'Theme',
      tableName: 'Themes',
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.Theme.hasMany(db.Keyword, { foreignKey: 'theme_id', sourceKey: 'id' });
    db.Theme.hasMany(db.GameHistory, { foreignKey: 'theme_id', sourceKey: 'id' });
  }
}

module.exports = Theme;