(function(){
'use strict';
const getUser=()=>JSON.parse(localStorage.getItem('user'));
const logout=()=>{localStorage.removeItem('user');location.href='/hod-login.html';};
if(!getUser()||getUser().role!=='hod'){location.href='/hod-login.html';return;}

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

let currentSection='dashboard';
const navItems=[
  {id:'dashboard',icon:'fa-chart-pie',label:'Dashboard'},
  {id:'approvals',icon:'fa-clipboard-check',label:'Approvals',badgeId:'badge-approvals'},
  {id:'allleaves',icon:'fa-folder-open',label:'All Leaves'},
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
      <div class="faculty-profile-card__avatar" style="background:linear-gradient(135deg,#6366f1,#818cf8)">${initials}</div>
      <div class="faculty-profile-card__info">
        <div class="faculty-profile-card__name">${user.name}</div>
        <div class="faculty-profile-card__dept">${user.department||'Head of Department'}</div>
        <span class="faculty-profile-card__badge" style="background:linear-gradient(135deg,#6366f1,#818cf8)">HOD</span>
      </div>
    </div>
    <div class="sidebar__section-label">MAIN MENU</div>
    <div class="sidebar__nav">
      ${navItems.map(l=>`<a href="#" class="sidebar__link hod-nav-link ${l.id==='dashboard'?'active':''}" data-section="${l.id}">
        <i class="fa-solid ${l.icon}"></i>${l.label}
        ${l.badgeId?`<span class="sidebar__badge" id="${l.badgeId}" style="background:#6366f1"></span>`:''}
      </a>`).join('')}
    </div>
    <div class="sidebar__user" style="border-top:1px solid var(--border);padding-top:1rem;margin-top:auto">
      <button class="sidebar__logout" id="logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out</button>
    </div>`;
  document.getElementById('logout-btn').addEventListener('click',logout);
  document.querySelectorAll('.hod-nav-link').forEach(link=>{
    link.addEventListener('click',(e)=>{e.preventDefault();switchSection(link.dataset.section);});
  });
}

function switchSection(id){
  currentSection=id;
  document.querySelectorAll('.hod-section').forEach(s=>s.style.display='none');
  const t=document.getElementById('section-'+id);if(t)t.style.display='block';
  document.querySelectorAll('.hod-nav-link').forEach(l=>l.classList.remove('active'));
  const al=document.querySelector(`.hod-nav-link[data-section="${id}"]`);if(al)al.classList.add('active');
  const titles={dashboard:'Dashboard',approvals:'Pending Approvals',allleaves:'All Leave Applications'};
  const tt=document.getElementById('topbar-title');if(tt)tt.textContent=titles[id]||'';
  if(id==='dashboard')loadDashboard();
  else if(id==='approvals')loadApprovals();
  else if(id==='allleaves')loadAllLeaves();
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
  // Show skeleton loading
  document.getElementById('hod-stats-grid').innerHTML=Array(6).fill('<div class="skeleton skeleton-stat"></div>').join('');
  try{
    const res=await fetch('/api/hod/stats');
    if(!res.ok)throw new Error('Failed');
    const s=await res.json();
    const ba=document.getElementById('badge-approvals');
    if(ba){ba.textContent=s.pending;ba.style.display=s.pending>0?'inline-flex':'none';}
    document.getElementById('hod-stats-grid').innerHTML=[
      {label:'Total Applications',value:s.total,sub:'All time',color:'#6366f1'},
      {label:'Pending Review',value:s.pending,sub:'Awaiting action',color:'#f97316'},
      {label:'Approved',value:s.approved,sub:'Total approved',color:'#22c55e'},
      {label:'Rejected',value:s.rejected,sub:'Total rejected',color:'#ef4444'},
      {label:'Student Leaves',value:s.studentLeaves,sub:'All students',color:'#a855f7'},
      {label:'Faculty Leaves',value:s.facultyLeaves,sub:'All faculty',color:'#06b6d4'},
    ].map(c=>`<div class="stat-card stat-card--faculty-new fade-in" style="--card-accent:${c.color}">
      <div class="stat-card__accent-bar" style="background:${c.color}"></div>
      <span class="stat-card__label">${c.label}</span>
      <div class="stat-card__value">${c.value}</div>
      <span class="stat-card__sub">${c.sub}</span>
    </div>`).join('');

    // Load chart data
    try{
      const chartRes=await fetch('/api/hod/all-leaves');
      if(chartRes.ok){
        const leaves=await chartRes.json();
        renderCharts(leaves);
      }
    }catch(e){console.error('Chart data error:',e);}
  }catch(err){console.error(err);showToast('Failed to load dashboard','error');}
}

// ============ APPROVALS ============
let pendingLeaves=[];
async function loadApprovals(){
  try{
    const res=await fetch('/api/hod/pending');
    if(!res.ok)throw new Error('Failed');
    pendingLeaves=await res.json();
    const tbody=document.getElementById('hod-approvals-table');
    if(!pendingLeaves.length){
      tbody.innerHTML=`<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-inbox"></i><div>No pending approvals</div></td></tr>`;
    }else{
      tbody.innerHTML=pendingLeaves.map(l=>{
        const role=l.applicantRole||'student';
        const idTag=role==='faculty'?'F001':'S'+String(Math.abs(l._id.charCodeAt(l._id.length-1))).padStart(3,'0');
        return `<tr>
          <td><div style="font-weight:600">${l.userName}</div><div style="font-size:.72rem;color:var(--text-muted)">${idTag} · ${role}</div></td>
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
      attachActions(document.getElementById('hod-approvals-table'),pendingLeaves);
    }
  }catch(err){console.error(err);showToast('Failed to load approvals','error');}
}

// ============ ALL LEAVES ============
let allLeavesData=[];
async function loadAllLeaves(){
  try{
    const res=await fetch('/api/hod/all-leaves');
    if(!res.ok)throw new Error('Failed');
    allLeavesData=await res.json();
    renderAllLeaves('All');
    document.querySelectorAll('#allleaves-filter-tabs .filter-tab').forEach(tab=>{
      tab.onclick=()=>{
        document.querySelectorAll('#allleaves-filter-tabs .filter-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');renderAllLeaves(tab.dataset.filter);
      };
    });
  }catch(err){console.error(err);showToast('Failed to load leaves','error');}
}

function renderAllLeaves(filter){
  const filtered=filter==='All'?allLeavesData:allLeavesData.filter(l=>l.status===filter);
  const tbody=document.getElementById('hod-allleaves-table');
  if(!filtered.length){
    tbody.innerHTML=`<tr><td colspan="8" class="table-empty"><i class="fa-solid fa-inbox"></i><div>No ${filter.toLowerCase()} leaves</div></td></tr>`;return;
  }
  tbody.innerHTML=filtered.map(l=>{
    const role=l.applicantRole||'student';
    const idTag=role==='faculty'?'F001':'S'+String(Math.abs(l._id.charCodeAt(l._id.length-1))).padStart(3,'0');
    return `<tr>
      <td><div style="font-weight:600">${l.userName}</div><div style="font-size:.72rem;color:var(--text-muted)">${idTag} · ${role}</div></td>
      <td><span class="badge badge--${l.leaveType.toLowerCase().replace(/\s/g,'-')}">${l.leaveType}</span></td>
      <td>${fmtDate(l.fromDate)}</td><td>${fmtDate(l.toDate)}</td>
      <td><strong>${l.days}</strong></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${l.reason}</td>
      <td><span class="badge badge--${l.status.toLowerCase()}">${l.status}</span></td>
      <td><button class="btn btn-ghost btn-sm view-btn" data-id="${l._id}">View</button></td></tr>`;
  }).join('');
  const tbody2=document.getElementById('hod-allleaves-table');
  tbody2.querySelectorAll('.view-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{const l=allLeavesData.find(x=>x._id===btn.dataset.id);if(l)openModal(l);});
  });
}

// ============ ACTIONS & MODALS ============
function attachActions(tbody,leaves){
  tbody.querySelectorAll('.view-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{const l=leaves.find(x=>x._id===btn.dataset.id);if(l)openModal(l);});
  });
  tbody.querySelectorAll('.approve-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{const l=leaves.find(x=>x._id===btn.dataset.id);if(l)openRemarksModal(l,'Approved');});
  });
  tbody.querySelectorAll('.reject-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{const l=leaves.find(x=>x._id===btn.dataset.id);if(l)openRemarksModal(l,'Rejected');});
  });
}

function openModal(leave){
  const overlay=document.getElementById('modal-overlay');
  document.getElementById('modal-body').innerHTML=`
    <div class="modal__row"><span class="modal__label">Applicant</span><span class="modal__value">${leave.userName}</span></div>
    <div class="modal__row"><span class="modal__label">Email</span><span class="modal__value">${leave.userEmail}</span></div>
    <div class="modal__row"><span class="modal__label">Role</span><span class="modal__value">${leave.applicantRole||'student'}</span></div>
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
    <div class="remarks-student-info__name">${leave.userName} <span style="font-size:.75rem;color:var(--text-muted)">(${leave.applicantRole||'student'})</span></div>
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
      const res=await fetch(`/api/hod/leaves/${leave._id}`,{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status:action,remarks,reviewedBy:user.name+' (HOD)'})
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

// ============ CHARTS ============
let monthlyChart=null,studentTypeChart=null,facultyTypeChart=null;
function renderCharts(leaves){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const studentMonthly=new Array(12).fill(0);
  const facultyMonthly=new Array(12).fill(0);
  const studentTypes={};
  const facultyTypes={};
  const year=new Date().getFullYear();

  leaves.forEach(l=>{
    const d=new Date(l.createdAt);
    const isFaculty=l.applicantRole==='faculty';
    if(d.getFullYear()===year){
      if(isFaculty) facultyMonthly[d.getMonth()]++;
      else studentMonthly[d.getMonth()]++;
    }
    if(isFaculty) facultyTypes[l.leaveType]=(facultyTypes[l.leaveType]||0)+1;
    else studentTypes[l.leaveType]=(studentTypes[l.leaveType]||0)+1;
  });

  // Grouped Bar Chart - Students vs Faculty
  const mCtx=document.getElementById('monthly-chart');
  if(mCtx){
    if(monthlyChart)monthlyChart.destroy();
    monthlyChart=new Chart(mCtx,{
      type:'bar',
      data:{labels:months,datasets:[
        {label:'Students',data:studentMonthly,backgroundColor:'rgba(168,85,247,.55)',borderColor:'#a855f7',borderWidth:1,borderRadius:4,hoverBackgroundColor:'rgba(168,85,247,.85)'},
        {label:'Faculty',data:facultyMonthly,backgroundColor:'rgba(6,182,212,.55)',borderColor:'#06b6d4',borderWidth:1,borderRadius:4,hoverBackgroundColor:'rgba(6,182,212,.85)'}
      ]},
      options:{responsive:true,maintainAspectRatio:true,
        plugins:{legend:{labels:{color:'#1a1d2e',usePointStyle:true,pointStyleWidth:10,padding:16,font:{size:12}}}},
        scales:{
          x:{ticks:{color:'#4a5068'},grid:{color:'rgba(226,230,240,.5)'}},
          y:{beginAtZero:true,ticks:{color:'#4a5068',stepSize:1},grid:{color:'rgba(226,230,240,.5)'}}
        }
      }
    });
  }

  // Student Doughnut
  const sCtx=document.getElementById('student-type-chart');
  if(sCtx){
    if(studentTypeChart)studentTypeChart.destroy();
    const sLabels=Object.keys(studentTypes);
    const sData=Object.values(studentTypes);
    const sColors=['#a855f7','#8b5cf6','#c084fc','#7c3aed','#d8b4fe','#6d28d9'];
    studentTypeChart=new Chart(sCtx,{
      type:'doughnut',
      data:{labels:sLabels,datasets:[{data:sData,backgroundColor:sColors.slice(0,sLabels.length),borderColor:'#ffffff',borderWidth:3,hoverOffset:8}]},
      options:{responsive:true,maintainAspectRatio:true,cutout:'60%',
        plugins:{legend:{position:'bottom',labels:{color:'#1a1d2e',padding:12,usePointStyle:true,pointStyleWidth:10,font:{size:11}}},
          title:{display:true,text:sData.reduce((a,b)=>a+b,0)+' total leaves',color:'#4a5068',font:{size:12,weight:'normal'},padding:{bottom:4}}
        }
      }
    });
  }

  // Faculty Doughnut
  const fCtx=document.getElementById('faculty-type-chart');
  if(fCtx){
    if(facultyTypeChart)facultyTypeChart.destroy();
    const fLabels=Object.keys(facultyTypes);
    const fData=Object.values(facultyTypes);
    const fColors=['#06b6d4','#0891b2','#22d3ee','#0e7490','#67e8f9','#155e75'];
    if(fLabels.length===0){
      fCtx.parentElement.querySelector('.chart-card__title').insertAdjacentHTML('afterend','<div style="text-align:center;color:var(--text-muted);padding:3rem 0;font-size:.85rem"><i class="fa-solid fa-inbox" style="font-size:1.5rem;display:block;margin-bottom:.5rem"></i>No faculty leave data yet</div>');
    }else{
      facultyTypeChart=new Chart(fCtx,{
        type:'doughnut',
        data:{labels:fLabels,datasets:[{data:fData,backgroundColor:fColors.slice(0,fLabels.length),borderColor:'#ffffff',borderWidth:3,hoverOffset:8}]},
        options:{responsive:true,maintainAspectRatio:true,cutout:'60%',
          plugins:{legend:{position:'bottom',labels:{color:'#1a1d2e',padding:12,usePointStyle:true,pointStyleWidth:10,font:{size:11}}},
            title:{display:true,text:fData.reduce((a,b)=>a+b,0)+' total leaves',color:'#4a5068',font:{size:12,weight:'normal'},padding:{bottom:4}}
          }
        }
      });
    }
  }
}

// ============ INIT ============
initSidebar();initTopbar();loadDashboard();
})();
