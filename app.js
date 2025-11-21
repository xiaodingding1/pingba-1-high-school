// =========================
// app.js - 修正版（把事件绑定放到 DOMContentLoaded）
// =========================

// 强制首次刷新（避免缓存）
if (!sessionStorage.getItem('reloaded')) {
  sessionStorage.setItem('reloaded', 'true');
  try { location.reload(true); } catch(e) { location.reload(); }
}

// LeanCloud 初始化
AV.init({
  appId: 'C3dq2PBdG2bI1cD6WMtlXU6y-gzGzoHsz',
  appKey: 'gQCrkPGwovInr3mVcBVoF10s',
  serverURL: 'https://C3dq2PBdG2bI1cD6WMtlXU6y.lc-cn-n1-shared.com'
});

// 全局密码对象（来自云端）
let globalResetPassword = null;   // 存储云端密码对象

// 从云端加载密码（若无则自动创建默认记录）
async function loadPasswordFromCloud() {
  try {
    const q = new AV.Query('VotePassword');
    q.equalTo('key', 'resetPwd');
    q.limit(1);
    const r = await q.find();
    if (r.length > 0) {
      globalResetPassword = r[0];
    } else {
      const VotePassword = AV.Object.extend('VotePassword');
      const obj = new VotePassword();
      obj.set('key', 'resetPwd');
      obj.set('pwd', '123456'); // 默认密码，请上线前改为更安全的初始值
      obj.setACL(new AV.ACL({ "*": { read: true, write: true }}));
      await obj.save();
      globalResetPassword = obj;
    }
  } catch (e) {
    console.error('loadPasswordFromCloud error:', e);
  }
}

// 楼层与数据初始化
const floorList = ["五教一楼","五教二楼","四教一楼","四教二楼","四教三楼","四教四楼","合班楼"];
const assigned = {}, teacherChoices = {}, submitTime = {};
floorList.forEach(f => assigned[f] = []);

// 页面初始化：渲染复选框
function init() {
  const floorsDiv = document.getElementById('floors');
  if (!floorsDiv) return;
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

// 北京时间字符串（使用 Asia/Shanghai）
function getBeijingTimeString() {
  const now = new Date();
  const str = now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const d = new Date(str);
  const pad = s => String(s).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}/${pad(d.getMonth()+1)}/${pad(d.getDate())},${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 更新公共投票板（不显示时间）
function updatePublicBoard() {
  const board = document.getElementById('publicBoard');
  if (!board) return;
  board.innerHTML = floorList.map(f => {
    if (assigned[f].length === 0)
      return `${f}：<span style="color:gray">无人选择</span>`;
    return `${f}：${assigned[f].join("，")}`;
  }).join("<br>");
}

// 拉取云端投票
async function loadVotesFromCloud() {
  try {
    const results = await new AV.Query('Vote').find();
    results.forEach(v => {
      const n = v.get('teacher');
      const c = v.get('choices') || [];
      const t = v.get('time') || '';
      teacherChoices[n] = c;
      c.forEach(f => {
        if (!assigned[f]) assigned[f] = [];
        assigned[f].push(n);
      });
      submitTime[n] = t;
    });
    init();
  } catch (e) {
    console.error('loadVotesFromCloud error:', e);
  }
}

// 拉取投票标题（key = 'mainTitle'）
async function loadTitleFromCloud() {
  try {
    const q = new AV.Query('VoteTitle');
    q.equalTo('key','mainTitle');
    q.limit(1);
    const r = await q.find();
    if (r.length > 0) {
      window.voteTitleObj = r[0];
      const title = r[0].get('title') || '';
      const el = document.getElementById('mainTitle');
      if (el) el.textContent = title;
    }
  } catch (e) {
    console.error('loadTitleFromCloud error:', e);
  }
}

// 保存新标题（不会提示弹窗）
async function saveNewTitle() {
  const input = document.getElementById('newTitleInput');
  if (!input) return;
  const t = input.value.trim();
  if (!t) return;
  closeModal();
  const mainEl = document.getElementById('mainTitle');
  if (mainEl) mainEl.textContent = t;

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
  } catch (e) {
    console.error('saveNewTitle error:', e);
  }
}

// 提交选择（保存到本地和云端）
async function submitChoiceHandler() {
  const nameEl = document.getElementById('teacherName');
  if (!nameEl) return;
  const name = nameEl.value.trim();
  if (!name) return;

  const choices = Array.from(document.querySelectorAll('#floors input:checked')).map(c => c.value);
  if (choices.length !== 2) return;

  if (teacherChoices[name]) teacherChoices[name].forEach(f => assigned[f] = assigned[f].filter(n => n !== name));

  for (const f of choices) if (assigned[f].length >= 2) return;

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
  } catch (e) {
    console.error('submitChoiceHandler error:', e);
  }
}

