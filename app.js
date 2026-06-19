/* ============================================================
   婚活自己開示QA Part3 – app.js
   ============================================================ */

const LIFF_ID   = "2010312230-U5plijAs";
const DRAFT_KEY = "konkatsu_qa_part3_draft_v2";

/* Part4への案内メッセージ（送信＆共有完了後にトーク画面へ送信） */
/* ※ Part4のLIFF IDが確定したらURLを差し替えてください */
const NEXT_PART_MESSAGE =
  "次は自己開示QA part4を答えてみましょう！\n→ https://liff.line.me/YOUR_PART4_LIFF_ID";

/* ------------------------------------------------------------
   URLセーフ Base64（圧縮対応）
   JSON文字列を pako（deflate）で圧縮し、バイナリをURLセーフな
   Base64に変換することで共有URLを大幅に短縮する。
   pako が読み込めない環境では非圧縮のBase64にフォールバックする。
   ------------------------------------------------------------ */
function uint8ToBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64UrlToUint8(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad    = padded.length % 4;
  const fixed  = pad ? padded + "=".repeat(4 - pad) : padded;
  const binary = atob(fixed);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(str) {
  try {
    if (typeof pako !== "undefined") {
      const compressed = pako.deflate(str);
      return "z" + uint8ToBase64Url(compressed); // "z"=圧縮フォーマットの目印
    }
  } catch (e) {
    console.warn("pako compress failed, fallback to plain encode", e);
  }
  // フォールバック（非圧縮）
  return "p" + btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64UrlDecode(str) {
  const flag = str.charAt(0);
  const body = str.slice(1);

  if (flag === "z") {
    const bytes = base64UrlToUint8(body);
    return pako.inflate(bytes, { to: "string" });
  }

  // flag === "p"（非圧縮フォールバック）。旧バージョンの目印なし文字列にも対応。
  const target = flag === "p" ? body : str;
  const padded = target.replace(/-/g, "+").replace(/_/g, "/");
  const pad    = padded.length % 4;
  const fixed  = pad ? padded + "=".repeat(4 - pad) : padded;
  return decodeURIComponent(escape(atob(fixed)));
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------
   ランキング選択肢一覧（共有URL短縮のため、テキストの代わりに
   インデックス番号でやり取りする）
   ------------------------------------------------------------ */
const Q4_OPTIONS = [
  "水土日の週休3日制",
  "金土日の週休3日制",
  "休みは変わらず1日の労働時間が5～6時間になる",
  "大型連休の回数が増える",
  "まるまる1ヶ月GWになる",
];

const Q6_OPTIONS = [
  "老若男女問わず褒められる",
  "食事や運動に気をつけなくても維持できる理想的な体型",
  "地頭の良さ",
  "運動神経",
  "お金を稼ぐ能力の高さ",
  "誰とでもすぐ打ち解けられ好かれるコミュニケーション能力",
  "アルコールへの耐性",
  "体力",
  "何があっても落ち込まないメンタルの強さ",
];

/* ------------------------------------------------------------
   Q9 選択肢一覧（複数選択・順不同）
   ------------------------------------------------------------ */
const Q9_LABELS = {
  "a9-1": "全部旅行に行ったりご馳走を食べに行くなどして祝いたい",
  "a9-2": "全部ではなくていいがどれかは旅行に行ったりご馳走を食べに行くなどして祝いたい",
  "a9-3": "旅行や外食よりも家で祝いたい",
  "a9-4": "毎回プレゼントを贈りあいたい",
  "a9-5": "毎回ではなくてもいいがプレゼントを贈りあいたい",
  "a9-6": "出かけたりプレゼントを用意したりはいらないが、一言お祝いの言葉はほしい",
  "a9-7": "記念日やその付近でのデートでも普段どおりの生活で良い",
};

/* ------------------------------------------------------------
   ランキングUI制御
   ------------------------------------------------------------ */
const rankingState = {
  q4: [],
  q6: [],
};

function rankingKey(groupId) {
  if (groupId === "q4Ranking") return "q4";
  if (groupId === "q6Ranking") return "q6";
  return null;
}

function setupRankingGroup(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  const key = rankingKey(groupId);
  if (!key) return;

  group.querySelectorAll(".rank-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.value;
      const arr   = rankingState[key];
      const idx   = arr.indexOf(value);
      if (idx === -1) { arr.push(value); } else { arr.splice(idx, 1); }
      renderRankingGroup(groupId);
    });
  });
}

