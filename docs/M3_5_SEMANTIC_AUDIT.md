# M3.5 — Semantic audit of 246 active artwork candidates

Status: **audit only** — nothing promoted, no regeneration, no spend, ledger and image files untouched. Head audited: `22191b5`.

## Method and limits

- Every one of the 246 `apps/web/public/mnemonic-candidates/*.webp` files was opened and viewed by the auditor in labelled contact sheets (5×4, each tile downscaled from 1600×1200 to 320×240). Dataset meaning/category from `apps/web/src/hanzi/beginner200.json`.
- Counts (六/七/八/九/十/五) were re-checked on 533×400 renders. Fine detail (hands, text) below ~320 px was **not** inspected; no image contains legible text.
- PASS = scene directly conveys the dataset meaning (or the character structure) and is not duplicated by another character. UNCERTAIN = plausible but indirect/ambiguous or collides with another character's scene. FAIL = arbitrary/misleading or numerically wrong.
- This is one reviewer's judgement, not a learner test. PASS rows are not owner-approved.

## Counts

| Verdict | Count |
|---|---|
| PASS | 193 |
| UNCERTAIN | 44 |
| FAIL | 9 |
| Total | 246 |

| Type | PASS | UNCERTAIN | FAIL |
|---|---|---|---|
| hình dạng chữ | 28 | 2 | 2 |
| ngữ nghĩa | 149 | 23 | 2 |
| chức năng/ngữ pháp | 16 | 19 | 5 |

## Per-character report

