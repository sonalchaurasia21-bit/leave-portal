(function(){
'use strict';
const getUser=()=>JSON.parse(localStorage.getItem('user'));
const setUser=(u)=>localStorage.setItem('user',JSON.stringify(u));
const logout=()=>{localStorage.removeItem('user');location.href='/faculty-login.html';};
const page=document.body.dataset.page;
if(page!=='faculty')return;
if(!getUser()||getUser().role!=='faculty'){location.href='/faculty-login.html';return;}

let toastTimer;
function showToast(msg,type='success'){
  const t=document.getElementById('toast');clearTimeout(toastTimer);
  t.className='toast toast--'+type;
  t.querySelector('.toast__icon').className='toast__icon fa-solid '+(type==='success'?'fa-circle-check':'fa-circle-xmark');
  t.querySelector('.toast__msg').textContent=msg;
  void t.offsetWidth;t.classList.add('toast--visible');
  toastTimer=setTimeout(()=>t.classList.remove('toast--visible'),3500);
}
function fmtDate(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}

// ---- Faculty Quotas (dynamic from config) ----
let FACULTY_QUOTAS={'Casual Leave':8,'Earned Leave':30,'Sick Leave':12,'Vacation Leave':42,'Bank Work':12,'Compensatory Off':2};
const QUOTA_COLORS_ARR=['#eab308','#f97316','#ef4444','#22c55e','#38bdf8','#a855f7','#5a6ff0','#ec4899'];
const QUOTA_EMOJI={'Casual Leave':'☀️','Earned Leave':'⭐','Sick Leave':'🤒','Vacation Leave':'🌴','Bank Work':'🏛️','Compensatory Off':'📋','Medical':'🏥','Emergency':'🚨','Personal':'🏠'};

// ---- Navigation ----
let currentSection='dashboard';
const navItems=[
  {id:'dashboard',icon:'fa-chart-pie',label:'Dashboard'},
  {id:'apply',icon:'fa-pen-to-square',label:'Apply Leave'},
  {id:'myleaves',icon:'fa-list-check',label:'My Leaves',badgeId:'badge-myleaves'},
  {id:'balance',icon:'fa-scale-balanced',label:'Leave Balance'},
  {id:'approvals',icon:'fa-clipboard-check',label:'Approvals',badgeId:'badge-approvals'},
];

function initSidebar(){
  const user=getUser();
  const initials=user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const sb=document.getElementById('sidebar');
  sb.className='faculty-sidebar';
  sb.innerHTML=`
    <div class="sidebar__brand sidebar__brand--faculty">
      <img src="crce-logo.png" alt="CRCE Logo" class="sidebar__logo-img">
      <div class="sidebar__brand-text">
        <div><span class="sidebar__brand-name" style="font-weight:800;font-size:1.1rem">CRCE</span></div>
        <div><span class="sidebar__brand-name" style="font-style:italic;font-weight:600;font-size:1rem">Leave</span></div>
        <div><span class="sidebar__brand-name" style="font-style:italic;font-weight:600;font-size:1rem">Portal</span></div>
        <span class="sidebar__brand-sub">Bandra, Mumbai</span>
      </div>
    </div>
    <div class="faculty-profile-card">
      <div class="faculty-profile-card__avatar">${initials}</div>
      <div class="faculty-profile-card__info">
        <div class="faculty-profile-card__name">${user.name}</div>
        <div class="faculty-profile-card__dept">${user.department||'Faculty'}</div>
        <span class="faculty-profile-card__badge">Faculty</span>
      </div>
    </div>
    <div class="sidebar__section-label">MAIN MENU</div>
    <div class="sidebar__nav">
      ${navItems.map(l=>`<a href="#" class="sidebar__link faculty-nav-link ${l.id==='dashboard'?'active':''}" data-section="${l.id}">
        <i class="fa-solid ${l.icon}"></i>${l.label}
        ${l.badgeId?`<span class="sidebar__badge" id="${l.badgeId}"></span>`:''}
      </a>`).join('')}
    </div>
    <div class="sidebar__user" style="border-top:1px solid var(--border);padding-top:1rem;margin-top:auto">
      <button class="sidebar__logout" id="logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out</button>
    </div>`;
  document.getElementById('logout-btn').addEventListener('click',logout);
  document.querySelectorAll('.faculty-nav-link').forEach(link=>{
    link.addEventListener('click',(e)=>{e.preventDefault();switchSection(link.dataset.section);});
  });
}

function switchSection(id){
  currentSection=id;
  document.querySelectorAll('.faculty-section').forEach(s=>s.style.display='none');
  const t=document.getElementById('section-'+id);if(t)t.style.display='block';
  document.querySelectorAll('.faculty-nav-link').forEach(l=>l.classList.remove('active'));
  const al=document.querySelector(`.faculty-nav-link[data-section="${id}"]`);if(al)al.classList.add('active');
  const titles={dashboard:'Dashboard',apply:'Apply Leave',myleaves:'My Leaves',balance:'Leave Balance',approvals:'Pending Approvals'};
  const tt=document.getElementById('topbar-title');if(tt)tt.textContent=titles[id]||'';
  if(id==='dashboard')loadDashboard();
  else if(id==='apply')initApply();
  else if(id==='myleaves')loadMyLeaves();
  else if(id==='balance')loadBalance();
  else if(id==='approvals')loadApprovals();
}

function initTopbar(){
  const d=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  document.getElementById('topbar').innerHTML=`
    <div style="display:flex;align-items:center;gap:.75rem">
      <button class="hamburger" id="hamburger"><i class="fa-solid fa-bars"></i></button>
      <span class="topbar__title" id="topbar-title">Dashboard</span>
    </div>
    <div class="topbar__right"><span class="topbar__date"><i class="fa-regular fa-calendar"></i> ${d}</span></div>`;
  document.getElementById('hamburger').addEventListener('click',()=>{document.getElementById('sidebar').classList.toggle('open');});
}

// ============ DASHBOARD ============
async function loadDashboard(){
  const user=getUser();
  try{
    const [statsRes,myRes]=await Promise.all([
      fetch('/api/faculty/stats?email='+encodeURIComponent(user.email)),
      fetch('/api/faculty/my-leaves?email='+encodeURIComponent(user.email))
    ]);
    const stats=await statsRes.json();
    if(!statsRes.ok){console.error('Stats error:',stats);throw new Error(stats.error||'Stats failed');}
    const myLeaves=await myRes.json();
    if(!myRes.ok){console.error('MyLeaves error:',myLeaves);throw new Error(myLeaves.error||'MyLeaves failed');}
    const pendingCount=myLeaves.filter(l=>l.status==='Pending').length;
    // Update badges
    const ba=document.getElementById('badge-approvals');if(ba){ba.textContent=stats.pendingApprovals;ba.style.display=stats.pendingApprovals>0?'inline-flex':'none';}
    const bm=document.getElementById('badge-myleaves');if(bm){bm.textContent=pendingCount;bm.style.display=pendingCount>0?'inline-flex':'none';}

    document.getElementById('faculty-stats-grid').innerHTML=[
      {label:'Pending Approvals',value:stats.pendingApprovals,sub:'Awaiting your action',color:'#f97316'},
      {label:'My Applications',value:stats.myApplications,sub:'Total submitted',color:'#a855f7'},
      {label:'Approved',value:stats.totalApproved,sub:'Leave days',color:'#22c55e'},
      {label:'Days Used',value:stats.myDaysUsed,sub:'This academic year',color:'#ec4899'},
    ].map(c=>`<div class="stat-card stat-card--faculty-new fade-in" style="--card-accent:${c.color}">
      <div class="stat-card__accent-bar" style="background:${c.color}"></div>
      <span class="stat-card__label">${c.label}</span>
      <div class="stat-card__value">${c.value}</div>
      <span class="stat-card__sub">${c.sub}</span>
    </div>`).join('');

    const recent=myLeaves.slice(0,5);
    const tbody=document.getElementById('faculty-recent-table');
    if(!recent.length){tbody.innerHTML=`<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-inbox"></i><div>No leave applications yet</div></td></tr>`;}
    else{
      tbody.innerHTML=recent.map(l=>myLeaveRow(l)).join('');
      attachMyLeaveActions(tbody,myLeaves);
    }
  }catch(err){console.error('Dashboard error:',err);showToast('Failed to load dashboard','error');}
  const gotoBtn=document.getElementById('goto-apply-btn');
  if(gotoBtn)gotoBtn.onclick=(e)=>{e.preventDefault();switchSection('apply');};
}

function myLeaveRow(l){
  const actions=`<div style="display:flex;gap:.4rem">
    <button class="btn btn-ghost btn-sm view-btn" data-id="${l._id}">View</button>
    ${l.status==='Pending'?`<button class="btn btn-danger btn-sm cancel-btn" data-id="${l._id}">Cancel</button>`:''}
  </div>`;
  return `<tr>
    <td><span class="badge badge--${l.leaveType.toLowerCase().replace(/\s/g,'-')}">${l.leaveType}</span></td>
    <td>${fmtDate(l.fromDate)}</td><td>${fmtDate(l.toDate)}</td><td><strong>${l.days}</strong></td>
    <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${l.reason}</td>
    <td><span class="badge badge--${l.status.toLowerCase()}">${l.status}</span></td>
    <td>${actions}</td></tr>`;
}

// ============ APPLY LEAVE ============
let applyInitialized=false;
let facultyConfig=null;
async function initApply(){
  if(applyInitialized)return;applyInitialized=true;

  // Fetch config to dynamically populate leave types
  const grid=document.getElementById('leave-type-grid');
  try{
    const cfgRes=await fetch('/api/admin/config');
    if(cfgRes.ok){
      facultyConfig=await cfgRes.json();
      // Check if faculty portal is disabled
      if(!facultyConfig.portalSettings.facultyPortalEnabled){
        const formCard=document.querySelector('.faculty-form-card');
        if(formCard){
          formCard.insertAdjacentHTML('beforebegin','<div class="portal-disabled-banner"><i class="fa-solid fa-ban"></i> Leave applications are currently disabled by the administrator.</div>');
          formCard.style.display='none';
        }
        return;
      }
      // Populate leave type grid from config
      const facultyTypes=facultyConfig.leaveTypes.filter(lt=>lt.applicableTo.includes('faculty'));
      grid.innerHTML=facultyTypes.map(lt=>`
        <div class="leave-type-card" data-type="${lt.name}">
          <span class="leave-type-card__icon">${QUOTA_EMOJI[lt.name]||'📋'}</span>
          <span class="leave-type-card__label">${lt.name}</span>
          <span class="leave-type-card__quota">${lt.maxDays} days</span>
        </div>
      `).join('');
      // Update FACULTY_QUOTAS from config
      FACULTY_QUOTAS={};
      facultyTypes.forEach(lt=>{FACULTY_QUOTAS[lt.name]=lt.maxDays;});
    }
  }catch(e){console.warn('Config fetch failed, using static types');}

  const cards=grid.querySelectorAll('.leave-type-card');
  const hiddenInput=document.getElementById('faculty-leave-type');
  cards.forEach(card=>{
    card.addEventListener('click',()=>{
      cards.forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      hiddenInput.value=card.dataset.type;
    });
  });
  const startEl=document.getElementById('faculty-start-date');
  const endEl=document.getElementById('faculty-end-date');
  const daysDisplay=document.getElementById('faculty-num-days-display');
  const daysHidden=document.getElementById('faculty-num-days');
  function calcDays(){
    if(startEl.value&&endEl.value){
      const diff=(new Date(endEl.value)-new Date(startEl.value))/(1000*60*60*24)+1;
      if(diff>0){daysDisplay.textContent=diff+' day'+(diff>1?'s':'');daysHidden.value=diff;}
      else{daysDisplay.textContent='—';daysHidden.value='';}
    }
  }
  startEl.addEventListener('change',calcDays);endEl.addEventListener('change',calcDays);

  document.getElementById('faculty-apply-form').addEventListener('submit',async(e)=>{
    e.preventDefault();
    const user=getUser();
    const leaveType=hiddenInput.value;
    const fromDate=startEl.value;const toDate=endEl.value;
    const days=daysHidden.value;const reason=document.getElementById('faculty-leave-reason').value.trim();
    const fileInput=document.getElementById('faculty-attachment');
    if(!leaveType){showToast('Please select a leave type','error');return;}
    if(!fromDate||!toDate){showToast('Please select dates','error');return;}
    if(!reason){showToast('Please provide a reason','error');return;}
    if(Number(days)<=0){showToast('End date must be after start date','error');return;}
    const fd=new FormData();
    fd.append('userName',user.name);fd.append('userEmail',user.email);
    fd.append('leaveType',leaveType);fd.append('fromDate',fromDate);
    fd.append('toDate',toDate);fd.append('days',days);fd.append('reason',reason);
    if(fileInput.files[0])fd.append('attachment',fileInput.files[0]);
    const btn=document.getElementById('faculty-apply-btn');
    btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    try{
      const res=await fetch('/api/faculty/apply-leave',{method:'POST',body:fd});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Submission failed');
      showToast('Leave Applied Successfully!');
      document.getElementById('faculty-apply-form').reset();
      grid.querySelectorAll('.leave-type-card').forEach(c=>c.classList.remove('selected'));
      daysDisplay.textContent='—';daysHidden.value='';hiddenInput.value='';
      btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-paper-plane"></i> Submit Application';
    }catch(err){
      showToast(err.message,'error');
      btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-paper-plane"></i> Submit Application';
    }
  });
}

// ============ MY LEAVES ============
let myLeavesData=[];
async function loadMyLeaves(){
  const user=getUser();
  try{
    const res=await fetch('/api/faculty/my-leaves?email='+encodeURIComponent(user.email));
    myLeavesData=await res.json();
    renderMyLeaves('All');
    document.querySelectorAll('#myleaves-filter-tabs .filter-tab').forEach(tab=>{
      tab.onclick=()=>{
        document.querySelectorAll('#myleaves-filter-tabs .filter-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');renderMyLeaves(tab.dataset.filter);
      };
    });
  }catch(err){showToast('Failed to load leaves','error');}
}

function renderMyLeaves(filter){
  const filtered=filter==='All'?myLeavesData:myLeavesData.filter(l=>l.status===filter);
  const tbody=document.getElementById('faculty-myleaves-table');
  if(!filtered.length){tbody.innerHTML=`<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-inbox"></i><div>No ${filter.toLowerCase()} leaves found</div></td></tr>`;return;}
  tbody.innerHTML=filtered.map(l=>myLeaveRow(l)).join('');
  attachMyLeaveActions(tbody,myLeavesData);
}

function attachMyLeaveActions(tbody,leaves){
  tbody.querySelectorAll('.view-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{const l=leaves.find(x=>x._id===btn.dataset.id);if(l)openModal(l);});
  });
  tbody.querySelectorAll('.cancel-btn').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      if(!confirm('Cancel this leave application?'))return;
      try{
        const res=await fetch('/api/faculty/leaves/'+btn.dataset.id,{method:'DELETE'});
        if(!res.ok)throw new Error('Failed');
        showToast('Leave cancelled');
        if(currentSection==='dashboard')loadDashboard();else loadMyLeaves();
      }catch(err){showToast('Failed to cancel','error');}
    });
  });
}

