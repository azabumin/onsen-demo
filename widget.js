/*!
 * 温泉AIコンシェルジュ — 埋め込みウィジェット
 * ------------------------------------------------------------------
 * 旅館さまの既存サイトに <script> 一行を貼るだけで、右下に多言語ご案内
 * ボタンが出ます。押すとコンシェルジュが開きます。
 *
 *   <script src="https://azabumin.github.io/onsen-demo/widget.js"
 *           data-inn="湯の音旅館" defer></script>
 *
 * 設計上の判断:
 *  - Shadow DOM に閉じ込める。旅館さまのサイトのCSSと絶対にぶつからない。
 *    （既存サイトの見た目を1pxも変えないことが導入の絶対条件）
 *  - 依存ライブラリなし。読み込み約6KB。表示速度に影響しない。
 *  - iframe の src は自分自身の script src から導出する。設置先が
 *    どこでも、URLを書き換える必要がない。
 *  - 二重読み込みしても安全。
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  if (window.__onsenConciergeLoaded) return;   // 二重読み込み防止
  window.__onsenConciergeLoaded = true;

  var me  = document.currentScript ||
            (function (s) { return s[s.length - 1]; })(document.getElementsByTagName("script"));
  var base = me && me.src ? me.src.replace(/\/[^\/]*$/, "/") : "";
  var INN  = (me && me.getAttribute("data-inn")) || "";
  var LANG = (me && me.getAttribute("data-lang")) || "";
  var SIDE = (me && me.getAttribute("data-side")) === "left" ? "left" : "right";

  var src = base + "index.html";
  var q = [];
  if (INN)  q.push("inn="  + encodeURIComponent(INN));
  if (LANG) q.push("lang=" + encodeURIComponent(LANG));
  if (q.length) src += "?" + q.join("&");

  // ── ボタンの文言。4言語を順に見せて「自分の言葉がある」と気づかせる ──
  var LABELS = [
    { t: "多言語ご案内",  s: "日本語" },
    { t: "다국어 안내",   s: "한국어" },
    { t: "Guide",         s: "English" },
    { t: "多語言指南",    s: "繁體中文" }
  ];

  var host = document.createElement("div");
  host.setAttribute("data-onsen-concierge", "");
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  root.innerHTML = [
    "<style>",
    ":host,*{box-sizing:border-box}",
    ".wrap{position:fixed;bottom:20px;", SIDE, ":20px;z-index:2147483000;",
    "  font-family:'Meiryo','メイリオ','Malgun Gothic','Hiragino Sans',",
    "    'Noto Sans JP',system-ui,sans-serif}",

    /* ボタン */
    ".btn{display:flex;align-items:center;gap:10px;border:none;cursor:pointer;",
    "  background:#2f4858;color:#fff;padding:13px 19px;border-radius:999px;",
    "  box-shadow:0 4px 18px rgba(36,31,28,.28);font-family:inherit;",
    "  transition:transform .18s ease,box-shadow .18s ease}",
    ".btn:hover{transform:translateY(-2px);box-shadow:0 7px 24px rgba(36,31,28,.34)}",
    ".btn:focus-visible{outline:3px solid #c9a875;outline-offset:3px}",
    ".ic{font-size:19px;line-height:1}",
    ".tx{text-align:", SIDE === "left" ? "left" : "right", ";line-height:1.3}",
    ".t1{font-size:13.5px;font-weight:700;display:block;white-space:nowrap}",
    ".t2{font-size:10px;color:#a8bcc6;display:block;white-space:nowrap;letter-spacing:.04em}",

    /* パネル */
    ".ovl{position:fixed;inset:0;background:rgba(24,32,38,.42);opacity:0;",
    "  pointer-events:none;transition:opacity .22s ease}",
    ".ovl.on{opacity:1;pointer-events:auto}",
    ".panel{position:fixed;bottom:20px;", SIDE, ":20px;width:400px;height:min(680px,calc(100vh - 40px));",
    "  background:#f7f4ef;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;",
    "  box-shadow:0 18px 60px rgba(24,32,38,.34);opacity:0;transform:translateY(14px) scale(.985);",
    "  pointer-events:none;transition:opacity .22s ease,transform .22s ease;z-index:2147483001}",
    ".panel.on{opacity:1;transform:none;pointer-events:auto}",
    ".bar{background:#2f4858;color:#fff;display:flex;align-items:center;justify-content:space-between;",
    "  padding:11px 12px 11px 16px;flex-shrink:0}",
    ".bar b{font-size:13px;font-weight:700}",
    ".x{background:none;border:none;color:#c5d3da;font-size:21px;line-height:1;cursor:pointer;",
    "  padding:3px 8px;border-radius:7px;font-family:inherit}",
    ".x:hover{background:rgba(255,255,255,.14);color:#fff}",
    ".x:focus-visible{outline:2px solid #c9a875;outline-offset:1px}",
    "iframe{border:0;width:100%;flex:1;background:#f7f4ef}",

    /* スマートフォンは全画面。旅館さまのお客様の大半はスマホ */
    "@media (max-width:520px){",
    "  .panel{inset:0;width:100%;height:100%;border-radius:0;bottom:auto;", SIDE, ":auto}",
    "  .wrap{bottom:14px;", SIDE, ":14px}",
    "  .btn{padding:12px 16px}",
    "}",
    "@media (prefers-reduced-motion:reduce){",
    "  .btn,.ovl,.panel{transition:none}.btn:hover{transform:none}",
    "}",
    "</style>",

    '<div class="ovl" part="overlay"></div>',
    '<div class="wrap">',
    '  <button class="btn" type="button" aria-haspopup="dialog" aria-expanded="false">',
    '    <span class="ic" aria-hidden="true">&#9832;</span>',
    '    <span class="tx"><span class="t1"></span><span class="t2"></span></span>',
    "  </button>",
    "</div>",
    '<div class="panel" role="dialog" aria-modal="true" aria-label="多言語ご案内">',
    '  <div class="bar"><b></b>',
    '    <button class="x" type="button" aria-label="閉じる">&#215;</button>',
    "  </div>",
    "</div>"
  ].join("");

  var ovl   = root.querySelector(".ovl");
  var btn   = root.querySelector(".btn");
  var panel = root.querySelector(".panel");
  var close = root.querySelector(".x");
  var t1    = root.querySelector(".t1");
  var t2    = root.querySelector(".t2");
  root.querySelector(".bar b").textContent = INN ? INN + " ご案内" : "多言語ご案内";

  // ラベルを順に切り替える。動きは控えめに（旅館サイトで浮かないこと）
  var i = 0;
  function paint() { t1.textContent = LABELS[i].t; t2.textContent = LABELS[i].s; }
  paint();
  var rotate = setInterval(function () {
    if (panel.classList.contains("on")) return;      // 開いている間は止める
    i = (i + 1) % LABELS.length;
    paint();
  }, 2600);

  var frame = null, opened = false;

  function open() {
    if (opened) return;
    opened = true;
    if (!frame) {                                     // 初回クリックまで読み込まない
      frame = document.createElement("iframe");
      frame.src = src;
      frame.title = "多言語ご案内";
      frame.setAttribute("loading", "lazy");
      panel.appendChild(frame);
    }
    ovl.classList.add("on");
    panel.classList.add("on");
    btn.setAttribute("aria-expanded", "true");
    close.focus();
  }

  function shut() {
    if (!opened) return;
    opened = false;
    ovl.classList.remove("on");
    panel.classList.remove("on");
    btn.setAttribute("aria-expanded", "false");
    btn.focus();
  }

  btn.addEventListener("click", open);
  close.addEventListener("click", shut);
  ovl.addEventListener("click", shut);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && opened) shut();
  });

  function mount() { (document.body || document.documentElement).appendChild(host); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // 旅館さま側から操作したい場合のために最小限だけ公開する
  window.OnsenConcierge = { open: open, close: shut, stopRotate: function () { clearInterval(rotate); } };
})();
