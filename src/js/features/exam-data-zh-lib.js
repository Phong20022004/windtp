  /* ===== Thư viện dựng đề HSK (2.0) từ PDF trong Drive: dùng chung cho các file exam-data-zh-*.js =====
     ZH.R(sec, n, đoạn, đề, [4 đáp án], "A".."D")   câu đọc trắc nghiệm; đoạn "" nếu câu không có đoạn văn, "^" nếu dùng chung đoạn với câu ngay trước
     ZH.L(sec, n, kịch bản, đề, [đáp án], "A".."D") câu nghe, chỉ dùng khi PDF có kịch bản chữ (đọc bằng giọng trình duyệt)
     ZH.O(sec, n, [câu A, câu B, câu C], "CBA")      câu sắp xếp thứ tự 3 câu (HSK 4–5), gõ thứ tự chữ cái
     ZH.W(n, "từ / từ / từ", "câu đúng")            câu sắp xếp từ thành câu (gõ lại cả câu)
     ZH.add("HSK 4", "H41327", [..các câu..], "ghi chú")  tự tách thành đề Nghe / Đọc / Viết và đặt thời gian */
  var ZH = (function () {
    var LET = "ABCDEF";
    var TIME = { "HSK 1": { r: 17, rn: 20, l: 15 }, "HSK 2": { r: 22, rn: 25, l: 25 }, "HSK 3": { r: 30, rn: 30, l: 35 }, "HSK 4": { r: 40, rn: 40, l: 30 }, "HSK 5": { r: 45, rn: 45, l: 30 }, "HSK 6": { r: 50, rn: 50, l: 35 } };
    var rng = function (items) { var ns = items.map(function (x) { return x.n; }); return Math.min.apply(null, ns) + "–" + Math.max.apply(null, ns); };
    return {
      R: function (sec, n, p, q, o, a) { return { kind: "reading", n: n, sec: sec, p: p || "", q: q, opts: o, a: LET.indexOf(a) }; },
      L: function (sec, n, speak, q, o, a) { return { kind: "listening", n: n, sec: sec, q: q, opts: o, a: LET.indexOf(a), speak: speak }; },
      O: function (sec, n, lines, ans) { return { kind: "reading", n: n, sec: sec, p: "", q: "排列顺序：\n" + lines.map(function (x, k) { return "ABC"[k] + " " + x; }).join("\n") + "\n（gõ thứ tự 3 chữ cái, ví dụ ABC）", text: [ans] }; },
      W: function (n, words, ans) { return { kind: "writing", n: n, sec: "Viết: sắp xếp câu", q: "把下列词语连成一个句子：\n" + words, text: [ans] }; },
      /* Đề có audio thật và câu dạng ảnh cắt từ đề gốc: items đã đủ trường (kind, n, sec, q, img, opts, a). Nghe 18 phút gồm 3 phút điền phiếu. */
      addMedia: function (level, code, items, audio) {
        var num = level.replace(/\D/g, ""), base = "hsk" + num + "-" + code.toLowerCase();
        [["listening", "listen", "Nghe 听力", 18], ["reading", "read", "Đọc 阅读", 17]].forEach(function (d) {
          var its = items.filter(function (x) { return x.kind === d[0]; }).map(function (x) { var c = {}; for (var f in x) if (f !== "kind") c[f] = x[f]; return c; });
          if (!its.length) return;
          var p = { id: base + "-" + d[1], sys: "hsk", level: level, section: d[0], lang: "zh-CN", items: its,
            title: level + " – đề " + code + " (" + d[2] + " " + rng(its) + ")", minutes: d[3],
            note: "Nguồn: thư mục ĐỀ THI TIẾNG TRUNG trên Google Drive. Mỗi câu là ảnh cắt từ đề gốc; chọn đáp án theo hình và chữ trong ảnh." + (d[0] === "listening" ? " Audio là bản thu thật của đề, nghe một lượt như thi thật." : "") };
          if (d[0] === "listening" && audio) p.audio = audio;
          EXAM_PAPERS.push(p);
        });
      },
      add: function (level, code, items, note) {
        var num = level.replace(/\D/g, ""), base = "hsk" + num + "-" + code.toLowerCase();
        var last = "";
        items.forEach(function (x) { if (x.kind === "reading") { if (x.p === "^") x.p = last; else last = x.p; } });
        var by = function (k) { return items.filter(function (x) { return x.kind === k; }).map(function (x) { var c = {}; for (var f in x) if (f !== "kind") c[f] = x[f]; return c; }); };
        var t = TIME[level], defs = [["listening", "listen", "Nghe 听力", "🎧"], ["reading", "read", "Đọc 阅读", "📖"], ["writing", "write", "Viết 书写", "✍️"]];
        defs.forEach(function (d) {
          var its = by(d[0]);
          if (!its.length) return;
          var mins = d[0] === "reading" ? Math.max(5, Math.round(t.r * its.length / t.rn)) : d[0] === "listening" ? t.l : Math.max(5, Math.round(its.length * 1.5));
          EXAM_PAPERS.push({ id: base + "-" + d[1], sys: "hsk", level: level, section: d[0], lang: "zh-CN", items: its,
            title: level + " – đề " + code + " (" + d[2] + " " + rng(its) + ")", minutes: mins,
            note: (note || "") + (d[0] === "listening" ? " Phần nghe được đọc bằng giọng của trình duyệt từ kịch bản gốc của đề, không phải audio gốc." : d[0] === "writing" ? " Gõ lại cả câu theo đúng trật tự; chỉ nhận câu giống đáp án mẫu. Thời gian là ước tính." : " Đáp án theo phần đáp án cuối đề. Câu cần xem hình đã được bỏ.") });
        });
      }
    };
  })();
