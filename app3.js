/* ============================================================
   婚活自己開示QA Part3 – app.js
   ============================================================ */

const LIFF_ID   = "YOUR_LIFF_ID"; // ← 実際のLIFF IDに差し替えてください
const DRAFT_KEY = "konkatsu_qa_part3_draft";

/* ------------------------------------------------------------
   URLセーフ Base64 エンコード／デコード
   ------------------------------------------------------------ */
function base64UrlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
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
   ランキングUI制御
   各ランキンググループごとに「選択順」を配列で保持する。
   クリック：
     - 未選択 → 末尾に追加し、その順位番号を表示
     - 選択済み → 配列から除去し、それより後ろの順位番号を1つずつ繰り上げる
   ------------------------------------------------------------ */
const rankingState = {
  q3: [],
  q4: [],
};

function setupRankingGroup(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;

  group.querySelectorAll(".rank-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.value;
      const arr   = rankingState[groupId === "q3Ranking" ? "q3" : "q4"];
      const key   = groupId === "q3Ranking" ? "q3" : "q4";

      const idx = arr.indexOf(value);

      if (idx === -1) {
        // 未選択 → 追加
        arr.push(value);
      } else {
        // 選択済み → 除去
        arr.splice(idx, 1);
      }

      rankingState[key] = arr;
      renderRankingGroup(groupId);
    });
  });
}

function renderRankingGroup(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;

  const key = groupId === "q3Ranking" ? "q3" : "q4";
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
  const key = groupId === "q3Ranking" ? "q3" : "q4";
  rankingState[key] = [];
  renderRankingGroup(groupId);
}

function restoreRankingGroup(groupId, savedOrder) {
  const key = groupId === "q3Ranking" ? "q3" : "q4";
  rankingState[key] = Array.isArray(savedOrder) ? savedOrder.slice() : [];
  renderRankingGroup(groupId);
}

/* ------------------------------------------------------------
   フォーム値の収集
   ------------------------------------------------------------ */
