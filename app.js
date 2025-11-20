// =========================
// 强制首次刷新（避免缓存）
// =========================
if (!sessionStorage.getItem('reloaded')) {
  sessionStorage.setItem('reloaded', 'true');
  location.reload(true);
}

// =========================
// LeanCloud 初始化
// =========================
AV.init({
  appId: 'C3dq2PBdG2bI1cD6WMtlXU6y-gzGzoHsz',
  appKey: 'gQCrkPGwovInr3mVcBVoF10s',
  serverURL: 'https://C3dq2PBdG2bI1cD6WMtlXU6y.lc-cn-n1-shared.com'
});

// =========================
// 楼层与数据初始化
// =========================
const floorList = ["五教一楼","五教二楼","四教一楼","四教二楼","四教三楼","四教四楼","合班楼"];
const assigned = {}, teacherChoices = {}, submitTime = {};
floorList.forEach(f => assigned[f] = []);

// =========================
// 页面初始化
// =========================
function init() {
  const floorsDiv = document.getElementById('floors');
  floorsDiv.innerHTML = "";

  floorList.forEach(f => {
    const id = "f_" + f;
    const wrapper = document.createElement("div");
    wrapper.style.margin = "8px 0";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.id = id;
    check.value = f;
    if (assigned[f].length >= 2) check.disabled = true;

    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.textContent = `${f} (已选 ${assigned[f].length}/2)`;
    if (assigned[f].length >= 2) label.classList.add("disabled");

    wrapper.appendChild(check);
    wrapper.appendChild(label);
    floorsDiv.appendChild(wrapper);
  });

  updatePublicBoard();
}

// =========================
// 北京时间
// =========================
function getBeijingTimeString() {
  const now = new Date();
  const str = now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const d = new Date(str);
  const pad = s => String(s).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}/${pad(d.getMonth()+1)}/${pad(d.getDate())},${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// =========================
// 更新公共投票板（不显示时间）
// =========================
function updatePublicBoard() {
  const board = document.getElementById('publicBoard');
  board.innerHTML = floorList.map(f => {
    if (assigned[f].length === 0)
      return `${f}：<span style="color:gray">无人选择</span>`;
    return `${f}：${assigned[f].join("，")}`;
  }).join("<br>");
}

// =========================
// 拉取云端投票
// =========================
async function loadVotesFromCloud() {
  try {
    const results = await new AV.Query('Vote').find();
    results.forEach(v => {
      const n = v.get('teacher');
      const c = v.get('choices');
      const t = v.get('time');
      teacherChoices[n] = c;
      c.forEach(f => assigned[f].push(n));
      submitTime[n] = t; // 时间仍然保存，只是不在主页面显示
    });
    init();
  } catch (e) { console.error(e); }
}

// =========================
// 拉取投票标题
// =========================
async function loadTitleFromCloud() {
  try {
    const q = new AV.Query('VoteTitle');
    q.equalTo('key','mainTitle');
    q.limit(1);

    const r = await q.find();
    if (r.length > 0) {
      window.voteTitleObj = r[0];
      document.getElementById('mainTitle').textContent = r[0].get('title');
    }
  } catch (e) { console.error(e); }
}

// =========================
// 保存新标题
// =========================
async function saveNewTitle() {
  const t = document.getElementById('newTitleInput').value.trim();
  if (!t) return;

  closeModal();
  document.getElementById('mainTitle').textContent = t;

  try {
    let obj = window.voteTitleObj;
    if (!obj) {
      const VoteTitle = AV.Object.extend('VoteTitle');
      obj = new VoteTitle();
      obj.set('key','mainTitle');
      window.voteTitleObj = obj;
    }
    obj.set('title', t);
    obj.setACL(new AV.ACL({ "*": { read: true, write: true }}));
    await obj.save();
  } catch (e) { console.error(e); }
}

// =========================
// 提交选择
// =========================
document.getElementById('submitBtn').onclick = async function() {
  const name = document.getElementById('teacherName').value.trim();
  if (!name) return;

  const choices = Array.from(document.querySelectorAll('#floors input:checked'))
                       .map(c => c.value);
  if (choices.length !== 2) return;

  if (teacherChoices[name])
    teacherChoices[name].forEach(f => assigned[f] = assigned[f].filter(n => n !== name));

  for (const f of choices)
    if (assigned[f].length >= 2) return;

  teacherChoices[name] = choices;
  choices.forEach(f => assigned[f].push(name));
  submitTime[name] = getBeijingTimeString();

  try {
    const Vote = AV.Object.extend('Vote');
    const q = new AV.Query('Vote');
    q.equalTo('teacher', name);
    const r = await q.find();

    let obj = r.length > 0 ? r[0] : new Vote();
    obj.set('teacher', name);
    obj.set('choices', choices);
    obj.set('time', submitTime[name]);

    obj.setACL(new AV.ACL({ "*": { read: true, write: true }}));
    await obj.save();

    init();
  } catch (e) { console.error(e); }
};

// =========================
// Modal
// =========================
function openModal() { document.getElementById('modalBg').style.display = "flex"; }
function closeModal() { document.getElementById('modalBg').style.display = "none"; }

// =========================
// 重置全部投票（增加确认）
// =========================
async function resetAll() {
  const ok = confirm("⚠ 确定要重置所有投票吗？此操作不可恢复！");
  if (!ok) return;

  floorList.forEach(f => assigned[f] = []);
  Object.keys(teacherChoices).forEach(k => delete teacherChoices[k]);
  Object.keys(submitTime).forEach(k => delete submitTime[k]);

  try {
    const results = await new AV.Query('Vote').find();
    for (const v of results) {
      v.setACL(new AV.ACL({ "*": { read:true, write:true }}));
      await v.destroy();
    }
  } catch (e) { console.error(e); }

  init();
}

// =========================
// 新增：查看投票详情
// =========================
document.getElementById("viewDetailsBtn").onclick = function() {
  window.location.href = "details.html";
};

// =========================
// 页面加载
// =========================
window.addEventListener('DOMContentLoaded', () => {
  loadVotesFromCloud();
  loadTitleFromCloud();
});
