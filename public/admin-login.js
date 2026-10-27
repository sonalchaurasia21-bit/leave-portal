(function(){
'use strict';
const getAdmin=()=>JSON.parse(localStorage.getItem('adminUser'));
const setAdmin=(u)=>localStorage.setItem('adminUser',JSON.stringify(u));
if(getAdmin()){location.href='/admin.html';return;}

let toastTimer;
function showToast(msg,type='success'){
  const t=document.getElementById('toast');clearTimeout(toastTimer);
  t.className='toast toast--'+type;
  t.querySelector('.toast__icon').className='toast__icon fa-solid '+(type==='success'?'fa-circle-check':'fa-circle-xmark');
  t.querySelector('.toast__msg').textContent=msg;
  void t.offsetWidth;t.classList.add('toast--visible');
  toastTimer=setTimeout(()=>t.classList.remove('toast--visible'),3500);
}

// Tab switching
document.querySelectorAll('.login-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.login-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.login-form-section').forEach(s=>s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('section-'+tab.dataset.tab).classList.add('active');
  });
});

// Login
document.getElementById('admin-login-form').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const email=document.getElementById('admin-login-email').value.trim();
  const password=document.getElementById('admin-login-password').value;
  if(!email||!password){showToast('Please fill in all fields','error');return;}
  const btn=document.getElementById('admin-login-btn');
  btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
  try{
    const res=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error);
    setAdmin(data);location.href='/admin.html';
  }catch(err){
    showToast(err.message||'Login failed','error');
    btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> Login';
  }
});

// Register
document.getElementById('admin-register-form').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const name=document.getElementById('admin-reg-name').value.trim();
  const email=document.getElementById('admin-reg-email').value.trim();
  const password=document.getElementById('admin-reg-password').value;
  const secretKey=document.getElementById('admin-reg-secret').value;
  if(!name||!email||!password||!secretKey){showToast('Please fill all fields','error');return;}
  const btn=document.getElementById('admin-register-btn');
  btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
  try{
    const res=await fetch('/api/admin/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password,secretKey})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error);
    setAdmin(data);location.href='/admin.html';
  }catch(err){
    showToast(err.message||'Registration failed','error');
    btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-user-plus"></i> Register';
  }
});
})();