// ============ LEAVE BALANCE ============
async function loadBalance(){
  const user=getUser();
  try{
    // Fetch config for dynamic quotas
    try{
      const cfgRes=await fetch('/api/admin/config');
      if(cfgRes.ok){
        const config=await cfgRes.json();
        const facultyTypes=config.leaveTypes.filter(lt=>lt.applicableTo.includes('faculty'));
        FACULTY_QUOTAS={};
        facultyTypes.forEach(lt=>{FACULTY_QUOTAS[lt.name]=lt.maxDays;});
      }
    }catch(e){/* use defaults */}

    const res=await fetch('/api/faculty/my-leaves?email='+encodeURIComponent(user.email));
    const leaves=await res.json();
    const counted=leaves.filter(l=>l.status==='Approved'||l.status==='Pending');
    let colorIdx=0;
    document.getElementById('faculty-balance-grid').innerHTML=Object.entries(FACULTY_QUOTAS).map(([type,quota])=>{
      const used=counted.filter(l=>l.leaveType===type).reduce((s,l)=>s+l.days,0);
      const remaining=Math.max(0,quota-used);
      const pct=Math.min(100,(used/quota)*100);
      const color=QUOTA_COLORS_ARR[colorIdx++%QUOTA_COLORS_ARR.length];
      const emoji=QUOTA_EMOJI[type]||'📋';
      return `<div class="balance-card fade-in">
        <div class="balance-card__header">
          <span class="balance-card__type">${emoji} ${type}</span>
          <span class="balance-card__count" style="font-size:1.4rem;font-weight:700;color:${color}">${remaining}<span style="font-size:.85rem;color:var(--text-muted)">/${quota}</span></span>
        </div>
        <div class="balance-card__detail" style="margin-bottom:.5rem"><span>${used} used · ${remaining} left</span></div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
    }).join('');
    // Usage timeline
    const tbody=document.getElementById('faculty-timeline-table');
    const approvedLeaves=leaves.filter(l=>l.status==='Approved'||l.status==='Pending');
    if(!approvedLeaves.length){
      tbody.innerHTML=`<tr><td colspan="4" class="table-empty"><i class="fa-solid fa-chart-simple"></i><div>No usage data yet</div></td></tr>`;
    }else{
      const byMonth={};
      approvedLeaves.forEach(l=>{
        const m=new Date(l.fromDate||l.createdAt).toLocaleDateString('en-IN',{month:'short'});
        if(!byMonth[m])byMonth[m]=[];byMonth[m].push(l);
      });
      tbody.innerHTML=Object.entries(byMonth).map(([month,ls])=>
        ls.map(l=>`<tr><td><strong>${month}</strong></td><td><span class="badge badge--${l.leaveType.toLowerCase().replace(/\s/g,'-')}">${l.leaveType}</span></td><td>${l.days} days</td><td><span class="badge badge--${l.status.toLowerCase()}">${l.status}</span></td></tr>`).join('')
      ).join('');
    }
  }catch(err){showToast('Failed to load balance','error');}
}

// ============ APPROVALS ============
let allLeaves=[];
async function loadApprovals(){
  try{
    const res=await fetch('/api/faculty/leaves');
    allLeaves=await res.json();
    const pending=allLeaves.filter(l=>l.status==='Pending');
    const tbody=document.getElementById('faculty-approvals-table');
    if(!pending.length){
      tbody.innerHTML=`<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-inbox"></i><div>No pending approvals</div></td></tr>`;
    }else{
      tbody.innerHTML=pending.map(l=>{
        const role=l.applicantRole||'student';
        const idPrefix=role==='faculty'?'F001':'S'+String(Math.abs(l._id.charCodeAt(l._id.length-1))).padStart(3,'0');
        return `<tr>
          <td><div style="font-weight:600">${l.userName}</div><div style="font-size:.72rem;color:var(--text-muted)">${idPrefix} · ${role}</div></td>
          <td><span class="badge badge--${l.leaveType.toLowerCase().replace(/\s/g,'-')}">${l.leaveType}</span></td>
          <td>${fmtDate(l.fromDate)} → ${fmtDate(l.toDate)}</td>
          <td><strong>${l.days}</strong></td>
          <td>${fmtDate(l.createdAt)}</td>
          <td>${l.attachment?`<a href="/uploads/${l.attachment}" target="_blank" class="cert-link"><i class="fa-solid fa-file-pdf"></i> ${l.attachment.substring(0,12)}...</a>`:'<span style="color:var(--text-muted)">N/A</span>'}</td>
          <td><div class="faculty-actions">
            <button class="btn-approve approve-btn" data-id="${l._id}">Approve</button>
            <button class="btn-reject reject-btn" data-id="${l._id}">Reject</button>
            <button class="btn btn-ghost btn-sm view-btn" data-id="${l._id}">View</button>
          </div></td></tr>`;
      }).join('');
      attachApprovalActions(tbody);
    }
  }catch(err){showToast('Failed to load approvals','error');}
}

function attachApprovalActions(tbody){
  tbody.querySelectorAll('.view-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{const l=allLeaves.find(x=>x._id===btn.dataset.id);if(l)openModal(l);});
  });
  tbody.querySelectorAll('.approve-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{const l=allLeaves.find(x=>x._id===btn.dataset.id);if(l)openRemarksModal(l,'Approved');});
  });
  tbody.querySelectorAll('.reject-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{const l=allLeaves.find(x=>x._id===btn.dataset.id);if(l)openRemarksModal(l,'Rejected');});
  });
}

