(function(){
'use strict';
const getUser=()=>JSON.parse(localStorage.getItem('user'));
const setUser=(u)=>localStorage.setItem('user',JSON.stringify(u));
if(getUser()&&getUser().role==='hod'){location.href='/hod.html';return;}
let toastTimer;
function showToast(msg,type='success'){
  const t=document.getElementById('toast');clearTimeout(toastTimer);
  t.className='toast toast--'+type;
  t.querySelector('.toast__icon').className='toast__icon fa-solid '+(type==='success'?'fa-circle-check':'fa-circle-xmark');
  t.querySelector('.toast__msg').textContent=msg;
  void t.offsetWidth;t.classList.add('toast--visible');
  toastTimer=setTimeout(()=>t.classList.remove('toast--visible'),3500);
}
document.querySelectorAll('.login-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.login-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.login-form-section').forEach(s=>s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('section-'+tab.dataset.tab).classList.add('active');
  });
});
document.getElementById('hod-login-form').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const email=document.getElementById('hod-login-email').value.trim();
  const password=document.getElementById('hod-login-password').value;
  if(!email||!password){showToast('Please fill in all fields','error');return;}
  const btn=document.getElementById('hod-login-btn');
  btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
  try{
    const res=await fetch('/api/hod/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error);
    setUser(data);location.href='/hod.html';
  }catch(err){
    showToast(err.message||'Login failed','error');
    btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> Login';
  }
});
document.getElementById('hod-register-form').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const name=document.getElementById('hod-reg-name').value.trim();
  const email=document.getElementById('hod-reg-email').value.trim();
  const department=document.getElementById('hod-reg-department').value;
  const password=document.getElementById('hod-reg-password').value;
  const secretKey=document.getElementById('hod-reg-secret').value;
  if(!name||!email||!department||!password||!secretKey){showToast('Please fill all fields','error');return;}
  const btn=document.getElementById('hod-register-btn');
  btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
  try{
    const res=await fetch('/api/hod/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password,department,secretKey})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error);
    setUser(data);location.href='/hod.html';
  }catch(err){
    showToast(err.message||'Registration failed','error');
    btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-user-plus"></i> Register';
  }
});
})();