function renderRankingGroup(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  const key = rankingKey(groupId);
  if (!key) return;
  const arr = rankingState[key];

  group.querySelectorAll(".rank-option").forEach((btn) => {
    const value = btn.dataset.value;
    const order = arr.indexOf(value);
    const numEl = btn.querySelector(".rank-number");
    if (order === -1) {
      btn.classList.remove("selected");
      numEl.textContent = "";
    } else {
      btn.classList.add("selected");
      numEl.textContent = String(order + 1);
    }
  });
}

function resetRankingGroup(groupId) {
  const key = rankingKey(groupId);
  if (!key) return;
  rankingState[key] = [];
  renderRankingGroup(groupId);
}

/* 復元時：現在のボタンに実在する値のみ採用（古い下書きのずれ防止） */
function restoreRankingGroup(groupId, savedOrder) {
  const key = rankingKey(groupId);
  if (!key) return;
  const group = document.getElementById(groupId);
  const validValues = group
    ? Array.from(group.querySelectorAll(".rank-option")).map(btn => btn.dataset.value)
    : [];
  rankingState[key] = Array.isArray(savedOrder)
    ? savedOrder.filter(v => validValues.includes(v))
    : [];
  renderRankingGroup(groupId);
}

/* ------------------------------------------------------------
   Q9 詳細欄の表示/非表示（a9-4 or a9-5 選択時のみ）
   ------------------------------------------------------------ */
function toggleQ9Detail(values) {
  const el = document.getElementById("q9Detail");
  if (!el) return;
  const arr  = Array.isArray(values) ? values : [];
  const show = arr.includes("a9-4") || arr.includes("a9-5");
  el.style.display = show ? "block" : "none";
  if (!show) el.value = "";
}

function getCheckedQ9() {
  return Array.from(document.querySelectorAll('input[name="q9"]:checked')).map(el => el.value);
}

/* ------------------------------------------------------------
   フォーム値の収集
   ------------------------------------------------------------ */
function collectFormData() {
  const q5Radio  = document.querySelector('input[name="q5"]:checked');
  const q10Radio = document.querySelector('input[name="q10"]:checked');
  const q11Radio = document.querySelector('input[name="q11"]:checked');

  return {
    q1good:   document.getElementById("q1good").value,
    q1bad:    document.getElementById("q1bad").value,
    q2good:   document.getElementById("q2good").value,
    q2bad:    document.getElementById("q2bad").value,
    q3:       document.getElementById("q3").value,
    q4:       rankingState.q4.slice(),
    q5:       q5Radio  ? q5Radio.value  : "",
    q6:       rankingState.q6.slice(),
    q7:       document.getElementById("q7").value,
    q8:       document.getElementById("q8").value,
    q9:       getCheckedQ9(),
    q9Detail: document.getElementById("q9Detail").value,
    q10:      q10Radio ? q10Radio.value : "",
    q11:      q11Radio ? q11Radio.value : "",
    q12:      document.getElementById("q12").value,
  };
}

/* ------------------------------------------------------------
   フォームへの値の復元
   ------------------------------------------------------------ */
