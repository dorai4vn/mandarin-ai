// Dữ liệu lịch sử chữ Hán — M3.5 (PRD-03). CHỈ chứa các giai đoạn có nguồn kiểm tra được.
// Hình vector là bản vẽ lại (redraw) của các contributor Wikimedia Commons từ các cơ sở dữ liệu cổ văn tự;
// KHÔNG phải ảnh chụp bản gốc và KHÔNG được sinh/nội suy trong dự án. Xem docs/HANZI_HISTORY_SOURCES.md.
import type { HanziHistory } from './types';

export const HANZI_HISTORY: Record<string, HanziHistory> = {
  山: {
    glyph: '山',
    meaningVi: 'núi',
    stages: [
      {
        id: 'oracle',
        label: 'Giáp cốt văn',
        period: 'Thương (~thế kỷ 13–11 TCN)',
        periodShort: '~13–11 TCN',
        sortYear: -1300,
        status: 'attested',
        svg: {
          viewBox: '0 0 300 300',
          d: 'm 16.444762,258.73905 c -3.756101,-3.75612 0.659381,-23.46836 3.635,-34.71706 L 54.811209,92.727136 c 0.970465,-6.945661 2.381537,-14.409663 4.469022,-16.142097 7.531714,-6.25076 11.892318,0.9651 27.158482,27.313971 l 22.625307,38.23335 38.1332,-88.646214 c 3.71802,-8.643077 10.96843,-14.714302 18.34218,-13.187202 5.07494,1.051019 5.22951,3.848938 7.98088,13.34326 0,0 14.47103,88.653546 14.4044,88.501226 l 48.09758,-49.380964 c 2.44079,-8.048025 6.01719,-13.469925 11.59232,-13.469925 6.96715,0 10.49681,8.274938 10.49681,24.608739 0,19.86057 18.83553,124.63023 23.33588,129.80203 5.54995,6.37798 4.49702,13.15015 -2.45553,15.79351 -3.39456,1.29062 -60.87555,3.10859 -127.73557,4.03991 l -121.674468,2.71324 c -3.066683,3.06671 -10.527254,5.09877 -13.13694,2.48908 z M 179.76373,231.21373 157.60865,75.006169 C 135.32158,126.96682 112.71482,180.27943 99.779967,231.90072 Z M 100.36548,166.78961 68.801245,118.92537 39.128583,232.09338 78.098228,231.68499 Z m 158.60288,63.53976 -20.37313,-114.61617 -47.0116,53.91662 8.55071,61.52781 z',
        },
        evidence: {
          sourceTitle: 'File:山-oracle.svg',
          sourceUrl: 'https://commons.wikimedia.org/wiki/File:山-oracle.svg',
          licence: 'Public domain (theo nhãn Wikimedia Commons)',
          licenceUrl: 'https://commons.wikimedia.org/wiki/File:山-oracle.svg',
          contributor: 'Wargaz (Wikimedia Commons)',
          retrievedOn: '2026-11-26',
          sha256: '21a08b3b031b6df86cdd834b879f343dc677b897f1da2f393106d97df67979f5',
          provenance:
            'Bản vẽ vector; ghi chú trong tệp nguồn: tham chiếu 合5431 (Hợp tập giáp cốt). Chưa đối chiếu độc lập với bản dập gốc.',
          reviewStatus: 'pending_owner_review',
        },
      },
      {
        id: 'bronze',
        label: 'Kim văn',
        period: 'Tây Chu – Xuân Thu (~thế kỷ 11–5 TCN)',
        periodShort: '~11–5 TCN',
        sortYear: -1100,
        status: 'attested',
        svg: {
          viewBox: '0 0 300 300',
          d: 'M 19.428207,214.98504 C 10.547563,204.11005 30.016237,139.36638 38.470753,101.43192 C 40.153055,90.058803 37.158512,70.96642 57.067027,95.901654 C 75.263747,120.47469 83.893073,127.86519 103.51488,149.65557 C 119.74656,130.62978 131.46718,105.01008 139.46807,81.254908 C 143.21781,49.114044 183.47339,136.9575 195.5604,153.04002 C 212.76374,130.76998 221.59039,110.0584 230.10003,91.60844 C 241.00105,71.134311 239.2241,81.395665 254.60173,124.58003 C 257.30332,133.89498 269.35777,188.3891 275.29102,196.14586 C 294.08551,210.51801 272.9898,219.22798 263.8104,220.40891 C 234.26946,225.08464 177.68554,224.56422 147.87243,225.75842 C 98.516901,220.66617 26.68023,223.86566 19.428207,214.98504 z M 252.28845,195.40735 C 251.61055,176.94596 245.49892,158.99072 240.49515,141.00576 C 235.29877,122.30458 231.12902,131.00154 219.84015,150.69535 C 194.31349,181.4707 194.6193,183.40586 188.33333,177.11858 C 177.20173,161.79495 162.24496,114.66971 149.06676,110.00012 C 132.63084,131.93014 118.62975,159.6696 99.982974,179.83598 C 84.758655,170.15967 68.982524,132.07292 50.680255,125.8618 C 48.642169,143.15046 41.003742,153.59873 39.882752,171.11175 C 40.601725,179.82291 32.920016,191.52765 41.079854,197.91278 C 54.047799,202.92114 80.032527,204.03581 139.43837,205.43323 C 160.15191,202.58096 241.69434,209.67316 252.28845,195.40735 z',
        },
        evidence: {
          sourceTitle: 'File:山-bronze.svg',
          sourceUrl: 'https://commons.wikimedia.org/wiki/File:山-bronze.svg',
          licence: 'Public domain (theo nhãn Wikimedia Commons)',
          licenceUrl: 'https://commons.wikimedia.org/wiki/File:山-bronze.svg',
          contributor: 'Yug (Wikimedia Commons)',
          retrievedOn: '2026-11-26',
          sha256: 'fe694d7639fb2c6f3b46bc9f294abfd320d9095c5dc227c890be895a8c95830a',
          provenance:
            'Bản vẽ vector; tệp nguồn tham chiếu hình b14270 trong dữ liệu hanziyuan.net. Chưa đối chiếu độc lập với bản dập gốc.',
          reviewStatus: 'pending_owner_review',
        },
      },
      {
        id: 'seal',
        label: 'Tiểu triện (Thuyết văn)',
        period: 'Tần – Hán (~thế kỷ 3 TCN – 2 SCN)',
        periodShort: '~3 TCN–2 SCN',
        sortYear: -300,
        status: 'attested',
        svg: {
          viewBox: '0 0 300 300',
          d: 'm 137.08336,284.87481 c -17.41416,-0.55932 -35.1165,-4.975 -47.616724,-16.13783 -11.156665,-9.96302 -12.654447,-28.84586 -13.90656,-43.53543 -1.629337,-60.33846 -1.029189,-94.28575 -1.11539,-162.752275 -0.06754,-3.935038 1.407292,-23.181551 6.29504,-20.810571 5.221379,2.53282 5.211029,15.683952 5.335047,59.118486 l 0.291401,102.05574 c 0.03917,13.72025 0.952164,28.14481 3.607761,41.00251 18.559225,-14.99585 51.357385,-38.8541 54.730825,-58.95042 0.25419,-1.51425 0.48295,-38.17382 0.5703,-81.45589 l 0.15884,-78.694671 c 0.0135,-6.678185 5.11973,-14.1989 10.63922,-6.385511 0.92995,1.316423 1.09106,12.317524 1.48824,81.283509 0.27506,47.759993 0.68871,82.161123 1.17747,85.774223 2.71585,20.0765 33.82745,42.47419 44.85233,50.89527 l 6.7284,4.58645 c 1.91728,-6.79298 2.8173,-13.97259 3.1974,-20.48356 0.62155,-10.64647 0.43315,-29.73437 -0.14862,-76.59292 -0.92131,-74.20746 -0.66515,-101.377993 1.09612,-101.941105 3.63534,-1.162287 5.87571,0.295674 7.00173,2.543709 2.10419,4.235722 2.72457,17.464387 3.67547,78.372666 1.09006,69.82152 0.24272,105.76777 -2.86319,121.46398 -2.09089,10.56674 -6.0113,18.17667 -13.2002,25.56149 -13.61057,13.9815 -39.51329,14.94284 -53.70184,15.16843 -8.54252,0.10773 -16.76728,-0.0372 -18.29307,-0.0863 z m 69.2144,-32.53003 c -18.89051,-14.21484 -42.8808,-32.02743 -54.85654,-49.2066 l -3.8744,5.05837 c -16.99557,18.52744 -34.84597,32.91025 -53.828514,47.42153 14.825814,17.69258 38.821714,18.01969 62.673564,17.61447 23.40086,-0.39755 42.93504,-5.59748 49.88589,-20.88777 z',
        },
        evidence: {
          sourceTitle: 'File:山-seal.svg',
          sourceUrl: 'https://commons.wikimedia.org/wiki/File:山-seal.svg',
          licence: 'Public domain (theo nhãn Wikimedia Commons)',
          licenceUrl: 'https://commons.wikimedia.org/wiki/File:山-seal.svg',
          contributor: 'Wargaz (Wikimedia Commons)',
          retrievedOn: '2026-11-26',
          sha256: '6a9bc5e4fb911be25655369dc2bf1151f7e43e7532c9f5c12802ab6318adff86',
          provenance:
            'Bản vẽ vector theo dạng Thuyết văn giải tự; tệp nguồn tham chiếu s06639 (hanziyuan.net). Chưa đối chiếu độc lập với bản in Thuyết văn.',
          reviewStatus: 'pending_owner_review',
        },
      },
      {
        id: 'clerical',
        label: 'Lệ thư',
        period: 'Hán',
        status: 'missing',
        missingReason:
          'Chưa có hình lệ thư có nguồn và giấy phép đã xác minh cho 山 trong M3.5. Không vẽ hình thay thế.',
      },
      {
        id: 'regular',
        label: 'Khải thư (chữ hiện đại)',
        period: 'Hán Ngụy trở đi → nay',
        periodShort: 'Hiện đại',
        status: 'modern',
        note: 'Hiển thị bằng phông chữ của ứng dụng (Noto Sans SC), không phải hình lịch sử.',
      },
    ],
    skippedSources: [
      {
        title: 'File:山-bigseal.svg (Liushutong)',
        reason:
          'Chỉ là bản chép trong Lục thư thông (biên soạn đời Minh), không phải chứng cứ nguyên thủy; không đưa vào để tránh nhầm với bằng chứng cổ.',
      },
      {
        title: 'File:山-silk.svg (bạch thư)',
        reason: 'Không có mô tả niên đại/nguồn đủ rõ trong siêu dữ liệu để xếp vào dòng thời gian.',
      },
    ],
    mnemonic: {
      text: 'Gợi nhớ: hình ba đỉnh núi, đỉnh giữa cao nhất. Đây chỉ là mẹo ghi nhớ hiện đại, KHÔNG phải bằng chứng lịch sử.',
      isHistoricalEvidence: false,
    },
    strokeOrder: {
      available: false,
      note: 'Thứ tự nét là tính năng riêng, tách khỏi tiến hóa lịch sử. Dữ liệu nét (hanzi-writer-data, Arphic Public License) chưa được duyệt/tích hợp; xem docs/HANZI_HISTORY_SOURCES.md.',
    },
  },
};
