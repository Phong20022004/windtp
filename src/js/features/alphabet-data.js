  /* ===== Dữ liệu bảng chữ cái theo ngôn ngữ (không có bảng chữ cái thì dùng 214 bộ thủ Khang Hy) =====
     Mỗi mục: { c: chữ, r: cách đọc, x: ví dụ / giải nghĩa, t: chữ dùng để đọc bằng giọng máy, a: các đáp án gõ khác được chấp nhận } */
  var ALPHA_DATA = (function () {
    function item(c, r, x, t, a) { var o = { c: c, r: r, x: x || "", t: t || c }; if (a) o.a = a; return o; }
    function rows(list) { return list.map(function (p) { return item(p[0], p[1], p[2], p[3], p[4]); }); }

    // ---- Tiếng Hàn: 40 chữ cái Hangul (tên chữ dùng để đọc) ----
    var ko = {
      code: "ko", tts: "ko-KR", kind: "alphabet", typeMode: "rom",
      title: "Bảng chữ cái Hangul", intro: "Hangul gồm 40 chữ cái: 14 phụ âm cơ bản, 5 phụ âm đôi, 10 nguyên âm cơ bản và 11 nguyên âm ghép.",
      groups: [
        { name: "Phụ âm cơ bản (14)", items: rows([
          ["ㄱ", "g / k", "가방 · cái cặp", "기역"], ["ㄴ", "n", "나무 · cái cây", "니은"], ["ㄷ", "d / t", "다리 · cái chân, cây cầu", "디귿"],
          ["ㄹ", "r / l", "라면 · mì gói", "리을"], ["ㅁ", "m", "마음 · tấm lòng", "미음"], ["ㅂ", "b / p", "바다 · biển", "비읍"],
          ["ㅅ", "s", "사과 · quả táo", "시옷"], ["ㅇ", "ng (cuối) / không âm (đầu)", "아이 · đứa trẻ", "이응"], ["ㅈ", "j", "자전거 · xe đạp", "지읒"],
          ["ㅊ", "ch", "차 · trà, xe hơi", "치읓"], ["ㅋ", "k", "커피 · cà phê", "키읔"], ["ㅌ", "t", "토마토 · cà chua", "티읕"],
          ["ㅍ", "p", "피아노 · đàn piano", "피읖"], ["ㅎ", "h", "하늘 · bầu trời", "히읗"]
        ]) },
        { name: "Phụ âm đôi (5)", items: rows([
          ["ㄲ", "kk", "까치 · chim ác là", "쌍기역"], ["ㄸ", "tt", "딸기 · dâu tây", "쌍디귿"], ["ㅃ", "pp", "빵 · bánh mì", "쌍비읍"],
          ["ㅆ", "ss", "쌀 · gạo", "쌍시옷"], ["ㅉ", "jj", "짜장면 · mì tương đen", "쌍지읒"]
        ]) },
        { name: "Nguyên âm cơ bản (10)", items: rows([
          ["ㅏ", "a", "아기 · em bé", "아"], ["ㅑ", "ya", "야구 · bóng chày", "야"], ["ㅓ", "eo", "어머니 · mẹ", "어"], ["ㅕ", "yeo", "여자 · phụ nữ", "여"],
          ["ㅗ", "o", "오리 · con vịt", "오"], ["ㅛ", "yo", "요리 · nấu ăn", "요"], ["ㅜ", "u", "우유 · sữa", "우"], ["ㅠ", "yu", "유리 · thủy tinh", "유"],
          ["ㅡ", "eu", "음악 · âm nhạc", "으"], ["ㅣ", "i", "이름 · tên", "이"]
        ]) },
        { name: "Nguyên âm ghép (11)", items: rows([
          ["ㅐ", "ae", "개 · con chó", "애"], ["ㅒ", "yae", "얘기 · câu chuyện", "얘"], ["ㅔ", "e", "게 · con cua", "에"], ["ㅖ", "ye", "시계 · đồng hồ", "예"],
          ["ㅘ", "wa", "과일 · trái cây", "와"], ["ㅙ", "wae", "왜 · tại sao", "왜"], ["ㅚ", "oe", "회사 · công ty", "외"], ["ㅝ", "wo", "뭐 · cái gì", "워"],
          ["ㅞ", "we", "웨이터 · bồi bàn", "웨"], ["ㅟ", "wi", "귀 · cái tai", "위"], ["ㅢ", "ui", "의사 · bác sĩ", "의"]
        ]) }
      ]
    };

    // ---- Tiếng Nhật: Hiragana và Katakana ----
    var hiraBase = [
      ["あ", "a", "あめ · mưa, kẹo"], ["い", "i", "いぬ · con chó"], ["う", "u", "うみ · biển"], ["え", "e", "えき · nhà ga"], ["お", "o", "おちゃ · trà"],
      ["か", "ka", "かさ · cái ô"], ["き", "ki", "きつね · con cáo"], ["く", "ku", "くつ · giày"], ["け", "ke", "けむり · khói"], ["こ", "ko", "こども · trẻ em"],
      ["さ", "sa", "さかな · con cá"], ["し", "shi", "しお · muối"], ["す", "su", "すし · sushi"], ["せ", "se", "せかい · thế giới"], ["そ", "so", "そら · bầu trời"],
      ["た", "ta", "たまご · quả trứng"], ["ち", "chi", "ちず · bản đồ"], ["つ", "tsu", "つくえ · cái bàn"], ["て", "te", "てがみ · lá thư"], ["と", "to", "とり · con chim"],
      ["な", "na", "なつ · mùa hè"], ["に", "ni", "にく · thịt"], ["ぬ", "nu", "ぬの · vải"], ["ね", "ne", "ねこ · con mèo"], ["の", "no", "のり · rong biển"],
      ["は", "ha", "はな · bông hoa"], ["ひ", "hi", "ひと · con người"], ["ふ", "fu", "ふね · con thuyền"], ["へ", "he", "へや · căn phòng"], ["ほ", "ho", "ほし · ngôi sao"],
      ["ま", "ma", "まど · cửa sổ"], ["み", "mi", "みず · nước"], ["む", "mu", "むし · côn trùng"], ["め", "me", "めがね · kính mắt"], ["も", "mo", "もり · khu rừng"],
      ["や", "ya", "やま · ngọn núi"], ["ゆ", "yu", "ゆき · tuyết"], ["よ", "yo", "よる · ban đêm"],
      ["ら", "ra", "らいおん · sư tử"], ["り", "ri", "りんご · quả táo"], ["る", "ru", "るす · vắng nhà"], ["れ", "re", "れきし · lịch sử"], ["ろ", "ro", "ろうそく · cây nến"],
      ["わ", "wa", "わに · cá sấu"], ["を", "o", "ほんを よむ · đọc sách (trợ từ を)"], ["ん", "n", "ほん · quyển sách"]
    ];
    var kataEx = ["アイス · kem", "インク · mực", "ウール · len", "エアコン · máy lạnh", "オレンジ · quả cam",
      "カメラ · máy ảnh", "キウイ · quả kiwi", "クッキー · bánh quy", "ケーキ · bánh ngọt", "コーヒー · cà phê",
      "サラダ · salad", "シャツ · áo sơ mi", "スープ · súp", "セーター · áo len", "ソファ · ghế sofa",
      "タクシー · taxi", "チーズ · phô mai", "ツアー · chuyến tham quan", "テレビ · ti vi", "トマト · cà chua",
      "ナイフ · con dao", "ニュース · tin tức", "ヌードル · mì", "ネクタイ · cà vạt", "ノート · vở",
      "ハンバーガー · bánh hamburger", "ヒーター · máy sưởi", "フォーク · cái nĩa", "ヘリコプター · trực thăng", "ホテル · khách sạn",
      "マスク · khẩu trang", "ミルク · sữa", "ムース · mousse", "メロン · dưa lưới", "モデル · người mẫu",
      "タイヤ · lốp xe", "ユニフォーム · đồng phục", "ヨット · du thuyền",
      "ラジオ · radio", "リボン · nơ", "ルール · quy tắc", "レモン · quả chanh", "ロボット · rô-bốt",
      "ワイン · rượu vang", "ヲタク · otaku (viết kiểu cũ)", "ペン · cái bút"];
    var dakuten = [
      ["が", "ga", "がっこう · trường học"], ["ぎ", "gi", "ぎんこう · ngân hàng"], ["ぐ", "gu", "かぐ · đồ nội thất"], ["げ", "ge", "げんき · khỏe mạnh"], ["ご", "go", "ごはん · cơm"],
      ["ざ", "za", "ざっし · tạp chí"], ["じ", "ji", "じてんしゃ · xe đạp"], ["ず", "zu", "ずぼん · quần dài"], ["ぜ", "ze", "ぜんぶ · toàn bộ"], ["ぞ", "zo", "ぞう · con voi"],
      ["だ", "da", "だいがく · đại học"], ["ぢ", "ji", "はなぢ · chảy máu cam"], ["づ", "zu", "つづき · phần tiếp theo"], ["で", "de", "でんしゃ · tàu điện"], ["ど", "do", "どうぶつ · động vật"],
      ["ば", "ba", "ばなな · quả chuối"], ["び", "bi", "びょういん · bệnh viện"], ["ぶ", "bu", "ぶた · con lợn"], ["べ", "be", "べんきょう · học tập"], ["ぼ", "bo", "ぼうし · cái mũ"],
      ["ぱ", "pa", "ぱん · bánh mì"], ["ぴ", "pi", "ぴあの · đàn piano"], ["ぷ", "pu", "ぷりん · bánh pudding"], ["ぺ", "pe", "ぺん · cái bút"], ["ぽ", "po", "ぽけっと · cái túi"]
    ];
    var yoon = [
      ["きゃ", "kya", "きゃく · khách"], ["きゅ", "kyu", "きゅうり · dưa chuột"], ["きょ", "kyo", "きょう · hôm nay"],
      ["しゃ", "sha", "しゃしん · bức ảnh"], ["しゅ", "shu", "しゅくだい · bài tập về nhà"], ["しょ", "sho", "しょくじ · bữa ăn"],
      ["ちゃ", "cha", "おちゃ · trà"], ["ちゅ", "chu", "ちゅうしゃ · đỗ xe, tiêm"], ["ちょ", "cho", "ちょうちょ · con bướm"],
      ["にゃ", "nya", "こんにゃく · konjac"], ["にゅ", "nyu", "にゅうがく · nhập học"], ["にょ", "nyo", "にょらい · Như Lai"],
      ["ひゃ", "hya", "ひゃく · một trăm"], ["ひゅ", "hyu", "ひゅうひゅう · tiếng gió vi vu"], ["ひょ", "hyo", "ひょう · con báo"],
      ["みゃ", "mya", "みゃく · mạch"], ["みゅ", "myu", "ミュージカル · nhạc kịch (thường viết bằng katakana)"], ["みょ", "myo", "みょうじ · họ"],
      ["りゃ", "rya", "りゃくご · từ viết tắt"], ["りゅ", "ryu", "りゅう · con rồng"], ["りょ", "ryo", "りょこう · du lịch"],
      ["ぎゃ", "gya", "ぎゃく · ngược lại"], ["ぎゅ", "gyu", "ぎゅうにゅう · sữa bò"], ["ぎょ", "gyo", "ぎょうざ · sủi cảo"],
      ["じゃ", "ja", "じゃがいも · khoai tây"], ["じゅ", "ju", "じゅぎょう · giờ học"], ["じょ", "jo", "じょせい · phụ nữ"],
      ["びゃ", "bya", "さんびゃく · ba trăm"], ["びゅ", "byu", "インタビュー · phỏng vấn"], ["びょ", "byo", "びょういん · bệnh viện"],
      ["ぴゃ", "pya", "ろっぴゃく · sáu trăm"], ["ぴゅ", "pyu", "コンピュータ · máy tính"], ["ぴょ", "pyo", "ぴょんぴょん · nhảy tưng tưng"]
    ];
    // Ví dụ katakana (từ mượn và từ tượng thanh) cho âm đục/bán đục và âm ghép, cùng thứ tự với hai bảng trên.
    var kataDak = ["ガム · kẹo cao su", "ギター · đàn ghi-ta", "グラス · ly thủy tinh", "ゲーム · trò chơi", "ゴルフ · gôn",
      "ザック · ba lô", "ジュース · nước ép", "ズボン · quần dài", "ゼリー · thạch", "ゾーン · khu vực",
      "ダンス · khiêu vũ", "ヂ · hiếm gặp (thường dùng ジ)", "ヅ · hiếm gặp (thường dùng ズ)", "デザート · món tráng miệng", "ドア · cửa",
      "バス · xe buýt", "ビール · bia", "ブーツ · ủng", "ベッド · giường", "ボール · quả bóng",
      "パン · bánh mì", "ピアノ · đàn piano", "プール · bể bơi", "ペン · cái bút", "ポスト · hòm thư"];
    var kataYoon = ["キャベツ · bắp cải", "キュート · dễ thương", "キョロキョロ · nhìn quanh (từ tượng thanh)",
      "シャツ · áo sơ mi", "シュークリーム · bánh su kem", "ショップ · cửa hàng",
      "チャンス · cơ hội", "チューリップ · hoa tulip", "チョコレート · sô cô la",
      "ニャーニャー · tiếng mèo kêu", "ニュース · tin tức", "ニョッキ · gnocchi",
      "ヒャッホー · tiếng reo vui", "ヒュッテ · nhà nghỉ trên núi", "ヒョウ · con báo (tên động vật)",
      "ミャンマー · Myanmar", "ミュージック · âm nhạc", "ミョウガ · gừng Nhật",
      "リャマ · lạc đà không bướu", "リュック · ba lô", "リョクチャ · trà xanh",
      "ギャラリー · phòng tranh", "ギュッと · ôm chặt (từ tượng thanh)", "ギョーザ · há cảo",
      "ジャム · mứt", "ジュース · nước ép", "ジョギング · chạy bộ",
      "ビャクダン · gỗ đàn hương", "ビューティー · sắc đẹp", "ビョーキ · bệnh (cách viết nhấn mạnh)",
      "ピャーピャー · tiếng ríu rít", "ピューマ · báo sư tử", "ピョンピョン · nhảy tưng tưng"];
    function toKata(s) { return Array.from(s).map(function (ch) { var n = ch.charCodeAt(0); return n >= 0x3041 && n <= 0x3096 ? String.fromCharCode(n + 0x60) : ch; }).join(""); }
    var ja = {
      code: "ja", tts: "ja-JP", kind: "alphabet", typeMode: "rom",
      title: "Bảng chữ cái Hiragana và Katakana", intro: "Tiếng Nhật có hai bộ chữ cái ngữ âm: Hiragana (chữ mềm, dùng cho từ thuần Nhật) và Katakana (chữ cứng, dùng cho từ ngoại lai). Mỗi bộ có 46 âm cơ bản, 25 âm đục/bán đục và 33 âm ghép.",
      groups: [
        { name: "Hiragana · 46 âm cơ bản", items: rows(hiraBase) },
        { name: "Hiragana · âm đục và bán đục (25)", items: rows(dakuten) },
        { name: "Hiragana · âm ghép (33)", items: rows(yoon) },
        { name: "Katakana · 46 âm cơ bản", items: hiraBase.map(function (p, i) { return item(toKata(p[0]), p[1], kataEx[i]); }) },
        { name: "Katakana · âm đục và bán đục (25)", items: dakuten.map(function (p, i) { return item(toKata(p[0]), p[1], kataDak[i]); }) },
        { name: "Katakana · âm ghép (33)", items: yoon.map(function (p, i) { return item(toKata(p[0]), p[1], kataYoon[i]); }) }
      ]
    };

    // ---- Các ngôn ngữ chữ Latin: tên chữ cái đọc theo tiếng Việt kèm ví dụ ----
    function latin(list, upperLower) { return rows(list.map(function (p) { return [upperLower ? p[0] + " " + p[0].toLowerCase() : p[0], p[1], p[2], p[3] || p[0].toLowerCase(), p[4]]; })); }
    var en = {
      code: "en", tts: "en-US", kind: "alphabet", typeMode: "dictate",
      title: "Bảng chữ cái tiếng Anh", intro: "26 chữ cái Latin. Tên chữ cái được ghi bằng cách đọc gần đúng cho người Việt.",
      groups: [{ name: "26 chữ cái", items: latin([
        ["A", "ây", "apple · quả táo"], ["B", "bi", "banana · quả chuối"], ["C", "xi", "cat · con mèo"], ["D", "đi", "dog · con chó"], ["E", "i", "egg · quả trứng"],
        ["F", "ép", "fish · con cá"], ["G", "dzi", "girl · cô gái"], ["H", "ây-ch", "hat · cái mũ"], ["I", "ai", "ice · nước đá"], ["J", "dzây", "juice · nước ép"],
        ["K", "khây", "key · chìa khóa"], ["L", "eo", "lemon · quả chanh"], ["M", "em", "moon · mặt trăng"], ["N", "en", "nose · cái mũi"], ["O", "âu", "orange · quả cam"],
        ["P", "pi", "pen · cái bút"], ["Q", "kiu", "queen · nữ hoàng"], ["R", "a", "rain · cơn mưa"], ["S", "ét", "sun · mặt trời"], ["T", "ti", "tree · cái cây"],
        ["U", "iu", "umbrella · cái ô"], ["V", "vi", "violin · đàn vi-ô-lông"], ["W", "đấp-bồ-liu", "water · nước"], ["X", "éc-x", "xylophone · mộc cầm"], ["Y", "quai", "yellow · màu vàng"],
        ["Z", "di (zi)", "zebra · ngựa vằn"]
      ], true) }]
    };
    var de = {
      code: "de", tts: "de-DE", kind: "alphabet", typeMode: "dictate",
      title: "Bảng chữ cái tiếng Đức", intro: "26 chữ cái Latin cộng ba nguyên âm biến âm Ä, Ö, Ü và chữ ß (Eszett).",
      groups: [
        { name: "26 chữ cái", items: latin([
          ["A", "a", "Apfel · quả táo"], ["B", "bê", "Buch · quyển sách"], ["C", "xê", "Café · quán cà phê"], ["D", "đê", "Dach · mái nhà"], ["E", "ê", "Eis · kem"],
          ["F", "ép", "Fisch · con cá"], ["G", "ghê", "Garten · khu vườn"], ["H", "ha", "Haus · ngôi nhà"], ["I", "i", "Insel · hòn đảo"], ["J", "giốt", "Jacke · áo khoác"],
          ["K", "ka", "Katze · con mèo"], ["L", "eo", "Lampe · cái đèn"], ["M", "em", "Mutter · mẹ"], ["N", "en", "Nase · cái mũi"], ["O", "ô", "Ofen · cái lò"],
          ["P", "pê", "Papier · giấy"], ["Q", "ku", "Qualle · con sứa"], ["R", "e-r", "Rose · hoa hồng"], ["S", "ét", "Sonne · mặt trời"], ["T", "tê", "Tisch · cái bàn"],
          ["U", "u", "Uhr · đồng hồ"], ["V", "phau", "Vogel · con chim"], ["W", "vê", "Wasser · nước"], ["X", "ích", "Xylophon · mộc cầm"], ["Y", "úp-xi-lon", "Yoga · yoga"],
          ["Z", "xét", "Zug · tàu hỏa"]
        ], true) },
        { name: "Chữ đặc biệt", items: rows([
          ["Ä ä", "ê (mở)", "Äpfel · những quả táo", "ä"], ["Ö ö", "ơ (tròn môi)", "Öl · dầu", "ö"], ["Ü ü", "uy", "Übung · bài tập", "ü"], ["ß", "ét-xét (Eszett, đọc như ss)", "Straße · con đường", "ß"]
        ]) }
      ]
    };
    var fr = {
      code: "fr", tts: "fr-FR", kind: "alphabet", typeMode: "dictate",
      title: "Bảng chữ cái tiếng Pháp", intro: "26 chữ cái Latin cùng các dấu phụ: dấu sắc, huyền, mũ, trema và dấu móc dưới chữ c.",
      groups: [
        { name: "26 chữ cái", items: latin([
          ["A", "a", "arbre · cái cây"], ["B", "bê", "bateau · con tàu"], ["C", "xê", "chat · con mèo"], ["D", "đê", "dent · cái răng"], ["E", "ơ", "école · trường học"],
          ["F", "ép-phờ", "fleur · bông hoa"], ["G", "giê", "gâteau · bánh ngọt"], ["H", "át-sờ", "homme · người đàn ông"], ["I", "i", "île · hòn đảo"], ["J", "gi", "jour · ngày"],
          ["K", "ka", "kilo · ki-lô-gam"], ["L", "eo", "lune · mặt trăng"], ["M", "em", "maison · ngôi nhà"], ["N", "en", "nez · cái mũi"], ["O", "ô", "oiseau · con chim"],
          ["P", "pê", "pain · bánh mì"], ["Q", "ky", "quatre · số bốn"], ["R", "e-rờ", "rouge · màu đỏ"], ["S", "ét-sờ", "soleil · mặt trời"], ["T", "tê", "table · cái bàn"],
          ["U", "uy", "usine · nhà máy"], ["V", "vê", "voiture · xe hơi"], ["W", "đúp-lơ-vê", "wagon · toa tàu"], ["X", "íc-xờ", "xylophone · mộc cầm"], ["Y", "i-grếc", "yaourt · sữa chua"],
          ["Z", "dét", "zéro · số không"]
        ], true) },
        { name: "Dấu phụ", items: rows([
          ["é", "ê (dấu sắc)", "été · mùa hè"], ["è", "e (dấu huyền)", "mère · mẹ"], ["ê", "e (dấu mũ)", "fête · lễ hội"], ["ë", "e (trema, đọc tách âm)", "Noël · lễ Giáng sinh"],
          ["à", "a (dấu huyền)", "là · ở đó"], ["â", "a (dấu mũ)", "château · lâu đài"], ["î", "i (dấu mũ)", "île · hòn đảo"], ["ï", "i (trema, đọc tách âm)", "maïs · ngô"],
          ["ô", "ô (dấu mũ)", "hôtel · khách sạn"], ["û", "uy (dấu mũ)", "sûr · chắc chắn"], ["ù", "uy (dấu huyền)", "où · ở đâu"], ["ç", "sờ (c có móc dưới)", "garçon · cậu bé"], ["œ", "ơ", "sœur · chị, em gái"]
        ]) }
      ]
    };
    var es = {
      code: "es", tts: "es-ES", kind: "alphabet", typeMode: "dictate",
      title: "Bảng chữ cái tiếng Tây Ban Nha", intro: "27 chữ cái (có thêm Ñ), các nguyên âm có dấu sắc và hai dấu câu mở đầu ¿ ¡.",
      groups: [
        { name: "27 chữ cái", items: latin([
          ["A", "a", "avión · máy bay"], ["B", "be", "barco · con tàu"], ["C", "xê (thê)", "casa · ngôi nhà"], ["D", "đê", "dedo · ngón tay"], ["E", "e", "escuela · trường học"],
          ["F", "ê-phê", "flor · bông hoa"], ["G", "hê", "gato · con mèo"], ["H", "a-chê (không đọc)", "hola · xin chào"], ["I", "i", "iglesia · nhà thờ"], ["J", "hô-ta", "jardín · khu vườn"],
          ["K", "ka", "kilo · ki-lô-gam"], ["L", "ê-lê", "luna · mặt trăng"], ["M", "ê-mê", "mesa · cái bàn"], ["N", "ê-nê", "nube · đám mây"], ["Ñ", "ê-nhê", "niño · cậu bé"],
          ["O", "o", "ojo · con mắt"], ["P", "pê", "perro · con chó"], ["Q", "cu", "queso · phô mai"], ["R", "ê-rê", "rosa · hoa hồng"], ["S", "ê-sê", "sol · mặt trời"],
          ["T", "tê", "taza · cái tách"], ["U", "u", "uva · quả nho"], ["V", "u-bê", "vaso · cái cốc"], ["W", "u-bê đô-blê", "wifi · wifi"], ["X", "ê-kít", "xilófono · mộc cầm"],
          ["Y", "i-grie-ga", "yo · tôi"], ["Z", "xê-ta (thê-ta)", "zapato · chiếc giày"]
        ], true) },
        { name: "Dấu và chữ đặc biệt", items: rows([
          ["á", "a (dấu sắc, nhấn mạnh)", "está · thì, ở"], ["é", "e (dấu sắc)", "café · cà phê"], ["í", "i (dấu sắc)", "día · ngày"], ["ó", "o (dấu sắc)", "canción · bài hát"],
          ["ú", "u (dấu sắc)", "menú · thực đơn"], ["ü", "u (đọc rõ sau g)", "pingüino · chim cánh cụt"], ["¿", "dấu hỏi mở đầu câu", "¿Cómo estás? · Bạn khỏe không?", "cómo estás"], ["¡", "dấu cảm mở đầu câu", "¡Hola! · Xin chào!", "hola"]
        ]) }
      ]
    };

    // ---- Tiếng Trung: 214 bộ thủ Khang Hy (chữ|pinyin|Hán Việt|nghĩa|ví dụ) ----
    var RAD = [
      [1, "一|yī|Nhất|số một|三 sān (ba)", "丨|gǔn|Cổn|nét sổ|中 zhōng (giữa)", "丶|zhǔ|Chủ|chấm|主 zhǔ (chủ)", "丿|piě|Phiệt|nét phẩy|久 jiǔ (lâu)", "乙|yǐ|Ất|can thứ hai|九 jiǔ (chín)", "亅|jué|Quyết|nét móc|了 le (xong)"],
      [2, "二|èr|Nhị|số hai|五 wǔ (năm)", "亠|tóu|Đầu|nắp, mái|交 jiāo (giao)", "人|rén|Nhân|người (biến thể 亻)|你 nǐ (bạn)", "儿|ér|Nhân|chân người|兄 xiōng (anh)", "入|rù|Nhập|vào|全 quán (toàn)", "八|bā|Bát|số tám|公 gōng (công)", "冂|jiōng|Quynh|vùng biên|同 tóng (cùng)", "冖|mì|Mịch|trùm khăn|写 xiě (viết)", "冫|bīng|Băng|băng giá|冷 lěng (lạnh)", "几|jī|Kỷ|cái ghế|风 fēng (gió)", "凵|kǎn|Khảm|há miệng|出 chū (ra)", "刀|dāo|Đao|con dao (biến thể 刂)|分 fēn (chia)", "力|lì|Lực|sức mạnh|办 bàn (làm)", "勹|bāo|Bao|bao bọc|包 bāo (bọc)", "匕|bǐ|Chủy|cái thìa|北 běi (bắc)", "匚|fāng|Phương|cái hòm|区 qū (khu)", "匸|xǐ|Hệ|che đậy|医 yī (y)", "十|shí|Thập|số mười|千 qiān (nghìn)", "卜|bǔ|Bốc|bói toán|占 zhàn (chiếm)", "卩|jié|Tiết|đốt tre, ấn tín|节 jié (tiết)", "厂|hǎn|Hán|sườn núi|历 lì (lịch)", "厶|sī|Tư|riêng tư|去 qù (đi)", "又|yòu|Hựu|lại, tay phải|友 yǒu (bạn)"],
      [3, "口|kǒu|Khẩu|cái miệng|叫 jiào (gọi)", "囗|wéi|Vi|vây quanh|国 guó (nước)", "土|tǔ|Thổ|đất|地 dì (đất)", "士|shì|Sĩ|học trò, binh sĩ|声 shēng (tiếng)", "夂|zhǐ|Trĩ|đi chậm|冬 dōng (mùa đông)", "夊|suī|Tuy|đi chậm|夏 xià (mùa hè)", "夕|xī|Tịch|buổi tối|多 duō (nhiều)", "大|dà|Đại|to lớn|太 tài (quá)", "女|nǚ|Nữ|phụ nữ|好 hǎo (tốt)", "子|zǐ|Tử|con|学 xué (học)", "宀|mián|Miên|mái nhà|家 jiā (nhà)", "寸|cùn|Thốn|tấc|对 duì (đúng)", "小|xiǎo|Tiểu|nhỏ|少 shǎo (ít)", "尢|wāng|Uông|yếu, què|就 jiù (liền)", "尸|shī|Thi|xác, thân người|屋 wū (phòng)", "屮|chè|Triệt|mầm cây|草 cǎo (cỏ)", "山|shān|Sơn|núi|岛 dǎo (đảo)", "巛|chuān|Xuyên|sông|州 zhōu (châu)", "工|gōng|Công|công việc|左 zuǒ (trái)", "己|jǐ|Kỷ|bản thân|起 qǐ (dậy)", "巾|jīn|Cân|khăn|帮 bāng (giúp)", "干|gān|Can|khô, can dự|平 píng (bằng)", "幺|yāo|Yêu|nhỏ bé|几 jǐ (mấy)", "广|guǎng|Nghiễm|mái nhà rộng|床 chuáng (giường)", "廴|yǐn|Dẫn|bước dài|建 jiàn (xây)", "廾|gǒng|Củng|chắp tay|开 kāi (mở)", "弋|yì|Dặc|bắn, cọc|式 shì (kiểu)", "弓|gōng|Cung|cây cung|张 zhāng (căng)", "彐|jì|Ký|đầu con nhím|归 guī (về)", "彡|shān|Sam|lông, tia sáng|形 xíng (hình)", "彳|chì|Xích|bước chân trái|很 hěn (rất)"],
      [4, "心|xīn|Tâm|trái tim (biến thể 忄)|想 xiǎng (nghĩ)", "戈|gē|Qua|cây giáo|我 wǒ (tôi)", "戶|hù|Hộ|cửa một cánh|房 fáng (phòng)|户", "手|shǒu|Thủ|bàn tay (biến thể 扌)|打 dǎ (đánh)", "支|zhī|Chi|cành, chi nhánh|技 jì (kỹ)", "攴|pū|Phộc|đánh khẽ (biến thể 攵)|教 jiào (dạy)", "文|wén|Văn|văn chương|这 zhè (này)", "斗|dǒu|Đẩu|cái đấu, sao Đẩu|料 liào (liệu)", "斤|jīn|Cân|cái rìu, cân|新 xīn (mới)", "方|fāng|Phương|vuông, phương hướng|放 fàng (thả)", "无|wú|Vô|không|既 jì (đã)", "日|rì|Nhật|mặt trời, ngày|明 míng (sáng)", "曰|yuē|Viết|nói rằng|最 zuì (nhất)", "月|yuè|Nguyệt|mặt trăng, tháng|有 yǒu (có)", "木|mù|Mộc|cây gỗ|林 lín (rừng)", "欠|qiàn|Khiếm|thiếu, ngáp|欢 huān (vui)", "止|zhǐ|Chỉ|dừng lại|步 bù (bước)", "歹|dǎi|Đãi|xấu, xương chết|死 sǐ (chết)", "殳|shū|Thù|binh khí|段 duàn (đoạn)", "毋|wú|Vô|đừng, chớ|母 mǔ (mẹ)", "比|bǐ|Tỷ|so sánh|比 bǐ (so)", "毛|máo|Mao|lông|毯 tǎn (thảm)", "氏|shì|Thị|họ|民 mín (dân)", "气|qì|Khí|hơi, khí|气 qì (khí)", "水|shuǐ|Thủy|nước (biến thể 氵)|河 hé (sông)", "火|huǒ|Hỏa|lửa (biến thể 灬)|灯 dēng (đèn)", "爪|zhǎo|Trảo|móng vuốt (biến thể ⺤)|爱 ài (yêu)", "父|fù|Phụ|cha|爸 bà (bố)", "爻|yáo|Hào|vạch quẻ|爽 shuǎng (sảng khoái)", "爿|qiáng|Tường|tấm ván|牀 chuáng (giường cổ)", "片|piàn|Phiến|mảnh, tấm|牌 pái (bài)", "牙|yá|Nha|răng|牙 yá (răng)", "牛|niú|Ngưu|con bò (biến thể 牜)|物 wù (vật)", "犬|quǎn|Khuyển|con chó (biến thể 犭)|狗 gǒu (chó)"],
      [5, "玄|xuán|Huyền|huyền bí, màu đen|率 shuài (tỷ lệ)", "玉|yù|Ngọc|ngọc (biến thể 王)|球 qiú (quả bóng)", "瓜|guā|Qua|dưa|瓜 guā (dưa)", "瓦|wǎ|Ngõa|ngói|瓶 píng (chai)", "甘|gān|Cam|ngọt|甜 tián (ngọt)", "生|shēng|Sinh|sinh ra, sống|牲 shēng (gia súc)", "用|yòng|Dụng|dùng|用 yòng (dùng)", "田|tián|Điền|ruộng|男 nán (nam)", "疋|pǐ|Thất|cuộn vải|疏 shū (thưa)", "疒|nè|Nạch|bệnh tật|病 bìng (bệnh)", "癶|bō|Bát|gạt ra, hai chân|发 fā (phát)", "白|bái|Bạch|màu trắng|百 bǎi (trăm)", "皮|pí|Bì|da|被 bèi (bị)", "皿|mǐn|Mãnh|cái đĩa|盘 pán (đĩa)", "目|mù|Mục|con mắt|看 kàn (nhìn)", "矛|máo|Mâu|cây giáo|矛 máo (giáo)", "矢|shǐ|Thỉ|mũi tên|知 zhī (biết)", "石|shí|Thạch|đá|研 yán (nghiên)", "示|shì|Thị|bày tỏ, thần linh (biến thể 礻)|礼 lǐ (lễ)", "禸|róu|Nhữu|vết chân thú|禽 qín (chim)", "禾|hé|Hòa|cây lúa|秋 qiū (mùa thu)", "穴|xué|Huyệt|cái hang|空 kōng (trống)", "立|lì|Lập|đứng|站 zhàn (đứng)"],
      [6, "竹|zhú|Trúc|cây tre (biến thể ⺮)|笔 bǐ (bút)", "米|mǐ|Mễ|gạo|饭 fàn (cơm)", "糸|mì|Mịch|sợi tơ (biến thể 纟)|红 hóng (đỏ)|纟", "缶|fǒu|Phẫu|cái vò sành|缺 quē (thiếu)", "网|wǎng|Võng|cái lưới (biến thể 罒)|罗 luó (la)", "羊|yáng|Dương|con dê, cừu|美 měi (đẹp)", "羽|yǔ|Vũ|lông vũ|习 xí (tập)", "老|lǎo|Lão|già (biến thể 耂)|考 kǎo (thi)", "而|ér|Nhi|mà, và|而 ér (mà)", "耒|lěi|Lỗi|cái cày|耕 gēng (cày)", "耳|ěr|Nhĩ|cái tai|听 tīng (nghe)", "聿|yù|Duật|cây bút|书 shū (sách)", "肉|ròu|Nhục|thịt (biến thể 月)|肚 dù (bụng)", "臣|chén|Thần|bề tôi|臣 chén (thần)", "自|zì|Tự|tự mình, mũi|自 zì (tự)", "至|zhì|Chí|đến|到 dào (đến)", "臼|jiù|Cữu|cái cối|舅 jiù (cậu)", "舌|shé|Thiệt|cái lưỡi|话 huà (lời)", "舛|chuǎn|Suyễn|trái ngược|舞 wǔ (múa)", "舟|zhōu|Chu|con thuyền|船 chuán (thuyền)", "艮|gèn|Cấn|bền vững, quẻ Cấn|很 hěn (rất)", "色|sè|Sắc|màu sắc|色 sè (màu)", "艸|cǎo|Thảo|cỏ (biến thể 艹)|花 huā (hoa)", "虍|hū|Hô|vằn hổ|虎 hǔ (hổ)", "虫|chóng|Trùng|côn trùng|蚊 wén (muỗi)", "血|xuè|Huyết|máu|血 xuè (máu)", "行|xíng|Hành|đi, hàng|街 jiē (phố)", "衣|yī|Y|áo (biến thể 衤)|衬 chèn (lót)", "襾|yà|Á|che đậy|要 yào (cần)"],
      [7, "見|jiàn|Kiến|nhìn thấy|观 guān (xem)|见", "角|jiǎo|Giác|cái sừng, góc|解 jiě (giải)", "言|yán|Ngôn|lời nói|说 shuō (nói)|讠", "谷|gǔ|Cốc|thung lũng|谷 gǔ (thung lũng)", "豆|dòu|Đậu|hạt đậu|豆 dòu (đậu)", "豕|shǐ|Thỉ|con lợn|象 xiàng (voi)", "豸|zhì|Trãi|loài thú có vuốt|貌 mào (diện mạo)", "貝|bèi|Bối|vỏ sò, tiền|贵 guì (đắt)|贝", "赤|chì|Xích|màu đỏ|赤 chì (đỏ)", "走|zǒu|Tẩu|đi bộ, chạy|起 qǐ (dậy)", "足|zú|Túc|bàn chân|跑 pǎo (chạy)", "身|shēn|Thân|thân thể|躺 tǎng (nằm)", "車|chē|Xa|xe|轮 lún (bánh)|车", "辛|xīn|Tân|cay, vất vả|辣 là (cay)", "辰|chén|Thần|thìn, giờ|农 nóng (nông)", "辵|chuò|Sước|chợt đi chợt dừng (biến thể 辶)|这 zhè (này)", "邑|yì|Ấp|thành ấp (biến thể 阝phải)|都 dōu (đều)", "酉|yǒu|Dậu|rượu, chi Dậu|酒 jiǔ (rượu)", "釆|biàn|Biện|phân biệt|释 shì (giải thích)", "里|lǐ|Lý|dặm, làng|重 zhòng (nặng)"],
      [8, "金|jīn|Kim|vàng, kim loại|钱 qián (tiền)|钅", "長|cháng|Trường|dài|长 cháng (dài)|长", "門|mén|Môn|cái cửa|间 jiān (giữa)|门", "阜|fù|Phụ|gò đất (biến thể 阝trái)|院 yuàn (viện)", "隶|dài|Đãi|theo kịp, nô lệ|隶 lì (lệ thuộc)", "隹|zhuī|Chuy|chim đuôi ngắn|难 nán (khó)", "雨|yǔ|Vũ|mưa|雪 xuě (tuyết)", "青|qīng|Thanh|màu xanh|静 jìng (yên tĩnh)", "非|fēi|Phi|không phải|非 fēi (không)"],
      [9, "面|miàn|Diện|mặt|面 miàn (mặt)", "革|gé|Cách|da thuộc|鞋 xié (giày)", "韋|wéi|Vi|da đã thuộc|韦 wéi (họ Vi)|韦", "韭|jiǔ|Cửu|hẹ|韭 jiǔ (hẹ)", "音|yīn|Âm|âm thanh|意 yì (ý)", "頁|yè|Hiệt|cái đầu, trang|页 yè (trang)|页", "風|fēng|Phong|gió|风 fēng (gió)|风", "飛|fēi|Phi|bay|飞 fēi (bay)|飞", "食|shí|Thực|ăn (biến thể 饣)|饿 è (đói)|饣", "首|shǒu|Thủ|cái đầu|首 shǒu (đầu)", "香|xiāng|Hương|thơm|香 xiāng (thơm)"],
      [10, "馬|mǎ|Mã|con ngựa|骑 qí (cưỡi)|马", "骨|gǔ|Cốt|xương|骨 gǔ (xương)", "高|gāo|Cao|cao|高 gāo (cao)", "髟|biāo|Bưu|tóc dài|发 fà (tóc)", "鬥|dòu|Đấu|đánh nhau|斗 dòu (đấu)|斗", "鬯|chàng|Sưởng|rượu nếp thơm|鬯 chàng (rượu tế)", "鬲|lì|Cách|cái nồi ba chân|融 róng (hòa tan)", "鬼|guǐ|Quỷ|ma quỷ|魂 hún (hồn)"],
      [11, "魚|yú|Ngư|con cá|鱼 yú (cá)|鱼", "鳥|niǎo|Điểu|con chim|鸟 niǎo (chim)|鸟", "鹵|lǔ|Lỗ|muối mỏ|卤 lǔ (kho)|卤", "鹿|lù|Lộc|con hươu|鹿 lù (hươu)", "麥|mài|Mạch|lúa mạch|麦 mài (lúa mạch)|麦", "麻|má|Ma|cây gai, tê|麻 má (tê)"],
      [12, "黃|huáng|Hoàng|màu vàng|黄 huáng (vàng)|黄", "黍|shǔ|Thử|kê nếp|黍 shǔ (kê)", "黑|hēi|Hắc|màu đen|黑 hēi (đen)", "黹|zhǐ|Chỉ|may vá, thêu|黹 zhǐ (thêu)"],
      [13, "黽|mǐn|Mãnh|con ếch|黾 mǐn (ếch)|黾", "鼎|dǐng|Đỉnh|cái đỉnh|鼎 dǐng (đỉnh)", "鼓|gǔ|Cổ|cái trống|鼓 gǔ (trống)", "鼠|shǔ|Thử|con chuột|鼠 shǔ (chuột)"],
      [14, "鼻|bí|Tỵ|cái mũi|鼻 bí (mũi)", "齊|qí|Tề|đều, ngay ngắn|齐 qí (đều)|齐"],
      [15, "齒|chǐ|Xỉ|răng|齿 chǐ (răng)|齿"],
      [16, "龍|lóng|Long|con rồng|龙 lóng (rồng)|龙", "龜|guī|Quy|con rùa|龟 guī (rùa)|龟"],
      [17, "龠|yuè|Dược|sáo ba lỗ|龠 yuè (sáo)"]
    ];
    function stripTone(s) { return s.normalize("NFD").replace(/u\u0308/g, "v").replace(/[\u0300-\u036f]/g, ""); }
    var radGroups = RAD.map(function (g) {
      return { name: g[0] + " nét", items: g.slice(1).map(function (row, i) {
        var p = row.split("|"), n = g[0];
        var x = p[2] + " · " + p[3] + " · " + n + " nét · ví dụ: " + p[4] + (p[5] ? " · giản thể: " + p[5] : "");
        return item(p[0], p[1], x, p[0], [p[2].toLowerCase(), stripTone(p[1])]);
      }) };
    });
    var zh = {
      code: "zh", tts: "zh-CN", kind: "radicals", typeMode: "rom",
      title: "214 bộ thủ Khang Hy", intro: "Tiếng Trung không có bảng chữ cái. Mọi chữ Hán đều được dựng từ 214 bộ thủ; nắm vững chúng giúp nhớ nghĩa và cách viết của chữ mới. Mỗi bộ ghi pinyin, âm Hán Việt, nghĩa, số nét và một chữ ví dụ.",
      groups: radGroups
    };

    var all = { ko: ko, ja: ja, en: en, de: de, fr: fr, es: es, zh: zh };
    return { get: function (code) { return all[code] || null; }, stripTone: stripTone };
  })();
