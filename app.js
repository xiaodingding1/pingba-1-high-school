if(!sessionStorage.getItem('reloaded')){
    sessionStorage.setItem('reloaded','true');
    try{ location.reload(true); }catch(e){ location.reload(); }
}

AV.init({
    appId:'C3dq2PBdG2bI1cD6WMtlXU6y-gzGzoHsz',
    appKey:'gQCrkPGwovInr3mVcBVoF10s',
    serverURL:'https://C3dq2PBdG2bI1cD6WMtlXU6y.lc-cn-n1-shared.com'
});

let globalResetPassword = null;
async function loadPasswordFromCloud(){
    try{
        const r = await new AV.Query('VotePassword').equalTo('key','resetPwd').limit(1).find();
        if(r.length > 0) globalResetPassword = r[0];
        else{
            const obj = new (AV.Object.extend('VotePassword'))();
            obj.set('key','resetPwd');
            obj.set('pwd','123456');
            obj.setACL(new AV.ACL({"*":{read:true,write:true}}));
            await obj.save();
            globalResetPassword = obj;
        }
    }catch(e){ console.error(e); }
}

const floorList=["五教一楼","五教二楼","四教一楼","四教二楼","四教三楼","四教四楼","合班楼"];
const assigned={},teacherChoices={},submitTime={};
floorList.forEach(f=>assigned[f]=[]);

function init(){
    const floorsDiv = document.getElementById('floors'); if(!floorsDiv) return; floorsDiv.innerHTML="";
    floorList.forEach(f=>{
        const id="f_"+f, wr=document.createElement('div'); wr.style.margin="8px 0";
        const chk=document.createElement('input'); chk.type="checkbox"; chk.id=id; chk.value=f;
        if(assigned[f].length>=2) chk.disabled=true;
        const lbl=document.createElement('label'); lbl.setAttribute('for',id);
        lbl.textContent=`${f} (已选 ${assigned[f].length}/2)`;
        if(assigned[f].length>=2) lbl.classList.add('disabled');
        wr.appendChild(chk); wr.appendChild(lbl); floorsDiv.appendChild(wr);
    });
    updatePublicBoard();
}

