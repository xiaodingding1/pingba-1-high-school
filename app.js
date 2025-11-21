if(!sessionStorage.getItem('reloaded')){sessionStorage.setItem('reloaded','true');try{location.reload(true);}catch(e){location.reload();}}

AV.init({appId:'C3dq2PBdG2bI1cD6WMtlXU6y-gzGzoHsz',appKey:'gQCrkPGwovInr3mVcBVoF10s',serverURL:'https://C3dq2PBdG2bI1cD6WMtlXU6y.lc-cn-n1-shared.com'});

let globalResetPassword=null,teacherChoices={},assigned={},submitTime={};
const floorList=["五教一楼","五教二楼","四教一楼","四教二楼","四教三楼","四教四楼","合班楼"];
floorList.forEach(f=>assigned[f]=[]);

async function loadPasswordFromCloud(){try{const r=await new AV.Query('VotePassword').equalTo('key','resetPwd').limit(1).find();
if(r.length>0)globalResetPassword=r[0];else{const o=new (AV.Object.extend('VotePassword'))();o.set('key','resetPwd');o.set('pwd','123456');o.setACL(new AV.ACL({"*":{read:true,write:true}}));await o.save();globalResetPassword=o;}}catch(e){console.error(e);}}

function init(){const div=document.getElementById('floors');if(!div)return;div.innerHTML='';floorList.forEach(f=>{const id='f_'+f,wr=document.createElement('div');wr.style.margin='8px 0';const chk=document.createElement('input');chk.type='checkbox';chk.id=id;chk.value=f;if(assigned[f].length>=2)chk.disabled=true;const lbl=document.createElement('label');lbl.setAttribute('for',id);lbl.textContent=`${f} (已选 ${assigned[f].length}/2)`;wr.append(chk,lbl);div.appendChild(wr);});updatePublicBoard();}

function getBeijingTimeString(){const d=new Date(new Date().toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"})),p=s=>String(s).padStart(2,'0');return `${String(d.getFullYear()).slice(2)}/${p(d.getMonth()+1)}/${p(d.getDate())},${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;}

function updatePublicBoard(){const b=document.getElementById('publicBoard');if(!b)return;b.innerHTML=floorList.map(f=>assigned[f].length?`${f}：${assigned[f].join('，')}`:`${f}：<span style="color:gray">无人选择</span>`).join('<br>');}

async function loadVotesFromCloud(){try{const r=await new AV.Query('Vote').find();r.forEach(v=>{const n=v.get('teacher'),c=v.get('choices')||[],t=v.get('time')||'';teacherChoices[n]=c;c.forEach(f=>assigned[f]=assigned[f]||[],assigned[f].push(n));submitTime[n]=t;});init();}catch(e){console.error(e);}}

async function loadTitleFromCloud(){try{const r=await new AV.Query('VoteTitle').equalTo('key','mainTitle').limit(1).find();if(r.length>0){window.voteTitleObj=r[0];const el=document.getElementById('mainTitle');if(el)el.textContent=r[0].get('title')||'';}}catch(e){console.error(e);}}

async function saveNewTitle(){const t=document.getElementById('newTitleInput')?.value.trim();if(!t)return;closeModal();const el=document.getElementById('mainTitle');if(el)el.textContent=t;try{let o=window.voteTitleObj;if(!o){o=new(AV.Object.extend('VoteTitle'))();o.set('key','mainTitle');window.voteTitleObj=o;}o.set('title',t);o.setACL(new AV.ACL({"*":{read:true,write:true}}));await o.save();}catch(e){console.error(e);}}

async function submitChoiceHandler(){const name=document.getElementById('teacherName')?.value.trim();if(!name)return;
const choices=Array.from(document.querySelectorAll('#floors input:checked')).map(c=>c.value);

// ★★★ 仅修改这一行：必须 1~2 个
if(choices.length<1||choices.length>2)return;

if(teacherChoices[name])teacherChoices[name].forEach(f=>assigned[f]=assigned[f].filter(n=>n!==name));
for(const f of choices)if(assigned[f].length>=2)return;
teacherChoices[name]=choices;choices.forEach(f=>assigned[f].push(name));submitTime[name]=getBeijingTimeString();
try{const Vote=AV.Object.extend('Vote'),r=await new AV.Query('Vote').equalTo('teacher',name).find(),obj=r.length>0?r[0]:new Vote();obj.set('teacher',name);obj.set('choices',choices);obj.set('time',submitTime[name]);obj.setACL(new AV.ACL({"*":{read:true,write:true}}));await obj.save();init();}catch(e){console.error(e);}}

function openModal(){document.getElementById('modalBg')&&(document.getElementById('modalBg').style.display='flex');}
function closeModal(){document.getElementById('modalBg')&&(document.getElementById('modalBg').style.display='none');}

function openResetModal(){const el=document.getElementById('resetPwdModal');if(el){el.style.display='flex';document.getElementById('resetPwdInput').value='';}}
function closeResetModal(){document.getElementById('resetPwdModal')&&(document.getElementById('resetPwdModal').style.display='none');}
async function confirmResetAll(){const pwd=document.getElementById('resetPwdInput')?.value.trim();if(!pwd||!globalResetPassword){alert("密码错误或未加载");return;}if(pwd!==globalResetPassword.get("pwd")){alert("密码错误！");return;}if(!confirm("⚠ 确定要重置所有投票吗？"))return;floorList.forEach(f=>assigned[f]=[]);Object.keys(teacherChoices).forEach(k=>delete teacherChoices[k]);Object.keys(submitTime).forEach(k=>delete submitTime[k]);try{const r=await new AV.Query('Vote').find();for(const v of r){v.setACL(new AV.ACL({"*":{read:true,write:true}}));await v.destroy();}}catch(e){console.error(e);}init();closeResetModal();}

async function changePwdViaPrompt(){if(!globalResetPassword){alert("密码未加载");return;}const oldPwd=prompt("请输入旧密码：");if(oldPwd===null)return;if(oldPwd!==globalResetPassword.get("pwd")){alert("旧密码错误");return;}const newPwd=prompt("请输入新密码：");if(!newPwd)return;try{globalResetPassword.set("pwd",newPwd);globalResetPassword.setACL(new AV.ACL({"*":{read:true,write:true}}));await globalResetPassword.save();alert("密码已修改");}catch(e){console.error(e);alert("保存出错");}}

function goToDetails(){window.location.href="details.html";}

window.addEventListener('DOMContentLoaded',()=>{
    Promise.all([loadVotesFromCloud(),loadTitleFromCloud(),loadPasswordFromCloud()]).then(()=>{
        document.body.classList.remove('hidden-before-load');
        [['submitBtn',submitChoiceHandler],['viewDetailsBtn',goToDetails],['changePwdBtn',changePwdViaPrompt],
         ['openTitleBtn',openModal],['closeTitleBtn',closeModal],['saveTitleBtn',saveNewTitle],
         ['resetBtn',openResetModal],['closeResetBtn',closeResetModal],['confirmResetBtn',confirmResetAll]]
        .forEach(([id,fn])=>document.getElementById(id)?.addEventListener('click',fn));
    }).catch(e=>{console.error(e);document.body.classList.remove('hidden-before-load');});
});
