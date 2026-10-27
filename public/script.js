// ============================================
//  CRCE Leave Portal — Client Logic
// ============================================
(function () {
  'use strict';

  // Clear session if requested via URL param (useful for tests or manual logout)
  if (window.location.search.includes('logout') || window.location.search.includes('clear')) {
    localStorage.removeItem('user');
    localStorage.removeItem('adminUser');
  }

  // ---- Helpers ----
  const getUser = () => JSON.parse(localStorage.getItem('user'));
  const setUser = (u) => localStorage.setItem('user', JSON.stringify(u));
  const logout = () => { localStorage.removeItem('user'); location.href = '/?logout=1'; };
  const page = document.body.dataset.page;

  function requireAuth() {
    if (!getUser() && page !== 'login') { location.href = '/'; return false; }
    return true;
  }

  // ---- Toast ----
  let toastTimer;
  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    clearTimeout(toastTimer);
    t.className = 'toast toast--' + type;
    t.querySelector('.toast__icon').className = 'toast__icon fa-solid ' + (type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark');
    t.querySelector('.toast__msg').textContent = msg;
    void t.offsetWidth;
    t.classList.add('toast--visible');
    toastTimer = setTimeout(() => t.classList.remove('toast--visible'), 3500);
  }

  // ---- Format Date ----
  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ---- Sidebar ----
  function initSidebar(active) {
    const user = getUser();
    const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const links = [
      { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', href: '/dashboard.html' },
      { id: 'apply', icon: 'fa-pen-to-square', label: 'Apply Leave', href: '/apply.html' },
      { id: 'leaves', icon: 'fa-list-check', label: 'My Leaves', href: '/leaves.html' },
      { id: 'balance', icon: 'fa-scale-balanced', label: 'Leave Balance', href: '/balance.html' },
    ];
    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar__brand"><img src="crce-logo.png" alt="CRCE Logo" class="sidebar__logo-img"><div class="sidebar__brand-text"><span class="sidebar__brand-name" style="font-weight:800;font-size:1.05rem">CRCE</span><span class="sidebar__brand-name" style="font-style:italic;font-weight:600">Leave Portal</span><span class="sidebar__brand-sub">Bandra, Mumbai</span></div></div>
      <div class="sidebar__nav">
        ${links.map(l => `<a href="${l.href}" class="sidebar__link ${l.id === active ? 'active' : ''}"><i class="fa-solid ${l.icon}"></i>${l.label}</a>`).join('')}
      </div>
      <div class="sidebar__user">
        <div class="sidebar__user-info">
          <div class="sidebar__avatar">${initials}</div>
          <div><div class="sidebar__user-name">${user.name}</div><div class="sidebar__user-email">${user.email}</div></div>
        </div>
        <button class="sidebar__logout" id="logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Logout</button>
      </div>`;
    document.getElementById('logout-btn').addEventListener('click', logout);
  }

  // ---- Topbar ----
  const titles = { dashboard: 'Dashboard', apply: 'Apply Leave', leaves: 'My Leaves', balance: 'Leave Balance' };
  function initTopbar() {
    const d = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('topbar').innerHTML = `
      <div style="display:flex;align-items:center;gap:.75rem">
        <button class="hamburger" id="hamburger"><i class="fa-solid fa-bars"></i></button>
        <span class="topbar__title">${titles[page] || ''}</span>
      </div>
      <div class="topbar__right"><span class="topbar__date"><i class="fa-regular fa-calendar"></i> ${d}</span></div>`;
    document.getElementById('hamburger').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  // ---- Modal helpers ----
  function openModal(leave) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-body').innerHTML = `
      <div class="modal__row"><span class="modal__label">Type</span><span class="modal__value">${leave.leaveType}</span></div>
      <div class="modal__row"><span class="modal__label">From</span><span class="modal__value">${fmtDate(leave.fromDate)}</span></div>
      <div class="modal__row"><span class="modal__label">To</span><span class="modal__value">${fmtDate(leave.toDate)}</span></div>
      <div class="modal__row"><span class="modal__label">Days</span><span class="modal__value">${leave.days}</span></div>
      <div class="modal__row"><span class="modal__label">Reason</span><span class="modal__value">${leave.reason}</span></div>
      <div class="modal__row"><span class="modal__label">Status</span><span class="modal__value"><span class="badge badge--${leave.status.toLowerCase()}">${leave.status}</span></span></div>
      <div class="modal__row"><span class="modal__label">Applied</span><span class="modal__value">${fmtDate(leave.createdAt)}</span></div>
      ${leave.attachment ? `<div class="modal__row"><span class="modal__label">Attachment</span><span class="modal__value"><a href="/uploads/${leave.attachment}" target="_blank" style="color:var(--accent)">View File</a></span></div>` : ''}`;
    overlay.classList.add('active');
    document.getElementById('modal-close').onclick = () => overlay.classList.remove('active');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('active'); };
  }

  // ---- Render table row ----
  function leaveRow(l, showActions = true) {
    const actions = showActions ? `
      <button class="btn btn-ghost btn-sm view-btn" data-id="${l._id}"><i class="fa-solid fa-eye"></i></button>
      ${l.status === 'Pending' ? `<button class="btn btn-danger btn-sm cancel-btn" data-id="${l._id}"><i class="fa-solid fa-xmark"></i></button>` : ''}` : '';
    return `<tr>
      <td>${l.leaveType}</td><td>${fmtDate(l.fromDate)}</td><td>${fmtDate(l.toDate)}</td>
      <td>${l.days}</td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">${l.reason}</td>
      <td><span class="badge badge--${l.status.toLowerCase()}">${l.status}</span></td>
      <td style="display:flex;gap:.4rem">${actions}</td></tr>`;
  }

  // ============================================
  //  LOGIN PAGE
  // ============================================
  function initLogin() {
    if (getUser()) { location.href = '/dashboard.html'; return; }

    // Tab switching
    document.querySelectorAll('.login-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.login-form-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('section-' + tab.dataset.tab).classList.add('active');
      });
    });

    // Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }
      const btn = document.getElementById('login-btn');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUser(data);
        location.href = '/dashboard.html';
      } catch (err) {
        showToast(err.message || 'Connection failed. Check your internet.', 'error');
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login';
      }
    });

    // Register
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const course = document.getElementById('reg-course').value.trim();
      const year = document.getElementById('reg-year').value;
      const password = document.getElementById('reg-password').value;
      if (!name || !email || !course || !year || !password) { showToast('Please fill in all fields', 'error'); return; }
      const btn = document.getElementById('register-btn');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, course, year })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUser(data);
        location.href = '/dashboard.html';
      } catch (err) {
        showToast(err.message || 'Connection failed. Check your internet.', 'error');
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Register';
      }
    });
  }

  // ============================================
  //  DASHBOARD
  // ============================================
  async function initDashboard() {
    const user = getUser();
    // Show skeleton loading
    document.getElementById('stats-grid').innerHTML = Array(4).fill('<div class="skeleton skeleton-stat"></div>').join('');
    document.getElementById('recent-table').innerHTML = Array(3).fill('<tr><td colspan="7"><div class="skeleton skeleton-row"></div></td></tr>').join('');
    try {
      const res = await fetch('/api/leaves?userEmail=' + encodeURIComponent(user.email));
      const leaves = await res.json();

      const total = leaves.length;
      const pending = leaves.filter(l => l.status === 'Pending').length;
      const approved = leaves.filter(l => l.status === 'Approved').length;
      const rejected = leaves.filter(l => l.status === 'Rejected').length;

      document.getElementById('stats-grid').innerHTML = [
        { label: 'Total Applications', value: total, icon: 'total', fa: 'fa-file-lines' },
        { label: 'Pending', value: pending, icon: 'pending', fa: 'fa-clock' },
        { label: 'Approved', value: approved, icon: 'approved', fa: 'fa-circle-check' },
        { label: 'Rejected', value: rejected, icon: 'rejected', fa: 'fa-circle-xmark' },
      ].map(c => `
        <div class="stat-card fade-in">
          <div class="stat-card__header">
            <span class="stat-card__label">${c.label}</span>
            <div class="stat-card__icon stat-card__icon--${c.icon}"><i class="fa-solid ${c.fa}"></i></div>
          </div>
          <div class="stat-card__value">${c.value}</div>
        </div>`).join('');

      const recent = leaves.slice(0, 5);
      const tbody = document.getElementById('recent-table');
      if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-inbox"></i><div>No leave applications yet</div></td></tr>`;
      } else {
        tbody.innerHTML = recent.map(l => leaveRow(l)).join('');
        attachTableActions(tbody, leaves);
      }
    } catch (err) { showToast('Failed to load dashboard', 'error'); }
  }

  // ============================================
  //  APPLY LEAVE
  // ============================================
  async function initApply() {
    const startEl = document.getElementById('start-date');
    const endEl = document.getElementById('end-date');
    const daysEl = document.getElementById('num-days');
    const hiddenType = document.getElementById('leave-type');
    const grid = document.getElementById('student-leave-type-grid');

    // Fetch config and dynamically populate leave types
    try {
      const cfgRes = await fetch('/api/admin/config');
      if (cfgRes.ok) {
        const config = await cfgRes.json();
        // Check if portal is disabled
        if (!config.portalSettings.studentPortalEnabled) {
          const formCard = document.querySelector('.form-card');
          if (formCard) {
            formCard.insertAdjacentHTML('beforebegin', '<div class="portal-disabled-banner"><i class="fa-solid fa-ban"></i> Leave applications are currently disabled by the administrator.</div>');
            formCard.style.display = 'none';
          }
          return;
        }
        // Populate leave type grid from config
        const studentTypes = config.leaveTypes.filter(lt => lt.applicableTo.includes('student'));
        const emojiMap = { 'Medical': '🏥', 'Hackathon': '💻', 'College Event': '🎓', 'Personal': '🏠', 'Sick Leave': '🤒', 'Casual Leave': '☀️', 'Emergency': '🚨', 'Earned Leave': '⭐' };
        grid.innerHTML = studentTypes.map(lt => `
          <div class="leave-type-card" data-type="${lt.name}">
            <span class="leave-type-card__icon">${emojiMap[lt.name] || '📋'}</span>
            <span class="leave-type-card__label">${lt.name}</span>
            <span class="leave-type-card__quota">${lt.maxDays} days</span>
          </div>
        `).join('');
      }
    } catch (e) { console.warn('Config fetch failed, using static types'); }

    // Leave type card selection (re-bind after dynamic render)
    grid.querySelectorAll('.leave-type-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.leave-type-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        hiddenType.value = card.dataset.type;
        const g = hiddenType.closest('.form-group');
        if (g) g.classList.remove('form-group--error');
      });
    });

    function calcDays() {
      if (startEl.value && endEl.value) {
        const diff = (new Date(endEl.value) - new Date(startEl.value)) / (1000 * 60 * 60 * 24) + 1;
        daysEl.value = diff > 0 ? diff : '';
      }
    }
    startEl.addEventListener('change', calcDays);
    endEl.addEventListener('change', calcDays);

    document.getElementById('apply-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = getUser();
      const leaveType = document.getElementById('leave-type').value;
      const fromDate = startEl.value;
      const toDate = endEl.value;
      const days = daysEl.value;
      const reason = document.getElementById('leave-reason').value.trim();
      const fileInput = document.getElementById('attachment');

      // Validation
      let valid = true;
      [['leave-type', leaveType], ['start-date', fromDate], ['end-date', toDate], ['leave-reason', reason]].forEach(([id, val]) => {
        const g = document.getElementById(id).closest('.form-group');
        if (!val) { g.classList.add('form-group--error'); valid = false; }
        else { g.classList.remove('form-group--error'); }
      });
      if (!valid) return;
      if (Number(days) <= 0) { showToast('End date must be after start date', 'error'); return; }

      const fd = new FormData();
      fd.append('userName', user.name);
      fd.append('userEmail', user.email);
      fd.append('leaveType', leaveType);
      fd.append('fromDate', fromDate);
      fd.append('toDate', toDate);
      fd.append('days', days);
      fd.append('reason', reason);
      if (fileInput.files[0]) fd.append('attachment', fileInput.files[0]);

      try {
        const btn = document.getElementById('apply-btn');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        const res = await fetch('/api/leaves', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Submission failed');
        showToast('Leave Applied Successfully!');
        document.getElementById('apply-form').reset();
        grid.querySelectorAll('.leave-type-card').forEach(c => c.classList.remove('selected'));
        hiddenType.value = '';
        daysEl.value = '';
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Request';
      } catch (err) {
        showToast(err.message, 'error');
        const btn = document.getElementById('apply-btn');
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Request';
      }
    });
  }

  // ============================================
  //  MY LEAVES
  // ============================================
  let allLeaves = [];
  async function initLeaves() {
    const user = getUser();
    try {
      const res = await fetch('/api/leaves?userEmail=' + encodeURIComponent(user.email));
      allLeaves = await res.json();
      renderLeaves('All');

      document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          renderLeaves(tab.dataset.filter);
        });
      });
    } catch (err) { showToast('Failed to load leaves', 'error'); }
  }

  function renderLeaves(filter) {
    const filtered = filter === 'All' ? allLeaves : allLeaves.filter(l => l.status === filter);
    const tbody = document.getElementById('leaves-table');
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-inbox"></i><div>No ${filter.toLowerCase()} leaves found</div></td></tr>`;
    } else {
      tbody.innerHTML = filtered.map(l => leaveRow(l)).join('');
      attachTableActions(tbody, allLeaves);
    }
  }

  // ============================================
  //  LEAVE BALANCE
  // ============================================
  let QUOTAS = { Medical: 10, Hackathon: 5, 'College Event': 5, Personal: 10 };
  const BALANCE_COLORS = ['#5a6ff0', '#a855f7', '#eab308', '#22c55e', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];

  async function initBalance() {
    const user = getUser();
    try {
      // Fetch config for dynamic quotas
      try {
        const cfgRes = await fetch('/api/admin/config');
        if (cfgRes.ok) {
          const config = await cfgRes.json();
          const studentTypes = config.leaveTypes.filter(lt => lt.applicableTo.includes('student'));
          QUOTAS = {};
          studentTypes.forEach(lt => { QUOTAS[lt.name] = lt.maxDays; });
        }
      } catch (e) { /* use defaults */ }

      const res = await fetch('/api/leaves?userEmail=' + encodeURIComponent(user.email));
      const leaves = await res.json();
      const approved = leaves.filter(l => l.status === 'Approved' || l.status === 'Pending');

      // Balance cards
      let colorIdx = 0;
      document.getElementById('balance-grid').innerHTML = Object.entries(QUOTAS).map(([type, quota]) => {
        const used = approved.filter(l => l.leaveType === type).reduce((s, l) => s + l.days, 0);
        const remaining = Math.max(0, quota - used);
        const pct = Math.min(100, (used / quota) * 100);
        const color = BALANCE_COLORS[colorIdx++ % BALANCE_COLORS.length];
        return `<div class="balance-card fade-in">
          <div class="balance-card__header">
            <span class="balance-card__type">${type}</span>
            <span class="balance-card__count">${used} / ${quota} used</span>
          </div>
          <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%;background:${color}"></div></div>
          <div class="balance-card__detail"><span>Remaining: ${remaining}</span><span>${Math.round(pct)}%</span></div>
        </div>`;
      }).join('');

      // Monthly timeline
      const typeNames = Object.keys(QUOTAS);
      const months = {};
      leaves.forEach(l => {
        const m = new Date(l.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        if (!months[m]) { months[m] = {}; typeNames.forEach(t => months[m][t] = 0); }
        if (months[m][l.leaveType] !== undefined) months[m][l.leaveType] = (months[m][l.leaveType] || 0) + l.days;
      });
      const tbody = document.getElementById('timeline-table');
      const entries = Object.entries(months);
      if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${typeNames.length + 2}" class="table-empty"><i class="fa-solid fa-chart-simple"></i><div>No usage data yet</div></td></tr>`;
      } else {
        tbody.innerHTML = entries.map(([month, data]) => {
          const total = Object.values(data).reduce((s, v) => s + v, 0);
          return `<tr><td>${month}</td>${typeNames.map(t => `<td>${data[t] || 0}</td>`).join('')}<td><strong>${total}</strong></td></tr>`;
        }).join('');
      }
    } catch (err) { showToast('Failed to load balance', 'error'); }
  }

  // ============================================
  //  TABLE ACTIONS (View / Cancel)
  // ============================================
  function attachTableActions(tbody, leaves) {
    tbody.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const leave = leaves.find(l => l._id === btn.dataset.id);
        if (leave) openModal(leave);
      });
    });
    tbody.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancel this leave application?')) return;
        try {
          const res = await fetch('/api/leaves/' + btn.dataset.id, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed');
          showToast('Leave cancelled');
          // Refresh current page data
          if (page === 'dashboard') initDashboard();
          else if (page === 'leaves') initLeaves();
        } catch (err) { showToast('Failed to cancel leave', 'error'); }
      });
    });
  }

  // ============================================
  //  FACULTY — Sidebar, Topbar & Navigation
  // ============================================
  let currentFacultySection = 'dashboard';
  const facultyNavItems = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'apply', icon: 'fa-pen-to-square', label: 'Apply Leave' },
    { id: 'myleaves', icon: 'fa-list-check', label: 'My Leaves', badgeId: 'badge-myleaves' },
    { id: 'balance', icon: 'fa-scale-balanced', label: 'Leave Balance' },
    { id: 'approvals', icon: 'fa-clipboard-check', label: 'Approvals', badgeId: 'badge-approvals' },
  ];

  function initFacultySidebar() {
    const user = getUser();
    const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('sidebar').className = 'sidebar sidebar--faculty';
    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar__brand sidebar__brand--faculty">
        <i class="fa-solid fa-graduation-cap"></i>
        <div class="sidebar__brand-text">
          <span class="sidebar__brand-name">CRCE</span>
          <span class="sidebar__brand-name" style="font-style:italic;font-weight:600">Leave</span>
          <span class="sidebar__brand-name" style="font-style:italic;font-weight:600">Portal</span>
          <span class="sidebar__brand-sub">Bandra, Mumbai</span>
        </div>
      </div>
      <div class="faculty-profile-card">
        <div class="faculty-profile-card__avatar">${initials}</div>
        <div class="faculty-profile-card__info">
          <div class="faculty-profile-card__name">${user.name}</div>
          <div class="faculty-profile-card__dept">${user.department || 'Faculty'}</div>
          <span class="faculty-profile-card__badge">Faculty</span>
        </div>
      </div>
      <div class="sidebar__section-label">MAIN MENU</div>
      <div class="sidebar__nav">
        ${facultyNavItems.map(l => `
          <a href="#" class="sidebar__link faculty-nav-link ${l.id === 'dashboard' ? 'active' : ''}" data-section="${l.id}">
            <i class="fa-solid ${l.icon}"></i>${l.label}
            ${l.badgeId ? `<span class="sidebar__badge" id="${l.badgeId}"></span>` : ''}
          </a>`).join('')}
      </div>
      <div class="sidebar__user" style="border-top:1px solid var(--border);padding-top:1rem;margin-top:auto">
        <button class="sidebar__logout" id="logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out</button>
      </div>`;
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.querySelectorAll('.faculty-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchFacultySection(link.dataset.section);
      });
    });
  }

  function switchFacultySection(sectionId) {
    currentFacultySection = sectionId;
    document.querySelectorAll('.faculty-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById('section-' + sectionId);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.faculty-nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.faculty-nav-link[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');
    const sectionTitles = { dashboard:'Dashboard', apply:'Apply Leave', myleaves:'My Leaves', balance:'Leave Balance', approvals:'Pending Approvals' };
    const topTitle = document.getElementById('topbar-title');
    if (topTitle) topTitle.textContent = sectionTitles[sectionId] || 'Dashboard';
    if (sectionId === 'dashboard') loadFacultyDashboard();
    else if (sectionId === 'apply') initFacultyApply();
    else if (sectionId === 'myleaves') loadFacultyMyLeaves();
    else if (sectionId === 'balance') loadFacultyBalance();
    else if (sectionId === 'approvals') loadFacultyApprovals();
  }

  function initFacultyTopbar() {
    const d = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
    document.getElementById('topbar').innerHTML = `
      <div style="display:flex;align-items:center;gap:.75rem">
        <button class="hamburger" id="hamburger"><i class="fa-solid fa-bars"></i></button>
        <span class="topbar__title" id="topbar-title">Dashboard</span>
      </div>
      <div class="topbar__right"><span class="topbar__date"><i class="fa-regular fa-calendar"></i> ${d}</span></div>`;
    document.getElementById('hamburger').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  // ============================================
  //  FACULTY LOGIN
  // ============================================
  function initFacultyLogin() {
    if (getUser() && getUser().role === 'faculty') { location.href = '/faculty.html'; return; }

    document.querySelectorAll('.login-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.login-form-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('section-' + tab.dataset.tab).classList.add('active');
      });
    });

    document.getElementById('faculty-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('faculty-login-email').value.trim();
      const password = document.getElementById('faculty-login-password').value;
      if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }
      const btn = document.getElementById('faculty-login-btn');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
      try {
        const res = await fetch('/api/faculty/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUser(data);
        location.href = '/faculty.html';
      } catch (err) {
        showToast(err.message || 'Login failed', 'error');
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login';
      }
    });

    document.getElementById('faculty-register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('faculty-reg-name').value.trim();
      const email = document.getElementById('faculty-reg-email').value.trim();
      const department = document.getElementById('faculty-reg-department').value;
      const password = document.getElementById('faculty-reg-password').value;
      const secretKey = document.getElementById('faculty-reg-secret').value;
      if (!name || !email || !department || !password || !secretKey) { showToast('Please fill all fields', 'error'); return; }
      const btn = document.getElementById('faculty-register-btn');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
      try {
        const res = await fetch('/api/faculty/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, department, secretKey })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUser(data);
        location.href = '/faculty.html';
      } catch (err) {
        showToast(err.message || 'Registration failed', 'error');
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Register';
      }
    });
  }

  // ============================================
  //  FACULTY DASHBOARD
  // ============================================
  let facultyLeaves = [];

  function facultyLeaveRow(l) {
    const isPending = l.status === 'Pending';
    const actions = isPending
      ? `<div class="faculty-actions">
           <button class="btn-approve approve-btn" data-id="${l._id}"><i class="fa-solid fa-check"></i> Approve</button>
           <button class="btn-reject reject-btn" data-id="${l._id}"><i class="fa-solid fa-xmark"></i> Reject</button>
           <button class="btn btn-ghost btn-sm view-btn" data-id="${l._id}"><i class="fa-solid fa-eye"></i></button>
         </div>`
      : `<div class="faculty-actions">
           <button class="btn btn-ghost btn-sm view-btn" data-id="${l._id}"><i class="fa-solid fa-eye"></i></button>
         </div>`;
    return `<tr>
      <td>${l.userName}</td><td>${l.leaveType}</td><td>${fmtDate(l.fromDate)}</td><td>${fmtDate(l.toDate)}</td>
      <td>${l.days}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${l.reason}</td>
      <td><span class="badge badge--${l.status.toLowerCase()}">${l.status}</span>${l.remarks ? `<div class="reviewed-info">${l.remarks}</div>` : ''}</td>
      <td>${actions}</td></tr>`;
  }

  async function initFacultyDashboard() {
    try {
      const [statsRes, leavesRes] = await Promise.all([
        fetch('/api/faculty/stats'),
        fetch('/api/faculty/leaves')
      ]);
      const stats = await statsRes.json();
      facultyLeaves = await leavesRes.json();

      document.getElementById('stats-grid').innerHTML = [
        { label: 'Total Applications', value: stats.total, icon: 'total', fa: 'fa-file-lines', accent: 'total' },
        { label: 'Pending Review', value: stats.pending, icon: 'pending', fa: 'fa-clock', accent: 'pending' },
        { label: 'Approved', value: stats.approved, icon: 'approved', fa: 'fa-circle-check', accent: 'approved' },
        { label: 'Rejected', value: stats.rejected, icon: 'rejected', fa: 'fa-circle-xmark', accent: 'rejected' },
      ].map(c => `
        <div class="stat-card stat-card--faculty stat-card--${c.accent}-accent fade-in">
          <div class="stat-card__header">
            <span class="stat-card__label">${c.label}</span>
            <div class="stat-card__icon stat-card__icon--${c.icon}"><i class="fa-solid ${c.fa}"></i></div>
          </div>
          <div class="stat-card__value">${c.value}</div>
        </div>`).join('');

      renderFacultyLeaves('All');

      document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          renderFacultyLeaves(tab.dataset.filter);
        });
      });
    } catch (err) { showToast('Failed to load dashboard', 'error'); }
  }

  function renderFacultyLeaves(filter) {
    const filtered = filter === 'All' ? facultyLeaves : facultyLeaves.filter(l => l.status === filter);
    const tbody = document.getElementById('faculty-table');
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><i class="fa-solid fa-inbox"></i><div>No ${filter.toLowerCase()} leave applications</div></td></tr>`;
    } else {
      tbody.innerHTML = filtered.map(l => facultyLeaveRow(l)).join('');
      attachFacultyActions(tbody);
    }
  }

  function openFacultyModal(leave) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-body').innerHTML = `
      <div class="modal__row"><span class="modal__label">Student</span><span class="modal__value">${leave.userName}</span></div>
      <div class="modal__row"><span class="modal__label">Email</span><span class="modal__value">${leave.userEmail}</span></div>
      <div class="modal__row"><span class="modal__label">Type</span><span class="modal__value">${leave.leaveType}</span></div>
      <div class="modal__row"><span class="modal__label">From</span><span class="modal__value">${fmtDate(leave.fromDate)}</span></div>
      <div class="modal__row"><span class="modal__label">To</span><span class="modal__value">${fmtDate(leave.toDate)}</span></div>
      <div class="modal__row"><span class="modal__label">Days</span><span class="modal__value">${leave.days}</span></div>
      <div class="modal__row"><span class="modal__label">Reason</span><span class="modal__value">${leave.reason}</span></div>
      <div class="modal__row"><span class="modal__label">Status</span><span class="modal__value"><span class="badge badge--${leave.status.toLowerCase()}">${leave.status}</span></span></div>
      <div class="modal__row"><span class="modal__label">Applied</span><span class="modal__value">${fmtDate(leave.createdAt)}</span></div>
      ${leave.remarks ? `<div class="modal__row"><span class="modal__label">Remarks</span><span class="modal__value">${leave.remarks}</span></div>` : ''}
      ${leave.reviewedBy ? `<div class="modal__row"><span class="modal__label">Reviewed By</span><span class="modal__value">${leave.reviewedBy}</span></div>` : ''}
      ${leave.attachment ? `<div class="modal__row"><span class="modal__label">Attachment</span><span class="modal__value"><a href="/uploads/${leave.attachment}" target="_blank" style="color:#10b981">View File</a></span></div>` : ''}`;
    overlay.classList.add('active');
    document.getElementById('modal-close').onclick = () => overlay.classList.remove('active');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('active'); };
  }

  function openRemarksModal(leave, action) {
    const overlay = document.getElementById('remarks-overlay');
    const isApprove = action === 'Approved';
    document.getElementById('remarks-title').textContent = isApprove ? 'Approve Leave' : 'Reject Leave';
    document.getElementById('remarks-student-info').innerHTML = `
      <div class="remarks-student-info__name">${leave.userName}</div>
      <div class="remarks-student-info__detail"><i class="fa-solid fa-calendar"></i> ${leave.leaveType} — ${fmtDate(leave.fromDate)} to ${fmtDate(leave.toDate)} (${leave.days} days)</div>
      <div class="remarks-student-info__detail"><i class="fa-solid fa-message"></i> ${leave.reason}</div>`;
    document.getElementById('remarks-text').value = '';

    const confirmBtn = document.getElementById('remarks-confirm');
    confirmBtn.className = `btn ${isApprove ? 'btn-approve-confirm' : 'btn-reject-confirm'}`;
    confirmBtn.innerHTML = isApprove ? '<i class="fa-solid fa-check"></i> Approve' : '<i class="fa-solid fa-xmark"></i> Reject';

    overlay.classList.add('active');
    document.getElementById('remarks-close').onclick = () => overlay.classList.remove('active');
    document.getElementById('remarks-cancel').onclick = () => overlay.classList.remove('active');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('active'); };

    confirmBtn.onclick = async () => {
      const remarks = document.getElementById('remarks-text').value.trim();
      const user = getUser();
      confirmBtn.disabled = true; confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
      try {
        const res = await fetch(`/api/faculty/leaves/${leave._id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action, remarks, reviewedBy: user.name })
        });
        if (!res.ok) throw new Error('Failed');
        overlay.classList.remove('active');
        showToast(`Leave ${isApprove ? 'approved' : 'rejected'} successfully!`);
        initFacultyDashboard();
      } catch (err) {
        showToast('Action failed', 'error');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = isApprove ? '<i class="fa-solid fa-check"></i> Approve' : '<i class="fa-solid fa-xmark"></i> Reject';
      }
    };
  }

  function attachFacultyActions(tbody) {
    tbody.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const leave = facultyLeaves.find(l => l._id === btn.dataset.id);
        if (leave) openFacultyModal(leave);
      });
    });
    tbody.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const leave = facultyLeaves.find(l => l._id === btn.dataset.id);
        if (leave) openRemarksModal(leave, 'Approved');
      });
    });
    tbody.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const leave = facultyLeaves.find(l => l._id === btn.dataset.id);
        if (leave) openRemarksModal(leave, 'Rejected');
      });
    });
  }

  // ============================================
  //  ROUTER
  // ============================================
  if (page === 'login') {
    initLogin();
  } else if (page === 'faculty-login') {
    initFacultyLogin();
  } else if (page === 'faculty') {
    if (!getUser() || getUser().role !== 'faculty') { location.href = '/faculty-login.html'; }
    else { initFacultySidebar(); initFacultyTopbar(); initFacultyDashboard(); }
  } else if (requireAuth()) {
    initSidebar(page);
    initTopbar();
    if (page === 'dashboard') initDashboard();
    else if (page === 'apply') initApply();
    else if (page === 'leaves') initLeaves();
    else if (page === 'balance') initBalance();
  }
})();
