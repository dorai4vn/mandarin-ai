import type { Course, Lexeme } from '@mandarin/contracts';

/**
 * Starter content (D-012): a small course written for Mandarin AI — common beginner words with
 * Vietnamese meanings and short examples. Ordinary course/lexicon records (seeded into Postgres
 * by migration, served as a snapshot), never hard-coded into screens. HSK lists are not copied.
 */
export const STARTER_PROVENANCE =
  'Biên soạn riêng cho Mandarin AI (2026-11) để học nội bộ; từ cơ bản thông dụng, nghĩa và ví dụ do nhóm dự án viết. Không sao chép giáo trình có bản quyền.';

type Row = [
  id: string,
  simplified: string,
  traditional: string | null,
  pinyin: string,
  meaningVi: string,
  example: string | null,
  exampleVi: string | null,
];

const ROWS: Row[] = [
  // Chào hỏi
  [
    'lx-ni-hao',
    '你好',
    null,
    'nǐ hǎo',
    'xin chào',
    '你好，我叫小明。',
    'Xin chào, tôi tên là Tiểu Minh.',
  ],
  ['lx-xie-xie', '谢谢', '謝謝', 'xièxie', 'cảm ơn', '谢谢你！', 'Cảm ơn bạn!'],
  ['lx-bu-ke-qi', '不客气', '不客氣', 'bú kèqi', 'không có gì (đáp lời cảm ơn)', null, null],
  ['lx-zai-jian', '再见', '再見', 'zàijiàn', 'tạm biệt', '明天见，再见！', 'Mai gặp, tạm biệt!'],
  ['lx-dui-bu-qi', '对不起', '對不起', 'duìbuqǐ', 'xin lỗi', null, null],
  ['lx-mei-guan-xi', '没关系', '沒關係', 'méi guānxi', 'không sao', null, null],
  ['lx-qing', '请', '請', 'qǐng', 'mời; xin (lịch sự)', '请坐。', 'Mời ngồi.'],
  ['lx-jiao', '叫', null, 'jiào', 'gọi, tên là', '你叫什么名字？', 'Bạn tên là gì?'],
  ['lx-ming-zi', '名字', null, 'míngzi', 'tên', null, null],
  ['lx-shen-me', '什么', '什麼', 'shénme', 'cái gì', '这是什么？', 'Đây là cái gì?'],
  // Con người & gia đình
  ['lx-wo', '我', null, 'wǒ', 'tôi', '我是学生。', 'Tôi là học sinh.'],
  ['lx-ni', '你', null, 'nǐ', 'bạn', null, null],
  ['lx-ta-he', '他', null, 'tā', 'anh ấy', null, null],
  ['lx-ta-she', '她', null, 'tā', 'cô ấy', null, null],
  ['lx-men', '们', '們', 'men', 'các, những (số nhiều)', '我们是朋友。', 'Chúng tôi là bạn.'],
  ['lx-shi', '是', null, 'shì', 'là', null, null],
  ['lx-ren', '人', null, 'rén', 'người', '他是中国人。', 'Anh ấy là người Trung Quốc.'],
  ['lx-peng-you', '朋友', null, 'péngyou', 'bạn bè', null, null],
  ['lx-xue-sheng', '学生', '學生', 'xuésheng', 'học sinh, sinh viên', null, null],
  ['lx-lao-shi', '老师', '老師', 'lǎoshī', 'giáo viên', '王老师很好。', 'Thầy Vương rất tốt.'],
  ['lx-ba-ba', '爸爸', null, 'bàba', 'bố', null, null],
  ['lx-ma-ma', '妈妈', '媽媽', 'māma', 'mẹ', null, null],
  ['lx-jia', '家', null, 'jiā', 'nhà, gia đình', '我家有四口人。', 'Nhà tôi có bốn người.'],
  ['lx-you', '有', null, 'yǒu', 'có', null, null],
  ['lx-ai', '爱', '愛', 'ài', 'yêu', '我爱妈妈。', 'Con yêu mẹ.'],
  // Số đếm & thời gian
  ['lx-yi', '一', null, 'yī', 'một', null, null],
  ['lx-er', '二', null, 'èr', 'hai', null, null],
  ['lx-san', '三', null, 'sān', 'ba', null, null],
  ['lx-si', '四', null, 'sì', 'bốn', null, null],
  ['lx-wu', '五', null, 'wǔ', 'năm (số 5)', null, null],
  ['lx-liu', '六', null, 'liù', 'sáu', null, null],
  ['lx-qi', '七', null, 'qī', 'bảy', null, null],
  ['lx-ba', '八', null, 'bā', 'tám', null, null],
  ['lx-jiu', '九', null, 'jiǔ', 'chín', null, null],
  ['lx-shi-ten', '十', null, 'shí', 'mười', null, null],
  ['lx-ji', '几', '幾', 'jǐ', 'mấy (hỏi số lượng nhỏ)', '你几岁？', 'Bạn mấy tuổi?'],
  ['lx-tian', '天', null, 'tiān', 'ngày; trời', null, null],
  ['lx-jin-tian', '今天', null, 'jīntiān', 'hôm nay', '今天很热。', 'Hôm nay rất nóng.'],
  ['lx-ming-tian', '明天', null, 'míngtiān', 'ngày mai', null, null],
  ['lx-zuo-tian', '昨天', null, 'zuótiān', 'hôm qua', null, null],
  ['lx-nian', '年', null, 'nián', 'năm (thời gian)', null, null],
  ['lx-yue', '月', null, 'yuè', 'tháng; mặt trăng', null, null],
  ['lx-dian', '点', '點', 'diǎn', 'giờ (điểm giờ)', '现在三点。', 'Bây giờ là ba giờ.'],
  // Thiên nhiên & nơi chốn
  ['lx-shan', '山', null, 'shān', 'núi', '这座山很高。', 'Ngọn núi này rất cao.'],
  ['lx-shui', '水', null, 'shuǐ', 'nước', '我想喝水。', 'Tôi muốn uống nước.'],
  ['lx-huo', '火', null, 'huǒ', 'lửa', null, null],
  ['lx-mu', '木', null, 'mù', 'cây, gỗ', null, null],
  ['lx-ri', '日', null, 'rì', 'mặt trời; ngày', null, null],
  ['lx-yu', '雨', null, 'yǔ', 'mưa', '下雨了。', 'Trời mưa rồi.'],
  ['lx-zhong-guo', '中国', '中國', 'Zhōngguó', 'Trung Quốc', null, null],
  ['lx-bei-jing', '北京', null, 'Běijīng', 'Bắc Kinh', null, null],
  ['lx-xue-xiao', '学校', '學校', 'xuéxiào', 'trường học', null, null],
  ['lx-zai', '在', null, 'zài', 'ở, tại', '我在家。', 'Tôi ở nhà.'],
  ['lx-qu', '去', null, 'qù', 'đi (đến đâu)', '我去学校。', 'Tôi đi đến trường.'],
  ['lx-lai', '来', '來', 'lái', 'đến, lại đây', null, null],
  // Ăn uống
  ['lx-chi', '吃', null, 'chī', 'ăn', '你吃饭了吗？', 'Bạn ăn cơm chưa?'],
  ['lx-he', '喝', null, 'hē', 'uống', null, null],
  ['lx-fan', '饭', '飯', 'fàn', 'cơm, bữa ăn', null, null],
  ['lx-cha', '茶', null, 'chá', 'trà', '我喜欢喝茶。', 'Tôi thích uống trà.'],
  ['lx-mi-fan', '米饭', '米飯', 'mǐfàn', 'cơm (gạo nấu chín)', null, null],
  ['lx-xi-huan', '喜欢', '喜歡', 'xǐhuan', 'thích', null, null],
  ['lx-xiang', '想', null, 'xiǎng', 'muốn; nghĩ, nhớ', null, null],
  ['lx-duo-shao', '多少', null, 'duōshao', 'bao nhiêu', '这个多少钱？', 'Cái này bao nhiêu tiền?'],
  ['lx-qian', '钱', '錢', 'qián', 'tiền', null, null],
  ['lx-hao', '好', null, 'hǎo', 'tốt, hay', null, null],
  ['lx-hen', '很', null, 'hěn', 'rất', null, null],
];