function restoreFormData(data) {
  if (!data) return;

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };

  setText("q1good", data.q1good);
  setText("q1bad",  data.q1bad);
  setText("q2good", data.q2good);
  setText("q2bad",  data.q2bad);
  setText("q3",     data.q3);
  setText("q7",     data.q7);
  setText("q8",     data.q8);
  setText("q12",    data.q12);   // ← 修正：全角数字バグを修正

  restoreRankingGroup("q4Ranking", data.q4);
  restoreRankingGroup("q6Ranking", data.q6);

  if (data.q5) {
    const r = document.querySelector(`input[name="q5"][value="${data.q5}"]`);
    if (r) r.checked = true;
  }

  if (Array.isArray(data.q9)) {
    data.q9.forEach((val) => {
      const c = document.querySelector(`input[name="q9"][value="${val}"]`);
      if (c) c.checked = true;
    });
    toggleQ9Detail(data.q9);
    setText("q9Detail", data.q9Detail);
  }

  if (data.q10) {
    const r = document.querySelector(`input[name="q10"][value="${data.q10}"]`);
    if (r) r.checked = true;
  }
  if (data.q11) {
    const r = document.querySelector(`input[name="q11"][value="${data.q11}"]`);
    if (r) r.checked = true;
  }
}

/* ------------------------------------------------------------
   バリデーション（本送信時のみ）
   ------------------------------------------------------------ */
function validate(data) {
  const errors = [];

  if (!data.q1good.trim()) errors.push("Q1: 会社で褒められることを入力してください。");
  if (!data.q1bad.trim())  errors.push("Q1: 会社で注意されることを入力してください。");
  if (!data.q2good.trim()) errors.push("Q2: 友人・元恋人から褒められることを入力してください。");
  if (!data.q2bad.trim())  errors.push("Q2: 友人・元恋人から注意されることを入力してください。");
  if (!data.q3.trim())     errors.push("Q3: 人生で一番大きな壁・挫折について入力してください。");

  const q4Total = document.querySelectorAll("#q4Ranking .rank-option").length;
  const q6Total = document.querySelectorAll("#q6Ranking .rank-option").length;

  if (data.q4.length < q4Total) errors.push("Q4: すべての選択肢を順位付けしてください。");
  if (!data.q5)                 errors.push("Q5: 家族で出かけるときの移動手段を選択してください。");
  if (data.q6.length < q6Total) errors.push("Q6: すべての選択肢を順位付けしてください。");
  if (!data.q7.trim())          errors.push("Q7: 結婚したら2人でしたいことを入力してください。");
  if (!data.q8.trim())          errors.push("Q8: 子どもが生まれたらしたいことを入力してください。");

  if (!data.q9 || data.q9.length === 0)
    errors.push("Q9: イベントごとの過ごし方を選択してください（複数選択可）。");
  if ((data.q9.includes("a9-4") || data.q9.includes("a9-5")) && !data.q9Detail.trim())
    errors.push("Q9: 理想のプレゼント代を入力してください。");

  if (!data.q10) errors.push("Q10: 回答を選択してください。");
  if (!data.q11) errors.push("Q11: 回答を選択してください。");
  if (!data.q12.trim()) errors.push("Q12: 夫婦や家族のなかで守っていきたいルール、家訓を入力してください。");

  return errors;
}

/* ------------------------------------------------------------
   共有URL短縮用：キー名を1文字に変換するマッピング
   ------------------------------------------------------------ */
const SHARE_KEY_MAP = {
  q1good: "a", q1bad: "b", q2good: "c", q2bad: "d", q3: "e",
  q4: "f", q5: "g", q6: "h", q7: "i", q8: "j",
  q9: "k", q9Detail: "l", q10: "m", q11: "n", q12: "o", _shareName: "p",
};
const SHARE_KEY_MAP_REVERSE = Object.fromEntries(
  Object.entries(SHARE_KEY_MAP).map(([k, v]) => [v, k])
);

/* ------------------------------------------------------------
   回答データ → 共有URL（URLセーフBase64・キー短縮）
   ------------------------------------------------------------ */
function encodeDataToURL(data) {
  const compact = {
    ...data,
    q4: data.q4.map((v) => Q4_OPTIONS.indexOf(v)),
    q6: data.q6.map((v) => Q6_OPTIONS.indexOf(v)),
  };
  const shortData = {};
  Object.keys(compact).forEach((key) => {
    shortData[SHARE_KEY_MAP[key] || key] = compact[key];
  });
  const encoded = base64UrlEncode(JSON.stringify(shortData));
  const base    = location.href.split("?")[0].split("#")[0];
  return `${base}?share=${encoded}`;
}