function collectFormData() {
  const q7Radio = document.querySelector('input[name="q7"]:checked');
  const q8Radio = document.querySelector('input[name="q8"]:checked');

  return {
    q1good: document.getElementById("q1good").value,
    q1bad:  document.getElementById("q1bad").value,
    q2good: document.getElementById("q2good").value,
    q2bad:  document.getElementById("q2bad").value,
    q3: rankingState.q3.slice(),
    q4: rankingState.q4.slice(),
    q5: document.getElementById("q5").value,
    q6: document.getElementById("q6").value,
    q7: q7Radio ? q7Radio.value : "",
    q8: q8Radio ? q8Radio.value : "",
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
  setText("q5",     data.q5);
  setText("q6",     data.q6);

  restoreRankingGroup("q3Ranking", data.q3);
  restoreRankingGroup("q4Ranking", data.q4);

  if (data.q7) {
    const r = document.querySelector(`input[name="q7"][value="${data.q7}"]`);
    if (r) r.checked = true;
  }
  if (data.q8) {
    const r = document.querySelector(`input[name="q8"][value="${data.q8}"]`);
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

  const q3Total = document.querySelectorAll("#q3Ranking .rank-option").length;
  const q4Total = document.querySelectorAll("#q4Ranking .rank-option").length;

  if (data.q3.length < q3Total) errors.push("Q3: すべての選択肢を順位付けしてください。");
  if (data.q4.length < q4Total) errors.push("Q4: すべての選択肢を順位付けしてください。");

  if (!data.q5.trim()) errors.push("Q5: 結婚したら2人でしたいことを入力してください。");
  if (!data.q6.trim()) errors.push("Q6: 子どもが生まれたらしたいことを入力してください。");
  if (!data.q7)        errors.push("Q7: 回答を選択してください。");
  if (!data.q8)        errors.push("Q8: 回答を選択してください。");

  return errors;
}

/* ------------------------------------------------------------
   回答データ → 共有URL（URLセーフBase64）
   ------------------------------------------------------------ */
function encodeDataToURL(data) {
  const encoded = base64UrlEncode(JSON.stringify(data));
  const base    = location.href.split("?")[0].split("#")[0];
  return `${base}?share=${encoded}`;
}

/* ------------------------------------------------------------
   URL → 回答データ（ビューモード）
   ------------------------------------------------------------ */
function decodeDataFromURL() {
  const params = new URLSearchParams(location.search);
  const raw    = params.get("share");
  if (!raw) return null;
  try {
    return JSON.parse(base64UrlDecode(raw));
  } catch (e) {
    console.error("URL decode error", e);
    return null;
  }
}

/* ------------------------------------------------------------
   ランキング配列 → 「1位：◯◯」形式のHTML（昇順）
   ------------------------------------------------------------ */
function rankingListHTML(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "未回答";

  return arr
    .map((item, i) => `${i + 1}位：${escapeHTML(item)}`)
    .join("<br>");
}

/* ------------------------------------------------------------
   ビューモード：回答をカード表示
   ------------------------------------------------------------ */
function renderViewMode(data) {
  const q7Labels = {
    "a7-1": "同年代男子に人気な習い事を調べていくつか見学に連れて行く",
    "a7-2": "同年代男子に人気な習い事を調べて資料を見せる",
    "a7-3": "自分が過去に通っていた習い事の話をしてみる",
    "a7-4": "興味がわいたら通わせられるように準備をしつつ今は息子にはこれ以上声かけはしない",
    "a7-5": "子どもをもつことは考えていない",
  };

  const q8Labels = {
    "a8-1": "その日だけは娘1人で帰らせる",
    "a8-2": "親戚か友人などに迎えに行ってもらうように頼む",
    "a8-3": "送迎サービスを探し、お金を払って利用する",
    "a8-4": "夫婦どちらかは間に合うように何がなんでも調整する",
    "a8-5": "子どもをもつことは考えていない",
  };

  const rows = [
    { q: "Q1 会社でどんなことを褒められますか？",
      a: `褒められること：${data.q1good || "未回答"}\n注意されること：${data.q1bad || "未回答"}` },
    { q: "Q2 友人や元恋人からどんなことを褒められますか？",
      a: `褒められること：${data.q2good || "未回答"}\n注意されること：${data.q2bad || "未回答"}` },
    { q: "Q3 次の働き方・休暇について、もし実現できたら嬉しい順",
      html: rankingListHTML(data.q3) },
    { q: "Q4 次の中でも手に入るとしたら嬉しい順",
      html: rankingListHTML(data.q4) },
    { q: "Q5 結婚したら2人でしたいことは何ですか？", a: data.q5 || "未回答" },
    { q: "Q6 子どもが生まれたら家族でしたいことは何ですか？", a: data.q6 || "未回答" },
    { q: "Q7 習い事に興味がない息子にどうしますか？", a: q7Labels[data.q7] || "未回答" },
    { q: "Q8 塾の迎えに行けない日、どうしますか？", a: q8Labels[data.q8] || "未回答" },
  ];

  // フォーム要素を非表示
  document.querySelectorAll(
    ".container > label, .container > input, .container > textarea, " +
    ".container > div.ranking-group, .container > div.button-group, " +
    ".container > div#shareModal"
  ).forEach(el => (el.style.display = "none"));

  const container = document.getElementById("viewMode");
  container.style.display = "block";
  container.innerHTML = `
    <div class="view-header">
      <p class="view-label">回答内容</p>
      ${data._shareName ? `<p class="view-name">${escapeHTML(data._shareName)} さんの回答</p>` : ""}
    </div>
    ${rows.map(({ q, a, html }) => `
      <div class="view-item">
        <p class="view-question">${escapeHTML(q)}</p>
        <p class="view-answer">${html ? html : escapeHTML(a).replace(/\n/g, "<br>")}</p>
      </div>
    `).join("")}
  `;
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
  setupRankingGroup("q3Ranking");
  setupRankingGroup("q4Ranking");

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

    ["q1good","q1bad","q2good","q2bad","q5","q6"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    document.querySelectorAll('input[type="radio"]').forEach(r => (r.checked = false));

    resetRankingGroup("q3Ranking");
    resetRankingGroup("q4Ranking");

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

    // 前回の回答として保存（次回編集時に復元できるようにする）
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (_) {}

    const modal = document.getElementById("shareModal");
    modal.classList.remove("hidden");
    modal.classList.add("show");

    document.getElementById("submitBtn").disabled = true;
  });

  /* ----- 共有ボタン ----- */
  document.getElementById("shareBtn").addEventListener("click", () => {
    const shareName = document.getElementById("shareName").value.trim();
    const data      = collectFormData();
    data._shareName = shareName;

    const shareURL   = encodeDataToURL(data);
    const previewMsg = shareName
      ? `${shareName}さんの婚活　自己開示QA part3の回答が届きました。\n回答をみる→${shareURL}`
      : `婚活　自己開示QA part3の回答が届きました。\n回答をみる→${shareURL}`;

    // モーダルを閉じる
    const modal = document.getElementById("shareModal");
    modal.classList.remove("show");
    modal.classList.add("hidden");

    const lineShareURL = `https://line.me/R/msg/text/?${encodeURIComponent(previewMsg)}`;

    if (liff.isInClient()) {
      window.location.href = lineShareURL;
    } else {
      window.open(lineShareURL, "_blank");
    }
  });

  /* ----- モーダル外クリックで閉じる ----- */
  document.getElementById("shareModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove("show");
      e.currentTarget.classList.add("hidden");
    }
  });

})();