| # | Hanzi | Pinyin | Meaning | Kind | Mnemonic type | Verdict | File | Evidence / rationale |
|---|---|---|---|---|---|---|---|---|
| 1 | 爱 | ài | yêu | contextual | ngữ nghĩa | PASS | ai-love.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 2 | 八 | bā | tám | contextual | hình dạng chữ | PASS | ba-eight.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 3 | 爸 | bà | bố | concrete | ngữ nghĩa | PASS | ba-dad.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 4 | 吧 | ba | trợ từ gợi ý, đề nghị (thôi, nhé) | contextual | chức năng/ngữ pháp | UNCERTAIN | ba-suggest.webp | Rót trà mời gợi ý nhẹ nhàng; đúng bối cảnh nhưng không tách khỏi 请/给/呢 (cảnh mời tương tự). |
| 5 | 白 | bái | trắng | concrete | ngữ nghĩa | PASS | bai-white.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 6 | 百 | bǎi | trăm | contextual | ngữ nghĩa | UNCERTAIN | bai-hundred.webp | Đàn hạc giấy rất đông: "nhiều" chứ không xác minh "100"; trùng chủ thể hạc với 白/飞/非. |
| 7 | 班 | bān | lớp học, ca làm | contextual | ngữ nghĩa | PASS | ban-class.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 8 | 半 | bàn | một nửa, rưỡi | concrete | ngữ nghĩa | PASS | ban-half.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 9 | 包 | bāo | túi, bọc, bánh bao | concrete | ngữ nghĩa | PASS | bao-bag.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 10 | 杯 | bēi | cốc, ly | concrete | ngữ nghĩa | PASS | bei-cup.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 11 | 本 | běn | quyển, gốc | concrete | hình dạng chữ | PASS | ben-volume.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 12 | 边 | biān | bên, cạnh | concrete | ngữ nghĩa | PASS | bian-side.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 13 | 便 | biàn | tiện, thuận tiện | contextual | ngữ nghĩa | UNCERTAIN | bian-handy.webp | Quầy hàng trong tầm tay: "tiện lợi" mơ hồ, nhiều chi tiết. |
| 14 | 病 | bìng | bệnh, ốm | concrete | ngữ nghĩa | PASS | bing-sick.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 15 | 不 | bù | không | contextual | chức năng/ngữ pháp | PASS | bu-not.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 16 | 菜 | cài | rau, món ăn | concrete | ngữ nghĩa | PASS | cai-vegetable.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 17 | 茶 | chá | trà | concrete | ngữ nghĩa | PASS | cha-tea.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 18 | 常 | cháng | thường, hay | contextual | ngữ nghĩa | PASS | chang-often.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 19 | 唱 | chàng | hát | concrete | ngữ nghĩa | PASS | chang-sing.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 20 | 超 | chāo | vượt, siêu | concrete | ngữ nghĩa | PASS | chao-overtake.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 21 | 车 | chē | xe | concrete | ngữ nghĩa | PASS | che-vehicle.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 22 | 吃 | chī | ăn | concrete | ngữ nghĩa | PASS | chi-eat.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 23 | 出 | chū | ra, xuất | concrete | ngữ nghĩa | PASS | chu-exit.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 24 | 穿 | chuān | mặc, xuyên qua | concrete | ngữ nghĩa | PASS | chuan-wear.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 25 | 床 | chuáng | giường | concrete | ngữ nghĩa | PASS | chuang-bed.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 26 | 打 | dǎ | đánh, chơi, gọi | concrete | ngữ nghĩa | PASS | da-hit.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 27 | 大 | dà | to, lớn | concrete | hình dạng chữ | PASS | da-big.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 28 | 蛋 | dàn | trứng | concrete | ngữ nghĩa | PASS | dan-egg.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 29 | 到 | dào | đến, tới | contextual | ngữ nghĩa | PASS | dao-arrive.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 30 | 道 | dào | đường, đạo | concrete | ngữ nghĩa | PASS | dao-road.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 31 | 得 | de | trợ từ bổ ngữ (đạt được) | contextual | chức năng/ngữ pháp | UNCERTAIN | de-gain.webp | Người chạy về đích dạy "đạt được"/跑得快, nhưng nghĩa chức năng (bổ ngữ trạng thái) không hiện qua ảnh. |
| 32 | 的 | de | của (trợ từ) | contextual | chức năng/ngữ pháp | FAIL | de-possessive.webp | Bàn tay trao chìa khoá nhà: dạy 给/租 (trao/thuê), không dạy sở hữu 的; cấu trúc trùng 租 (#242). |
| 33 | 弟 | dì | em trai | concrete | ngữ nghĩa | PASS | di-younger-brother.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 34 | 第 | dì | thứ (số thứ tự) | contextual | chức năng/ngữ pháp | UNCERTAIN | di-ordinal.webp | Bục 3 bậc, huy chương đồng ở bậc giữa: thứ tự không rõ (bậc giữa cao nhất nhưng huy chương đồng = hạng 3). |
| 35 | 点 | diǎn | điểm, giờ, chấm | concrete | ngữ nghĩa | PASS | dian-point.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 36 | 电 | diàn | điện | concrete | ngữ nghĩa | PASS | dian-lightning.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 37 | 东 | dōng | phía đông | concrete | hình dạng chữ | PASS | dong-east.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 38 | 都 | dōu | đều | contextual | chức năng/ngữ pháp | PASS | dou-all.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 39 | 读 | dú | đọc | concrete | ngữ nghĩa | PASS | du-read.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 40 | 对 | duì | đúng, đối diện | contextual | chức năng/ngữ pháp | UNCERTAIN | dui-correct.webp | Hai người đối diện ổn cho "đối diện"; dấu tích "đúng" bằng đũa không thấy trong ảnh. |
| 41 | 多 | duō | nhiều | concrete | ngữ nghĩa | PASS | duo-many.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 42 | 儿 | ér | con, hậu tố nhỏ | concrete | chức năng/ngữ pháp | PASS | er-child.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 43 | 二 | èr | hai | contextual | hình dạng chữ | PASS | er-two.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 44 | 饭 | fàn | cơm, bữa ăn | concrete | ngữ nghĩa | PASS | fan-meal.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 45 | 房 | fáng | nhà, phòng | concrete | ngữ nghĩa | PASS | fang-house.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 46 | 飞 | fēi | bay | concrete | ngữ nghĩa | PASS | fei-fly.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 47 | 非 | fēi | không phải, phi | contextual | ngữ nghĩa | FAIL | fei-not.webp | Hai con hạc quay lưng, cánh dang: không gợi "không phải/phi"; trùng chủ thể với 飞 (hạc bay) nên dễ nhầm với 飞/白/百. Chủ sở hữu đã loại. |
| 48 | 分 | fēn | phút, chia | concrete | ngữ nghĩa | PASS | fen-divide.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 49 | 服 | fú | quần áo, phục | concrete | ngữ nghĩa | PASS | fu-clothes.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 50 | 高 | gāo | cao | concrete | hình dạng chữ | PASS | gao-tall.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 51 | 哥 | gē | anh trai | concrete | ngữ nghĩa | PASS | ge-older-brother.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 52 | 歌 | gē | bài hát | concrete | ngữ nghĩa | PASS | ge-song.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 53 | 个 | gè | cái (lượng từ chung) | contextual | chức năng/ngữ pháp | FAIL | ge-piece.webp | Một quả hồng trên đĩa: vật tuỳ ý, không dạy lượng từ chung 个 (không có cặp danh từ-lượng từ nào). |
| 54 | 给 | gěi | cho, đưa | contextual | ngữ nghĩa | PASS | gei-give.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 55 | 工 | gōng | công việc, thợ | concrete | ngữ nghĩa | PASS | gong-work.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 56 | 公 | gōng | công, chung, ông | concrete | ngữ nghĩa | PASS | gong-public.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 57 | 狗 | gǒu | chó | concrete | ngữ nghĩa | PASS | gou-dog.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 58 | 关 | guān | đóng | concrete | ngữ nghĩa | PASS | guan-close.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 59 | 贵 | guì | đắt, quý | concrete | ngữ nghĩa | PASS | gui-costly.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 60 | 国 | guó | nước, quốc gia | concrete | ngữ nghĩa | PASS | guo-country.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 61 | 果 | guǒ | quả, trái cây | concrete | ngữ nghĩa | PASS | guo-fruit.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 62 | 还 | hái | vẫn, còn | contextual | chức năng/ngữ pháp | FAIL | hai-still.webp | Nến + tách trà nguội: gợi "vẫn/còn" quá gián tiếp; học viên không đọc được nghĩa. |
| 63 | 孩 | hái | trẻ con | concrete | ngữ nghĩa | PASS | hai-kid.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 64 | 汉 | hàn | Hán, người Hán | contextual | ngữ nghĩa | UNCERTAIN | han-han.webp | Sông + học giả đọc sách: "Hán" (sông Hán/dân tộc) gián tiếp. |
| 65 | 好 | hǎo | tốt, ngon | concrete | hình dạng chữ | PASS | hao-good.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 66 | 号 | hào | số, ngày, kèn | concrete | chức năng/ngữ pháp | UNCERTAIN | hao-number.webp | Chỉ thể hiện nghĩa "kèn"; thiếu nghĩa số/ngày (nghĩa chính của 号 khi học). |
| 67 | 喝 | hē | uống | concrete | ngữ nghĩa | PASS | he-drink.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 68 | 和 | hé | và, với | contextual | chức năng/ngữ pháp | UNCERTAIN | he-and.webp | Hai bát cơm cạnh nhau ≈ 二 (#43) / 没 (#112); ý "và" không rõ. |
| 69 | 很 | hěn | rất | contextual | chức năng/ngữ pháp | FAIL | hen-very.webp | Hoa hướng dương to: vật trang trí, không biểu đạt mức độ "rất"; không thể suy ra từ ảnh. |
| 70 | 后 | hòu | phía sau | concrete | ngữ nghĩa | PASS | hou-behind.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 71 | 候 | hòu | chờ, lúc | contextual | ngữ nghĩa | PASS | hou-wait.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 72 | 话 | huà | lời nói | concrete | ngữ nghĩa | PASS | hua-speech.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 73 | 欢 | huān | vui | concrete | ngữ nghĩa | PASS | huan-joy.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 74 | 回 | huí | về, quay lại | concrete | ngữ nghĩa | PASS | hui-return.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 75 | 会 | huì | biết, sẽ | contextual | ngữ nghĩa | PASS | hui-can.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 76 | 火 | huǒ | lửa | concrete | hình dạng chữ | PASS | huo-fire.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 77 | 机 | jī | máy | concrete | ngữ nghĩa | UNCERTAIN | ji-machine.webp | Khung dệt cổ: "máy" đúng nghĩa rộng nhưng gợi nghề dệt hơn máy. |
| 78 | 鸡 | jī | gà | concrete | ngữ nghĩa | PASS | ji-chicken.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 79 | 几 | jǐ | mấy | contextual | chức năng/ngữ pháp | PASS | ji-how-many.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 80 | 家 | jiā | nhà, gia đình | concrete | hình dạng chữ | PASS | jia-home.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 81 | 间 | jiān | gian, giữa, khoảng | concrete | hình dạng chữ | PASS | jian-between.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 82 | 见 | jiàn | thấy, gặp | concrete | ngữ nghĩa | PASS | jian-meet.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 83 | 件 | jiàn | cái, món (lượng từ) | concrete | chức năng/ngữ pháp | UNCERTAIN | jian-item.webp | Một chiếc áo gấp: cặp 件-áo hợp lý nhưng ảnh không cho biết lượng từ; mức giống 个. |
| 84 | 叫 | jiào | gọi, tên là | concrete | ngữ nghĩa | PASS | jiao-call.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 85 | 姐 | jiě | chị gái | concrete | ngữ nghĩa | PASS | jie-older-sister.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 86 | 今 | jīn | nay, hôm nay | contextual | ngữ nghĩa | UNCERTAIN | jin-today.webp | Lịch trống + bình minh: trùng motif lịch với 昨 (#243); "hôm nay" không phân biệt được. |
| 87 | 九 | jiǔ | chín | contextual | hình dạng chữ | UNCERTAIN | jiu-nine.webp | Núi nhiều lớp: không đếm được 9 lớp từ ảnh. |
| 88 | 觉 | jué | cảm thấy, ngủ | contextual | ngữ nghĩa | PASS | jue-feel.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 89 | 开 | kāi | mở | concrete | ngữ nghĩa | PASS | kai-open.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 90 | 看 | kàn | nhìn, xem | concrete | hình dạng chữ | PASS | kan-look.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 91 | 可 | kě | có thể, khả | contextual | chức năng/ngữ pháp | UNCERTAIN | ke-can.webp | Cổng mở then nhấc: gần giống 开 (#89 cửa mở); ý "được phép" mơ hồ. |
| 92 | 客 | kè | khách | concrete | ngữ nghĩa | PASS | ke-guest.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 93 | 课 | kè | bài học, tiết học | concrete | ngữ nghĩa | PASS | ke-lesson.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 94 | 口 | kǒu | miệng | concrete | hình dạng chữ | PASS | kou-mouth.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 95 | 块 | kuài | miếng, cục, đồng | concrete | chức năng/ngữ pháp | UNCERTAIN | kuai-chunk.webp | Miếng dưa hấu: gợi "miếng" nhưng không có tín hiệu 块 = đồng/cục. |
| 96 | 来 | lái | đến | contextual | ngữ nghĩa | PASS | lai-come.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 97 | 老 | lǎo | già, cũ | concrete | ngữ nghĩa | PASS | lao-old.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 98 | 了 | le | rồi (trợ từ) | contextual | chức năng/ngữ pháp | PASS | le-completed.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 99 | 冷 | lěng | lạnh | concrete | ngữ nghĩa | PASS | leng-cold.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 100 | 里 | lǐ | trong | concrete | ngữ nghĩa | PASS | li-inside.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 101 | 两 | liǎng | hai (đếm đồ vật) | contextual | ngữ nghĩa | UNCERTAIN | liang-two-items.webp | Hai vòng ngọc tương tự 二 (#43); không phân biệt 两 (đếm vật) với 二. |
| 102 | 亮 | liàng | sáng | concrete | ngữ nghĩa | PASS | liang-bright.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 103 | 零 | líng | số không | contextual | ngữ nghĩa | UNCERTAIN | ling-zero.webp | Bát rỗng gợi "không" nhưng trùng 没 (#112 bát úp); mơ hồ giữa 0 và "không có". |
| 104 | 六 | liù | sáu | contextual | hình dạng chữ | FAIL | liu-six.webp | Tháp xửng hấp: đếm được 7 tầng, không phải 6 → sai số lượng, dễ gây nhầm 六/七. |
| 105 | 妈 | mā | mẹ | concrete | ngữ nghĩa | PASS | ma-mom.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 106 | 吗 | ma | không? (hỏi) | contextual | chức năng/ngữ pháp | PASS | ma-question.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 107 | 买 | mǎi | mua | concrete | ngữ nghĩa | PASS | mai-buy.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 108 | 卖 | mài | bán | concrete | ngữ nghĩa | PASS | mai-sell.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 109 | 忙 | máng | bận | concrete | ngữ nghĩa | PASS | mang-busy.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 110 | 猫 | māo | mèo | concrete | ngữ nghĩa | PASS | mao-cat.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 111 | 么 | me | (hậu tố trong 什么) | contextual | chức năng/ngữ pháp | FAIL | me-what-suffix.webp | Mèo con trong hộp: vật tuỳ ý (không liên quan 什么), lại trùng chủ thể với 猫/它/息. |
| 112 | 没 | méi | không có, chưa | contextual | chức năng/ngữ pháp | UNCERTAIN | mei-not-have.webp | Bát úp rỗng hợp lý, nhưng trùng ý 零; "chưa" không thể hiện. |
| 113 | 妹 | mèi | em gái | concrete | ngữ nghĩa | PASS | mei-younger-sister.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 114 | 们 | men | (hậu tố số nhiều) | contextual | chức năng/ngữ pháp | PASS | men-plural.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 115 | 米 | mǐ | gạo | concrete | ngữ nghĩa | PASS | mi-rice.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 116 | 面 | miàn | mì, mặt | concrete | ngữ nghĩa | PASS | mian-noodles.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 117 | 名 | míng | tên | concrete | ngữ nghĩa | PASS | ming-name.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 118 | 明 | míng | sáng, ngày mai | concrete | hình dạng chữ | PASS | ming-bright.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 119 | 哪 | nǎ | nào, đâu | contextual | chức năng/ngữ pháp | PASS | na-which.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 120 | 那 | nà | kia, đó | contextual | chức năng/ngữ pháp | PASS | na-that.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 121 | 奶 | nǎi | sữa, bà | concrete | ngữ nghĩa | PASS | nai-milk.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 122 | 男 | nán | nam, con trai | contextual | ngữ nghĩa | PASS | nan-man.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 123 | 脑 | nǎo | não, đầu óc | concrete | ngữ nghĩa | PASS | nao-brain.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 124 | 呢 | ne | thế? (hỏi lại) | contextual | chức năng/ngữ pháp | UNCERTAIN | ne-and-you.webp | Lòng bàn tay mở mời đáp lại ("còn bạn thì sao?") hợp lý nhưng mơ hồ; cần chú thích ngữ cảnh. |
| 125 | 能 | néng | có thể | contextual | ngữ nghĩa | PASS | neng-able.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 126 | 你 | nǐ | bạn, anh/chị | contextual | ngữ nghĩa | PASS | ni-you.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 127 | 年 | nián | năm, tuổi | concrete | ngữ nghĩa | PASS | nian-year.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 128 | 您 | nín | ngài, ông/bà (kính ngữ) | contextual | ngữ nghĩa | PASS | nin-polite.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 129 | 牛 | niú | bò, trâu | concrete | ngữ nghĩa | PASS | niu-ox.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 130 | 女 | nǚ | nữ, con gái | concrete | ngữ nghĩa | PASS | nu-woman.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 131 | 朋 | péng | bạn | concrete | hình dạng chữ | PASS | peng-companion.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 132 | 漂 | piào | đẹp (trong 漂亮) | concrete | ngữ nghĩa | PASS | piao-pretty.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 133 | 苹 | píng | táo (trong 苹果) | concrete | ngữ nghĩa | PASS | ping-apple-part.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 134 | 七 | qī | bảy | contextual | hình dạng chữ | PASS | qi-seven.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 135 | 期 | qī | kỳ, thời kỳ | contextual | ngữ nghĩa | FAIL | qi-period.webp | Bảy viên đá: dạy số 七 (trùng #134), không có tín hiệu "kỳ/thời kỳ". |
| 136 | 起 | qǐ | dậy, lên | concrete | ngữ nghĩa | PASS | qi-rise.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 137 | 气 | qì | khí, hơi | concrete | ngữ nghĩa | PASS | qi-air.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 138 | 千 | qiān | nghìn | contextual | ngữ nghĩa | UNCERTAIN | qian-thousand.webp | Hàng nghìn nến: gợi độ lớn nhưng không đếm/so sánh được với 百. |
| 139 | 前 | qián | phía trước | concrete | ngữ nghĩa | PASS | qian-front.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 140 | 钱 | qián | tiền | concrete | ngữ nghĩa | PASS | qian-money.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 141 | 请 | qǐng | mời, xin | concrete | ngữ nghĩa | PASS | qing-please.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 142 | 去 | qù | đi | contextual | ngữ nghĩa | PASS | qu-go.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 143 | 热 | rè | nóng | concrete | ngữ nghĩa | PASS | re-hot.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 144 | 人 | rén | người | concrete | hình dạng chữ | PASS | ren-person.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 145 | 认 | rèn | nhận ra, quen | contextual | ngữ nghĩa | PASS | ren-recognise.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 146 | 日 | rì | mặt trời, ngày | concrete | hình dạng chữ | PASS | ri-sun.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 147 | 三 | sān | ba | contextual | hình dạng chữ | PASS | san-three.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 148 | 商 | shāng | thương mại, buôn bán | concrete | ngữ nghĩa | PASS | shang-trade.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 149 | 上 | shàng | trên, lên | concrete | ngữ nghĩa | PASS | shang-up.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 150 | 少 | shǎo | ít | concrete | ngữ nghĩa | PASS | shao-few.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 151 | 谁 | shéi | ai | contextual | chức năng/ngữ pháp | PASS | shei-who.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 152 | 什 | shén | gì (trong 什么) | contextual | chức năng/ngữ pháp | UNCERTAIN | shen-what-part.webp | Hộp quà đóng + nét mặt thắc mắc ("bên trong là gì?") hợp lý nhưng chỉ là phần của 什么. |
| 153 | 生 | shēng | sinh, sống | concrete | ngữ nghĩa | PASS | sheng-grow.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 154 | 师 | shī | thầy, sư phạm | concrete | ngữ nghĩa | PASS | shi-teacher.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 155 | 十 | shí | mười | contextual | hình dạng chữ | UNCERTAIN | shi-ten.webp | Hình chữ thập (dạng chữ) đúng, nhưng đèn lồng ≈ 12, không phải 10. |
| 156 | 时 | shí | giờ, lúc | concrete | ngữ nghĩa | PASS | shi-time.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 157 | 识 | shí | biết, nhận biết | contextual | ngữ nghĩa | UNCERTAIN | shi-know.webp | Sách mở + nến + kính: gợi "biết/đọc" chung chung, trùng 知/读. |
| 158 | 士 | shì | sĩ, chiến sĩ, binh | concrete | ngữ nghĩa | PASS | shi-soldier.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 159 | 市 | shì | chợ, thành phố | concrete | ngữ nghĩa | PASS | shi-market.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 160 | 事 | shì | việc, sự việc | contextual | ngữ nghĩa | UNCERTAIN | shi-matter.webp | Đôi tay chạm khắc chim gỗ: "việc làm" chấp nhận được, khó suy ra "sự việc". |
| 161 | 视 | shì | nhìn, thị | concrete | ngữ nghĩa | UNCERTAIN | shi-look.webp | Tay che mắt nhìn núi: trùng 看 (#90), không phân biệt. |
| 162 | 是 | shì | là, vâng | contextual | chức năng/ngữ pháp | UNCERTAIN | shi-be.webp | Hai bóng người, hai tách giống nhau: gợi "đồng ý/là" rất mờ. |
| 163 | 手 | shǒu | tay | concrete | hình dạng chữ | PASS | shou-hand.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 164 | 书 | shū | sách | concrete | ngữ nghĩa | PASS | shu-book.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 165 | 水 | shuǐ | nước | concrete | hình dạng chữ | PASS | shui-water.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 166 | 睡 | shuì | ngủ | concrete | ngữ nghĩa | PASS | shui-sleep.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 167 | 说 | shuō | nói | concrete | ngữ nghĩa | UNCERTAIN | shuo-speak.webp | Hai người nói chuyện: trùng 话 (#72), 语 (#222), 呢/吧. |
| 168 | 司 | sī | quản lý, tài xế | contextual | ngữ nghĩa | PASS | si-driver.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 169 | 四 | sì | bốn | contextual | hình dạng chữ | PASS | si-four.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 170 | 岁 | suì | tuổi | concrete | ngữ nghĩa | PASS | sui-age.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 171 | 他 | tā | anh ấy, ông ấy | contextual | ngữ nghĩa | UNCERTAIN | ta-he.webp | Bóng người đi về phía thành phố, quay lưng: không thể hiện "anh ấy"; trùng 去 (#142). |
| 172 | 它 | tā | nó (vật, con vật) | concrete | ngữ nghĩa | UNCERTAIN | ta-it.webp | Mèo cam: trùng chủ thể với 猫 (#110); "nó (vật)" không phân biệt với con mèo. |
| 173 | 她 | tā | cô ấy, bà ấy | contextual | ngữ nghĩa | PASS | ta-she.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 174 | 太 | tài | quá | contextual | chức năng/ngữ pháp | PASS | tai-too-much.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 175 | 题 | tí | đề, câu hỏi | contextual | ngữ nghĩa | UNCERTAIN | ti-question.webp | Học sinh chống cằm trước cuộn giấy trống: gợi "suy nghĩ", chưa là "đề/câu hỏi". |
| 176 | 天 | tiān | trời, ngày | contextual | ngữ nghĩa | PASS | tian-sky.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 177 | 条 | tiáo | cái, con (vật dài) | concrete | chức năng/ngữ pháp | UNCERTAIN | tiao-strip.webp | Con sông dài hẹp: đúng loại vật dài, nhưng không có cặp lượng từ rõ ràng. |
| 178 | 听 | tīng | nghe | concrete | ngữ nghĩa | PASS | ting-listen.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 179 | 同 | tóng | cùng, giống | concrete | ngữ nghĩa | PASS | tong-same.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 180 | 外 | wài | ngoài | concrete | hình dạng chữ | PASS | wai-outside.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 181 | 玩 | wán | chơi | concrete | ngữ nghĩa | PASS | wan-play.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 182 | 晚 | wǎn | tối, muộn | concrete | ngữ nghĩa | PASS | wan-evening.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 183 | 喂 | wèi | alô, cho ăn | concrete | ngữ nghĩa | PASS | wei-feed.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 184 | 文 | wén | văn, chữ viết | concrete | ngữ nghĩa | PASS | wen-writing.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 185 | 问 | wèn | hỏi | concrete | ngữ nghĩa | PASS | wen-ask.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 186 | 我 | wǒ | tôi, tớ | contextual | ngữ nghĩa | PASS | wo-i-me.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 187 | 五 | wǔ | năm | contextual | hình dạng chữ | FAIL | wu-five.webp | Bàn tay xoè 5 ngón nhưng cầm 4 quả quýt → số lượng mâu thuẫn (4 vs 5). |
| 188 | 午 | wǔ | trưa | contextual | ngữ nghĩa | PASS | wu-noon.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 189 | 西 | xī | phía tây | concrete | hình dạng chữ | PASS | xi-west.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 190 | 息 | xī | nghỉ, hơi thở | contextual | ngữ nghĩa | UNCERTAIN | xi-rest.webp | Mèo ngủ cạnh nến: gợi nghỉ ngơi nhưng chủ thể mèo trùng 猫/它/么. |
| 191 | 习 | xí | học, tập | contextual | ngữ nghĩa | PASS | xi-practise.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 192 | 喜 | xǐ | vui, thích | contextual | ngữ nghĩa | PASS | xi-happy.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 193 | 系 | xì | hệ, liên hệ, buộc | contextual | ngữ nghĩa | PASS | xi-tie.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 194 | 下 | xià | dưới, xuống | concrete | ngữ nghĩa | PASS | xia-down.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 195 | 先 | xiān | trước, trước tiên | contextual | chức năng/ngữ pháp | PASS | xian-first.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 196 | 现 | xiàn | hiện, bây giờ | contextual | ngữ nghĩa | PASS | xian-now.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 197 | 想 | xiǎng | nghĩ, muốn, nhớ | contextual | ngữ nghĩa | PASS | xiang-think.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 198 | 小 | xiǎo | nhỏ | concrete | ngữ nghĩa | PASS | xiao-small.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 199 | 校 | xiào | trường học | concrete | ngữ nghĩa | PASS | xiao-school.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 200 | 些 | xiē | một vài, một số | concrete | ngữ nghĩa | PASS | xie-some.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 201 | 写 | xiě | viết | concrete | ngữ nghĩa | PASS | xie-write.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 202 | 谢 | xiè | cảm ơn | concrete | ngữ nghĩa | PASS | xie-thanks.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 203 | 新 | xīn | mới | concrete | ngữ nghĩa | PASS | xin-new.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 204 | 星 | xīng | ngôi sao | concrete | ngữ nghĩa | PASS | xing-star.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 205 | 兴 | xìng | hứng thú, vui | contextual | ngữ nghĩa | PASS | xing-delight.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 206 | 休 | xiū | nghỉ ngơi | concrete | hình dạng chữ | PASS | xiu-rest.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 207 | 学 | xué | học | concrete | ngữ nghĩa | PASS | xue-study.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 208 | 雪 | xuě | tuyết | concrete | ngữ nghĩa | PASS | xue-snow.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 209 | 样 | yàng | kiểu, dạng | contextual | ngữ nghĩa | UNCERTAIN | yang-kind.webp | Hai bình gốm giống nhau: gợi "kiểu/giống" nhưng trùng 同 (#179). |
| 210 | 要 | yào | muốn, cần | contextual | ngữ nghĩa | PASS | yao-want.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 211 | 也 | yě | cũng | contextual | chức năng/ngữ pháp | UNCERTAIN | ye-also.webp | Hai người cầm cùng ô đỏ đối xứng: ý "cũng" tinh tế, người học khó đọc. |
| 212 | 一 | yī | một | contextual | hình dạng chữ | PASS | yi-one.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 213 | 衣 | yī | áo, quần áo | concrete | ngữ nghĩa | PASS | yi-clothes.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 214 | 医 | yī | y học, bác sĩ | contextual | ngữ nghĩa | PASS | yi-doctor.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 215 | 宜 | yí | thích hợp | contextual | ngữ nghĩa | UNCERTAIN | yi-suitable.webp | Cân có rau/xu: "rẻ/thích hợp" suy ra gián tiếp. |
| 216 | 以 | yǐ | dùng, để, bằng | contextual | chức năng/ngữ pháp | PASS | yi-use.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 217 | 椅 | yǐ | ghế | concrete | ngữ nghĩa | PASS | yi-chair.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 218 | 影 | yǐng | bóng, phim | concrete | ngữ nghĩa | PASS | ying-shadow.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 219 | 友 | yǒu | bạn bè | concrete | ngữ nghĩa | PASS | you-friend.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 220 | 有 | yǒu | có | contextual | chức năng/ngữ pháp | UNCERTAIN | you-have.webp | Tay cầm đèn lồng trăng khuyết + túi táo: "có/sở hữu" chấp nhận được nhưng trăng khuyết gây nhiễu với 月. |
| 221 | 雨 | yǔ | mưa | concrete | hình dạng chữ | PASS | yu-rain.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 222 | 语 | yǔ | ngôn ngữ | concrete | ngữ nghĩa | UNCERTAIN | yu-language.webp | Hai người trao đổi lời + sách thơ: gần 说/话; nghĩa "ngôn ngữ" mơ hồ. |
| 223 | 元 | yuán | đồng (tiền), đầu | concrete | ngữ nghĩa | PASS | yuan-coin.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 224 | 院 | yuàn | sân, viện | concrete | ngữ nghĩa | PASS | yuan-courtyard.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 225 | 月 | yuè | mặt trăng, tháng | concrete | hình dạng chữ | PASS | yue-moon.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 226 | 再 | zài | lại, nữa | contextual | chức năng/ngữ pháp | UNCERTAIN | zai-again.webp | Vẫy tay tiễn trên thuyền đọc là 再见/tạm biệt hơn là "lại/nữa". |
| 227 | 在 | zài | ở, đang | contextual | chức năng/ngữ pháp | PASS | zai-at.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 228 | 早 | zǎo | sớm | concrete | hình dạng chữ | PASS | zao-early.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 229 | 怎 | zěn | sao, thế nào | contextual | chức năng/ngữ pháp | UNCERTAIN | zen-how.webp | Ngã ba đường: trùng 哪 (#119); "thế nào" khó suy ra. |
| 230 | 找 | zhǎo | tìm | concrete | ngữ nghĩa | PASS | zhao-search.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 231 | 这 | zhè | này, đây | contextual | chức năng/ngữ pháp | PASS | zhe-this.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 232 | 真 | zhēn | thật | contextual | ngữ nghĩa | PASS | zhen-real.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 233 | 正 | zhèng | đúng, chính, đang | contextual | chức năng/ngữ pháp | PASS | zheng-upright.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 234 | 知 | zhī | biết | contextual | ngữ nghĩa | UNCERTAIN | zhi-know.webp | Cú mèo = biểu tượng trí tuệ kiểu phương Tây, không gắn trực tiếp với 知 (biết). |
| 235 | 只 | zhǐ | chỉ | contextual | chức năng/ngữ pháp | UNCERTAIN | zhi-only.webp | Một chiếc thuyền lẻ loi gợi "chỉ" mơ hồ; trùng chủ đề "một vật lẻ" với 一/个/件. |
| 236 | 中 | zhōng | giữa, trung | concrete | ngữ nghĩa | PASS | zhong-middle.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 237 | 钟 | zhōng | chuông, đồng hồ | concrete | ngữ nghĩa | PASS | zhong-bell.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 238 | 住 | zhù | ở, sống | concrete | ngữ nghĩa | PASS | zhu-live.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 239 | 桌 | zhuō | bàn | concrete | ngữ nghĩa | PASS | zhuo-table.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 240 | 子 | zǐ | con, đứa trẻ | concrete | ngữ nghĩa | PASS | zi-child.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 241 | 字 | zì | chữ | concrete | ngữ nghĩa | UNCERTAIN | zi-character.webp | Trẻ viết lên trang giấy trống: không thấy chữ; trùng 学/写 (#207, #201). |
| 242 | 租 | zū | thuê | contextual | ngữ nghĩa | UNCERTAIN | zu-rent.webp | Trao chìa khoá nhà: hợp lý cho "thuê" nhưng trùng 的 (#32) và 给 (#54). |
| 243 | 昨 | zuó | hôm qua | contextual | ngữ nghĩa | UNCERTAIN | zuo-yesterday.webp | Trang lịch lật + ghế trống: hợp lý nhưng trùng 今; khó phân biệt qua ảnh. |
| 244 | 作 | zuò | làm, tác phẩm | concrete | ngữ nghĩa | PASS | zuo-make.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 245 | 坐 | zuò | ngồi | concrete | ngữ nghĩa | PASS | zuo-sit.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |
| 246 | 做 | zuò | làm | concrete | ngữ nghĩa | PASS | zuo-do.webp | Cảnh mô tả trực tiếp nghĩa trong dataset và không trùng chủ thể với ký tự khác. |

## Root cause

1. The briefs were written one-per-character with a "one object" template; for abstract/function words (的 个 很 还 么 非 …) the generator had no concrete referent and produced a decorative object (persimmon, sunflower, candle, kitten) — technically valid art, zero mnemonic value.
2. Briefs were never checked for collisions: cranes (白 百 飞 非), empty bowls (零 没), calendars (今 昨), key hand-over (的 租 给), talking pairs (说 话 语), cats (猫 它 么 息).
3. Quantity briefs were not machine-checked against the image (六 shows 7 tiers, 五 shows 4 tangerines, 十 ≈ 12 lanterns). Automated QC verified format/checksum only, not content.

## Proposed remediation (for owner review — nothing executed)

| Action | Characters | Est. cost (@ $0.0195/image, ledger estimate) |
|---|---|---|
| A. Replace with a contextual teaching card (example phrase + gloss, **no illustration**) for pure function words | 的 个 很 还 么 非 得 了 吧 呢 什 也 和 是 可 对 再 只 件 块 条 号 (≈22) | $0 |
| B. Regenerate with corrected brief (count fixes, de-duplication) | 六 五 期 + UNCERTAIN concrete scenes 九 十 百 千 两 零 没 今 昨 第 租 视 它 他 息 字 (≈18) | ≈ $0.35 |
| C. Keep, add owner-visible caption/disambiguation | remaining UNCERTAIN | $0 |

Budget check: ledger cumulative estimate $4.9335 / $6 → headroom $1.0665 ≈ 54 images. Worst case (regenerate all 9 FAIL + 44 UNCERTAIN = 53) ≈ $1.03 would leave ~$0.03; option A+B above is ≈ $0.35 and recommended. Any spend needs a new owner-approved batch through the existing gated workflow (`mnemonic-art-pilot`, main-only, owner dispatch); none is performed here.