// ============ MODALS ============
function openModal(leave){
  const overlay=document.getElementById('modal-overlay');
  document.getElementById('modal-body').innerHTML=`
    <div class="modal__row"><span class="modal__label">Applicant</span><span class="modal__value">${leave.userName}</span></div>
    <div class="modal__row"><span class="modal__label">Email</span><span class="modal__value">${leave.userEmail}</span></div>
    <div class="modal__row"><span class="modal__label">Type</span><span class="modal__value">${leave.leaveType}</span></div>
    <div class="modal__row"><span class="modal__label">From</span><span class="modal__value">${fmtDate(leave.fromDate)}</span></div>
    <div class="modal__row"><span class="modal__label">To</span><span class="modal__value">${fmtDate(leave.toDate)}</span></div>
    <div class="modal__row"><span class="modal__label">Days</span><span class="modal__value">${leave.days}</span></div>
    <div class="modal__row"><span class="modal__label">Reason</span><span class="modal__value">${leave.reason}</span></div>
    <div class="modal__row"><span class="modal__label">Status</span><span class="modal__value"><span class="badge badge--${leave.status.toLowerCase()}">${leave.status}</span></span></div>
    <div class="modal__row"><span class="modal__label">Applied</span><span class="modal__value">${fmtDate(leave.createdAt)}</span></div>
    ${leave.remarks?`<div class="modal__row"><span class="modal__label">Remarks</span><span class="modal__value">${leave.remarks}</span></div>`:''}
    ${leave.reviewedBy?`<div class="modal__row"><span class="modal__label">Reviewed By</span><span class="modal__value">${leave.reviewedBy}</span></div>`:''}
    ${leave.attachment?`<div class="modal__row"><span class="modal__label">Attachment</span><span class="modal__value"><a href="/uploads/${leave.attachment}" target="_blank" style="color:#10b981">View File</a></span></div>`:''}`;
  overlay.classList.add('active');
  document.getElementById('modal-close').onclick=()=>overlay.classList.remove('active');
  overlay.onclick=(e)=>{if(e.target===overlay)overlay.classList.remove('active');};
}

