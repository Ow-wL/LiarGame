module.exports = (sequelize, DataTypes) => {
    const Keyword = sequelize.define('Keyword', {
        word: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        theme_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }
    }, {
        timestamps: false,
        tableName: 'Keywords',
    });
    return Keyword;
};