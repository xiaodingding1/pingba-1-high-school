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
const floorList = [
  "五教一楼", "五教二楼",
  "四教一楼", "四教二楼", "四教三楼", "四教四楼",
  "合班楼"
];

// 每个楼层最多可选2人
const assigned = {};
floorList.forEach(f => assigned[f] = []);

// 记录老师选择
const teacherChoices = {};
const submitTime = {};

// =========================
// 页面初始化函数
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
// 获取北京时间字符串
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
// 更新投票显示
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
// 加载云端投票
// =========================
async function loadVotesFromCloud() {
  try {
    const query = new AV.Query('Vote');
    const results = await query.find();

    results.forEach(vote => {
      const name = vote.get('teacher');
      const choices = vote.get('choices');
      const time = vote.get('time');

      teacherChoices[name] = choices;
      choices.forEach(f => assigned[f].push(name));
      submitTime[name] = time;
    });

    init();
  } catch (e) {
    console.error(e);
    alert("加载云端数据失败！");
  }
}

// =========================
// 保存/更新投票标题到云端（固定 key，确保唯一）
// =========================
async function loadTitleFromCloud() {
  try {
    const query = new AV.Query('VoteTitle');
    query.equalTo('key', 'mainTitle'); // 固定 key
    query.limit(1);
    const results = await query.find();
    if (results.length > 0) {
      const titleObj = results[0];
      const title = titleObj.get('title');
      document.getElementById('mainTitle').textContent = title;
      window.voteTitleObj = titleObj; // 缓存对象方便更新
    }
  } catch (e) {
    console.error(e);
    alert("加载投票标题失败！");
  }
}

async function saveNewTitle() {
  const newTitle = document.getElementById('newTitleInput').value.trim();
  if (!newTitle) return;

  document.getElementById('mainTitle').textContent = newTitle;
  closeModal();

  try {
    let titleObj;
    if (window.voteTitleObj) {
      titleObj = window.voteTitleObj;
    } else {
      const VoteTitle = AV.Object.extend('VoteTitle');
      titleObj = new VoteTitle();
      titleObj.set('key', 'mainTitle'); // 设置固定 key
      window.voteTitleObj = titleObj;
    }
    titleObj.set('title', newTitle);
    titleObj.setACL(new AV.ACL({ "*": { read: true, write: true } })); // 所有人可读写
    await titleObj.save();
    alert("投票标题已保存到云端！");
  } catch (e) {
    console.error(e);
    alert("保存投票标题失败！");
  }
}

// =========================
// 提交选择（保存到本地和云端）
// =========================
document.getElementById('submitBtn').onclick = async function() {
  const name = document.getElementById('teacherName').value.trim();
  if (!name) { alert("请输入姓名"); return; }

  const choices = Array.from(document.querySelectorAll('#floors input:checked')).map(c => c.value);
  if (choices.length !== 2) { alert("必须选择 2 个楼层"); return; }

  // 撤销本地原选择
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

  // 登记本地数据
  teacherChoices[name] = choices;
  choices.forEach(f => assigned[f].push(name));
  submitTime[name] = getBeijingTimeString();

  // 保存到 LeanCloud
  try {
    const Vote = AV.Object.extend('Vote');
    const query = new AV.Query('Vote');
    query.equalTo('teacher', name);
    const results = await query.find();

    let voteObj;
    if (results.length > 0) {
      voteObj = results[0]; // 更新已有记录
    } else {
      voteObj = new Vote(); // 新建记录
    }

    voteObj.set('teacher', name);
    voteObj.set('choices', choices);
    voteObj.set('time', submitTime[name]);

    // 设置 ACL：所有人可读写
    voteObj.setACL(new AV.ACL({ "*": { read: true, write: true } }));

    await voteObj.save();
    alert("提交成功并保存到云端！");
    init();
  } catch (e) {
    console.error(e);
    alert("保存到云端失败！");
  }
};

// =========================
// Modal 功能
// =========================
function openModal() { document.getElementById('modalBg').style.display = "flex"; }
function closeModal() { document.getElementById('modalBg').style.display = "none"; }

// =========================
// 重置投票（同步云端）
// =========================
async function resetAll() {
  if (!confirm("确定要重置所有投票吗？")) return;

  floorList.forEach(f => assigned[f] = []);
  for (const k in teacherChoices) delete teacherChoices[k];
  for (const k in submitTime) delete submitTime[k];

  try {
    const query = new AV.Query('Vote');
    const results = await query.find();
    for (const vote of results) {
      vote.setACL(new AV.ACL({ "*": { read: true, write: true } }));
      await vote.destroy();
    }
    alert("已重置云端投票数据");
  } catch (e) {
    console.error(e);
    alert("云端重置失败");
  }

  init();
}

// =========================
// 页面加载时拉取云端数据和标题
// =========================
window.addEventListener('DOMContentLoaded', () => {
  loadVotesFromCloud();
  loadTitleFromCloud();
});
