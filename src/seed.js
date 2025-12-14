// src/seed.js
const { sequelize, Theme, Keyword } = require('./models');

const data = [
  {
    category: '음식',
    words: ['김치찌개', '치킨', '탕수육', '비빔밥', '초밥', '햄버거', '라면', '피자', '떡볶이', '삼겹살'],
  },
  {
    category: '동물',
    words: ['사자', '호랑이', '기린', '코끼리', '펭귄', '독수리', '판다', '강아지', '고양이', '토끼'],
  },
  {
    category: '직업',
    words: ['개발자', '의사', '경찰', '소방관', '선생님', '요리사', '변호사', '연예인', '운동선수', '대통령'],
  },
];

async function seed() {
  try {
    // 1. DB 연결 확인 및 테이블 생성 (없으면 생성)
    await sequelize.sync({ force: false });
    console.log('DB 연결 성공, 데이터 주입을 시작합니다...');

    // 2. 기존 데이터가 있다면 중복을 막기 위해 초기화할지 결정
    // (여기서는 편의상 Keywords와 Themes를 싹 비우고 다시 채웁니다)
    // 외래키 제약조건 때문에 Keywords(자식) 먼저 지우고 Themes(부모)를 지워야 함
    await Keyword.destroy({ where: {}, truncate: true }); // truncate: id를 1번부터 리셋
    // 주의: Themes를 지우려면 외래키 체크를 잠시 꺼야 할 수도 있음. 
    // 여기서는 간단하게 destroy만 사용
    await Theme.destroy({ where: {} }); 

    // 3. 데이터 루프 돌면서 넣기
    for (const group of data) {
      // (1) 주제(Theme) 생성
      const theme = await Theme.create({ theme_name: group.category });
      console.log(`주제 생성 완료: ${group.category} (ID: ${theme.id})`);

      // (2) 해당 주제의 단어(Keyword)들 생성
      for (const wordText of group.words) {
        await Keyword.create({
          theme_id: theme.id, // 위에서 만든 주제의 ID를 연결
          word: wordText,
        });
      }
    }

    console.log('✅ 모든 데이터 주입이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 데이터 주입 중 에러 발생:', error);
  } finally {
    // 4. 연결 종료
    await sequelize.close();
  }
}

seed();