/* ------------------------------------------------------------
   URL → 回答データ（ビューモード・キー復元）
   ------------------------------------------------------------ */
function decodeDataFromURL() {
  const params = new URLSearchParams(location.search);
  const raw    = params.get("share");
  if (!raw) return null;
  try {
    const shortData = JSON.parse(base64UrlDecode(raw));
    const data = {};
    Object.keys(shortData).forEach((key) => {
      data[SHARE_KEY_MAP_REVERSE[key] || key] = shortData[key];
    });
    if (Array.isArray(data.q4)) data.q4 = data.q4.map((i) => Q4_OPTIONS[i]).filter(Boolean);
    if (Array.isArray(data.q6)) data.q6 = data.q6.map((i) => Q6_OPTIONS[i]).filter(Boolean);
    return data;
  } catch (e) {
    console.error("URL decode error", e);
    return null;
  }
}

/* ------------------------------------------------------------
   ランキング配列 → 「1位：◯◯」形式のHTML
   ------------------------------------------------------------ */
function rankingListHTML(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "未回答";
  return arr.map((item, i) => `${i + 1}位：${escapeHTML(item)}`).join("<br>");
}

/* ------------------------------------------------------------
   Q9 選択結果 → 表示用HTML
   ------------------------------------------------------------ */
function q9AnswerHTML(data) {
  const values = Array.isArray(data.q9) ? data.q9 : [];
  if (values.length === 0) return "未回答";
  let html = values.map((v) => `・${escapeHTML(Q9_LABELS[v] || v)}`).join("<br>");
  if ((values.includes("a9-4") || values.includes("a9-5")) && data.q9Detail) {
    html += `<br>（プレゼント代：${escapeHTML(data.q9Detail)}）`;
  }
  return html;
}

/* ------------------------------------------------------------
   ビューモード：回答をカード表示
   ------------------------------------------------------------ */