function openRemarksModal(leave,action){
  const overlay=document.getElementById('remarks-overlay');
  const isApprove=action==='Approved';
  document.getElementById('remarks-title').textContent=isApprove?'Approve Leave':'Reject Leave';
  document.getElementById('remarks-student-info').innerHTML=`
    <div class="remarks-student-info__name">${leave.userName}</div>
    <div class="remarks-student-info__detail"><i class="fa-solid fa-calendar"></i> ${leave.leaveType} — ${fmtDate(leave.fromDate)} to ${fmtDate(leave.toDate)} (${leave.days} days)</div>
    <div class="remarks-student-info__detail"><i class="fa-solid fa-message"></i> ${leave.reason}</div>`;
  document.getElementById('remarks-text').value='';
  const confirmBtn=document.getElementById('remarks-confirm');
  confirmBtn.className=`btn ${isApprove?'btn-approve-confirm':'btn-reject-confirm'}`;
  confirmBtn.innerHTML=isApprove?'<i class="fa-solid fa-check"></i> Approve':'<i class="fa-solid fa-xmark"></i> Reject';
  overlay.classList.add('active');
  document.getElementById('remarks-close').onclick=()=>overlay.classList.remove('active');
  document.getElementById('remarks-cancel').onclick=()=>overlay.classList.remove('active');
  overlay.onclick=(e)=>{if(e.target===overlay)overlay.classList.remove('active');};
  confirmBtn.onclick=async()=>{
    const remarks=document.getElementById('remarks-text').value.trim();
    const user=getUser();
    confirmBtn.disabled=true;confirmBtn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    try{
      const res=await fetch(`/api/faculty/leaves/${leave._id}`,{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status:action,remarks,reviewedBy:user.name})
      });
      if(!res.ok)throw new Error('Failed');
      overlay.classList.remove('active');
      showToast(`Leave ${isApprove?'approved':'rejected'} successfully!`);
      loadApprovals();loadDashboard();
    }catch(err){
      showToast('Action failed','error');
      confirmBtn.disabled=false;
      confirmBtn.innerHTML=isApprove?'<i class="fa-solid fa-check"></i> Approve':'<i class="fa-solid fa-xmark"></i> Reject';
    }
  };
}

// ============ INIT ============
initSidebar();initTopbar();loadDashboard();
})();
