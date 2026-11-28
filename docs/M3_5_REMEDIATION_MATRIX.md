# M3.5 — Remediation matrix for 53 FAIL/UNCERTAIN active candidates

Status: **planning + zero-cost UI only.** No image generated, no workflow dispatched, no artwork promoted, no file/ledger changed. Source of truth: `apps/web/src/hanzi/artworkRemediation.json` (rendered in `/lab/visual-mnemonic`; filters by action). Audit verdicts are from `docs/M3_5_SEMANTIC_AUDIT.md` (single reviewer, not owner approval).

## Counts

| Action | Count | Cost |
|---|---|---|
| Thẻ ngữ cảnh (contextual teaching card, illustration unsuitable) | 41 | $0 |
| Đề xuất thay ảnh (replacement brief, owner review first) | 11 | est. $0.2145 (11 × $0.0195) |
| Giữ kèm chú thích (retain, defensible visual evidence) | 1 (说) | $0 |
| **Total** | **53** (9 FAIL + 44 UNCERTAIN) | |

193 preliminary-PASS candidates are untouched. Cards and captions are display-only: the candidate image stays visible and is still "chưa duyệt".

## Budget

Ledger cumulative estimate $4.9335 / $6 (estimate, not provider billing). Proposed 11 replacements: +$0.2145 → $5.148 / $6 (headroom $0.852). Costs are ledger estimates at $0.0195/image; no retries are budgeted (a failed paid call must be reported, not re-run automatically). Replacement needs: dataset brief revision for these 11 hanzi (new promptHash → the existing `--revise` path), a new owner-approved dispatch of the gated `mnemonic-art-production` workflow, and a re-QC. None of that is started.

## Matrix (53)

