// 引入 LeanCloud SDK
// 注意：在 index.html 里已经通过 <script src="https://cdn1.lncld.net/static/js/3.14.1/av-min.js"></script> 引入了 SDK

// 初始化 LeanCloud
AV.init({
  appId: 'C3dq2PBdG2bI1cD6WMtlXU6y-gzGzoHsz',
  appKey: 'gQCrkPGwovInr3mVcBVoF10s',
  serverURL: 'https://C3dq2PBdG2bI1cD6WMtlXU6y.lc-cn-n1-shared.com'
});


// =========================
// 初始化 LeanCloud SDK（如果需要持久化）
// =========================
// AV.init({
//   appId: '你的 AppID',
//   appKey: '你的 AppKey',
//   serverURL: 'https://你的AppID.lc-cn-n1-shared.com'
// });

// =========================
// 楼层与数据初始化
// =========================
const floorList = [
  "五教一楼", "五教二楼",
  "四教一楼",   // 新增
  "四教二楼", "四教三楼", "四教四楼",
  "合班楼"
];

// 每个楼层最多可选2人
const assigned = {};
floorList.forEach(f => assigned[f] = []);

// 记录老师选择
const teacherChoices = {};
const submitTime = {};

// =========================
// 初始化页面
// =========================
function init() {
  const floorDiv = document.getElementById('floors');
  floorDiv.innerHTML = "";

  floorList.forEach(floor => {
    const id = "f_" + floor;

    const wrapper = document.createElement("div");
    wrapper.style.margin = "8px 0";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.id = id;
    check.value = floor;

    if (assigned[floor].length >= 2) check.disabled = true;

    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.textContent = `${floor} (已选 ${assigned[floor].length}/2)`;
    if (assigned[floor].length >= 2) label.classList.add("disabled");

    wrapper.appendChild(check);
    wrapper.appendChild(label);
    floorDiv.appendChild(wrapper);
  });

  updatePublicBoard();
}

// =========================
// 更新时间显示
// =========================
function getBeijingTimeString() {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000);
  const y = String(beijing.getUTCFullYear()).slice(2);
  const m = String(beijing.getUTCMonth() + 1).padStart(2,'0');
  const d = String(beijing.getUTCDate()).padStart(2,'0');
  const hh = String(beijing.getUTCHours()).padStart(2,'0');
  const mm = String(beijing.getUTCMinutes()).padStart(2,'0');
  const ss = String(beijing.getUTCSeconds()).padStart(2,'0');
  return `${y}/${m}/${d},${hh}:${mm}:${ss}`;
}

// =========================
// 更新统计显示
// =========================
function updatePublicBoard() {
  const board = document.getElementById('publicBoard');
  let html = "";

  floorList.forEach(f => {
    if (assigned[f].length === 0) {
      html += `${f}：<span style="color:gray">无人选择</span><br>`;
    } else {
      const list = assigned[f].map(n => `${n}（${submitTime[n]}）`);
      html += `${f}：${list.join("，")}<br>`;
    }
  });

  board.innerHTML = html;
}

// =========================
// 提交选择
// =========================
document.getElementById('submitBtn').onclick = function() {
  const name = document.getElementById('teacherName').value.trim();
  if (!name) { alert("请输入姓名"); return; }

  const choices = Array.from(document.querySelectorAll('#floors input:checked')).map(c => c.value);
  if (choices.length !== 2) { alert("必须选择 2 个楼层"); return; }

  // 如果之前选过，撤销
  if (teacherChoices[name]) {
    teacherChoices[name].forEach(f => {
      assigned[f] = assigned[f].filter(n => n !== name);
    });
  }

  // 检查人数上限
  for (const f of choices) {
    if (assigned[f].length >= 2) {
      alert(`${f} 名额已满`);
      return;
    }
  }

  // 登记选择
  teacherChoices[name] = choices;
  choices.forEach(f => assigned[f].push(name));
  submitTime[name] = getBeijingTimeString();

  alert("提交成功！");
  init();
};

// =========================
// Modal 功能
// =========================
function openModal() { document.getElementById('modalBg').style.display = "flex"; }
function closeModal() { document.getElementById('modalBg').style.display = "none"; }
function saveNewTitle() {
  const v = document.getElementById('newTitleInput').value.trim();
  if (v) document.getElementById('mainTitle').textContent = v;
  closeModal();
}

// =========================
// 重置投票
// =========================
function resetAll() {
  if (!confirm("确定要重置所有投票吗？")) return;
  floorList.forEach(f => assigned[f] = []);
  for (const k in teacherChoices) delete teacherChoices[k];
  for (const k in submitTime) delete submitTime[k];
  init();
}

// 初始化
init();