function renderViewMode(data, options = {}) {
  const { selfPreview = false, onShare = null } = options;

  const q5Labels = {
    "a5-1": "車が多かった",
    "a5-2": "公共交通機関が多かった",
  };

  const q10Labels = {
    "a10-1": "同年代男子に人気な習い事を調べていくつか見学に連れて行く",
    "a10-2": "同年代男子に人気な習い事を調べて資料を見せる",
    "a10-3": "自分が過去に通っていた習い事の話をしてみる",
    "a10-4": "興味がわいたら通わせられるように準備をしつつ今は息子にはこれ以上声かけはしない",
    "a10-5": "子どもをもつことは考えていない",
  };

  const q11Labels = {
    "a11-1": "その日だけは娘1人で帰らせる",
    "a11-2": "親戚か友人などに迎えに行ってもらうように頼む",
    "a11-3": "送迎サービスを探し、お金を払って利用する",
    "a11-4": "夫婦どちらかは間に合うように何がなんでも調整する",
    "a11-5": "子どもをもつことは考えていない",
  };

  // ← 修正：Q12をrows配列の内側に正しく追加
  const rows = [
    { q: "Q1 会社でどんなことを褒められますか？",
      a: `褒められること：${data.q1good || "未回答"}\n注意されること：${data.q1bad || "未回答"}` },
    { q: "Q2 友人や元恋人からどんなことを褒められますか？",
      a: `褒められること：${data.q2good || "未回答"}\n注意されること：${data.q2bad || "未回答"}` },
    { q: "Q3 人生で一番大きな壁・挫折だったと感じる出来事は何ですか？", a: data.q3 || "未回答" },
    { q: "Q4 次の働き方・休暇について、もし実現できたら嬉しい順",
      html: rankingListHTML(data.q4) },
    { q: "Q5 子どものころ、家族で出かけるときの移動手段は？",
      a: q5Labels[data.q5] || "未回答" },
    { q: "Q6 次の中でも手に入るとしたら嬉しい順",
      html: rankingListHTML(data.q6) },
    { q: "Q7 結婚したら2人でしたいことは何ですか？", a: data.q7 || "未回答" },
    { q: "Q8 子どもが生まれたら家族でしたいことは何ですか？", a: data.q8 || "未回答" },
    { q: "Q9 記念日や誕生日、クリスマスなどのイベントごとはどう過ごしたいですか？（複数選択）",
      html: q9AnswerHTML(data) },
    { q: "Q10 習い事に興味がない息子にどうしますか？", a: q10Labels[data.q10] || "未回答" },
    { q: "Q11 塾の迎えに行けない日、どうしますか？",  a: q11Labels[data.q11] || "未回答" },
    { q: "Q12 夫婦や家族のなかで守っていきたいルール、家訓はありますか？", a: data.q12 || "未回答" },
  ];

  // フォーム要素を非表示
  document.querySelectorAll(
    ".container > label, .container > input, .container > textarea, " +
    ".container > div.ranking-group, .container > div.button-group, " +
    ".container > div#shareModal"
  ).forEach(el => (el.style.display = "none"));

  const formURL = location.href.split("?")[0].split("#")[0];

  const descEl = document.querySelector(".form-header .form-description");
  if (descEl) {
    descEl.innerHTML =
      "回答を共有してお互いのことを知りましょう。<br>" +
      "回答内容だけじゃなく、なぜそう思ってるのか、この場合はどう変わるかなども質問し合ってみましょう。";
  }

  const container = document.getElementById("viewMode");
  container.style.display = "block";
  container.innerHTML = `
    ${selfPreview ? `
    <div class="cta-card share-confirm-card">
      <div class="cta-content" style="text-align:center;">
        <h3 class="cta-title">この内容を共有します</h3>
        <p class="cta-text">内容を確認したら、共有先を選んでください。</p>
        <button type="button" id="goShareBtn" class="cta-button">
          共有先を選ぶ <span class="cta-arrow">›</span>
        </button>
      </div>
    </div>
    ` : ""}

    ${!selfPreview ? `
    <div class="view-header">
      <p class="view-label">回答内容</p>
      ${data._shareName ? `<p class="view-name">${escapeHTML(data._shareName)} さんの回答</p>` : ""}
    </div>
    ` : ""}

    ${rows.map(({ q, a, html }) => `
      <div class="view-item">
        <p class="view-question">${escapeHTML(q)}</p>
        <p class="view-answer">${html ? html : escapeHTML(a).replace(/\n/g, "<br>")}</p>
      </div>
    `).join("")}

    ${!selfPreview ? `
    <div class="cta-card">
      <img src="image1.PNG" class="cta-image-left" alt="">
      <div class="cta-content">
        <h3 class="cta-title">あなたの価値観も共有してみませんか？</h3>
        <p class="cta-text">
          婚活・交際前の自己開示は、<br>
          お互いを知る大切なきっかけになります。<br>
          あなたの考えや価値観をアンケートで伝えてみましょう。
        </p>
        <button type="button" id="ctaButton" class="cta-button" data-href="${formURL}">
          私も回答する <span class="cta-arrow">›</span>
        </button>
      </div>
    </div>
    ` : ""}
  `;

  if (selfPreview) {
    const goShareBtn = document.getElementById("goShareBtn");
    if (goShareBtn && typeof onShare === "function") {
      goShareBtn.addEventListener("click", onShare);
    }
    return;
  }

  const ctaButton = document.getElementById("ctaButton");
  if (ctaButton) {
    ctaButton.addEventListener("click", () => {
      if (confirm("自己開示QA part3を開く")) {
        window.location.href = ctaButton.dataset.href;
      }
    });
  }
}

/* ------------------------------------------------------------
   共有メッセージを本人のトーク画面にも送信する
   ------------------------------------------------------------ */
async function sendShareMessageToSelf(previewMsg) {
  try {
    if (liff.isInClient() && liff.isApiAvailable("sendMessages")) {
      await liff.sendMessages([{ type: "text", text: previewMsg }]);
    }
  } catch (e) {
    console.warn("sendMessages (self) skipped:", e);
  }
}