| # | Hanzi | Prelim | Action | Rationale | Card / caption |
|---|---|---|---|---|---|
| 4 | 吧 | UNCERTAIN | card | Rót trà mời gợi ý nhẹ nhàng; đúng bối cảnh nhưng không tách khỏi 请/给/呢 (cảnh mời tương tự). | 我们走吧。 Wǒmen zǒu ba. — Chúng ta đi thôi. |
| 6 | 百 | UNCERTAIN | replace | Đàn hạc giấy rất đông: "nhiều" chứ không xác minh "100"; trùng chủ thể hạc với 白/飞/非. | see brief below |
| 13 | 便 | UNCERTAIN | card | Quầy hàng trong tầm tay: "tiện lợi" mơ hồ, nhiều chi tiết. | 住在这里很方便。 Zhù zài zhèlǐ hěn fāngbiàn. — Ở đây rất tiện. |
| 31 | 得 | UNCERTAIN | card | Người chạy về đích dạy "đạt được"/跑得快, nhưng nghĩa chức năng (bổ ngữ trạng thái) không hiện qua ảnh. | 他跑得很快。 Tā pǎo de hěn kuài. — Anh ấy chạy rất nhanh. |
| 32 | 的 | FAIL | card | Bàn tay trao chìa khoá nhà: dạy 给/租 (trao/thuê), không dạy sở hữu 的; cấu trúc trùng 租 (#242). | 这是我的书。 Zhè shì wǒ de shū. — Đây là sách của tôi. |
| 34 | 第 | UNCERTAIN | card | Bục 3 bậc, huy chương đồng ở bậc giữa: thứ tự không rõ (bậc giữa cao nhất nhưng huy chương đồng = hạng 3). | 今天是第二天。 Jīntiān shì dì èr tiān. — Hôm nay là ngày thứ hai. |
| 40 | 对 | UNCERTAIN | card | Hai người đối diện ổn cho "đối diện"; dấu tích "đúng" bằng đũa không thấy trong ảnh. | 你说得对。 Nǐ shuō de duì. — Bạn nói đúng. |
| 47 | 非 | FAIL | card | Hai con hạc quay lưng, cánh dang: không gợi "không phải/phi"; trùng chủ thể với 飞 (hạc bay) nên dễ nhầm với 飞/白/百. Chủ sở hữu đã loại. | 非常好。 Fēicháng hǎo. — Rất tốt. |
| 53 | 个 | FAIL | card | Một quả hồng trên đĩa: vật tuỳ ý, không dạy lượng từ chung 个 (không có cặp danh từ-lượng từ nào). | 我有三个苹果。 Wǒ yǒu sān gè píngguǒ. — Tôi có ba quả táo. |
| 62 | 还 | FAIL | card | Nến + tách trà nguội: gợi "vẫn/còn" quá gián tiếp; học viên không đọc được nghĩa. | 我还有一个问题。 Wǒ hái yǒu yí gè wèntí. — Tôi còn một câu hỏi. |
| 64 | 汉 | UNCERTAIN | card | Sông + học giả đọc sách: "Hán" (sông Hán/dân tộc) gián tiếp. | 我学汉语。 Wǒ xué Hànyǔ. — Tôi học tiếng Trung (Hán ngữ). |
| 66 | 号 | UNCERTAIN | card | Chỉ thể hiện nghĩa "kèn"; thiếu nghĩa số/ngày (nghĩa chính của 号 khi học). | 今天几号？ Jīntiān jǐ hào? — Hôm nay mùng mấy? |
| 68 | 和 | UNCERTAIN | card | Hai bát cơm cạnh nhau ≈ 二 (#43) / 没 (#112); ý "và" không rõ. | 我和你是朋友。 Wǒ hé nǐ shì péngyou. — Tôi và bạn là bạn bè. |
| 69 | 很 | FAIL | card | Hoa hướng dương to: vật trang trí, không biểu đạt mức độ "rất"; không thể suy ra từ ảnh. | 今天很热。 Jīntiān hěn rè. — Hôm nay rất nóng. |
| 77 | 机 | UNCERTAIN | replace | Khung dệt cổ: "máy" đúng nghĩa rộng nhưng gợi nghề dệt hơn máy. | see brief below |
| 83 | 件 | UNCERTAIN | card | Một chiếc áo gấp: cặp 件-áo hợp lý nhưng ảnh không cho biết lượng từ; mức giống 个. | 我买了一件衣服。 Wǒ mǎi le yí jiàn yīfu. — Tôi đã mua một cái áo. |
| 86 | 今 | UNCERTAIN | replace | Lịch trống + bình minh: trùng motif lịch với 昨 (#243); "hôm nay" không phân biệt được. | see brief below |
| 87 | 九 | UNCERTAIN | replace | Núi nhiều lớp: không đếm được 9 lớp từ ảnh. | see brief below |
| 91 | 可 | UNCERTAIN | card | Cổng mở then nhấc: gần giống 开 (#89 cửa mở); ý "được phép" mơ hồ. | 我可以看吗？ Wǒ kěyǐ kàn ma? — Tôi xem được không? |
| 95 | 块 | UNCERTAIN | card | Miếng dưa hấu: gợi "miếng" nhưng không có tín hiệu 块 = đồng/cục. | 这个五块钱。 Zhège wǔ kuài qián. — Cái này năm đồng. |
| 101 | 两 | UNCERTAIN | card | Hai vòng ngọc tương tự 二 (#43); không phân biệt 两 (đếm vật) với 二. | 我要两个杯子。 Wǒ yào liǎng gè bēizi. — Tôi cần hai cái cốc. |
| 103 | 零 | UNCERTAIN | replace | Bát rỗng gợi "không" nhưng trùng 没 (#112 bát úp); mơ hồ giữa 0 và "không có". | see brief below |
| 104 | 六 | FAIL | replace | Tháp xửng hấp: đếm được 7 tầng, không phải 6 → sai số lượng, dễ gây nhầm 六/七. | see brief below |
| 111 | 么 | FAIL | card | Mèo con trong hộp: vật tuỳ ý (không liên quan 什么), lại trùng chủ thể với 猫/它/息. | 你要什么？ Nǐ yào shénme? — Bạn muốn gì? |
| 112 | 没 | UNCERTAIN | card | Bát úp rỗng hợp lý, nhưng trùng ý 零; "chưa" không thể hiện. | 我没有钱。 Wǒ méiyǒu qián. — Tôi không có tiền. |
| 124 | 呢 | UNCERTAIN | card | Lòng bàn tay mở mời đáp lại ("còn bạn thì sao?") hợp lý nhưng mơ hồ; cần chú thích ngữ cảnh. | 我很好，你呢？ Wǒ hěn hǎo, nǐ ne? — Tôi khoẻ, còn bạn thì sao? |
| 135 | 期 | FAIL | card | Bảy viên đá: dạy số 七 (trùng #134), không có tín hiệu "kỳ/thời kỳ". | 这个星期我很忙。 Zhège xīngqī wǒ hěn máng. — Tuần này tôi rất bận. |
| 138 | 千 | UNCERTAIN | replace | Hàng nghìn nến: gợi độ lớn nhưng không đếm/so sánh được với 百. | see brief below |
| 152 | 什 | UNCERTAIN | card | Hộp quà đóng + nét mặt thắc mắc ("bên trong là gì?") hợp lý nhưng chỉ là phần của 什么. | 你吃什么？ Nǐ chī shénme? — Bạn ăn gì? |
| 155 | 十 | UNCERTAIN | replace | Hình chữ thập (dạng chữ) đúng, nhưng đèn lồng ≈ 12, không phải 10. | see brief below |
| 157 | 识 | UNCERTAIN | card | Sách mở + nến + kính: gợi "biết/đọc" chung chung, trùng 知/读. | 我认识他。 Wǒ rènshi tā. — Tôi quen anh ấy. |
| 160 | 事 | UNCERTAIN | card | Đôi tay chạm khắc chim gỗ: "việc làm" chấp nhận được, khó suy ra "sự việc". | 你有什么事？ Nǐ yǒu shénme shì? — Bạn có việc gì? |
| 161 | 视 | UNCERTAIN | card | Tay che mắt nhìn núi: trùng 看 (#90), không phân biệt. | 我喜欢看电视。 Wǒ xǐhuan kàn diànshì. — Tôi thích xem tivi. |
| 162 | 是 | UNCERTAIN | card | Hai bóng người, hai tách giống nhau: gợi "đồng ý/là" rất mờ. | 我是学生。 Wǒ shì xuésheng. — Tôi là học sinh. |
| 167 | 说 | UNCERTAIN | retain | Hai người nói chuyện: trùng 话 (#72), 语 (#222), 呢/吧. | Hai người đối thoại, một người đang nói — minh hoạ hành động "nói" khá trực tiếp. Chỉ giữ làm ứng viên; thêm chú thích phân biệt: 说 = hành động nói, 话 = lời nói, 语 = ngôn ngữ. |
| 171 | 他 | UNCERTAIN | card | Bóng người đi về phía thành phố, quay lưng: không thể hiện "anh ấy"; trùng 去 (#142). | 他是我的老师。 Tā shì wǒ de lǎoshī. — Anh ấy là giáo viên của tôi. |
| 172 | 它 | UNCERTAIN | card | Mèo cam: trùng chủ thể với 猫 (#110); "nó (vật)" không phân biệt với con mèo. | 它是我的猫。 Tā shì wǒ de māo. — Nó là con mèo của tôi. |
| 175 | 题 | UNCERTAIN | card | Học sinh chống cằm trước cuộn giấy trống: gợi "suy nghĩ", chưa là "đề/câu hỏi". | 我有一个问题。 Wǒ yǒu yí gè wèntí. — Tôi có một câu hỏi. |
| 177 | 条 | UNCERTAIN | card | Con sông dài hẹp: đúng loại vật dài, nhưng không có cặp lượng từ rõ ràng. | 这条路很长。 Zhè tiáo lù hěn cháng. — Con đường này rất dài. |
| 187 | 五 | FAIL | replace | Bàn tay xoè 5 ngón nhưng cầm 4 quả quýt → số lượng mâu thuẫn (4 vs 5). | see brief below |
| 190 | 息 | UNCERTAIN | card | Mèo ngủ cạnh nến: gợi nghỉ ngơi nhưng chủ thể mèo trùng 猫/它/么. | 我们休息一下。 Wǒmen xiūxi yíxià. — Chúng ta nghỉ một lát. |
| 209 | 样 | UNCERTAIN | card | Hai bình gốm giống nhau: gợi "kiểu/giống" nhưng trùng 同 (#179). | 这个怎么样？ Zhège zěnmeyàng? — Cái này thế nào? |
| 211 | 也 | UNCERTAIN | card | Hai người cầm cùng ô đỏ đối xứng: ý "cũng" tinh tế, người học khó đọc. | 我也喜欢茶。 Wǒ yě xǐhuan chá. — Tôi cũng thích trà. |
| 215 | 宜 | UNCERTAIN | card | Cân có rau/xu: "rẻ/thích hợp" suy ra gián tiếp. | 这里的水果很便宜。 Zhèlǐ de shuǐguǒ hěn piányi. — Trái cây ở đây rất rẻ. |
| 220 | 有 | UNCERTAIN | card | Tay cầm đèn lồng trăng khuyết + túi táo: "có/sở hữu" chấp nhận được nhưng trăng khuyết gây nhiễu với 月. | 我有一只猫。 Wǒ yǒu yì zhī māo. — Tôi có một con mèo. |
| 222 | 语 | UNCERTAIN | card | Hai người trao đổi lời + sách thơ: gần 说/话; nghĩa "ngôn ngữ" mơ hồ. | 你会说汉语吗？ Nǐ huì shuō Hànyǔ ma? — Bạn biết nói tiếng Trung không? |
| 226 | 再 | UNCERTAIN | card | Vẫy tay tiễn trên thuyền đọc là 再见/tạm biệt hơn là "lại/nữa". | 明天再来。 Míngtiān zài lái. — Ngày mai lại đến. |
| 229 | 怎 | UNCERTAIN | card | Ngã ba đường: trùng 哪 (#119); "thế nào" khó suy ra. | 你怎么去学校？ Nǐ zěnme qù xuéxiào? — Bạn đến trường bằng cách nào? |
| 234 | 知 | UNCERTAIN | card | Cú mèo = biểu tượng trí tuệ kiểu phương Tây, không gắn trực tiếp với 知 (biết). | 我不知道。 Wǒ bù zhīdào. — Tôi không biết. |
| 235 | 只 | UNCERTAIN | card | Một chiếc thuyền lẻ loi gợi "chỉ" mơ hồ; trùng chủ đề "một vật lẻ" với 一/个/件. | 我只有一个哥哥。 Wǒ zhǐyǒu yí gè gēge. — Tôi chỉ có một anh trai. |
| 241 | 字 | UNCERTAIN | card | Trẻ viết lên trang giấy trống: không thấy chữ; trùng 学/写 (#207, #201). | 这个字怎么读？ Zhège zì zěnme dú? — Chữ này đọc thế nào? |
| 242 | 租 | UNCERTAIN | replace | Trao chìa khoá nhà: hợp lý cho "thuê" nhưng trùng 的 (#32) và 给 (#54). | see brief below |
| 243 | 昨 | UNCERTAIN | replace | Trang lịch lật + ghế trống: hợp lý nhưng trùng 今; khó phân biệt qua ảnh. | see brief below |

## Replacement briefs (11) — for owner review, not executed

Each brief is a proposed new `artwork.brief`; the pipeline appends its global style/thumbnail prompt. Acceptance criteria are checked by a human on a 533×400 render and by contact-sheet uniqueness review.

### 百 (trăm)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. A large fully readable grid of 10 rows by 10 columns of small identical paper boats on a calm pond, top view, neat and regular so a viewer can see 10x10.
- Accept: Regular 10x10 lattice visible (100 items)
- Accept: No cranes (collision with 白/飞/非 removed)
- Accept: Reads as "a hundred = ten tens", not just "many"

### 机 (máy)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. A simple wooden machine with a crank handle, visible interlocking gears and a belt, on a workshop table, no weaving frame or loom.
- Accept: Gears + crank read as "machine"
- Accept: No loom/textile elements
- Accept: Different from 车 and 电 scenes

### 今 (nay, hôm nay)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. One person drinking morning tea on a sunlit balcony as the sun is rising right now, steam visible, the present moment, no calendar.
- Accept: No calendar object
- Accept: Sunrise + present-moment action
- Accept: Visibly different from 昨 scene (no footprints, no faded sun)

### 九 (chín)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. Nine identical red paper lanterns hung in a single horizontal row of nine evenly spaced, clearly countable, under a wooden eave.
- Accept: Exactly 9 lanterns, single row, countable on 533x400
- Accept: Different object from 十/六 scenes
- Accept: No partially hidden lanterns

### 零 (số không)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. A thermometer-style glass tube standing in snow at exactly the zero mark, frost on the glass, soft winter light; the zero mark clearly aligned with the liquid level.
- Accept: Liquid level clearly at the zero mark
- Accept: Winter/frost cue supports 零下 (below zero) example
- Accept: No empty bowls (collision with 没 removed)

### 六 (sáu)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. Exactly six identical bamboo steamer baskets stacked in one vertical tower on a kitchen counter, all six rim lines clearly visible, steam rising from the top.
- Accept: Count of stacked tiers is exactly 6 on a 533x400 render
- Accept: No second tower or extra baskets that could change the count
- Accept: Not reused for 七/八 scenes

### 千 (nghìn)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. Ten large panels each containing a regular 10x10 grid of tiny dots, arranged in two rows of five, as an abstract-but-concrete picture of one thousand dots.
- Accept: Ten blocks of 100 dots each
- Accept: Visibly larger than 百 scene, same lattice language
- Accept: No candles (collision with 灯/火 scenes removed)

### 十 (mười)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. Ten round tangerines arranged in two rows of five on a plain wooden tray, top view, each tangerine fully visible.
- Accept: Exactly 10 items in a 2x5 grid
- Accept: Items fully visible and countable
- Accept: Different from 五 (no hand) and from 九 (no lanterns)

### 五 (năm)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. A single open hand with exactly five clearly separated fingers held up in front of a market stall, empty palm, no objects held.
- Accept: Exactly 5 fingers visible, one hand only
- Accept: No held objects (removes the earlier 4-vs-5 contradiction)
- Accept: Hand clearly distinct from 手 (#163) pilot scene: gesture "5", not a hand study

### 租 (thuê)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. A landlord counting coins from a tenant at a small timber house door, a key on a string on the table between them, a house with a visible rent-sign shape but no legible text.
- Accept: Coins plus key plus house all present (rental, not gifting)
- Accept: No bare hand-to-hand key giving only (collision with 给 removed)
- Accept: No readable text

### 昨 (hôm qua)
- Prompt: Premium editorial illustration, warm natural light. No text, no letters, no numerals, no signage in the image. Footprints on a sandy path leading away from the viewer toward a setting sun, the previous day left behind, an empty folded blanket on a bench.
- Accept: Receding footprints and sunset (past)
- Accept: No calendar object
- Accept: Visibly different from 今 scene (low light, warm dusk, no steam)

## Notes / limits

- Teaching-card sentences are simple HSK-1-level phrases written for this review; the owner/a native reviewer should confirm wording before any promotion.
- 零 proposes a thermometer-at-zero scene supporting 零下; it is the weakest brief (abstract) and may be better as a card if owner prefers.
- No historical/etymology claims are made.
