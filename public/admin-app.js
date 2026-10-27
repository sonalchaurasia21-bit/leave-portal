(function(){
'use strict';
const getAdmin=()=>JSON.parse(localStorage.getItem('adminUser'));
const logout=()=>{localStorage.removeItem('adminUser');location.href='/admin-login.html';};
if(!getAdmin()||getAdmin().role!=='admin'){location.href='/admin-login.html';return;}

let toastTimer;
function showToast(msg,type='success'){
  const t=document.getElementById('toast');clearTimeout(toastTimer);
  t.className='toast toast--'+type;
  t.querySelector('.toast__icon').className='toast__icon fa-solid '+(type==='success'?'fa-circle-check':'fa-circle-xmark');
  t.querySelector('.toast__msg').textContent=msg;
  void t.offsetWidth;t.classList.add('toast--visible');
  toastTimer=setTimeout(()=>t.classList.remove('toast--visible'),3500);
}

let currentConfig=null;
let currentSection='leave-types';
const navItems=[
  {id:'leave-types',icon:'fa-tags',label:'Leave Types'},
  {id:'leave-limits',icon:'fa-gauge-high',label:'Leave Limits'},
  {id:'portal-settings',icon:'fa-toggle-on',label:'Portal Settings'},
  {id:'academic-year',icon:'fa-calendar-days',label:'Academic Year'},
];

// ============ SIDEBAR ============
function initSidebar(){
  const user=getAdmin();
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
      <div class="faculty-profile-card__avatar" style="background:linear-gradient(135deg,#f97316,#ef4444)">${initials}</div>
      <div class="faculty-profile-card__info">
        <div class="faculty-profile-card__name">${user.name}</div>
        <div class="faculty-profile-card__dept">System Administrator</div>
        <span class="faculty-profile-card__badge" style="background:linear-gradient(135deg,#f97316,#ef4444)">Super Admin</span>
      </div>
    </div>
    <div class="sidebar__section-label">CONFIGURATION</div>
    <div class="sidebar__nav">
      ${navItems.map(l=>`<a href="#" class="sidebar__link admin-nav-link ${l.id==='leave-types'?'active':''}" data-section="${l.id}">
        <i class="fa-solid ${l.icon}"></i>${l.label}
      </a>`).join('')}
    </div>
    <div class="sidebar__user" style="border-top:1px solid var(--border);padding-top:1rem;margin-top:auto">
      <button class="sidebar__logout" id="logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out</button>
    </div>`;
  document.getElementById('logout-btn').addEventListener('click',logout);
  document.querySelectorAll('.admin-nav-link').forEach(link=>{
    link.addEventListener('click',(e)=>{e.preventDefault();switchSection(link.dataset.section);});
  });
}

function switchSection(id){
  currentSection=id;
  document.querySelectorAll('.admin-section').forEach(s=>s.style.display='none');
  const t=document.getElementById('section-'+id);if(t)t.style.display='block';
  document.querySelectorAll('.admin-nav-link').forEach(l=>l.classList.remove('active'));
  const al=document.querySelector(`.admin-nav-link[data-section="${id}"]`);if(al)al.classList.add('active');
  const titles={'leave-types':'Leave Types','leave-limits':'Leave Limits','portal-settings':'Portal Settings','academic-year':'Academic Year'};
  const tt=document.getElementById('topbar-title');if(tt)tt.textContent=titles[id]||'';
}

function initTopbar(){
  const d=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  document.getElementById('topbar').innerHTML=`
    <div style="display:flex;align-items:center;gap:.75rem">
      <button class="hamburger" id="hamburger"><i class="fa-solid fa-bars"></i></button>
      <span class="topbar__title" id="topbar-title">Leave Types</span>
    </div>
    <div class="topbar__right"><span class="topbar__date"><i class="fa-regular fa-calendar"></i> ${d}</span></div>`;
  document.getElementById('hamburger').addEventListener('click',()=>{document.getElementById('sidebar').classList.toggle('open');});
}

// ============ LOAD CONFIG ============
async function loadConfig(){
  try{
    const res=await fetch('/api/admin/config');
    if(!res.ok)throw new Error('Failed to load config');
    currentConfig=await res.json();
    renderLeaveTypes();
    renderLeaveLimits();
    renderPortalSettings();
    renderAcademicYear();
  }catch(err){showToast('Failed to load configuration','error');console.error(err);}
}

// ============ LEAVE TYPES ============
function renderLeaveTypes(){
  const tbody=document.getElementById('leave-types-table');
  if(!currentConfig||!currentConfig.leaveTypes.length){
    tbody.innerHTML=`<tr><td colspan="4" class="table-empty"><i class="fa-solid fa-inbox"></i><div>No leave types configured</div></td></tr>`;
    return;
  }
  tbody.innerHTML=currentConfig.leaveTypes.map(lt=>{
    const badges=lt.applicableTo.filter(r=>r!=='hod').map(r=>{
      const colors={student:'#5a6ff0',faculty:'#10b981'};
      return `<span class="admin-role-badge" style="background:${colors[r]||'#888'}">${r}</span>`;
    }).join('');
    return `<tr>
      <td><strong>${lt.name}</strong></td>
      <td><span class="admin-days-pill">${lt.maxDays} days</span></td>
      <td>${badges}</td>
      <td>
        <div style="display:flex;gap:.4rem">
          <button class="btn btn-ghost btn-sm edit-lt-btn" data-name="${lt.name}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-danger btn-sm delete-lt-btn" data-name="${lt.name}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Attach delete actions
  tbody.querySelectorAll('.delete-lt-btn').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      const name=btn.dataset.name;
      if(!confirm(`Delete leave type "${name}"?`))return;
      try{
        const res=await fetch('/api/admin/config/leave-types/'+encodeURIComponent(name),{method:'DELETE'});
        if(!res.ok){const d=await res.json();throw new Error(d.error);}
        currentConfig=await res.json();
        renderLeaveTypes();
        showToast(`"${name}" deleted successfully`);
      }catch(err){showToast(err.message,'error');}
    });
  });

  // Attach inline edit actions
  tbody.querySelectorAll('.edit-lt-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const name=btn.dataset.name;
      const lt=currentConfig.leaveTypes.find(x=>x.name===name);
      if(!lt)return;
      const row=btn.closest('tr');
      row.innerHTML=`
        <td><input type="text" class="admin-inline-input" id="edit-name-${name}" value="${lt.name}"></td>
        <td><input type="number" class="admin-inline-input" id="edit-days-${name}" value="${lt.maxDays}" min="1" style="width:80px"></td>
        <td>
          <div class="admin-checkbox-group admin-checkbox-group--inline">
            <label class="admin-checkbox"><input type="checkbox" value="student" ${lt.applicableTo.includes('student')?'checked':''}> <span>Student</span></label>
            <label class="admin-checkbox"><input type="checkbox" value="faculty" ${lt.applicableTo.includes('faculty')?'checked':''}> <span>Faculty</span></label>
          </div>
        </td>
        <td>
          <div style="display:flex;gap:.4rem">
            <button class="btn btn-admin btn-sm save-edit-btn"><i class="fa-solid fa-check"></i></button>
            <button class="btn btn-ghost btn-sm cancel-edit-btn"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </td>`;
      row.querySelector('.cancel-edit-btn').addEventListener('click',()=>renderLeaveTypes());
      row.querySelector('.save-edit-btn').addEventListener('click',async()=>{
        const newName=row.querySelector(`#edit-name-${name}`).value.trim();
        const newDays=Number(row.querySelector(`#edit-days-${name}`).value);
        const checks=row.querySelectorAll('.admin-checkbox input:checked');
        const newApplicable=Array.from(checks).map(c=>c.value);
        if(!newName||!newDays||!newApplicable.length){showToast('Fill all fields','error');return;}
        // Update via full array replacement
        const updated=currentConfig.leaveTypes.map(x=>{
          if(x.name===name)return{name:newName,maxDays:newDays,applicableTo:newApplicable};
          return x;
        });
        try{
          const res=await fetch('/api/admin/config/leave-types',{
            method:'PUT',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({leaveTypes:updated})
          });
          if(!res.ok){const d=await res.json();throw new Error(d.error);}
          currentConfig=await res.json();
          renderLeaveTypes();
          showToast('Leave type updated successfully');
        }catch(err){showToast(err.message,'error');}
      });
    });
  });
}