function getBeijingTimeString(){
    const d=new Date(new Date().toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"}));
    const p=s=>String(s).padStart(2,'0');
    return `${String(d.getFullYear()).slice(2)}/${p(d.getMonth()+1)}/${p(d.getDate())},${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function updatePublicBoard(){
    const board=document.getElementById('publicBoard');if(!board)return;
    board.innerHTML=floorList.map(f=>assigned[f].length?`${f}：${assigned[f].join('，')}`:`${f}：<span style="color:gray">无人选择</span>`).join('<br>');
}

async function loadVotesFromCloud(){
    try{
        const r = await new AV.Query('Vote').find();
        r.forEach(v=>{
            const n=v.get('teacher'), c=v.get('choices')||[], t=v.get('time')||'';
            teacherChoices[n]=c;
            c.forEach(f=>{ if(!assigned[f]) assigned[f]=[]; assigned[f].push(n); });
            submitTime[n]=t;
        });
        init();
    }catch(e){ console.error(e); }
}

async function loadTitleFromCloud(){
    try{
        const r = await new AV.Query('VoteTitle').equalTo('key','mainTitle').limit(1).find();
        if(r.length>0){
            window.voteTitleObj=r[0];
            const t=r[0].get('title')||'';
            const el=document.getElementById('mainTitle');
            if(el) el.textContent = t;
        }
    }catch(e){ console.error(e); }
}

async function saveNewTitle(){
    const inp=document.getElementById('newTitleInput'); if(!inp) return;
    const t=inp.value.trim(); if(!t) return; closeModal();
    const el=document.getElementById('mainTitle'); if(el) el.textContent=t;
    try{
        let obj=window.voteTitleObj;
        if(!obj){ obj=new(AV.Object.extend('VoteTitle'))(); obj.set('key','mainTitle'); window.voteTitleObj=obj; }
        obj.set('title',t);
        obj.setACL(new AV.ACL({"*":{read:true,write:true}}));
        await obj.save();
    }catch(e){ console.error(e); }
}

async function submitChoiceHandler(){
    const nameEl=document.getElementById('teacherName');if(!nameEl)return;const name=nameEl.value.trim();if(!name)return;
    const choices=Array.from(document.querySelectorAll('#floors input:checked')).map(c=>c.value);if(choices.length!==2)return;
    if(teacherChoices[name])teacherChoices[name].forEach(f=>assigned[f]=assigned[f].filter(n=>n!==name));
    for(const f of choices) if(assigned[f].length>=2) return;
    teacherChoices[name]=choices;choices.forEach(f=>assigned[f].push(name));submitTime[name]=getBeijingTimeString();
    try{
        const Vote=AV.Object.extend('Vote');
        const r=await new AV.Query('Vote').equalTo('teacher',name).find();
        const obj=r.length>0?r[0]:new Vote();
        obj.set('teacher',name); obj.set('choices',choices); obj.set('time',submitTime[name]);
        obj.setACL(new AV.ACL({"*":{read:true,write:true}}));
        await obj.save();
        init();
    }catch(e){ console.error(e); }
}

function openModal(){const el=document.getElementById('modalBg');if(el)el.style.display='flex';}
function closeModal(){const el=document.getElementById('modalBg');if(el)el.style.display='none';}

// 新增重置投票 modal 控制
function openResetModal(){
    const el=document.getElementById('resetPwdModal');
    if(el){ el.style.display='flex'; document.getElementById('resetPwdInput').value=''; }
}
function closeResetModal(){
    const el=document.getElementById('resetPwdModal');
    if(el) el.style.display='none';
}
async function confirmResetAll(){
    const pwdInput=document.getElementById('resetPwdInput'); if(!pwdInput) return;
    const pwd=pwdInput.value.trim();
    if(pwd!==globalResetPassword.get("pwd")) { alert("密码错误！"); return; }
    if(!confirm("⚠ 确定要重置所有投票吗？此操作不可恢复！")) return;
    floorList.forEach(f=>assigned[f]=[]);
    Object.keys(teacherChoices).forEach(k=>delete teacherChoices[k]);
    Object.keys(submitTime).forEach(k=>delete submitTime[k]);
    try{
        const r=await new AV.Query('Vote').find();
        for(const v of r){ v.setACL(new AV.ACL({"*":{read:true,write:true}})); await v.destroy(); }
    }catch(e){ console.error(e); }
    init();
    closeResetModal();
}

async function changePwdViaPrompt(){
    if(!globalResetPassword){alert("密码尚未加载，请稍后重试");return;}
    const oldPwd=prompt("请输入旧密码：");if(oldPwd===null)return;if(oldPwd!==globalResetPassword.get("pwd")){alert("旧密码错误！");return;}
    const newPwd=prompt("请输入新密码：");if(!newPwd)return;
    try{globalResetPassword.set("pwd",newPwd);globalResetPassword.setACL(new AV.ACL({"*":{read:true,write:true}}));await globalResetPassword.save();alert("密码已成功修改！");}catch(e){console.error(e);alert("保存密码时出错");}
}

function goToDetails(){window.location.href="details.html";}

window.addEventListener('DOMContentLoaded',()=>{
    Promise.all([loadVotesFromCloud(),loadTitleFromCloud(),loadPasswordFromCloud()]).then(()=>{
        if(document.body) document.body.classList.remove('hidden-before-load');
        const submitBtn=document.getElementById('submitBtn');if(submitBtn)submitBtn.addEventListener('click',submitChoiceHandler);
        const viewBtn=document.getElementById('viewDetailsBtn');if(viewBtn)viewBtn.addEventListener('click',goToDetails);
        const changePwdBtn=document.getElementById('changePwdBtn');if(changePwdBtn)changePwdBtn.addEventListener('click',changePwdViaPrompt);
        const openTitleBtn=document.querySelector('button[onclick="openModal()"]');if(openTitleBtn)openTitleBtn.addEventListener('click',openModal);
        const modalCloseBtn=document.querySelector('#modalBg .danger');if(modalCloseBtn)modalCloseBtn.addEventListener('click',closeModal);
        const saveTitleBtn=document.querySelector('#modalBg button:not(.danger)');if(saveTitleBtn)saveTitleBtn.addEventListener('click',saveNewTitle);

        // 绑定重置投票 modal 事件
        const resetBtn = document.querySelector('.danger[onclick="resetAll()"]');
        if(resetBtn) resetBtn.addEventListener('click', openResetModal);
        const resetCloseBtn = document.getElementById('closeResetBtn');
        if(resetCloseBtn) resetCloseBtn.addEventListener('click', closeResetModal);
        const confirmResetBtn = document.getElementById('confirmResetBtn');
        if(confirmResetBtn) confirmResetBtn.addEventListener('click', confirmResetAll);
    }).catch(err=>{ console.error(err); if(document.body)document.body.classList.remove('hidden-before-load'); });
});
