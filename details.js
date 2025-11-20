// =========================
// LeanCloud 初始化（与 index.html 一致）
// =========================
AV.init({
  appId: 'C3dq2PBdG2bI1cD6WMtlXU6y-gzGzoHsz',
  appKey: 'gQCrkPGwovInr3mVcBVoF10s',
  serverURL: 'https://C3dq2PBdG2bI1cD6WMtlXU6y.lc-cn-n1-shared.com'
});

// =========================
// 返回主页
// =========================
function goHome() {
  window.location.href = "index.html";
}

// =========================
// 加载所有投票详细
// =========================
async function loadDetails() {
  const container = document.getElementById("detailList");
  container.innerHTML = "加载中...";

  try {
    const q = new AV.Query('Vote');
    q.ascending('teacher');  // 按姓名排序
    const results = await q.find();

    if (results.length === 0) {
      container.innerHTML = "<span style='color:gray'>暂无任何投票记录</span>";
      return;
    }

    container.innerHTML = results.map(v => {
      const teacher = v.get('teacher');
      const choices = v.get('choices') || [];
      const time = v.get('time') || "未知时间";

      return `
        <div class="item">
          <strong>${teacher}</strong><br>
          楼层：${choices.join("，")}<br>
          时间：${time}
        </div>
      `;
    }).join("");

  } catch (e) {
    console.error(e);
    container.innerHTML = "<span style='color:red'>加载失败，请检查网络或云端权限</span>";
  }
}

window.addEventListener('DOMContentLoaded', loadDetails);