/* ------------------------------------------------------------
   Part4への案内メッセージをトーク画面に送信
   ------------------------------------------------------------ */
async function sendNextPartMessage() {
  try {
    if (liff.isInClient() && liff.isApiAvailable("sendMessages")) {
      await liff.sendMessages([{ type: "text", text: NEXT_PART_MESSAGE }]);
    }
  } catch (e) {
    console.warn("sendMessages skipped:", e);
  }
}

/* ------------------------------------------------------------
   メイン処理
   ------------------------------------------------------------ */
(async () => {

  /* ----- ビューモード判定（LIFFログイン不要） ----- */
  const sharedData = decodeDataFromURL();
  if (sharedData) {
    renderViewMode(sharedData);
    return;
  }

  /* ----- LIFF 初期化 ----- */
  try {
    await liff.init({ liffId: LIFF_ID });
  } catch (e) {
    console.error("LIFF init failed", e);
    alert("LIFFの初期化に失敗しました。");
    return;
  }

  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  /* ----- ランキングUIの初期化 ----- */
  setupRankingGroup("q4Ranking");
  setupRankingGroup("q6Ranking");

  /* ----- Q9 チェックボックス：詳細欄の表示制御 ----- */
  document.querySelectorAll('input[name="q9"]').forEach(c =>
    c.addEventListener("change", () => toggleQ9Detail(getCheckedQ9()))
  );
  toggleQ9Detail(getCheckedQ9());

  /* ----- localStorage から下書き復元 ----- */
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) restoreFormData(JSON.parse(saved));
  } catch (_) {}

  /* ----- 下書き保存 ----- */
  document.getElementById("draftBtn").addEventListener("click", () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(collectFormData()));
      alert("下書きを保存しました。");
    } catch (_) {
      alert("下書きの保存に失敗しました。");
    }
  });

  /* ----- フォームクリア ----- */
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (!confirm("入力内容をすべてクリアしますか？")) return;

    ["q1good","q1bad","q2good","q2bad","q3","q7","q8","q9Detail","q12"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    document.querySelectorAll('input[type="radio"], input[type="checkbox"]')
      .forEach(r => (r.checked = false));

    resetRankingGroup("q4Ranking");
    resetRankingGroup("q6Ranking");

    toggleQ9Detail([]);

    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
  });

  /* ----- 送信ボタン ----- */
  document.getElementById("submitBtn").addEventListener("click", () => {
    const data   = collectFormData();
    const errors = validate(data);

    if (errors.length > 0) {
      alert("以下の項目を入力してください。\n\n" + errors.join("\n"));
      return;
    }

    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (_) {}

    const modal = document.getElementById("shareModal");
    modal.classList.remove("hidden");
    modal.classList.add("show");

    document.getElementById("submitBtn").disabled = true;
  });

  /* ----- 共有ボタン ----- */
  document.getElementById("shareBtn").addEventListener("click", async () => {
    const shareName = document.getElementById("shareName").value.trim();
    const data      = collectFormData();
    data._shareName = shareName;

    const shareURL   = encodeDataToURL(data);
    const previewMsg = shareName
      ? `${shareName}さんの婚活　自己開示QA part3の回答が届きました。\n回答をみる→${shareURL}`
      : `婚活　自己開示QA part3の回答が届きました。\n回答をみる→${shareURL}`;

    const modal = document.getElementById("shareModal");
    modal.classList.remove("show");
    modal.classList.add("hidden");

    await sendShareMessageToSelf(previewMsg);
    await sendNextPartMessage();

    renderViewMode(data, {
      selfPreview: true,
      onShare: () => {
        const lineShareURL = `https://line.me/R/msg/text/?${encodeURIComponent(previewMsg)}`;
        if (liff.isInClient()) {
          window.location.href = lineShareURL;
        } else {
          window.open(lineShareURL, "_blank");
        }
      },
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ----- モーダル外クリックで閉じる ----- */
  document.getElementById("shareModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove("show");
      e.currentTarget.classList.add("hidden");
    }
  });

})();
