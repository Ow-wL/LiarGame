module.exports = (sequelize, DataTypes) => {
    const Theme = sequelize.define('Theme', {
        theme_name: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
    }, {
        timestamps: false, // 생성일/수정일 기록 안 함
        tableName: 'Themes',
    });
    return Theme;
};