export const STARTER_LEXEMES: Lexeme[] = ROWS.map(
  ([id, simplified, traditional, pinyin, meaningVi, example, exampleVi]) => ({
    id,
    simplified,
    traditional,
    pinyin,
    meaningVi,
    example,
    exampleVi,
  }),
);

const lesson = (id: string, ordinal: number, title: string, lexemeIds: string[]) => ({
  id,
  ordinal,
  title,
  lexemeIds,
});

export const STARTER_COURSE: Course = {
  id: 'course-khoi-dong',
  title: 'Khởi động tiếng Trung',
  level: 'Sơ cấp',
  description:
    'Khóa nhập môn nhỏ: chào hỏi, con người, số đếm, thời gian, nơi chốn và ăn uống — đủ để làm quen với chữ Hán, pinyin và cách học trong Mandarin AI.',
  provenance: STARTER_PROVENANCE,
  chapters: [
    {
      id: 'ch-1',
      ordinal: 1,
      title: 'Làm quen',
      lessons: [
        lesson('ls-1-1', 1, 'Chào hỏi', [
          'lx-ni-hao',
          'lx-xie-xie',
          'lx-bu-ke-qi',
          'lx-zai-jian',
          'lx-dui-bu-qi',
          'lx-mei-guan-xi',
          'lx-qing',
        ]),
        lesson('ls-1-2', 2, 'Tên và giới thiệu', [
          'lx-wo',
          'lx-ni',
          'lx-ta-he',
          'lx-ta-she',
          'lx-men',
          'lx-shi',
          'lx-jiao',
          'lx-ming-zi',
          'lx-shen-me',
        ]),
        lesson('ls-1-3', 3, 'Con người và gia đình', [
          'lx-ren',
          'lx-peng-you',
          'lx-xue-sheng',
          'lx-lao-shi',
          'lx-ba-ba',
          'lx-ma-ma',
          'lx-jia',
          'lx-you',
          'lx-ai',
        ]),
      ],
    },
    {
      id: 'ch-2',
      ordinal: 2,
      title: 'Số và thời gian',
      lessons: [
        lesson('ls-2-1', 1, 'Số đếm 1–10', [
          'lx-yi',
          'lx-er',
          'lx-san',
          'lx-si',
          'lx-wu',
          'lx-liu',
          'lx-qi',
          'lx-ba',
          'lx-jiu',
          'lx-shi-ten',
          'lx-ji',
        ]),
        lesson('ls-2-2', 2, 'Ngày tháng, giờ giấc', [
          'lx-tian',
          'lx-jin-tian',
          'lx-ming-tian',
          'lx-zuo-tian',
          'lx-nian',
          'lx-yue',
          'lx-dian',
        ]),
      ],
    },
    {
      id: 'ch-3',
      ordinal: 3,
      title: 'Thế giới quanh ta',
      lessons: [
        lesson('ls-3-1', 1, 'Thiên nhiên', [
          'lx-shan',
          'lx-shui',
          'lx-huo',
          'lx-mu',
          'lx-ri',
          'lx-yu',
          'lx-tian',
        ]),
        lesson('ls-3-2', 2, 'Nơi chốn, đi lại', [
          'lx-zhong-guo',
          'lx-bei-jing',
          'lx-xue-xiao',
          'lx-zai',
          'lx-qu',
          'lx-lai',
        ]),
        lesson('ls-3-3', 3, 'Ăn uống, mua bán', [
          'lx-chi',
          'lx-he',
          'lx-fan',
          'lx-cha',
          'lx-mi-fan',
          'lx-xi-huan',
          'lx-xiang',
          'lx-duo-shao',
          'lx-qian',
          'lx-hao',
          'lx-hen',
        ]),
      ],
    },
  ],
};
