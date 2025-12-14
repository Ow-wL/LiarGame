module.exports = (sequelize, DataTypes) => {
    // 'User'라는 이름의 테이블 정의
    const User = sequelize.define('User', {
        username: { 
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true, // 아이디 중복 금지
        },
        password: { 
            type: DataTypes.STRING(100), // 암호화된 비번이라 길게 잡음
            allowNull: false,
        },
        nickname: { 
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true, // 닉네임 중복 금지
        }
    }, {
        timestamps: true, // 가입 시간(createdAt) 자동 기록
        tableName: 'Users'
    });
    return User;
};