// Add leave type form
document.getElementById('add-leave-type-form').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const name=document.getElementById('new-lt-name').value.trim();
  const maxDays=Number(document.getElementById('new-lt-maxdays').value);
  const applicableTo=[];
  if(document.getElementById('new-lt-student').checked)applicableTo.push('student');
  if(document.getElementById('new-lt-faculty').checked)applicableTo.push('faculty');
  if(!name||!maxDays){showToast('Name and Max Days are required','error');return;}
  if(!applicableTo.length){showToast('Select at least one role','error');return;}
  const btn=document.getElementById('add-lt-btn');
  btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
  try{
    const res=await fetch('/api/admin/config/leave-types',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,maxDays,applicableTo})
    });
    if(!res.ok){const d=await res.json();throw new Error(d.error);}
    currentConfig=await res.json();
    renderLeaveTypes();
    document.getElementById('add-leave-type-form').reset();
    showToast(`"${name}" added successfully`);
  }catch(err){showToast(err.message,'error');}
  btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-plus"></i> Add Leave Type';
});

// ============ LEAVE LIMITS ============
function renderLeaveLimits(){
  if(!currentConfig)return;
  document.getElementById('limit-student').value=currentConfig.leaveLimits.student;
  document.getElementById('limit-faculty').value=currentConfig.leaveLimits.faculty;
}