// Modal 控制
function openModal() { const el = document.getElementById('modalBg'); if (el) el.style.display = 'flex'; }
function closeModal() { const el = document.getElementById('modalBg'); if (el) el.style.display = 'none'; }

// 重置全部投票（带密码验证）
async function resetAll() {
  if (!globalResetPassword) {
    alert("密码尚未加载，请稍后重试");
    return;
  }

  const pwd = prompt("请输入重置密码：");
  if (pwd === null) return;

  if (pwd !== globalResetPassword.get("pwd")) {
    alert("密码错误！");
    return;
  }

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
  } catch (e) {
    console.error('resetAll error:', e);
  }

  init();
}

// 修改密码（通过 prompt 流程）
async function changePwdViaPrompt() {
  if (!globalResetPassword) {
    alert("密码尚未加载，请稍后重试");
    return;
  }

  const oldPwd = prompt("请输入旧密码：");
  if (oldPwd === null) return;

  if (oldPwd !== globalResetPassword.get("pwd")) {
    alert("旧密码错误！");
    return;
  }

  const newPwd = prompt("请输入新密码：");
  if (!newPwd) return;

  try {
    globalResetPassword.set("pwd", newPwd);
    globalResetPassword.setACL(new AV.ACL({ "*": { read:true, write:true }}));
    await globalResetPassword.save();
    alert("密码已成功修改！");
  } catch (e) {
    console.error('changePwdViaPrompt error:', e);
    alert("保存密码时出错");
  }
}

// 跳转到详情页
function goToDetails() {
  window.location.href = "details.html";
}

// 页面加载后绑定事件（保证元素存在）
window.addEventListener('DOMContentLoaded', () => {
  // 并行拉取云端数据（投票、标题、密码），加载完成再显示页面
  Promise.all([
    loadVotesFromCloud(),
    loadTitleFromCloud(),
    loadPasswordFromCloud()
  ]).then(() => {
    // 解除页面隐藏（如果你用了 hidden-before-load）
    if (document.body) document.body.classList.remove('hidden-before-load');

    // 绑定提交按钮
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.addEventListener('click', submitChoiceHandler);

    // 绑定重置按钮 - note: HTML used inline onclick earlier, but safe to bind here as well
    const resetBtn = document.querySelector('.danger[onclick="resetAll()"]') || document.querySelector('.danger');
    // If there is a dedicated id for reset, prefer it:
    const resetById = document.getElementById('resetAllBtn');
    const actualResetBtn = resetById || resetBtn;
    if (actualResetBtn) {
      actualResetBtn.addEventListener('click', (e) => {
        // If HTML already uses inline onclick, it's fine; we call same function
        // But ensure we don't double-call if inline exists; use event.stopImmediatePropagation not necessary here
        resetAll();
      });
    }

    // 绑定“查看详情”按钮
    const viewBtn = document.getElementById('viewDetailsBtn');
    if (viewBtn) viewBtn.addEventListener('click', goToDetails);

    // 绑定“修改密码”按钮（如果存在）
    const changePwdBtn = document.getElementById('changePwdBtn');
    if (changePwdBtn) changePwdBtn.addEventListener('click', changePwdViaPrompt);

    // 绑定打开/关闭 modal 的按钮（安全绑定）
    const openTitleBtn = document.querySelector('button[onclick="openModal()"]');
    if (openTitleBtn) openTitleBtn.addEventListener('click', openModal);
    const modalCloseBtn = document.querySelector('#modalBg .danger');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    // 绑定保存标题按钮 inside modal (if exists)
    const saveTitleBtn = document.querySelector('#modalBg button:not(.danger)');
    if (saveTitleBtn) saveTitleBtn.addEventListener('click', saveNewTitle);
  }).catch(err => {
    console.error('initial load error:', err);
    if (document.body) document.body.classList.remove('hidden-before-load');
  });
});