document.getElementById('save-limits-btn').addEventListener('click',async()=>{
  const student=Number(document.getElementById('limit-student').value);
  const faculty=Number(document.getElementById('limit-faculty').value);
  if(!student||!faculty){showToast('All limits are required','error');return;}
  const btn=document.getElementById('save-limits-btn');
  btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  try{
    const res=await fetch('/api/admin/config/leave-limits',{
      method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({student,faculty})
    });
    if(!res.ok){const d=await res.json();throw new Error(d.error);}
    currentConfig=await res.json();
    showToast('Leave limits updated successfully');
  }catch(err){showToast(err.message,'error');}
  btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Save Limits';
});

// ============ PORTAL SETTINGS ============
function renderPortalSettings(){
  if(!currentConfig)return;
  document.getElementById('toggle-student').checked=currentConfig.portalSettings.studentPortalEnabled;
  document.getElementById('toggle-faculty').checked=currentConfig.portalSettings.facultyPortalEnabled;
  document.getElementById('toggle-hod').checked=currentConfig.portalSettings.hodPortalEnabled;
}

['student','faculty','hod'].forEach(role=>{
  document.getElementById('toggle-'+role).addEventListener('change',async(e)=>{
    const key=role+'PortalEnabled';
    const body={};body[key]=e.target.checked;
    try{
      const res=await fetch('/api/admin/config/portal-settings',{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body)
      });
      if(!res.ok){const d=await res.json();throw new Error(d.error);}
      currentConfig=await res.json();
      showToast(`${role.charAt(0).toUpperCase()+role.slice(1)} portal ${e.target.checked?'enabled':'disabled'}`);
    }catch(err){
      e.target.checked=!e.target.checked;
      showToast(err.message,'error');
    }
  });
});

// ============ ACADEMIC YEAR ============
function renderAcademicYear(){
  if(!currentConfig)return;
  document.getElementById('academic-year-input').value=currentConfig.academicYear;
}

document.getElementById('save-ay-btn').addEventListener('click',async()=>{
  const academicYear=document.getElementById('academic-year-input').value.trim();
  if(!academicYear){showToast('Academic year is required','error');return;}
  const btn=document.getElementById('save-ay-btn');
  btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  try{
    const res=await fetch('/api/admin/config/academic-year',{
      method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({academicYear})
    });
    if(!res.ok){const d=await res.json();throw new Error(d.error);}
    currentConfig=await res.json();
    showToast('Academic year updated successfully');
  }catch(err){showToast(err.message,'error');}
  btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Save Academic Year';
});

// ============ INIT ============
initSidebar();initTopbar();loadConfig();
})();
