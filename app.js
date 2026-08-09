/* ============== 个人工作台 - 业务逻辑 ============== */

// ---------- 版本 ----------
const APP_VERSION = '1.1.1';   // 语义化版本号，发版后同步 git tag

// ---------- 存储：账号注册表 + 会话 ----------
const STORAGE_KEY = 'workbench_accounts_v1';  // 所有用户数据
const SESSION_KEY = 'workbench_session_v1';   // 当前登录用户名
const PREFS_KEY = 'workbench_prefs_v1';       // 主题等偏好（与账号无关）

// 单个用户的默认数据
function defaultUserData() {
  const today = todayStr();
  const ad1 = new Date(); ad1.setDate(ad1.getDate() + 1); const date1 = isoDate(ad1);
  const ad2 = new Date(); ad2.setDate(ad2.getDate() + 2); const date2 = isoDate(ad2);
  const d1 = new Date(); d1.setDate(d1.getDate() + 1); d1.setHours(9, 0, 0, 0); const t1 = fmtFullDate(d1);
  const d2 = new Date(); d2.setDate(d2.getDate() + 2); d2.setHours(18, 0, 0, 0); const t2 = fmtFullDate(d2);
  return {
    tasks: [
      { id: 1, title: '完成本周周报', project: '日常工作', priority: 'high', date: today, time: '10:00', note: '汇总本周工作进展', done: false },
      { id: 2, title: '回复客户邮件', project: '日常工作', priority: 'mid', date: date1, time: '14:00', note: '', done: false },
      { id: 3, title: '准备周五会议材料', project: '日常工作', priority: 'high', date: date2, time: '16:00', note: '', done: false },
      { id: 4, title: '整理学习笔记', project: '学习提升', priority: 'low', date: today, time: '18:00', note: '', done: true }
    ],
    projects: [
      { id: 'p1', name: '日常工作', code: '', type: '旧改建筑', status: 'active', desc: '处理日常工作任务，保持进度稳定', address: '', start: t1, due: t2, members: ['我'] },
      { id: 'p2', name: '学习提升', code: '', type: '室内全案设计', status: 'active', desc: '持续学习行业知识，提升专业能力', address: '', start: t1, due: t2, members: ['我'] }
    ],
    events: {
      [todayKey()]: [
        { id: 'e1', title: '需求评审会议', time: '10:00', priority: 'high' },
        { id: 'e2', title: '产品设计评审', time: '14:00', priority: 'mid' },
        { id: 'e3', title: '周会', time: '16:00', priority: 'low' }
      ]
    },
    selectedDate: null,
    profile: {
      emoji: '🚀',
      color: '#3ddc97',
      name: '我的工作台',
      company: '未设置公司',
      avatarImage: ''
    },
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    activeDays: [todayStr()],  // 使用天数记录（用于"连续使用"统计）
    health: {
      sport: {
        plan: { period: '每天', time: '18:00-19:00', route: '小区跑道' },
        logs: []  // { id, date, duration, note }
      },
      weight: {
        plan: { target: '65.0', remindTime: '08:00' },
        logs: []  // { id, date, weight }
      },
      habits: [
        { id: 'h1', name: '早睡', icon: '🌙', goal: '23:00前', type: 'sleep', config: { targetTime: '23:00' } },
        { id: 'h2', name: '读书', icon: '📖', goal: '30分钟', type: 'reading', config: { duration: 30 } },
        { id: 'h3', name: '喝水', icon: '💧', goal: '8杯', type: 'water', config: { cups: 8, perTap: 300 } },
        { id: 'h4', name: '运动', icon: '🏃', goal: '30分钟', type: 'simple', config: {} },
        { id: 'h5', name: '早起', icon: '☀️', goal: '07:00前', type: 'wake', config: { targetTime: '07:00' } }
      ],
      habitLogs: {},  // { '2026-07-31': { 'h1': { time: '23:15', count: 1, duration: 30 }, ... } }
      camping: {
        logs: []  // { id, date, location, transport, people, rating, category, note }
      }
    }
  };
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

// 当前时间 HH:MM（用于记录日志/体重时的默认时间）
function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 把 datetime 串（YYYY-MM-DDTHH:MM 或 YYYY-MM-DD）拆成 { date, time }
function splitDateTime(v) {
  if (!v) return { date: '', time: '' };
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})T?\s*(\d{2}:\d{2})?/);
  return m ? { date: m[1], time: m[2] || '' } : { date: '', time: '' };
}
// 把 日期输入id + 时间输入id 拼成 datetime 串（无时间则只存日期）
function joinDateTime(dateId, timeId) {
  const date = document.getElementById(dateId)?.value || '';
  const time = document.getElementById(timeId)?.value || '';
  if (!date) return '';
  return time ? `${date}T${time}` : date;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 简单哈希（非安全级别，仅本地演示用）
function hashPwd(pwd) {
  return btoa(unescape(encodeURIComponent(pwd + 'wb_salt_2025')));
}

// 账号注册表操作
function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (e) { return {}; }
}
function saveAccounts(acc) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acc));
}
function getSession() {
  return localStorage.getItem(SESSION_KEY) || '';
}
function setSession(username) {
  if (username) localStorage.setItem(SESSION_KEY, username);
  else localStorage.removeItem(SESSION_KEY);
}

// 当前状态指针
let state = null;
let currentUser = '';
let editingTaskId = null;
let calYear, calMonth;

// ---------- 工具 ----------
function loadState() {
  // 兼容旧版：把 workbench_v1 迁移到新结构
  try {
    const oldRaw = localStorage.getItem('workbench_v1');
    if (oldRaw && Object.keys(loadAccounts()).length === 0) {
      const oldData = JSON.parse(oldRaw);
      const acc = { 'demo': { password: hashPwd('123456'), data: oldData } };
      saveAccounts(acc);
      localStorage.removeItem('workbench_v1');
    }
  } catch (e) {}

  currentUser = getSession();
  if (!currentUser) return null;
  const acc = loadAccounts();
  if (!acc[currentUser]) {
    setSession('');
    return null;
  }
  // 合并默认字段
  const data = Object.assign(defaultUserData(), acc[currentUser].data || {});
  acc[currentUser].data = data;
  acc[currentUser].lastActiveAt = Date.now();
  // 记录今日使用
  const today = todayStr();
  if (!data.activeDays) data.activeDays = [];
  if (!data.activeDays.includes(today)) data.activeDays.push(today);
  saveAccounts(acc);
  return data;
}

function saveState() {
  if (!currentUser || !state) return;
  try {
    const acc = loadAccounts();
    acc[currentUser].data = state;
    saveAccounts(acc);
    maybeWarnBackup();
  } catch (e) {
    showToast('保存失败：浏览器存储不可用');
  }
}

function uid() { return Date.now() + Math.floor(Math.random() * 1000); }

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 1800);
}

function fmtDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ---------- Tab 切换 ----------
const PAGE_TITLES = {
  overview: '项目总览',
  tasks: '任务管理',
  projects: '项目管理',
  health: '健康管理'
};

// 切换到指定 Tab
function switchToTab(tab) {
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (!btn) return;
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page' + capitalize(tab)).classList.add('active');
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = PAGE_TITLES[tab] || '个人工作台';
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (!tab) {
      // 中央加号按钮：展开/收起 FAB 菜单
      toggleFabMenu();
      return;
    }
    // 关闭 FAB 菜单
    closeFabMenu();
    switchToTab(tab);
  });
});

function toggleFabMenu() {
  fabOpen = !fabOpen;
  document.getElementById('fabMenu').classList.toggle('show', fabOpen);
  document.getElementById('fabBtn').classList.toggle('active', fabOpen);
}
function closeFabMenu() {
  fabOpen = false;
  document.getElementById('fabMenu').classList.remove('show');
  document.getElementById('fabBtn').classList.remove('active');
}

// 点击菜单/按钮外部任意位置，自动收起 FAB 新建列表
document.addEventListener('click', e => {
  if (!fabOpen) return;
  const fabMenu = document.getElementById('fabMenu');
  const fabBtn = document.getElementById('fabBtn');
  if (fabMenu && fabMenu.contains(e.target)) return;   // 点菜单项内不收
  if (fabBtn && fabBtn.contains(e.target)) return;      // 点加号按钮内不收（toggle 自己处理）
  closeFabMenu();
});

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------- 任务渲染 ----------
function renderTasks() {
  // 同步刷新「所有任务」栏（含已完成）
  renderTasksAll();
  const list = document.getElementById('taskList');
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const today = todayStr();
  const doneDisplay = loadSettingsPrefs().doneTaskDisplay || 'bottom';
  const showDone = doneDisplay !== 'hide';
  // 判断是否逾期（未完成且日期早于今天）
  const isOverdue = t => !t.done && taskDateStr(t) < today;
  // 今日待办：今天任务 + 逾期任务（未完成）；strike/bottom 模式下也显示今日已完成
  let tasks = state.tasks.filter(t => {
    if (taskDateStr(t) === today) return showDone || !t.done;
    return isOverdue(t);
  });

  if (q) {
    tasks = tasks.filter(t => {
      const proj = (state.projects || []).find(p => p.name === t.project);
      const tagText = ((proj && proj.tags) || []).join(' ').toLowerCase();
      return t.title.toLowerCase().includes(q)
        || (t.project || '').toLowerCase().includes(q)
        || tagText.includes(q);
    });
  }

  // 排序：今天任务优先，其次逾期任务；bottom 模式下已完成沉底
  tasks.sort((a, b) => {
    const aToday = taskDateStr(a) === today, bToday = taskDateStr(b) === today;
    if (aToday !== bToday) return aToday ? -1 : 1;
    if (doneDisplay === 'bottom' && a.done !== b.done) return a.done ? 1 : -1;
    const ka = taskSortKey(a), kb = taskSortKey(b);
    if (ka !== kb) return ka.localeCompare(kb);
    const order = { high: 0, mid: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  document.getElementById('taskCount').textContent = tasks.length;

  if (!tasks.length) {
    list.innerHTML = '<div class="empty-tip">还没有任务，点击底部 + 创建吧</div>';
    return;
  }
  list.innerHTML = tasks.map(t => {
    const overdue = isOverdue(t);
    const dateLabel = overdue ? `<span class="task-date-overdue">逾期 ${overdueDays(taskDateStr(t))} 天</span>` : `${fmtTaskDateLabel(taskDateStr(t))}`;
    return `
    <div class="task-item ${overdue ? 'task-overdue' : ''} ${t.done ? 'done' : ''}">
      <div class="task-check ${t.done ? 'checked' : ''}" data-id="${t.id}"></div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">
          <span><span class="task-prio ${t.priority}"></span>${prioLabel(t.priority)}</span>
          <span>· ${escapeHtml(t.project || '无项目')}</span>
          <span>· ${dateLabel} ${taskTimeStr(t) ? taskTimeStr(t) : ''}</span>
        </div>
      </div>
      <div class="task-actions">
        <button data-edit="${t.id}">✎</button>
        <button data-del="${t.id}">×</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.task-check').forEach(el => {
    el.addEventListener('click', () => toggleTask(+el.dataset.id));
  });
  list.querySelectorAll('[data-edit]').forEach(el => {
    el.addEventListener('click', () => openModal(+el.dataset.edit));
  });
  list.querySelectorAll('[data-del]').forEach(el => {
    el.addEventListener('click', () => deleteTask(+el.dataset.del));
  });
}

// 逾期天数（dateStr < today 时计算相差天数）
function overdueDays(dateStr) {
  const d1 = new Date(dateStr + 'T00:00:00');
  const d2 = new Date(todayStr() + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}

function prioLabel(p) { return { high: '高', mid: '中', low: '低' }[p] || '中'; }

// 所有任务列表（含已完成，按日期+时间排序，完成后沉底）
function renderTasksAll() {
  const list = document.getElementById('taskAllList');
  if (!list) return;
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const doneDisplay = loadSettingsPrefs().doneTaskDisplay || 'bottom';
  let tasks = state.tasks.slice();
  // hide 模式下过滤掉已完成任务
  if (doneDisplay === 'hide') tasks = tasks.filter(t => !t.done);
  if (q) {
    tasks = tasks.filter(t => {
      const proj = (state.projects || []).find(p => p.name === t.project);
      const tagText = ((proj && proj.tags) || []).join(' ').toLowerCase();
      return t.title.toLowerCase().includes(q)
        || (t.project || '').toLowerCase().includes(q)
        || tagText.includes(q);
    });
  }
  tasks.sort((a, b) => {
    // bottom 模式：已完成沉底
    if (doneDisplay === 'bottom' && a.done !== b.done) return a.done ? 1 : -1;
    const ka = taskSortKey(a), kb = taskSortKey(b);
    if (ka !== kb) return ka.localeCompare(kb);
    const order = { high: 0, mid: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
  const cnt = document.getElementById('taskAllCount');
  if (cnt) cnt.textContent = tasks.length;
  if (!tasks.length) {
    list.innerHTML = '<div class="empty-tip">还没有任务，点击底部 + 创建吧</div>';
    return;
  }
  list.innerHTML = tasks.map(t => `
    <div class="task-item ${t.done ? 'done' : ''}">
      <div class="task-check ${t.done ? 'checked' : ''}" data-id="${t.id}"></div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">
          <span><span class="task-prio ${t.priority}"></span>${prioLabel(t.priority)}</span>
          <span>· ${escapeHtml(t.project || '无项目')}</span>
          <span>· ${fmtTaskDateLabel(taskDateStr(t))} ${taskTimeStr(t) ? taskTimeStr(t) : ''}</span>
        </div>
      </div>
      <div class="task-actions">
        <button data-edit="${t.id}">✎</button>
        <button data-del="${t.id}">×</button>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.task-check').forEach(el => {
    el.addEventListener('click', () => toggleTask(+el.dataset.id));
  });
  list.querySelectorAll('[data-edit]').forEach(el => {
    el.addEventListener('click', () => openModal(+el.dataset.edit));
  });
  list.querySelectorAll('[data-del]').forEach(el => {
    el.addEventListener('click', () => deleteTask(+el.dataset.del));
  });
}

// 任务日期兼容：优先用 t.date（YYYY-MM-DD），否则旧数据视为今天
function taskDateStr(t) {
  if (t.date) return t.date;
  return todayStr();
}
// 任务时间兼容：优先用 t.time（HH:MM），否则 '00:00'
function taskTimeStr(t) {
  if (t.time) return t.time;
  return '';
}
// 用于排序：'YYYY-MM-DD HH:MM'
function taskSortKey(t) {
  return `${taskDateStr(t)} ${taskTimeStr(t) || '00:00'}`;
}
// 把 YYYY-MM-DD 转成 "M月D日"（用于今天/明天判断时特殊处理）
function fmtTaskDateLabel(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  if (dateStr === todayStr()) return '今天';
  if (dateStr === tomorrowStr()) return '明天';
  return `${m}月${d}日`;
}
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
// Date → YYYY-MM-DD（补零）
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
// Date → YYYY-MM-DDTHH:MM（datetime-local 用）
function fmtFullDate(d) {
  return `${isoDate(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveState();
  renderTasks();
  renderOverview();   // 同步更新总览页统计
  renderProjects();   // 同步更新项目页进度
  showToast(t.done ? '已标记为完成' : '已恢复为未完成');
}

function deleteTask(id) {
  if (!confirm('确定删除这条任务？')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderTasks();
  renderOverview();
  renderProjects();
  showToast('已删除');
}

// ---------- 模态框 ----------
const modal = document.getElementById('taskModal');
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function openModal(id) {
  editingTaskId = id || null;
  refreshTaskProjectOptions();
  document.getElementById('modalTitle').textContent = id ? '编辑任务' : '新建任务';
  const pSel = document.getElementById('taskProject');
  if (id) {
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById('taskTitle').value = t.title;
    pSel.value = t.project;
    document.getElementById('taskPriority').value = t.priority;
    document.getElementById('taskDate').value = t.date || todayStr();
    document.getElementById('taskTime').value = t.time || '';
    document.getElementById('taskNote').value = t.note || '';
  } else {
    document.getElementById('taskTitle').value = '';
    pSel.value = pSel.options[0] ? pSel.options[0].value : '';
    document.getElementById('taskPriority').value = loadSettingsPrefs().defaultPriority || 'mid';
    document.getElementById('taskDate').value = todayStr();
    document.getElementById('taskTime').value = '';
    document.getElementById('taskNote').value = '';
  }
  modal.classList.add('show');
  setTimeout(() => document.getElementById('taskTitle').focus(), 200);
}

// 动态填充任务弹窗的项目下拉（含"无项目"选项）
function refreshTaskProjectOptions() {
  const sel = document.getElementById('taskProject');
  if (!sel) return;
  const names = (state.projects || []).map(p => p.name);
  const prev = sel.value;
  let html = '<option value="">无项目</option>';
  html += names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.innerHTML = html;
  sel.value = prev;
}

// 任务 time/date 字段 → datetime-local 输入值
function taskToInputValue(t) {
  if (!t) return '';
  // 新格式：已有 date + time
  if (t.date && t.time) return `${t.date}T${t.time}`;
  // 新格式：time 已是完整 datetime
  if (t.time && t.time.includes('T')) return t.time;
  // 旧格式：仅 HH:MM → 合并到今天
  if (t.time) return `${todayStr()}T${t.time}`;
  // 无时间
  const d = new Date(Date.now() + 3600 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function closeModal() {
  modal.classList.remove('show');
  editingTaskId = null;
}

// ========== 项目弹窗（新建 / 编辑） ==========
const projectModal = document.getElementById('projectModal');
let editingProjectId = null;

// 动态填充项目类型下拉（含"自定义"选项）
function refreshProjTypeOptions() {
  const sel = document.getElementById('projType');
  if (!sel) return;
  const sp = loadSettingsPrefs();
  const types = sp.projectTypes || [];
  const prev = sel.value;
  let html = types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  html += '<option value="__custom__">+ 自定义…</option>';
  sel.innerHTML = html;
  // 尝试恢复之前的选择
  if (prev && prev !== '__custom__' && types.includes(prev)) sel.value = prev;
  else if (types.length) sel.value = types[0];
  // 自定义输入框联动
  const customInput = document.getElementById('projTypeCustom');
  if (customInput) {
    customInput.style.display = sel.value === '__custom__' ? 'block' : 'none';
  }
}

// 项目类型 select 变化时联动自定义输入框
document.getElementById('projType')?.addEventListener('change', function() {
  const customInput = document.getElementById('projTypeCustom');
  if (customInput) customInput.style.display = this.value === '__custom__' ? 'block' : 'none';
});

function openProjectModal(id) {
  editingProjectId = id || null;
  document.getElementById('projectModalTitle').textContent = id ? '编辑项目' : '新建项目';
  refreshProjTypeOptions();
  const customInput = document.getElementById('projTypeCustom');

  if (id) {
    const p = (state.projects || []).find(x => x.id === id);
    if (!p) return;
    document.getElementById('projName').value = p.name || '';
    document.getElementById('projCode').value = p.code || '';
    // 检查项目类型是否在预设列表中
    const sp = loadSettingsPrefs();
    const types = sp.projectTypes || [];
    if (p.type && types.includes(p.type)) {
      document.getElementById('projType').value = p.type;
      if (customInput) { customInput.style.display = 'none'; customInput.value = ''; }
    } else if (p.type) {
      // 不在预设中 → 选"自定义"并填入
      document.getElementById('projType').value = '__custom__';
      if (customInput) { customInput.style.display = 'block'; customInput.value = p.type; }
    }
    const sd = splitDateTime(p.start);
    document.getElementById('projStartDate').value = sd.date;
    document.getElementById('projStartTime').value = sd.time;
    const dd = splitDateTime(p.due);
    document.getElementById('projDueDate').value = dd.date;
    document.getElementById('projDueTime').value = dd.time;
    document.getElementById('projAddress').value = p.address || '';
    document.getElementById('projNote').value = p.desc || '';
    document.getElementById('projStatus').value = p.status || 'active';
    renderProjTagSelect(p.tags || []);
  } else {
    document.getElementById('projName').value = '';
    document.getElementById('projCode').value = '';
    if (customInput) { customInput.style.display = 'none'; customInput.value = ''; }
    document.getElementById('projStartDate').value = '';
    document.getElementById('projStartTime').value = '';
    document.getElementById('projDueDate').value = '';
    document.getElementById('projDueTime').value = '';
    document.getElementById('projAddress').value = '';
    document.getElementById('projNote').value = '';
    document.getElementById('projStatus').value = 'active';
    renderProjTagSelect([]);
  }
  projectModal.classList.add('show');
  setTimeout(() => document.getElementById('projName').focus(), 200);
}

// 渲染项目弹窗标签多选（标签列表来自设置里的自定义标签）
function renderProjTagSelect(selected) {
  const wrap = document.getElementById('projTagSelect');
  if (!wrap) return;
  const sp = loadSettingsPrefs();
  const allTags = sp.tags || [];
  const selectedSet = new Set(selected || []);
  wrap.innerHTML = (allTags.length ?
    allTags.map(t => `
      <span class="pt-option ${selectedSet.has(t) ? 'active' : ''}" data-tag="${escapeHtml(t)}">
        <span class="pt-dot"></span>${escapeHtml(t)}
      </span>`).join('')
    : '<span style="font-size:12px;color:var(--text-2)">暂无标签</span>');

  // 收集当前已选（保存用）
  window.__projSelectedTags = Array.from(selectedSet);
  wrap.querySelectorAll('.pt-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const tag = opt.dataset.tag;
      const cur = window.__projSelectedTags || [];
      opt.classList.toggle('active');
      if (opt.classList.contains('active')) {
        if (!cur.includes(tag)) cur.push(tag);
      } else {
        const i = cur.indexOf(tag);
        if (i > -1) cur.splice(i, 1);
      }
      window.__projSelectedTags = cur;
    });
  });
}

function closeProjectModal() {
  projectModal.classList.remove('show');
  editingProjectId = null;
}

document.getElementById('projectClose').addEventListener('click', closeProjectModal);
document.getElementById('projectCancel').addEventListener('click', closeProjectModal);
projectModal.addEventListener('click', e => { if (e.target === projectModal) closeProjectModal(); });

document.getElementById('projectSave').addEventListener('click', () => {
  const name = document.getElementById('projName').value.trim();
  if (!name) { showToast('请输入项目名称'); return; }
  // 处理项目类型：如果是"自定义"则取输入框值
  let projType = document.getElementById('projType').value;
  if (projType === '__custom__') {
    projType = (document.getElementById('projTypeCustom')?.value || '').trim();
  }
  const data = {
    name,
    code: document.getElementById('projCode').value.trim(),
    type: projType,
    start: joinDateTime('projStartDate', 'projStartTime'),
    due: joinDateTime('projDueDate', 'projDueTime'),
    address: document.getElementById('projAddress').value.trim(),
    desc: document.getElementById('projNote').value.trim(),
    status: document.getElementById('projStatus').value,
    tags: window.__projSelectedTags || []
  };
  if (editingProjectId) {
    const p = (state.projects || []).find(x => x.id === editingProjectId);
    if (p) {
      const oldName = p.name;
      Object.assign(p, data);
      // 项目改名时，同步该项目下任务的所属项目名称
      if (oldName !== data.name) {
        state.tasks.forEach(t => { if (t.project === oldName) t.project = data.name; });
      }
      showToast('已更新');
    }
  } else {
    state.projects.push({ id: 'p' + uid(), members: ['我'], ...data });
    showToast('项目已添加');
  }
  saveState();
  closeProjectModal();
  renderProjects();
  renderOverview();
  refreshTaskProjectOptions();
});

// 删除项目（编辑项目弹窗右下角垃圾桶）
document.getElementById('projectDel')?.addEventListener('click', () => {
  if (!editingProjectId) { showToast('仅编辑状态可删除项目'); return; }
  const p = (state.projects || []).find(x => x.id === editingProjectId);
  if (!p) return;
  if (!confirm(`是否确认删除项目“${p.name}”？`)) return;   // 取消则返回编辑卡片
  state.projects = (state.projects || []).filter(x => x.id !== editingProjectId);
  saveState();
  closeProjectModal();
  renderProjects();
  renderOverview();
  refreshTaskProjectOptions();
  showToast('项目已删除');
});

document.getElementById('modalSave').addEventListener('click', () => {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { showToast('请输入任务标题'); return; }
  // 执行时间拆为左右两栏：taskDate(日期) + taskTime(时间)
  const date = document.getElementById('taskDate')?.value || '';
  const time = document.getElementById('taskTime')?.value || '';
  if (!date) { showToast('请选择执行日期'); return; }
  const data = {
    title,
    project: document.getElementById('taskProject').value,
    priority: document.getElementById('taskPriority').value,
    date,
    time,
    note: document.getElementById('taskNote').value.trim()
  };
  if (editingTaskId) {
    const t = state.tasks.find(x => x.id === editingTaskId);
    Object.assign(t, data);
    showToast('已更新');
  } else {
    state.tasks.push({ id: uid(), done: false, ...data });
    showToast('已添加');
  }
  saveState();
  renderTasks();
  renderCalendar();
  renderOverview();
  closeModal();
});

// 搜索（任务列表 + 总览项目卡片按标签/名称/类型过滤）
// 总览搜索框：输入后点搜索图标或按回车确认，才执行搜索
function doSearch() {
  renderTasks();
  renderOverview();
}
const siEl = document.getElementById('searchInput');
const sbEl = document.getElementById('searchBtn');
if (siEl) siEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});
if (sbEl) sbEl.addEventListener('click', doSearch);
document.getElementById('globalSearchInput')?.addEventListener('input', (e) => {
  // PC 全局搜索同步到原搜索框并切换任务页
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = e.target.value;
  doSearch();
});

// ---------- 日历 ----------
const calDays = document.getElementById('calDays');
const calTitle = document.getElementById('calTitle');
const eventList = document.getElementById('eventList');

function initCalendar() {
  const today = new Date();
  calYear = today.getFullYear();
  calMonth = today.getMonth();
  if (!state.selectedDate) {
    state.selectedDate = fmtDateKey(calYear, calMonth, today.getDate());
    saveState();
  }
  renderCalendar();
}

// 初始化可折叠面板
function initCollapsible() {
  const sections = [
    { header: 'todayTasksHeader', body: 'todayTasksBody', arrow: 'todayTasksArrow' },
    { header: 'weekTasksHeader', body: 'weekTasksBody', arrow: 'weekTasksArrow' },
    { header: 'allTasksHeader', body: 'allTasksBody', arrow: 'allTasksArrow' }
  ];
  sections.forEach(({ header, body }) => {
    const h = document.getElementById(header);
    const b = document.getElementById(body);
    if (!h || !b) return;
    h.addEventListener('click', () => {
      h.classList.toggle('collapsed');
      b.classList.toggle('collapsed');
    });
  });
}

function renderCalendar() {
  calTitle.textContent = `${calYear}年 ${calMonth + 1}月`;
  calDays.innerHTML = '';
  updateWeekdayHeaders();

  const firstDay = new Date(calYear, calMonth, 1);
  let start = getCalStartCol(firstDay);
  const lastDate = new Date(calYear, calMonth + 1, 0).getDate();
  const prevLastDate = new Date(calYear, calMonth, 0).getDate();

  const today = new Date();
  const isCurMonth = today.getFullYear() === calYear && today.getMonth() === calMonth;
  const todayD = today.getDate();

  // 收集本月哪些日期有任务（按任务真实日期聚合，key 用 YYYY-MM-DD）
  const taskDays = {};
  const taskHighDays = {};
  (state.tasks || []).forEach(t => {
    const dkey = taskDateStr(t);
    // 匹配当前显示的月份
    const y = parseInt(dkey.slice(0, 4), 10);
    const m = parseInt(dkey.slice(5, 7), 10);
    if (y !== calYear || (m - 1) !== calMonth) return;
    if (!taskDays[dkey]) taskDays[dkey] = [];
    taskDays[dkey].push(t);
    if (t.priority === 'high' || t.priority === '高') {
      if (!taskHighDays[dkey]) taskHighDays[dkey] = [];
      taskHighDays[dkey].push(t);
    }
  });

  // 本周日期范围（根据周起始日设置）
  const weekStart = new Date(today); weekStart.setDate(today.getDate() + getWeekOffset());
  const weekKeys = new Set();
  for (let i = 0; i < 7; i++) {
    const wd = new Date(weekStart); wd.setDate(weekStart.getDate() + i);
    weekKeys.add(fmtDateKey(wd.getFullYear(), wd.getMonth(), wd.getDate()));
  }

  // 上月补位
  for (let i = start; i > 0; i--) {
    const d = prevLastDate - i + 1;
    const div = document.createElement('div');
    div.className = 'cal-day muted';
    div.textContent = d;
    div.addEventListener('click', () => {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      state.selectedDate = fmtDateKey(calYear, calMonth, d);
      saveState();
      renderCalendar();
    });
    calDays.appendChild(div);
  }

  // 本月
  for (let d = 1; d <= lastDate; d++) {
    const div = document.createElement('div');
    div.className = 'cal-day';
    div.textContent = d;
    const key = fmtDateKey(calYear, calMonth, d);

    // 当日：实心圆
    if (isCurMonth && d === todayD) {
      div.classList.add('today');
    }
    if (state.selectedDate === key) div.classList.add('selected');

    // 有任务的日子：单线圈出（使用 ring 类）
    if (taskDays[key] && taskDays[key].length) {
      div.classList.add('has-task');
    }
    // 高优先级任务日期：加强高亮（实点）
    if (taskHighDays[key] && taskHighDays[key].length) {
      div.classList.add('high-task');
    }

    // 本周日期：虚线外圈
    if (weekKeys.has(key) && !div.classList.contains('today')) {
      div.classList.add('this-week');
    }

    div.addEventListener('click', () => {
      state.selectedDate = key;
      saveState();
      renderCalendar();
    });
    calDays.appendChild(div);
  }

  // 下月补位
  const total = calDays.children.length;
  const fill = (7 - (total % 7)) % 7;
  for (let d = 1; d <= fill; d++) {
    const div = document.createElement('div');
    div.className = 'cal-day muted';
    div.textContent = d;
    div.addEventListener('click', () => {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      state.selectedDate = fmtDateKey(calYear, calMonth, d);
      saveState();
      renderCalendar();
    });
    calDays.appendChild(div);
  }

  renderEvents(taskDays);
}

function renderEvents(taskDays) {
  // 本周任务列表（按优先级排序）
  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() + getWeekOffset());

  const weekTasks = [];
  for (let i = 0; i < 7; i++) {
    const wd = new Date(weekStart); wd.setDate(weekStart.getDate() + i);
    const key = fmtDateKey(wd.getFullYear(), wd.getMonth(), wd.getDate());
    if (taskDays && taskDays[key]) {
      weekTasks.push(...taskDays[key].map(t => ({ ...t, _dateKey: key, _date: new Date(wd) })));
    }
  }
  // 去重
  const seen = new Set();
  const unique = weekTasks.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });

  // 按优先级排序（高→中→低），同优先级按时序
  const prioOrder = { high: 0, mid: 1, low: 2 };
  unique.sort((a, b) => {
    if (prioOrder[a.priority] !== prioOrder[b.priority]) return prioOrder[a.priority] - prioOrder[b.priority];
    return a.time.localeCompare(b.time);
  });

  const ec = document.getElementById('eventCount');
  if (ec) ec.textContent = unique.length;

  if (!unique.length) {
    eventList.innerHTML = '<div class="empty-tip">本周暂无任务</div>';
    return;
  }
  const weekDayNames = ['日','一','二','三','四','五','六'];
  eventList.innerHTML = unique.map(t => {
    const wd = weekDayNames[t._date.getDay()];
    const [_, m, d] = t._dateKey.split('-').map(Number);
    return `
      <div class="event-item">
        <div class="event-bar ${t.priority}"></div>
        <div class="event-body">
          <div class="event-title">${escapeHtml(t.title)}</div>
          <div class="event-time">周${wd} ${m}月${d}日 · ${t.time} · ${prioLabel(t.priority)}优先级 · ${escapeHtml(t.project)}</div>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('prevMonth').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

// ---------- 项目页渲染 ----------
const STATUS_LABEL = { active: '进行中', paused: '已暂停', done: '已完成' };

// 按设置排序项目列表（总览横滑 + 项目页统一）
function getSortedProjects(projects) {
  const sp = loadSettingsPrefs();
  const mode = sp.projectSort || 'due';
  const arr = projects.slice();
  if (mode === 'name') {
    arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'));
  } else if (mode === 'created') {
    // id 格式 'p<timestamp>'，提取数字部分比较，新建在前
    arr.sort((a, b) => (parseInt(b.id.slice(1)) || 0) - (parseInt(a.id.slice(1)) || 0));
  } else {
    // due：按截止日期升序，无截止日期排末尾
    arr.sort((a, b) => {
      const va = a.due || '', vb = b.due || '';
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      return va.localeCompare(vb);
    });
  }
  return arr;
}

function renderProjects() {
  const projects = getSortedProjects(state.projects || []);
  document.getElementById('projCount').textContent = projects.length;

  // 顶部汇总：总项目 / 进行中 / 已完成 / 已暂停
  const active = projects.filter(p => p.status === 'active').length;
  const done = projects.filter(p => p.status === 'done').length;
  const paused = projects.filter(p => p.status === 'paused').length;
  document.getElementById('projSummary').innerHTML = `
    <div class="summary-cell">
      <div class="summary-num">${projects.length}</div>
      <div class="summary-label">总项目</div>
    </div>
    <div class="summary-cell">
      <div class="summary-num accent">${active}</div>
      <div class="summary-label">进行中</div>
    </div>
    <div class="summary-cell">
      <div class="summary-num done">${done}</div>
      <div class="summary-label">已完成</div>
    </div>
    <div class="summary-cell">
      <div class="summary-num warn">${paused}</div>
      <div class="summary-label">已暂停</div>
    </div>
  `;

  // 项目卡片列表
  const list = document.getElementById('projectFullList');
  if (!projects.length) {
    list.innerHTML = '<div class="empty-tip">还没有项目</div>';
    return;
  }
  list.innerHTML = projects.map(p => {
    // 根据任务完成情况计算进度
    const projTasks = state.tasks.filter(t => t.project === p.name);
    const total = projTasks.length || 1;
    const done = projTasks.filter(t => t.done).length;
    const pct = projTasks.length ? Math.round(done / total * 100) : (p.status === 'done' ? 100 : 0);
    const tagChips = (p.tags || []).map(t => `<span class="proj-tag-chip">${escapeHtml(t)}</span>`).join('');

    // 该项目任务：未完成在前、已完成在后，各自按时间排序
    const sortByTime = (a, b) => (taskSortKey(a) || '').localeCompare(taskSortKey(b) || '');
    const pendingList = projTasks.filter(t => !t.done).sort(sortByTime);
    const doneList = projTasks.filter(t => t.done).sort(sortByTime);
    const taskRow = t => `
      <div class="pt-row ${t.done ? 'done' : ''}">
        <span class="pt-flag ${t.priority}"></span>
        <span class="pt-title">${escapeHtml(t.title)}</span>
        <span class="pt-time">${fmtTaskDateLabel(taskDateStr(t))} ${taskTimeStr(t) ? taskTimeStr(t) : ''}</span>
      </div>`;
    const pendingHtml = pendingList.length
      ? `<div class="pt-group-title">未完成（${pendingList.length}）</div>` + pendingList.map(taskRow).join('')
      : '';
    const doneHtml = doneList.length
      ? `<div class="pt-group-title">已完成（${doneList.length}）</div>` + doneList.map(taskRow).join('')
      : '';
    const tasksPanel = (pendingHtml || doneHtml)
      ? `<div class="project-tasks-panel">
           <div class="pt-head">项目任务 · 共 ${projTasks.length} 个</div>
           ${pendingHtml}${doneHtml}
           ${projTasks.length ? '' : '<div class="pt-empty">暂无任务</div>'}
         </div>`
      : `<div class="project-tasks-panel"><div class="pt-empty">该项目暂无任务</div></div>`;

    return `
      <div class="project-full-card-wrap" data-project-id="${p.id}">
        <div class="project-full-card">
          <div class="project-full-head">
            <div>
              <div class="project-full-title">${escapeHtml(p.name)}</div>
              <div class="project-full-desc">${p.type ? '<span class="chip">' + escapeHtml(p.type) + '</span>' : ''} ${escapeHtml(p.desc || '')}</div>
            </div>
            <span class="project-full-tag ${p.status}">${STATUS_LABEL[p.status] || '进行中'}</span>
          </div>
          ${tagChips ? `<div class="proj-full-tags">${tagChips}</div>` : ''}
          <div class="project-progress-row">
            <span>${done}/${projTasks.length} 任务</span>
            <span class="pct">${pct}%</span>
          </div>
          <div class="project-progress-bar">
            <div class="project-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="project-full-foot">
            <div class="project-edit-btn" title="编辑项目信息">
              <svg viewBox="0 0 24 24" width="15" height="15"><path d="M17 3l4 4L8 20l-5 1 1-5L17 3Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/></svg>
            </div>
            <span>${fmtProjectWindow(p)} · ${escapeHtml(p.address || '未设地址')}</span>
          </div>
        </div>
        ${tasksPanel}
      </div>
    `;
  }).join('');

  // 点卡片主体 → 展开/收起该项目任务（同一时间只展开一个，自动收起其他的）
  list.querySelectorAll('.project-full-card').forEach(el => {
    el.addEventListener('click', function(e) {
      if (e.target.closest('.project-edit-btn')) return; // 编辑按钮不触发展开
      const wrap = this.closest('.project-full-card-wrap');
      const wasOpen = wrap.classList.contains('open');
      // 先收起其它已展开的项目卡片
      list.querySelectorAll('.project-full-card-wrap.open').forEach(w => w.classList.remove('open'));
      if (!wasOpen) wrap.classList.add('open');
    });
  });
  // 点左下角「编辑」图标 → 编辑项目信息
  list.querySelectorAll('.project-edit-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openProjectModal(el.closest('.project-full-card-wrap').dataset.projectId);
    });
  });
}

// 项目时间范围显示：起始 → 预计完成
function fmtProjectWindow(p) {
  const a = p.start, b = p.due;
  if (!a && !b) return '未设时间';
  const part = s => {
    if (!s) return '';
    // datetime-local 值 YYYY-MM-DDTHH:MM 或 YYYY-MM-DD
    const md = String(s).match(/^\d{4}-(\d{2})-(\d{2})/);
    return md ? `${parseInt(md[1],10)}/${parseInt(md[2],10)}` : s;
  };
  if (a && b) return `${part(a)} – ${part(b)}`;
  return a ? part(a) : '预计' + part(b);
}

// ---------- 总览页渲染 ----------
function renderOverview() {
  try {
    // 确保数据完整
    if (!state.tasks) state.tasks = [];
    if (!state.projects) state.projects = defaultUserData().projects;
    if (!state.events) state.events = {};
    if (!state.profile) state.profile = defaultUserData().profile;

    const tasks = state.tasks;
    const projects = getSortedProjects(state.projects);
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.done).length;

    // 四张统计卡
    const elTotal = document.getElementById('statTotalProj');
    const elTotalSub = document.getElementById('statTotalProjSub');
    if (elTotal) elTotal.textContent = projects.length;
    if (elTotalSub) elTotalSub.textContent = projects.length;

    const elActive = document.getElementById('statActive');
    if (elActive) elActive.textContent = projects.filter(p => p.status === 'active').length;
    const elActiveTrend = document.getElementById('statActiveTrend');
    if (elActiveTrend) elActiveTrend.textContent = '—';

    // 「已完成」= 已完成项目数（关联项目页顶部的已完成汇总）
    const doneProj = projects.filter(p => p.status === 'done').length;
    const elDone = document.getElementById('statDone');
    if (elDone) elDone.textContent = doneProj;
    const elDoneTrend = document.getElementById('statDoneTrend');
    if (elDoneTrend) elDoneTrend.textContent = projects.length ? Math.round(doneProj/projects.length*100) + '%' : '—';

    // 「暂停任务」= 已暂停项目数（关联项目页顶部的已暂停汇总）
    const pausedProj = projects.filter(p => p.status === 'paused').length;
    const elPaused = document.getElementById('statPaused');
    if (elPaused) elPaused.textContent = pausedProj;
    const elPausedSub = document.getElementById('statPausedSub');
    if (elPausedSub) elPausedSub.textContent = pausedProj;

    // 本月进度：日期在当月的所有任务（当月已完成 / 当月所有）
    const d0 = new Date();
    const year0 = d0.getFullYear();          // 为区分下面 month 变量，用 year0
    const month0 = d0.getMonth() + 1;
    const monthTasks = tasks.filter(t => {
      const dt = taskDateStr(t);
      return dt.startsWith(`${year0}-${String(month0).padStart(2, '0')}`);
    });
    const monthDone = monthTasks.filter(t => t.done).length;
    const monthPct = monthTasks.length ? Math.round(monthDone / monthTasks.length * 100) : 0;

    const elLabel = document.getElementById('progressDateLabel');
    if (elLabel) elLabel.textContent = `${year0}年 ${month0}月 · 本月任务进度`;
    const elPct = document.getElementById('circlePct');
    if (elPct) elPct.textContent = monthPct + '%';
    const elDays = document.getElementById('progressDays');
    if (elDays) elDays.innerHTML = `已完成 <strong>${monthDone}</strong>/${monthTasks.length} 个任务`;
    const elCirc = document.getElementById('progressCircle');
    if (elCirc) elCirc.style.background =
      `conic-gradient(var(--accent) 0% ${monthPct}%, rgba(255,255,255,0.08) ${monthPct}% 100%)`;

    // 年度柱状图：按项目创建月份(start)统计每月新增项目数
    const BAR_H = 70;          // 柱子总高度（px）固定
    const months = ['1','2','3','4','5','6','7','8','9','10','11','12'];
    // 解析 datetime 串 → {y,m}，取开始时间所在月份
    const projMonth = p => {
      const md = String(p.start || '').match(/^(\d{4})-(\d{2})-\d{2}/);
      return md ? { y: +md[1], m: parseInt(md[2], 10) } : null;
    };
    const newPerMonth = new Array(12).fill(0);
    projects.forEach(p => {
      const s = projMonth(p);
      if (s && s.y === year0 && s.m >= 1 && s.m <= 12) newPerMonth[s.m - 1]++;
    });
    const maxMonth = Math.max(1, ...newPerMonth);   // 避免除以0
    const chartBars = document.getElementById('chartBars');
    if (chartBars) {
      chartBars.innerHTML = months.map((m, i) => {
        const n = newPerMonth[i];
        const h = Math.round(n / maxMonth * BAR_H);
        return `
          <div class="chart-month">
            <div class="chart-bar-stack" style="height:${BAR_H}px">
              <div class="chart-bar-fill" style="height:${h < 2 ? 2 : h}px"></div>
            </div>
            <span class="chart-month-label">${m}</span>
            <span class="chart-badge">${n}</span>
          </div>`;
      }).join('');
    }

    // 项目卡片横滑
    const cardList = document.getElementById('overviewProjects');
    if (cardList) {
      // 搜索词（来自总览页/全局搜索）
      const sq = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
      let shown = projects;
      if (sq) {
        shown = projects.filter(p => {
          const tagText = (p.tags || []).join(' ').toLowerCase();
          return (p.name || '').toLowerCase().includes(sq)
            || (p.type || '').toLowerCase().includes(sq)
            || (p.address || '').toLowerCase().includes(sq)
            || (p.desc || '').toLowerCase().includes(sq)
            || tagText.includes(sq);
        });
      }
      if (!shown.length) {
        cardList.innerHTML = '<div style="color:var(--text-2);font-size:12px;padding:10px 0;">暂无匹配项目</div>';
      } else {
        cardList.innerHTML = shown.map(p => {
          const projTasks = tasks.filter(t => t.project === p.name);
          const pDone = projTasks.filter(t => t.done).length;
          const pTotal = projTasks.length;
          const isActive = p.status === 'active';
          const tagChips = (p.tags || []).map(t => `<span class="proj-tag-chip">${escapeHtml(t)}</span>`).join('');
          return `
            <div class="project-card ${isActive ? 'active' : ''}" data-project-id="${p.id}">
              <div class="project-head">
                <span class="project-tag">${escapeHtml(p.name)}</span>
                <span class="project-id">${pDone}/${pTotal}</span>
              </div>
              <div class="project-code">编号：${escapeHtml(p.code || '—')}</div>
              <div class="project-meta">${p.status === 'active' ? '进行中' : p.status === 'paused' ? '已暂停' : '已完成'} · ${fmtProjectWindow(p)}</div>
              ${tagChips ? `<div class="proj-card-tags">${tagChips}</div>` : ''}
            </div>`;
        }).join('');

        // 总览卡片也可点击编辑
        cardList.querySelectorAll('[data-project-id]').forEach(el => {
          el.addEventListener('click', () => openProjectModal(el.dataset.projectId));
        });
      }
    }
    // 项目计数
    const elProjCount = document.getElementById('overviewProjectCount');
    if (elProjCount) elProjCount.textContent = `${projects.length} 个项目`;

    // 今日任务预览（PC端）
    const previewList = document.getElementById('todayPreviewList');
    const previewCount = document.getElementById('todayPreviewCount');
    if (previewList && previewCount) {
      const todayTasks = tasks.filter(t => !t.done).slice(0, 6);
      previewCount.textContent = todayTasks.length;
      if (!todayTasks.length) {
        previewList.innerHTML = '<div class="empty-hint">今日暂无待办</div>';
      } else {
        previewList.innerHTML = todayTasks.map(t => {
          const dotCls = t.priority === 'high' ? 'high' : t.priority === 'mid' ? 'mid' : 'low';
          return `
            <div class="tp-task-item">
              <span class="tp-task-dot ${dotCls}"></span>
              <span class="tp-task-title">${escapeHtml(t.title)}</span>
              <span class="tp-task-time">${escapeHtml(t.time||'')}</span>
            </div>`;
        }).join('');
      }
    }

    // 健康看板
    renderHealthDashboard();
  } catch (err) {
    console.error('renderOverview 错误:', err);
  }
}

// ---------- 顶栏按钮 ----------
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('historyBtn').addEventListener('click', () => {
  const done = state.tasks.filter(t => t.done).length;
  const total = state.tasks.length;
  const rate = total ? Math.round(done / total * 100) : 0;
  let emoji, msg, tip;
  if (total === 0) {
    emoji = '🌱';
    msg = '万事开头难，先添加第一个任务吧';
    tip = '从一个小目标开始，慢慢积累';
  } else if (rate < 50) {
    emoji = '🚀';
    msg = '革命尚未成功，同志仍需努力';
    tip = `当前已完成 ${rate}%，再坚持一下就能过半`;
  } else if (rate < 80) {
    emoji = '🌍';
    msg = '你已超越银河人类50%，加油';
    tip = `当前已完成 ${rate}%，朝着 80% 冲刺`;
  } else if (rate < 100) {
    emoji = '💪';
    msg = '非常棒，你正在超越自己';
    tip = `当前已完成 ${rate}%，离圆满只差一步`;
  } else {
    emoji = '✨';
    msg = '恭喜，你已位列仙班';
    tip = `${total} 个任务全部完成，今天的你真厉害`;
  }
  showMotivationModal(emoji, `已完成 ${done}/${total} 个任务（${rate}%）`, msg, tip);
});

// 温馨励志对话框
function showMotivationModal(emoji, subtitle, msg, tip) {
  const modal = document.createElement('div');
  modal.className = 'modal-mask show';
  modal.innerHTML = `
    <div class="modal glass motivation-modal">
      <button class="modal-close" id="motivationClose">×</button>
      <div class="motivation-emoji">${emoji}</div>
      <div class="motivation-msg">${msg}</div>
      <div class="motivation-sub">${subtitle}</div>
      <div class="motivation-tip">${tip}</div>
      <div class="modal-foot">
        <button class="btn btn-primary" id="motivationOk" style="width:100%;">好，继续加油</button>
      </div>
    </div>
  `;
  document.getElementById('appShell').appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('#motivationClose').addEventListener('click', close);
  modal.querySelector('#motivationOk').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
}

// ========== 登录/注册 ==========
const authPage = document.getElementById('authPage');
const appShell = document.getElementById('appShell');
let authMode = 'login';

document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    authMode = btn.dataset.auth;
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('authSubmit').textContent = authMode === 'login' ? '登录' : '注册';
    document.getElementById('authHint').textContent = authMode === 'login'
      ? '首次使用？点击上方"注册"创建账号'
      : '注册后数据将独立保存在本浏览器中';
  });
});

document.getElementById('authSubmit').addEventListener('click', () => {
  const u = document.getElementById('authUsername').value.trim();
  const p = document.getElementById('authPassword').value;
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{3,20}$/.test(u)) {
    showToast('用户名 3-20 位（中英文/数字/下划线）'); return;
  }
  if (p.length < 6) { showToast('密码至少 6 位'); return; }

  const acc = loadAccounts();
  if (authMode === 'register') {
    if (acc[u]) { showToast('用户名已存在，请直接登录'); return; }
    acc[u] = { password: hashPwd(p), data: defaultUserData() };
    saveAccounts(acc);
    setSession(u);
    showToast('注册成功，已自动登录');
    enterApp();
  } else {
    if (!acc[u]) { showToast('用户名不存在，请先注册'); return; }
    if (acc[u].password !== hashPwd(p)) { showToast('密码错误'); return; }
    setSession(u);
    showToast('登录成功');
    enterApp();
  }
});

// 回车提交
['authUsername', 'authPassword'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('authSubmit').click();
  });
});

function enterApp() {
  state = loadState();
  if (!state) return;
  authPage.style.display = 'none';
  appShell.style.display = 'block';
  renderOverview();
  renderTasks();
  initCalendar();
  initCollapsible();
  renderProjects();
  renderHealth();
  applyPrefs();
  refreshAvatar();
  initSidebar();
  // 跳转到默认起始页
  const sp = loadSettingsPrefs();
  if (sp.defaultPage && sp.defaultPage !== 'overview') switchToTab(sp.defaultPage);
}

// PC 端侧边栏初始化（仅在宽屏下添加 Logo/快速创建/用户信息）
function initSidebar() {
  const tabBar = document.getElementById('tabBar');
  if (!tabBar) return;

  // 移除旧侧边栏元素
  tabBar.querySelectorAll('.sidebar-logo, .sidebar-add-btn, .sidebar-footer, .sidebar-header').forEach(el => el.remove());

  // 移动端不添加 PC 端专属侧边栏元素
  if (window.innerWidth < 768) return;

  // 侧边栏 Logo
  const logo = document.createElement('div');
  logo.className = 'sidebar-logo';
  logo.innerHTML = `
    <div class="sidebar-logo-mark">W</div>
    <div class="sidebar-logo-text">个人工作台</div>
  `;
  tabBar.insertBefore(logo, tabBar.firstChild);

  // Logo 下方 — 全局加号按钮
  const addBtn = document.createElement('button');
  addBtn.className = 'sidebar-add-btn';
  addBtn.id = 'sidebarAddBtn';
  addBtn.title = '快速创建';
  addBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    <span>快速创建</span>
  `;
  logo.after(addBtn);
  addBtn.addEventListener('click', toggleFabMenu);

  // 侧边栏底部 — 用户区
  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';
  footer.innerHTML = `
    <div class="sidebar-user" id="sidebarUser" title="点击编辑资料">
      <div class="sidebar-user-avatar" id="sidebarAvatar"></div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" id="sidebarUsername">我的工作台</div>
        <div class="sidebar-user-role" id="sidebarCompany">未设置公司</div>
      </div>
      <span class="sidebar-user-arrow">›</span>
    </div>
  `;
  tabBar.appendChild(footer);
  footer.querySelector('#sidebarUser').addEventListener('click', () => {
    document.getElementById('avatarWrap').click();
  });

  syncSidebarProfile();
}

// 同步侧边栏头像信息
function syncSidebarProfile() {
  const p = state.profile || defaultUserData().profile;
  const av = document.getElementById('sidebarAvatar');
  const un = document.getElementById('sidebarUsername');
  const cn = document.getElementById('sidebarCompany');
  if (!av || !un || !cn) return;
  if (p.avatarImage) {
    av.style.background = `url(${p.avatarImage}) center/cover no-repeat`;
    av.textContent = '';
  } else {
    av.style.background = `linear-gradient(135deg, ${p.color}, ${p.color}cc)`;
    av.textContent = p.emoji;
  }
  un.textContent = p.name || '我的工作台';
  cn.textContent = p.company || '未设置公司';
}

// 窗口大小变化时重新初始化侧边栏（处理 PC/移动端切换）
window.addEventListener('resize', debounce(() => {
  initSidebar();
}, 150));

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function logout() {
  setSession('');
  state = null;
  appShell.style.display = 'none';
  authPage.style.display = 'flex';
  document.getElementById('authPassword').value = '';
}

// ========== 设置中心 ==========
const settingsPage = document.getElementById('settingsPage');
const SETTINGS_PREFS_KEY = 'workbench_settings_prefs_v1';

function openSettings() {
  renderSettingsStats();
  loadSettingsPrefsToUI();
  // 显示版本号
  const vt = document.getElementById('appVersionText');
  if (vt) vt.textContent = 'v' + APP_VERSION;
  // 登录账号栏显示当前登录名
  const lan = document.getElementById('loginAccountName');
  if (lan) lan.textContent = currentUser || '—';
  settingsPage.classList.add('show');
}
document.getElementById('settingsBack').addEventListener('click', () => {
  settingsPage.classList.remove('show');
});

function renderSettingsStats() {
  const statsEl = document.getElementById('settingsStats');
  if (!statsEl) return;   // 使用统计已移除
  const tasks = state.tasks || [];
  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const rate = total ? Math.round(done / total * 100) : 0;
  const projActive = (state.projects || []).filter(p => p.status === 'active').length;
  const days = (state.activeDays || []).length;
  const habitTotal = (state.health?.habits || []).length;
  const sportLogs = (state.health?.sport?.logs || []).length;
  const weightLogs = (state.health?.weight?.logs || []).length;

  statsEl.innerHTML = `
    <div class="stat-grid-item">
      <div class="stat-grid-num">${total}</div>
      <div class="stat-grid-label">总任务</div>
    </div>
    <div class="stat-grid-item">
      <div class="stat-grid-num accent">${rate}%</div>
      <div class="stat-grid-label">完成率</div>
    </div>
    <div class="stat-grid-item">
      <div class="stat-grid-num">${projActive}</div>
      <div class="stat-grid-label">进行中项目</div>
    </div>
    <div class="stat-grid-item">
      <div class="stat-grid-num">${days}</div>
      <div class="stat-grid-label">使用天数</div>
    </div>
    <div class="stat-grid-item">
      <div class="stat-grid-num">${habitTotal}</div>
      <div class="stat-grid-label">习惯数</div>
    </div>
    <div class="stat-grid-item">
      <div class="stat-grid-num">${sportLogs + weightLogs}</div>
      <div class="stat-grid-label">健康记录</div>
    </div>
  `;
}

// ========== 设置项偏好管理 ==========
const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: '#3ddc97',
  fontSize: 'normal',
  tags: ['勘测', '绘图', '客户对接', '材料采购', '施工'],
  weekStart: 'monday',          // monday | sunday
  defaultPriority: 'mid',       // high | mid | low
  doneTaskDisplay: 'bottom',    // strike(划线保留) | bottom(沉底) | hide(隐藏)
  projectTypes: ['旧改建筑', '旧改场地', '室内空间改造', '别墅方案设计', '室内全案设计', '展厅方案设计'],
  projectSort: 'due',           // due(截止日期) | created(创建时间) | name(名称)
  defaultPage: 'overview'       // overview | tasks | projects | health
};

// 获取周起始日设置对应的偏移量（用于计算本周范围）
function getWeekOffset() {
  const sp = loadSettingsPrefs();
  const today = new Date();
  const todayIdx = today.getDay(); // 0=Sunday
  if (sp.weekStart === 'sunday') return -todayIdx;                 // 周日为首日
  return todayIdx === 0 ? -6 : 1 - todayIdx;                        // 周一为首日
}

// 获取日历首列偏移（当月1号是第几列，0-indexed）
function getCalStartCol(firstDay) {
  const sp = loadSettingsPrefs();
  const d = firstDay.getDay(); // 0=Sunday
  if (sp.weekStart === 'sunday') return d;       // 周日首列
  return d === 0 ? 6 : d - 1;                    // 周一首列
}

// 更新日历星期表头
function updateWeekdayHeaders() {
  const sp = loadSettingsPrefs();
  const el = document.getElementById('calWeekdays');
  if (!el) return;
  if (sp.weekStart === 'sunday') {
    el.innerHTML = '<span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>';
  } else {
    el.innerHTML = '<span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>';
  }
}

function loadSettingsPrefs() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_PREFS_KEY) || '{}') };
  } catch (e) { return { ...DEFAULT_SETTINGS }; }
}
function saveSettingsPrefs() {
  const sp = loadSettingsPrefs();
  const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
  // 收集所有设置项
  const v = getVal('setWeekStart'); if (v !== undefined) sp.weekStart = v;
  const v2 = getVal('setDefaultPriority'); if (v2 !== undefined) sp.defaultPriority = v2;
  const v3 = getVal('setDoneTaskDisplay'); if (v3 !== undefined) sp.doneTaskDisplay = v3;
  const v4 = getVal('setProjectSort'); if (v4 !== undefined) sp.projectSort = v4;
  const v5 = getVal('setDefaultPage'); if (v5 !== undefined) sp.defaultPage = v5;
  localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp));
  applySettingsToUI(sp);
}

function loadSettingsPrefsToUI() {
  const sp = loadSettingsPrefs();
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('setWeekStart', sp.weekStart);
  setVal('setDefaultPriority', sp.defaultPriority);
  setVal('setDoneTaskDisplay', sp.doneTaskDisplay);
  setVal('setProjectSort', sp.projectSort);
  setVal('setDefaultPage', sp.defaultPage);
  // 标签数量
  const tc = document.getElementById('tagCountHint');
  if (tc) tc.textContent = (sp.tags || []).length + ' 个标签';
  // 项目类型数量
  const ptHint = document.getElementById('projTypeCountHint');
  if (ptHint) ptHint.textContent = (sp.projectTypes || []).length + ' 个类型';
  // 主题和强调色
  applySettingsToUI(sp);
}

function applySettingsToUI(sp) {
  document.body.classList.toggle('theme-light', sp.theme === 'light');
  document.documentElement.style.setProperty('--accent', sp.accent);
  const accent2Map = {
    '#3ddc97': '#4ad6ff',          // 翡翠绿 → 潮蓝
    '#ED5126': '#F97D1C',          // 朱红 → 橘橙
    '#862617': '#A020F0',          // 赭石 → 紫云
    '#F97D1C': '#ED5126',          // 橘橙 → 朱红
    '#FEBA07': '#F97D1C',          // 琥珀黄 → 橘橙
    '#BACF65': '#20A162',          // 苹果绿 → 翠绿
    '#20A162': '#BACF65',          // 翠绿 → 苹果绿
    '#22A2C3': '#2983BB',          // 海青 → 潮蓝
    '#2983BB': '#22A2C3',          // 潮蓝 → 海青
    '#A020F0': '#862617'           // 紫云 → 赭石
  };
  document.documentElement.style.setProperty('--accent-2', accent2Map[sp.accent] || '#4ad6ff');
  // 同步UI
  document.querySelectorAll('#themeControl button').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === sp.theme);
  });
  document.querySelectorAll('#accentPicker span').forEach(s => {
    s.classList.toggle('active', s.dataset.accent === sp.accent);
  });
}

// 主题控制事件
document.querySelectorAll('#themeControl button').forEach(b => {
  b.addEventListener('click', () => {
    const sp = loadSettingsPrefs(); sp.theme = b.dataset.theme;
    localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp));
    applySettingsToUI(sp);
  });
});
document.querySelectorAll('#accentPicker span').forEach(s => {
  s.addEventListener('click', () => {
    const sp = loadSettingsPrefs(); sp.accent = s.dataset.accent;
    localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp));
    applySettingsToUI(sp);
  });
});

// 退出登录
document.getElementById('rowLogout').addEventListener('click', () => {
  if (confirm('确定退出登录？')) {
    settingsPage.classList.remove('show');
    logout();
  }
});

// 修改密码
const pwdModal = document.getElementById('pwdModal');
document.getElementById('rowChangePwd').addEventListener('click', () => {
  ['oldPwd', 'newPwd', 'newPwd2'].forEach(id => document.getElementById(id).value = '');
  pwdModal.classList.add('show');
});
document.getElementById('pwdClose').addEventListener('click', () => pwdModal.classList.remove('show'));
document.getElementById('pwdCancel').addEventListener('click', () => pwdModal.classList.remove('show'));
document.getElementById('pwdSave').addEventListener('click', () => {
  const o = document.getElementById('oldPwd').value;
  const n = document.getElementById('newPwd').value;
  const n2 = document.getElementById('newPwd2').value;
  const acc = loadAccounts();
  if (acc[currentUser].password !== hashPwd(o)) { showToast('原密码错误'); return; }
  if (n.length < 6) { showToast('新密码至少 6 位'); return; }
  if (n !== n2) { showToast('两次新密码不一致'); return; }
  acc[currentUser].password = hashPwd(n);
  saveAccounts(acc);
  pwdModal.classList.remove('show');
  showToast('密码已修改');
});

// ========== 项目类型预设管理 ==========
let projTypeModal = null;
document.getElementById('rowProjTypeManage')?.addEventListener('click', () => {
  const sp = loadSettingsPrefs();
  const types = sp.projectTypes || [];
  if (!projTypeModal) {
    projTypeModal = document.createElement('div');
    projTypeModal.className = 'modal-mask';
    projTypeModal.innerHTML = `
      <div class="modal glass">
        <div class="modal-head"><h3>项目类型预设</h3><button class="modal-close" id="projTypeClose">×</button></div>
        <div class="modal-body">
          <div class="tag-list" id="projTypeList"></div>
          <div class="tag-add-row">
            <input type="text" id="newProjTypeInput" placeholder="输入新类型名称" maxlength="20">
            <button id="addProjTypeBtn">添加</button>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" id="projTypeDone">完成</button>
        </div>
      </div>`;
    document.getElementById('appShell').appendChild(projTypeModal);
    projTypeModal.addEventListener('click', e => { if (e.target === projTypeModal) projTypeModal.classList.remove('show'); });
    document.getElementById('projTypeClose').addEventListener('click', () => projTypeModal.classList.remove('show'));
    document.getElementById('projTypeDone').addEventListener('click', () => projTypeModal.classList.remove('show'));
  }

  const renderTypes = () => {
    const sp2 = loadSettingsPrefs();
    const types2 = sp2.projectTypes || [];
    const list = projTypeModal.querySelector('#projTypeList');
    list.innerHTML = types2.map((t, i) => `
      <span class="tag-chip">${escapeHtml(t)}<span class="tag-del" data-idx="${i}">×</span></span>
    `).join('');
    list.querySelectorAll('.tag-del').forEach(del => {
      del.addEventListener('click', () => {
        const idx = parseInt(del.dataset.idx);
        const sp3 = loadSettingsPrefs();
        sp3.projectTypes.splice(idx, 1);
        localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp3));
        renderTypes();
        const hint = document.getElementById('projTypeCountHint');
        if (hint) hint.textContent = sp3.projectTypes.length + ' 个类型';
      });
    });
  };

  const addBtn = projTypeModal.querySelector('#addProjTypeBtn');
  const newInput = projTypeModal.querySelector('#newProjTypeInput');
  const addHandler = () => {
    const name = newInput.value.trim();
    if (!name) { showToast('请输入类型名称'); return; }
    const sp2 = loadSettingsPrefs();
    if (!sp2.projectTypes) sp2.projectTypes = [];
    if (sp2.projectTypes.includes(name)) { showToast('类型已存在'); return; }
    sp2.projectTypes.push(name);
    localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp2));
    newInput.value = '';
    renderTypes();
    const hint = document.getElementById('projTypeCountHint');
    if (hint) hint.textContent = sp2.projectTypes.length + ' 个类型';
  };
  const newAddBtn = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAddBtn, addBtn);
  newAddBtn.addEventListener('click', addHandler);
  const newInput2 = newInput.cloneNode(true);
  newInput.parentNode.replaceChild(newInput2, newInput);
  newInput2.addEventListener('keydown', e => { if (e.key === 'Enter') addHandler(); });

  renderTypes();
  projTypeModal.querySelector('#newProjTypeInput').value = '';
  projTypeModal.classList.add('show');
});

// ========== 自定义标签管理 ==========
let tagManageModal = null;
document.getElementById('rowTagManage')?.addEventListener('click', () => {
  const sp = loadSettingsPrefs();
  const tags = sp.tags || [];
  if (!tagManageModal) {
    tagManageModal = document.createElement('div');
    tagManageModal.className = 'modal-mask';
    tagManageModal.innerHTML = `
      <div class="modal glass">
        <div class="modal-head"><h3>自定义标签管理</h3><button class="modal-close" id="tagModalClose">×</button></div>
        <div class="modal-body">
          <div class="tag-list" id="tagList"></div>
          <div class="tag-add-row">
            <input type="text" id="newTagInput" placeholder="输入新标签名称" maxlength="10">
            <button id="addTagBtn">添加</button>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" id="tagModalDone">完成</button>
        </div>
      </div>`;
    document.getElementById('appShell').appendChild(tagManageModal);
    tagManageModal.addEventListener('click', e => { if (e.target === tagManageModal) tagManageModal.classList.remove('show'); });
    document.getElementById('tagModalClose').addEventListener('click', () => tagManageModal.classList.remove('show'));
    document.getElementById('tagModalDone').addEventListener('click', () => tagManageModal.classList.remove('show'));
  }

  const renderTags = () => {
    const sp2 = loadSettingsPrefs();
    const tags2 = sp2.tags || [];
    const list = tagManageModal.querySelector('#tagList');
    list.innerHTML = tags2.map((t, i) => `
      <span class="tag-chip">${escapeHtml(t)}<span class="tag-del" data-idx="${i}">×</span></span>
    `).join('');
    list.querySelectorAll('.tag-del').forEach(del => {
      del.addEventListener('click', () => {
        const idx = parseInt(del.dataset.idx);
        const sp3 = loadSettingsPrefs();
        sp3.tags.splice(idx, 1);
        localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp3));
        renderTags();
        const tc = document.getElementById('tagCountHint');
        if (tc) tc.textContent = sp3.tags.length + ' 个标签';
      });
    });
  };

  const addBtn = tagManageModal.querySelector('#addTagBtn');
  const newInput = tagManageModal.querySelector('#newTagInput');
  const addHandler = () => {
    const name = newInput.value.trim();
    if (!name) { showToast('请输入标签名称'); return; }
    const sp2 = loadSettingsPrefs();
    if (sp2.tags.includes(name)) { showToast('标签已存在'); return; }
    sp2.tags.push(name);
    localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp2));
    newInput.value = '';
    renderTags();
    const tc = document.getElementById('tagCountHint');
    if (tc) tc.textContent = sp2.tags.length + ' 个标签';
  };
  const newAddBtn = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAddBtn, addBtn);
  newAddBtn.addEventListener('click', addHandler);
  const newInput2 = newInput.cloneNode(true);
  newInput.parentNode.replaceChild(newInput2, newInput);
  newInput2.addEventListener('keydown', e => { if (e.key === 'Enter') addHandler(); });

  renderTags();
  tagManageModal.querySelector('#newTagInput').value = '';
  tagManageModal.classList.add('show');
});

// 查看本地数据大小
document.getElementById('rowCloudUsage')?.addEventListener('click', () => {
  const tasksBytes = new Blob([JSON.stringify(state.tasks || [])]).size;
  const projBytes = new Blob([JSON.stringify(state.projects || [])]).size;
  const healthBytes = new Blob([JSON.stringify(state.health || {})]).size;
  const localData = new Blob([JSON.stringify(state)]).size;
  const totalKB = Math.round(localData / 1024 * 10) / 10;
  alert(`📦 本地数据大小\n\n任务数据：约 ${Math.round(tasksBytes / 1024 * 10) / 10} KB\n项目数据：约 ${Math.round(projBytes / 1024 * 10) / 10} KB\n健康数据：约 ${Math.round(healthBytes / 1024 * 10) / 10} KB\n\n本地总占用：${totalKB} KB\n\n（当前为本地存储版，数据保存在浏览器中）`);
});

// 全部数据文件导入（点击触发文件选择）
document.getElementById('rowImportAll')?.addEventListener('click', () => {
  const imp = document.getElementById('importFile');
  if (imp) imp.click();
});

// 批量删除
document.getElementById('rowBatchDelete')?.addEventListener('click', () => {
  const modal = document.createElement('div');
  modal.className = 'modal-mask show';
  modal.innerHTML = `
    <div class="modal glass">
      <div class="modal-head"><h3>批量删除数据</h3><button class="modal-close" id="batchDelClose">×</button></div>
      <div class="modal-body">
        <div class="batch-delete-checks">
          <label><input type="checkbox" id="batchDelTasks" checked> 清除已完成任务</label>
          <label><input type="checkbox" id="batchDelProjects"> 清除已暂停/已完成项目</label>
          <label><input type="checkbox" id="batchDelHealthLogs"> 清除 30 天前健康记录</label>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="batchDelCancel">取消</button>
        <button class="btn btn-primary" id="batchDelConfirm" style="background:var(--danger)">确认删除</button>
      </div>
    </div>
  `;
  document.getElementById('appShell').appendChild(modal);
  const close = () => { modal.remove(); };
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  modal.querySelector('#batchDelClose').addEventListener('click', close);
  modal.querySelector('#batchDelCancel').addEventListener('click', close);
  modal.querySelector('#batchDelConfirm').addEventListener('click', () => {
    const delTasks = modal.querySelector('#batchDelTasks').checked;
    const delProjects = modal.querySelector('#batchDelProjects').checked;
    const delHealth = modal.querySelector('#batchDelHealthLogs').checked;
    let count = 0;
    if (delTasks) {
      const before = state.tasks.length;
      state.tasks = state.tasks.filter(t => !t.done);
      count += before - state.tasks.length;
    }
    if (delProjects) {
      const before = state.projects.length;
      state.projects = state.projects.filter(p => p.status === 'active');
      count += before - state.projects.length;
    }
    if (delHealth) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
      ['sport', 'weight'].forEach(k => {
        if (state.health && state.health[k]) {
          const before = state.health[k].logs.length;
          state.health[k].logs = state.health[k].logs.filter(l => l.date >= cutoffStr);
          count += before - state.health[k].logs.length;
        }
      });
      if (state.health && state.health.habitLogs) {
        Object.keys(state.health.habitLogs).forEach(d => {
          if (d < cutoffStr) { count++; delete state.health.habitLogs[d]; }
        });
      }
    }
    saveState();
    close();
    showToast(`已清理 ${count} 条记录 ✓`);
    renderTasks();
    renderProjects();
    renderSettingsStats();
  });
});

// 全部导出备份（设置中心行 + 顶栏【本地备份】按钮共用）
function exportBackup() {
  const sp = loadSettingsPrefs();
  const data = JSON.stringify({
    user: currentUser,
    exportedAt: new Date().toISOString(),
    version: '1.1',
    data: state,
    settings: sp
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workbench-${currentUser}-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已导出完整备份文件 ✓');
}
// 触发备份文件导入（设置中心行 + 顶栏【导入备份】按钮共用）
function triggerImportBackup() {
  const imp = document.getElementById('importFile');
  if (imp) imp.click();
}

document.getElementById('rowExportAll')?.addEventListener('click', exportBackup);
document.getElementById('backupBtn').addEventListener('click', exportBackup);
document.getElementById('importBackupBtn').addEventListener('click', triggerImportBackup);

// 数据达到 30 条时温和提示备份（每个账号只提示一次，用 localStorage 标记）
function maybeWarnBackup() {
  if (!currentUser) return;
  try {
    const tasks = (state.tasks || []).length;
    const projects = (state.projects || []).length;
    const events = Object.values(state.events || {}).reduce((a, b) => a + b.length, 0);
    const healthLogs = (state.health?.sport?.logs || []).length
      + (state.health?.weight?.logs || []).length
      + (state.health?.camping?.logs || []).length;
    const total = tasks + projects + events + healthLogs;
    if (total < 30) return;
    const key = 'workbench_backup_warned_' + currentUser;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    showToast('📦 数据已积累 ' + total + ' 条，建议点击左上 ↓ 图标做个本地备份');
  } catch (e) {}
}

// 导入文件（保留原逻辑，绑定到导入 input）
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const obj = JSON.parse(ev.target.result);
      const imported = obj.data || obj;
      state = Object.assign(defaultUserData(), imported);
      saveState();
      renderTasks();
      initCalendar();
      renderProjects();
      renderSettingsStats();
      showToast('导入成功');
    } catch (err) {
      showToast('导入失败：文件格式错误');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// 清空示例数据（确认后清空任务/项目/日程/健康数据，保留账号与外观设置）
document.getElementById('rowClearSample')?.addEventListener('click', () => {
  const modal = document.createElement('div');
  modal.className = 'modal-mask show';
  modal.innerHTML = `
    <div class="modal glass">
      <div class="modal-head"><h3>清空示例数据</h3><button class="modal-close" id="clearSampleClose">×</button></div>
      <div class="modal-body">
        <p style="color:var(--text-1);line-height:1.7;margin:0;">此操作将清空当前账号下的全部任务、项目、日程、健康记录数据，<br>恢复为空白状态（登录账号与外观设置保留）。<br><span style="color:var(--danger)">该操作不可撤销！</span><br>如需保留，请先点击「全部数据本地备份导出」。</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="clearSampleCancel">取消</button>
        <button class="btn btn-primary" id="clearSampleConfirm" style="background:var(--danger)">确认清空</button>
      </div>
    </div>
  `;
  document.getElementById('appShell').appendChild(modal);
  const close = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  modal.querySelector('#clearSampleClose').addEventListener('click', close);
  modal.querySelector('#clearSampleCancel').addEventListener('click', close);
  modal.querySelector('#clearSampleConfirm').addEventListener('click', () => {
    const fresh = defaultUserData();
    // 保留 profile（头像/昵称）与偏好设置，清空业务数据
    state.tasks = [];
    state.projects = [];
    state.events = {};
    state.selectedDate = null;
    state.health = fresh.health;
    saveState();
    close();
    renderTasks();
    initCalendar();
    renderProjects();
    renderOverview();
    renderSettingsStats();
    showToast('已清空示例数据 ✓');
  });
});

// 迁移旧偏好
(function migrateOldPrefs() {
  try {
    const OLD_KEY = 'workbench_prefs_v1';
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || '{}');
    if (Object.keys(old).length) {
      const merged = { ...DEFAULT_SETTINGS, ...old };
      localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(merged));
      localStorage.removeItem(OLD_KEY);
    }
  } catch (e) { }
})();

// ========== 主题 & 外观应用 ==========
function loadPrefs() {
  try { return loadSettingsPrefs(); }
  catch (e) { return { ...DEFAULT_SETTINGS }; }
}
function savePrefs(p) {
  localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(p));
}
function applyPrefs() {
  const sp = loadSettingsPrefs();
  applySettingsToUI(sp);
}

// ========== 头像编辑 ==========
function refreshAvatar() {
  const p = (state.profile = state.profile || defaultUserData().profile);
  const av = document.getElementById('avatarImg');
  if (p.avatarImage) {
    av.style.background = `url(${p.avatarImage}) center/cover no-repeat`;
    av.textContent = '';
  } else {
    av.style.background = `linear-gradient(135deg, ${p.color}, ${p.color}cc)`;
    av.textContent = p.emoji;
  }
  document.getElementById('avatarName').textContent = p.name || '我的工作台';
  document.getElementById('avatarCompany').textContent = p.company || '未设置公司';
  // 同步侧边栏
  syncSidebarProfile();
  // 同时更新设置中心用户名 / 登录账号
  const su = document.getElementById('settingsUsername');
  if (su) su.textContent = currentUser;
  const lan = document.getElementById('loginAccountName');
  if (lan) lan.textContent = currentUser || '—';
}

// 点击头像打开编辑弹层
const profileModal = document.getElementById('profileModal');
document.getElementById('avatarWrap').addEventListener('click', () => {
  const p = (state.profile = state.profile || defaultUserData().profile);
  document.getElementById('profileName').value = p.name || '';
  document.getElementById('profileCompany').value = p.company || '';
  updateProfilePreview();
  // 重置子面板
  document.getElementById('emojiPicker').style.display = 'none';
  document.getElementById('colorPickerGrid').style.display = 'none';
  profileModal.classList.add('show');
});

function updateProfilePreview() {
  const el = document.getElementById('profileAvatarPreview');
  const p = (state.profile = state.profile || defaultUserData().profile);
  if (p.avatarImage) {
    el.style.background = `url(${p.avatarImage}) center/cover no-repeat`;
    el.textContent = '';
  } else {
    el.style.background = `linear-gradient(135deg, ${p.color}, ${p.color}cc)`;
    el.textContent = p.emoji;
  }
}

document.getElementById('profileClose').addEventListener('click', () => profileModal.classList.remove('show'));
document.getElementById('profileCancel').addEventListener('click', () => profileModal.classList.remove('show'));
profileModal.addEventListener('click', e => { if (e.target === profileModal) profileModal.classList.remove('show'); });

// 选表情
document.getElementById('pickEmoji').addEventListener('click', () => {
  document.getElementById('emojiPicker').style.display = 'flex';
  document.getElementById('colorPickerGrid').style.display = 'none';
});
document.querySelectorAll('#emojiPicker span').forEach(el => {
  el.addEventListener('click', () => {
    state.profile.emoji = el.textContent;
    updateProfilePreview();
    document.getElementById('emojiPicker').style.display = 'none';
  });
});

// 换颜色
document.getElementById('pickColor').addEventListener('click', () => {
  document.getElementById('colorPickerGrid').style.display = 'flex';
  document.getElementById('emojiPicker').style.display = 'none';
});
document.querySelectorAll('#colorPickerGrid span').forEach(el => {
  el.addEventListener('click', () => {
    const c = el.style.background;
    state.profile.color = c;
    updateProfilePreview();
    document.getElementById('colorPickerGrid').style.display = 'none';
  });
});

// 上传图片
document.getElementById('pickImage').addEventListener('click', () => {
  document.getElementById('emojiPicker').style.display = 'none';
  document.getElementById('colorPickerGrid').style.display = 'none';
  document.getElementById('avatarImageFile').click();
});
document.getElementById('avatarImageFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.profile.avatarImage = reader.result;
    // 清除 emoji 和 color 的视觉干扰
    updateProfilePreview();
    showToast('图片已选择');
  };
  reader.readAsDataURL(file);
});

// 保存
document.getElementById('profileSave').addEventListener('click', () => {
  state.profile.name = document.getElementById('profileName').value.trim() || '我的工作台';
  state.profile.company = document.getElementById('profileCompany').value.trim() || '未设置公司';
  saveState();
  refreshAvatar();
  profileModal.classList.remove('show');
  showToast('资料已更新');
});

// ========== 健康管理 ==========
let healthSub = 'sport';  // 当前子Tab
let healthEditingPlan = false;

function renderHealth() {
  // 确保 health 存在
  if (!state.health) state.health = defaultUserData().health;
  renderHealthPlan();
  renderHealthChart();
  renderHealthHistory();
}

// 子Tab切换
document.querySelectorAll('.health-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    healthSub = btn.dataset.sub;
    document.querySelectorAll('.health-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.health-panel').forEach(p => p.classList.remove('active'));
    const panelId = 'panel' + (healthSub === 'habit' ? 'Habit' : capitalize(healthSub));
    document.getElementById(panelId).classList.add('active');
    if (healthSub === 'habit') renderHabits();
    else if (healthSub === 'camping') renderCamping();
    else {
      renderHealthPlan();
      renderHealthChart();
      renderHealthHistory();
    }
  });
});

// 渲染计划卡片
function renderHealthPlan() {
  const h = state.health[healthSub];
  const plan = h.plan;
  const el = document.getElementById(healthSub + 'Plan');

  if (healthSub === 'sport') {
    const dm = parseInt(plan.durationMin || 100, 10) || 100;
    el.innerHTML = `
      <h4>运动计划</h4>
      <div class="health-plan-row"><span>周期：</span>${escapeHtml(plan.period || '未设置')}</div>
      <div class="health-plan-row"><span>运动计划时间：</span>${dm} 分钟</div>
      <div class="health-plan-row"><span>运动地点：</span>${escapeHtml(plan.location || '未设置')}</div>
      <button class="health-plan-edit" onclick="editPlan('sport')">✎ 编辑计划</button>`;
  } else if (healthSub === 'weight') {
    el.innerHTML = `
      <h4>体重目标</h4>
      <div class="health-plan-row"><span>目标体重：</span>${escapeHtml(plan.target || '未设置')} kg</div>
      <div class="health-plan-row"><span>提醒时间：</span>${escapeHtml(plan.remindTime || '未设置')}</div>
      <button class="health-plan-edit" onclick="editPlan('weight')">✎ 编辑计划</button>`;
  }
}

// 编辑计划
function editPlan(type) {
  healthSub = type;
  const plan = state.health[type].plan;
  const titleMap = { sport: '运动计划', weight: '体重目标', sleep: '作息安排' };
  document.getElementById('healthLogTitle').textContent = '编辑' + titleMap[type];
  healthEditingPlan = true;

  const body = document.getElementById('healthLogBody');
  if (type === 'sport') {
    body.innerHTML = `
      <label class="form-label">重复周期</label>
      <select id="hlPeriod"><option>每天</option><option>每周</option></select>
      <label class="form-label">运动计划时间</label>
      <select id="hlDurationPlan">
        <option value="30">30 分钟</option>
        <option value="60">60 分钟</option>
        <option value="90">90 分钟</option>
        <option value="120">2 小时</option>
        <option value="480">8 小时</option>
        <option value="600">10 小时</option>
        <option value="720">12 小时</option>
      </select>
      <label class="form-label">运动地点</label>
      <input type="text" id="hlLocation" value="${escapeHtml(plan.location || '')}" placeholder="如 小区跑道">`;
    setTimeout(() => {
      document.getElementById('hlPeriod').value = plan.period || '每天';
      document.getElementById('hlDurationPlan').value = String(plan.durationMin || 60);
    }, 50);
  } else if (type === 'weight') {
    body.innerHTML = `
      <label class="form-label">目标体重 (kg)</label>
      <input type="text" id="hlTarget" value="${escapeHtml(plan.target||'65.0')}" placeholder="65.0">
      <label class="form-label">每日提醒时间</label>
      <input type="time" id="hlRemind" value="${escapeHtml(plan.remindTime||'08:00')}">`;
  } else {
    body.innerHTML = `
      <label class="form-label">入睡时间</label>
      <input type="time" id="hlBed" value="${escapeHtml(plan.bedTime||'23:00')}">
      <label class="form-label">起床时间</label>
      <input type="time" id="hlWake" value="${escapeHtml(plan.wakeTime||'07:00')}">`;
  }
  document.getElementById('healthLogModal').classList.add('show');
}

// 录入数据按钮（仅运动、体重）
['sport', 'weight'].forEach(type => {
  document.getElementById(type + 'LogBtn').addEventListener('click', () => {
    healthSub = type;
    healthEditingPlan = false;
    const titleMap = { sport: '记录运动', weight: '记录体重' };
    document.getElementById('healthLogTitle').textContent = titleMap[type];
    const body = document.getElementById('healthLogBody');
    if (type === 'sport') {
      body.innerHTML = `
        <label class="form-label">记录日期</label>
        <input type="date" class="health-input" id="hlDate" value="${todayStr()}">
        <label class="form-label">记录时间</label>
        <input type="time" class="health-input" id="hlTime" value="${nowTimeStr()}">
        <label class="form-label">运动时长（分钟）</label>
        <input type="number" class="health-input" id="hlDuration" placeholder="如 30" min="1" max="300" value="30">
        <label class="form-label">备注（可选）</label>
        <input type="text" class="health-input" id="hlNote" placeholder="如 慢跑">`;
    } else {
      body.innerHTML = `
        <label class="form-label">记录日期</label>
        <input type="date" class="health-input" id="hlDate" value="${todayStr()}">
        <label class="form-label">记录时间</label>
        <input type="time" class="health-input" id="hlTime" value="${nowTimeStr()}">
        <label class="form-label">今日体重 (kg)</label>
        <input type="number" class="health-input" id="hlWeight" placeholder="如 65.5" step="0.1" min="30" max="200">`;
    }
    document.getElementById('healthLogModal').classList.add('show');
  });
});

// 弹层控制
document.getElementById('healthLogClose').addEventListener('click', () => {
  document.getElementById('healthLogModal').classList.remove('show');
});
document.getElementById('healthLogCancel').addEventListener('click', () => {
  document.getElementById('healthLogModal').classList.remove('show');
});
document.getElementById('healthLogModal').addEventListener('click', e => {
  if (e.target === document.getElementById('healthLogModal')) document.getElementById('healthLogModal').classList.remove('show');
});

// 保存
document.getElementById('healthLogSave').addEventListener('click', () => {
  const h = state.health[healthSub];

  if (healthEditingPlan) {
    if (healthSub === 'sport') {
      h.plan.period = document.getElementById('hlPeriod')?.value || '每天';
      h.plan.durationMin = parseInt(document.getElementById('hlDurationPlan')?.value, 10) || 60;
      h.plan.location = document.getElementById('hlLocation')?.value || '';
    } else if (healthSub === 'weight') {
      h.plan.target = document.getElementById('hlTarget')?.value || '65.0';
      h.plan.remindTime = document.getElementById('hlRemind')?.value || '08:00';
    } else {
      h.plan.bedTime = document.getElementById('hlBed')?.value || '23:00';
      h.plan.wakeTime = document.getElementById('hlWake')?.value || '07:00';
    }
  } else {
    const today = todayStr();
    if (healthSub === 'sport') {
      const dur = parseInt(document.getElementById('hlDuration')?.value) || 0;
      const note = document.getElementById('hlNote')?.value || '';
      const tm = document.getElementById('hlTime')?.value || nowTimeStr();
      const dt = document.getElementById('hlDate')?.value || today;
      if (dur <= 0) { showToast('请输入运动时长'); return; }
      h.logs.push({ id: uid(), date: dt, time: tm, duration: dur, note });
    } else if (healthSub === 'weight') {
      const w = parseFloat(document.getElementById('hlWeight')?.value) || 0;
      const tm = document.getElementById('hlTime')?.value || nowTimeStr();
      const dt = document.getElementById('hlDate')?.value || today;
      if (w <= 0) { showToast('请输入体重'); return; }
      h.logs.push({ id: uid(), date: dt, time: tm, weight: w });
    } else {
      const sleep = document.getElementById('hlSleepTime')?.value || '23:00';
      const wake = document.getElementById('hlWakeTime')?.value || '07:00';
      h.logs.push({ id: uid(), date: today, sleepTime: sleep, wakeTime: wake });
    }
  }

  saveState();
  document.getElementById('healthLogModal').classList.remove('show');
  renderHealthPlan();
  renderHealthChart();
  renderHealthHistory();
  renderOverview();  // 同步总览
  showToast(healthEditingPlan ? '计划已更新' : '已记录');
  healthEditingPlan = false;
});

// 删除历史记录
function deleteHealthLog(type, id) {
  if (!confirm('删除这条记录？')) return;
  const logs = state.health[type].logs;
  const idx = logs.findIndex(l => l.id === id);
  if (idx > -1) logs.splice(idx, 1);
  saveState();
  renderHealthChart();
  renderHealthHistory();
  showToast('已删除');
}

// 周图表
function renderHealthChart() {
  const h = state.health[healthSub];
  const logs = h.logs || [];
  const el = document.getElementById(healthSub + 'Chart');

  if (!logs.length) {
    el.innerHTML = `<h4>${chartTitle()}</h4><div class="health-chart-empty">暂无数据，点击上方按钮录入</div>`;
    return;
  }

  // 最近7天
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  }

  const dayData = {};
  days.forEach(d => { dayData[d] = 0; });
  logs.forEach(l => {
    if (dayData.hasOwnProperty(l.date)) {
      if (healthSub === 'sport') dayData[l.date] += (l.duration || 0);
      else if (healthSub === 'weight') dayData[l.date] = (l.weight || 0);
      else dayData[l.date] = 1; // 作息打卡次数
    }
  });

  const values = days.map(d => dayData[d]);
  const maxV = Math.max(...values, 1);

  el.innerHTML = `
    <h4>${chartTitle()}（最近7天）</h4>
    <div class="health-bars">${days.map((d, i) => {
      const v = values[i];
      const hPct = Math.round(v / maxV * 50);
      const label = d.slice(5); // MM-DD
      const unit = healthSub === 'weight' ? v + 'kg' : (healthSub === 'sport' ? v + 'min' : (v > 0 ? '已打卡' : '—'));
      return `<div class="health-bar-col">
        <span class="health-bar-label" style="font-size:9px;color:var(--text-2)">${unit}</span>
        <div class="health-bar-stack"><div class="health-bar-fill" style="height:${hPct}px"></div></div>
        <span class="health-bar-label">${label}</span>
      </div>`;
    }).join('')}</div>`;

  function chartTitle() {
    return { sport: '运动时长', weight: '体重趋势', sleep: '作息打卡' }[healthSub] || '';
  }
}

// 历史记录
function renderHealthHistory() {
  const h = state.health[healthSub];
  const logs = (h.logs || []).slice().reverse(); // 最新在前
  const el = document.getElementById(healthSub + 'History');
  if (!logs.length) {
    el.innerHTML = '<h4>历史记录</h4><div class="health-chart-empty">暂无记录</div>';
    return;
  }
  let html = '<h4>历史记录</h4>';
  logs.forEach(l => {
    let val = '';
    if (healthSub === 'sport') val = `${l.duration} 分钟${l.note ? ' · ' + escapeHtml(l.note) : ''}`;
    else if (healthSub === 'weight') val = `${l.weight} kg`;
    else val = `入睡 ${l.sleepTime} · 起床 ${l.wakeTime}`;
    html += `<div class="health-log-item">
      <div><span class="health-log-date">${l.date}</span></div>
      <div class="health-log-val">${val}</div>
      <button class="health-log-del" onclick="deleteHealthLog('${healthSub}',${l.id})">×</button>
    </div>`;
  });
  el.innerHTML = html;
}

// 暴露 deleteHealthLog 到全局
window.deleteHealthLog = deleteHealthLog;
window.editPlan = editPlan;

// ========== 习惯打卡渲染 ==========
let habitPickedIcon = '📖';
let editingHabitId = null;   // 正在编辑的习惯 id（null 表示新增）

// 兼容旧数据：将旧格式 habitLogs (string[]) 转为新格式 ({ habitId: { ... } })
function migrateHabitLogs() {
  if (!state.health.habitLogs) return;
  const keys = Object.keys(state.health.habitLogs);
  let migrated = false;
  for (const d of keys) {
    const val = state.health.habitLogs[d];
    if (Array.isArray(val)) {
      const newVal = {};
      val.forEach(hid => { newVal[hid] = { count: 1 }; });
      state.health.habitLogs[d] = newVal;
      migrated = true;
    }
  }
  if (migrated) saveState();
}

// 渲染单个习惯卡片
function habitCardHTML(h) {
  const today = todayStr();
  const todayLogs = (state.health.habitLogs || {})[today] || {};
  const log = todayLogs[h.id];
  let done = !!log;
  let info = '';
  if (h.type === 'water') {
    // 喝水量化：cups 表示已喝杯数（每次点击+1）；兼容旧数据中 count 为毫升(count/300=杯)
    let cups = log ? (typeof log.cups === 'number' ? log.cups : Math.floor((log.count || 0) / 300)) : 0;
    const target = h.config.cups || 8;
    done = cups >= target;
    info = `<span class="habit-card-progress">${Math.min(cups, target)}/${target} 杯</span>`;
  } else if (h.type === 'reading' && log && log.duration) {
    info = `<span class="habit-card-progress">${log.duration}分钟</span>`;
  } else if ((h.type === 'sleep' || h.type === 'wake') && log && log.time) {
    info = `<span class="habit-card-progress">${log.time}</span>`;
  } else if (done) {
    info = `<span class="habit-card-progress">✓ 已完成</span>`;
  }
  return `<div class="habit-card ${done ? 'done' : ''}" onclick="toggleHabit('${h.id}')">
    <div class="habit-card-check">✓</div>
    <div class="habit-card-icon">${h.icon}</div>
    <div class="habit-card-name">${escapeHtml(h.name)}</div>
    <div class="habit-card-goal">${info || escapeHtml(h.goal || '')}</div>
    <div class="habit-card-actions">
      <button class="habit-card-edit" onclick="event.stopPropagation();editHabit('${h.id}')">✎ 编辑</button>
      <button class="habit-card-del" onclick="event.stopPropagation();deleteHabit('${h.id}')">删除</button>
    </div>
  </div>`;
}

function renderHabits() {
  if (!state.health.habits) state.health.habits = defaultUserData().health.habits;
  if (!state.health.habitLogs) state.health.habitLogs = {};
  migrateHabitLogs();
  // 兼容旧 habit 无 type
  state.health.habits.forEach(h => { if (!h.type) { h.type = 'simple'; h.config = {}; } });

  const habits = state.health.habits;
  const preset = habits.filter(h => h.type === 'sleep' || h.type === 'wake');
  const other = habits.filter(h => h.type !== 'sleep' && h.type !== 'wake');

  const presetEl = document.getElementById('habitPreset');
  const grid = document.getElementById('habitGrid');

  // 早睡/早起 预设习惯 → 添加习惯按钮上方
  if (presetEl) {
    if (preset.length) {
      presetEl.innerHTML = '<div class="habit-preset-label">作息习惯</div>' + preset.map(habitCardHTML).join('');
    } else {
      presetEl.innerHTML = '';
    }
  }

  // 其他习惯 → 添加习惯按钮下方
  if (!other.length) {
    grid.innerHTML = '<div class="empty-tip" style="grid-column:span 2;">点击上方「+ 添加习惯」开始</div>';
  } else {
    grid.innerHTML = other.map(habitCardHTML).join('');
  }
}

function toggleHabit(id) {
  const today = todayStr();
  if (!state.health.habitLogs[today]) state.health.habitLogs[today] = {};
  const todayLogs = state.health.habitLogs[today];
  const habit = (state.health.habits || []).find(h => h.id === id);
  if (!habit) return;

  // 已打卡则取消（喝水除外：喝水为计数型，不取消，重复点击累加）
  if (todayLogs[id] && habit.type !== 'water') {
    delete todayLogs[id];
    saveState();
    renderHabits();
    renderHealthDashboard();
    showToast('已取消打卡');
    return;
  }

  // 根据类型执行打卡
  const now = new Date();
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const type = habit.type || 'simple';
  const config = habit.config || {};

  if (type === 'simple') {
    todayLogs[id] = { count: 1 };
    showToast('打卡成功 ✓');
  } else if (type === 'reading') {
    const duration = parseInt(config.duration) || 30;
    todayLogs[id] = { duration };
    showToast(`读书打卡 ${duration} 分钟 ✓`);
  } else if (type === 'sleep') {
    todayLogs[id] = { time: timeStr };
    showToast(`入睡时间 ${timeStr} 已记录 ✓`);
  } else if (type === 'wake') {
    todayLogs[id] = { time: timeStr };
    showToast(`起床时间 ${timeStr} 已记录 ✓`);
  } else if (type === 'water') {
    // 每次点击 = 喝 1 杯，重复点击累计次数；达到目标后重置为新一轮
    const target = config.cups || 8;
    const prev = todayLogs[id] ? (todayLogs[id].cups || 0) : 0;
    if (prev >= target) {
      todayLogs[id] = { cups: 1 };          // 新一轮开始
      showToast(`新一轮喝水 1/${target} 杯 ✓`);
    } else {
      const nc = prev + 1;
      todayLogs[id] = { cups: nc };
      if (nc >= target) {
        showToast(`喝水 ${nc}/${target} 杯，达成今日目标 🎉`);
      } else {
        showToast(`喝水 ${nc}/${target} 杯 ✓`);
      }
    }
  } else {
    todayLogs[id] = { count: 1 };
    showToast('打卡成功 ✓');
  }

  saveState();
  renderHabits();
  renderHealthDashboard();
}

function deleteHabit(id) {
  if (!confirm('删除这个习惯？')) return;
  state.health.habits = state.health.habits.filter(h => h.id !== id);
  // 清理日志
  Object.keys(state.health.habitLogs).forEach(d => {
    delete state.health.habitLogs[d][id];
  });
  saveState();
  renderHabits();
  renderHealthDashboard();
  showToast('习惯已删除');
}

window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;

// 编辑习惯：填充弹窗并打开（编辑模式）
function editHabit(id) {
  const habit = (state.health.habits || []).find(h => h.id === id);
  if (!habit) return;
  editingHabitId = id;
  document.getElementById('habitModalTitle').textContent = '编辑习惯';

  const type = habit.type || 'simple';
  const config = habit.config || {};
  document.getElementById('habitType').value = type;
  // 显示对应专属字段
  document.querySelectorAll('.habit-type-fields').forEach(el => el.style.display = 'none');
  const targetId = 'habitFields' + type.charAt(0).toUpperCase() + type.slice(1);
  const target = document.getElementById(targetId);
  if (target) target.style.display = 'block';

  // 填充字段
  document.getElementById('habitName').value = (type === 'simple' || !type) ? (habit.name || '') : '';
  document.getElementById('habitGoal').value = (type === 'simple' || !type) ? (habit.goal && habit.goal.includes('前') === false ? habit.goal || '' : '') : '';
  // 图标选择
  document.querySelectorAll('#habitIconPick span').forEach(s => {
    const on = s.textContent === (habit.icon || '📖');
    s.classList.toggle('picked', on);
    if (on) habitPickedIcon = s.textContent;
  });
  if (config.duration) document.getElementById('readingDuration').value = config.duration;
  if (config.targetTime) {
    document.getElementById('sleepTargetTime').value = config.targetTime;
    document.getElementById('wakeTargetTime').value = config.targetTime;
  }
  if (config.cups) document.getElementById('waterCups').value = config.cups;

  document.getElementById('habitAddModal').classList.add('show');
}
window.editHabit = editHabit;

// ========== 户外露营 ==========
function campingLogs() {
  if (!state.health.camping) state.health.camping = { logs: [] };
  return state.health.camping.logs;
}

// 统计字段出现次数，返回累计最多的值；平票取最近一次
function mostFrequent(items) {
  const count = {};
  let best = null, bestN = 0;
  for (const v of items) {
    if (!v) continue;
    count[v] = (count[v] || 0) + 1;
    if (count[v] > bestN) { best = v; bestN = count[v]; }
  }
  return best;
}

function renderCamping() {
  renderCampingGear();
  renderCampingBoard();
  renderCampingHistory();
}

// 最上面：露营装备看板
function renderCampingGear() {
  const el = document.getElementById('campingGear');
  if (!el) return;
  const logs = campingLogs();
  const gear = (state.health.camping && state.health.camping.gear) || '';
  el.innerHTML = `
    <div class="camping-gear-title">露营装备</div>
    <div class="camping-gear-stats">
      <div class="camping-gear-stat"><span class="cg-num">${logs.length}</span><span class="cg-label">露营次数</span></div>
      <div class="camping-gear-stat"><span class="cg-num">${logs.length ? logs[logs.length - 1].date.slice(5) : '—'}</span><span class="cg-label">最近露营</span></div>
    </div>
    <div class="camping-gear-icons">${gear ? escapeHtml(gear) : '未设置装备清单，点击下方编辑'}</div>
    <button class="health-plan-edit" onclick="editCampingGear()">✎ 编辑装备</button>
  `;
}

// 编辑露营装备清单（与运动计划的编辑交互一致）
function editCampingGear() {
  if (!state.health.camping) state.health.camping = { logs: [] };
  if (!('gear' in state.health.camping)) state.health.camping.gear = '';
  document.getElementById('campingGearTitle').textContent = '编辑露营装备';
  document.getElementById('campingGearInput').value = state.health.camping.gear || '';
  document.getElementById('campingGearModal').classList.add('show');
}
document.getElementById('campingGearClose') && document.getElementById('campingGearClose').addEventListener('click', () => {
  document.getElementById('campingGearModal').classList.remove('show');
});
document.getElementById('campingGearCancel') && document.getElementById('campingGearCancel').addEventListener('click', () => {
  document.getElementById('campingGearModal').classList.remove('show');
});
document.getElementById('campingGearSave') && document.getElementById('campingGearSave').addEventListener('click', () => {
  if (!state.health.camping) state.health.camping = { logs: [] };
  state.health.camping.gear = document.getElementById('campingGearInput').value.trim() || '';
  saveState();
  document.getElementById('campingGearModal').classList.remove('show');
  renderCampingGear();
  showToast('装备清单已更新');
});
document.getElementById('campingGearModal') && document.getElementById('campingGearModal').addEventListener('click', e => {
  if (e.target === document.getElementById('campingGearModal')) {
    document.getElementById('campingGearModal').classList.remove('show');
  }
});

// 露营看板：只显示累计最多的文本（地点/交通/人员/类别），不标注类别
function renderCampingBoard() {
  const el = document.getElementById('campingBoard');
  if (!el) return;
  const logs = campingLogs();
  if (!logs.length) {
    el.innerHTML = '<div class="camping-board-empty">还没有露营记录，点击上方「记录露营」开始吧</div>';
    return;
  }
  const topLoc = mostFrequent(logs.map(l => l.location)) || '—';
  const topTra = mostFrequent(logs.map(l => l.transport)) || '—';
  const topPpl = mostFrequent(logs.map(l => l.people)) || '—';
  const topCat = mostFrequent(logs.map(l => l.category)) || '—';
  el.innerHTML = `
    <div class="camping-board-title">露营看板</div>
    <div class="camping-board-grid">
      <div class="camping-board-cell"><div class="cbc-label"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><circle cx="12" cy="11" r="2" stroke="currentColor" stroke-width="1.7" fill="none"/></svg></div><div class="cbc-val">${escapeHtml(topLoc)}</div></div>
      <div class="camping-board-cell"><div class="cbc-label"><svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M16 10h3l2 3v3h-2M16 15h3M6.5 12a1 1 0 1 0 0 2 1 1 0 1 0 0-2Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 11V8M9 11V8" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg></div><div class="cbc-val">${escapeHtml(topTra)}</div></div>
      <div class="camping-board-cell"><div class="cbc-label"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.7" fill="none"/><circle cx="17" cy="9" r="2.2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5M14 15c2 0 4 1.6 4 4" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="cbc-val">${escapeHtml(topPpl)}</div></div>
      <div class="camping-board-cell"><div class="cbc-label"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21s-7-5.5-7-11a3.5 3.5 0 0 1 7-1.5A3.5 3.5 0 0 1 19 10c0 5.5-7 11-7 11Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/></svg></div><div class="cbc-val">${escapeHtml(topCat)}</div></div>
    </div>
  `;
}

// 历史记录
function renderCampingHistory() {
  const el = document.getElementById('campingHistory');
  if (!el) return;
  const logs = campingLogs().slice().reverse(); // 最新在前
  if (!logs.length) {
    el.innerHTML = '<h4>历史记录</h4><div class="camping-history-empty">暂无露营历史</div>';
    return;
  }
  const rateEmoji = { '优秀': '⭐', '良好': '👍', '说得过去': '🙂', '扑街': '💩' };
  el.innerHTML = '<h4>历史记录</h4>' + logs.map(l => `
    <div class="camping-history-item glass">
      <div class="camping-history-head">
        <span class="camping-history-date">${escapeHtml(l.date)}</span>
        <span class="camping-history-rate">${rateEmoji[l.rating] || l.rating || ''}</span>
      </div>
      <div class="camping-history-main">
        <div class="camping-history-loc">${escapeHtml(l.location || '未命名地点')}</div>
        <div class="camping-history-tags">
          <span class="camping-chip">${escapeHtml(l.transport || '')}</span>
          <span class="camping-chip">${escapeHtml(l.people || '')}</span>
          <span class="camping-chip">${escapeHtml(l.category || '')}</span>
          <span class="camping-chip ${(l.rating || '').length ? '' : 'hide'}">${escapeHtml(l.rating || '')}</span>
        </div>
        ${l.note ? `<div class="camping-history-note">${escapeHtml(l.note)}</div>` : ''}
      </div>
      <button class="camping-history-del" data-camp-id="${l.id}">删除</button>
    </div>
  `).join('');

  el.querySelectorAll('.camping-history-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('删除这条露营记录？')) return;
      state.health.camping.logs = state.health.camping.logs.filter(l => l.id !== btn.dataset.campId);
      saveState();
      renderCamping();
      showToast('已删除');
    });
  });
}

// 记录露营弹窗
function openCampingModal() {
  document.getElementById('campLoc').value = '';
  document.getElementById('campTransport').value = '骑行';
  document.getElementById('campPeople').value = '家人';
  document.getElementById('campRating').value = '优秀';
  document.getElementById('campCategory').value = '获能';
  document.getElementById('campNote').value = '';
  document.getElementById('campingLogModal').classList.add('show');
  setTimeout(() => document.getElementById('campLoc').focus(), 200);
}
document.getElementById('campingLogClose').addEventListener('click', () => document.getElementById('campingLogModal').classList.remove('show'));
document.getElementById('campingLogCancel').addEventListener('click', () => document.getElementById('campingLogModal').classList.remove('show'));
document.getElementById('campingLogModal').addEventListener('click', e => {
  if (e.target === document.getElementById('campingLogModal')) document.getElementById('campingLogModal').classList.remove('show');
});
document.getElementById('campingLogBtn').addEventListener('click', openCampingModal);
document.getElementById('campingLogSave').addEventListener('click', () => {
  const loc = document.getElementById('campLoc').value.trim();
  if (!loc) { showToast('请输入露营地点'); return; }
  campingLogs().push({
    id: 'c' + uid(),
    date: todayStr(),
    location: loc,
    transport: document.getElementById('campTransport').value,
    people: document.getElementById('campPeople').value,
    rating: document.getElementById('campRating').value,
    category: document.getElementById('campCategory').value,
    note: document.getElementById('campNote').value.trim()
  });
  saveState();
  document.getElementById('campingLogModal').classList.remove('show');
  renderCamping();
  showToast('露营记录已保存 ⛺');
});


// 添加习惯弹层
function resetHabitAddModal() {
  editingHabitId = null;
  const mt = document.getElementById('habitModalTitle');
  if (mt) mt.textContent = '添加习惯';
  document.getElementById('habitName').value = '';
  document.getElementById('habitGoal').value = '';
  document.querySelectorAll('#habitIconPick span').forEach(s => s.classList.remove('picked'));
  habitPickedIcon = '📖';
  const typeSel = document.getElementById('habitType');
  if (typeSel) typeSel.value = 'simple';
  // 隐藏所有专属字段
  document.querySelectorAll('.habit-type-fields').forEach(el => el.style.display = 'none');
  // 显示 simple 专属字段
  const fs = document.getElementById('habitFieldsSimple');
  if (fs) fs.style.display = 'block';
}

document.getElementById('habitAddBtn').addEventListener('click', () => {
  resetHabitAddModal();
  document.getElementById('habitAddModal').classList.add('show');
});

// 类型切换
const habitTypeSel = document.getElementById('habitType');
if (habitTypeSel) {
  habitTypeSel.addEventListener('change', () => {
    const v = habitTypeSel.value;
    document.querySelectorAll('.habit-type-fields').forEach(el => el.style.display = 'none');
    const targetId = 'habitFields' + v.charAt(0).toUpperCase() + v.slice(1);
    const target = document.getElementById(targetId);
    if (target) target.style.display = 'block';
  });
}

function closeHabitModal() {
  editingHabitId = null;
  document.getElementById('habitAddModal').classList.remove('show');
}
document.getElementById('habitAddClose').addEventListener('click', closeHabitModal);
document.getElementById('habitAddCancel').addEventListener('click', closeHabitModal);
document.getElementById('habitAddModal').addEventListener('click', e => {
  if (e.target === document.getElementById('habitAddModal')) closeHabitModal();
});
document.querySelectorAll('#habitIconPick span').forEach(s => {
  s.addEventListener('click', () => {
    document.querySelectorAll('#habitIconPick span').forEach(ss => ss.classList.remove('picked'));
    s.classList.add('picked');
    habitPickedIcon = s.textContent;
  });
});
document.getElementById('habitAddSave').addEventListener('click', () => {
  const habitType = document.getElementById('habitType').value;
  let name, icon, goal, config = {};

  if (habitType === 'simple') {
    name = document.getElementById('habitName').value.trim();
    if (!name) { showToast('请输入习惯名称'); return; }
    icon = habitPickedIcon;
    goal = document.getElementById('habitGoal').value.trim() || '每日1次';
  } else if (habitType === 'reading') {
    name = '读书';
    icon = '📖';
    const duration = parseInt(document.getElementById('readingDuration').value) || 30;
    goal = `${duration}分钟`;
    config = { duration };
  } else if (habitType === 'sleep') {
    name = '早睡';
    icon = '🌙';
    const targetTime = document.getElementById('sleepTargetTime').value || '23:00';
    goal = `${targetTime}前`;
    config = { targetTime };
  } else if (habitType === 'wake') {
    name = '早起';
    icon = '☀️';
    const targetTime = document.getElementById('wakeTargetTime').value || '07:00';
    goal = `${targetTime}前`;
    config = { targetTime };
  } else if (habitType === 'water') {
    name = '喝水';
    icon = '💧';
    const cups = parseInt(document.getElementById('waterCups').value) || 8;
    goal = `${cups}杯`;
    config = { cups, perTap: 300 };
  } else {
    name = document.getElementById('habitName').value.trim();
    if (!name) { showToast('请输入习惯名称'); return; }
    icon = habitPickedIcon;
    goal = document.getElementById('habitGoal').value.trim() || '每日1次';
  }

  if (editingHabitId) {
    const h = state.health.habits.find(h => h.id === editingHabitId);
    if (h) {
      if (h.type !== habitType) {
        // 类型变了，清理历史日志中的旧数据
        Object.keys(state.health.habitLogs).forEach(d => { delete state.health.habitLogs[d][h.id]; });
      }
      Object.assign(h, { name, icon, goal, type: habitType, config });
      showToast('习惯已更新');
    }
  } else {
    state.health.habits.push({ id: 'h' + uid(), name, icon, goal, type: habitType, config });
    showToast('习惯已添加');
  }
  saveState();
  editingHabitId = null;
  document.getElementById('habitAddModal').classList.remove('show');
  renderHabits();
  renderHealthDashboard();
});

// ========== FAB 菜单 ==========
let fabOpen = false;

document.querySelectorAll('.fab-menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const action = item.dataset.action;
    closeFabMenu();

    if (action === 'task') openModal();
    else if (action === 'project') {
      // 打开新建项目弹窗
      openProjectModal();
    } else if (action === 'habit') {
      // 直接打开添加习惯弹层
      resetHabitAddModal();
      document.getElementById('habitAddModal').classList.add('show');
    }
  });
});

// 更新健康看板（替换旧版，加入作息表格）
function renderHealthDashboard() {
  const el = document.getElementById('healthDashboard');
  if (!el) return;
  if (!state.health) state.health = defaultUserData().health;
  const sport = state.health.sport || { plan: {}, logs: [] };
  const weight = state.health.weight || { plan: {}, logs: [] };
  const habits = state.health.habits || [];

  // 本周（根据周起始日设置）为完整一周，作为运动计时统计范围
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() + getWeekOffset());
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate); d.setDate(weekStartDate.getDate() + i);
    weekDays.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  }
  const weekSet = new Set(weekDays);
  const sportMin = (sport.logs || []).filter(l => weekSet.has(l.date)).reduce((s, l) => s + (l.duration || 0), 0);
  const today = todayStr();
  const todayLogs = state.health.habitLogs ? (state.health.habitLogs[today] || {}) : {};
  const todayCount = Object.keys(todayLogs).length;
  // 当日运动打卡时间（分钟）
  const todaySportMin = (sport.logs || []).filter(l => l.date === today).reduce((s, l) => s + (l.duration || 0), 0);
  // 每日运动计划时间（分钟），默认 100
  const planMin = parseInt(sport.plan.durationMin || 100, 10) || 100;

  el.innerHTML = `
    <div class="hd-section hd-section-metrics">
    <div class="hd-row">
      <div class="hd-card">
        <div class="hd-card-icon"><svg viewBox="0 0 24 24" width="22" height="22"><circle cx="15" cy="5" r="2.2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M13.5 8 11 12.5l1.5 2v5.5M13.5 8l2.5 2 3 .8M11 12.5 8 14" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="hd-card-val ${todaySportMin >= planMin ? 'ok' : 'warn'}">${todaySportMin}/${planMin}</div>
        <div class="hd-card-label">运动计划</div>
      </div>
      <div class="hd-card accent">
        <div class="hd-card-icon"><svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="hd-card-val">${sportMin}</div>
        <div class="hd-card-label">本周运动（分钟）</div>
      </div>
      <div class="hd-card">
        <div class="hd-card-icon"><svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M8.2 12.4 11 15.2l5-5.4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="hd-card-val ${todayCount >= habits.length ? 'ok' : 'warn'}">${todayCount}/${habits.length}</div>
        <div class="hd-card-label">今日打卡</div>
      </div>
    </div>
    <div class="hd-plan">
      <strong>运动：</strong>${escapeHtml(sport.plan.period||'未设置')} · ${planMin} 分钟 · ${escapeHtml(sport.plan.location||'未设置地点')}
    </div>
    </div>
    <div class="hd-section hd-section-sleep">
      ${renderSleepChart()}
    </div>
    <div class="hd-section hd-section-trend">
      ${renderTrendChart()}
      <div class="hd-quick-actions">
        <button class="hd-quick-btn sport" onclick="quickHealthLog('sport')"><svg viewBox="0 0 24 24" width="17" height="17"><circle cx="15" cy="5" r="2.2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M13.5 8 11 12.5l1.5 2v5.5M13.5 8l2.5 2 3 .8M11 12.5 8 14" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg> 运动</button>
        <button class="hd-quick-btn weight" onclick="quickHealthLog('weight')"><svg viewBox="0 0 24 24" width="17" height="17"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M13 8h2l1-2h-8l1 2h2" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg> 体重</button>
        <button class="hd-quick-btn sleep" onclick="quickHealthLog('habit')"><svg viewBox="0 0 24 24" width="17" height="17"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M8.5 12.4 11 15l4.5-4.6" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg> 打卡</button>
      </div>
    </div>
  `;

  function renderSleepChart() {
    // 最近14天
    const days14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days14.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }

    // 柱子纵向范围：前一天 22:00（底部） → 当天 10:00（顶部）
    // 中间虚线 = 当天 0:00
    // 虚线向上：0:00 → 起床时间（当天睡段）
    // 虚线向下：0:00 → 入睡时间（前夜睡段）

    const COL_H = 144;  // 12 小时 = 144px（1 小时 = 12px）
    // 以当天 0:00 为基准（相对分钟）：
    //   前一天 22:00 = -120，当天 0:00 = 0，当天 10:00 = +600
    const RANGE = [-120, 600];               // 范围 720 分钟 = 12 小时
    function parseHM(str) {
      const m = String(str || '').match(/^(\d{1,2}):(\d{2})/);
      return m ? { h: parseInt(m[1], 10), m: parseInt(m[2], 10) } : null;
    }
    // 把 HH:MM 归到最近的整点/半点（半小时一个档位）
    function roundHalf(p) {
      const total = p.h * 60 + p.m;
      const r = Math.round(total / 30) * 30;
      return { h: (Math.floor(r / 60)) % 24, m: r % 60 };
    }
    function toRel(h, m) {
      // h>=12 时视为"前一天晚上"，否则视为"当天"
      if (h >= 12) return -(24 - h) * 60 + m;  // 前一日（距当天0点的负分钟数）
      return h * 60 + m;                         // 当天（距0点的分钟数）
    }
    function posYFromTop(relMin) {
      return Math.round((RANGE[1] - relMin) / (RANGE[1] - RANGE[0]) * COL_H);
    }
    const yMid = posYFromTop(0);  // 0:00 = 虚线位置

    // 找出"早睡(sleep)""早起(wake)"习惯的 id
    const sleepIds = habits.filter(h => h.type === 'sleep').map(h => h.id);
    const wakeIds  = habits.filter(h => h.type === 'wake').map(h => h.id);
    const logs = state.health.habitLogs || {};
    // 取某天某类习惯最早的一条打卡时间
    function dayTime(dateKey, ids) {
      const dayLog = logs[dateKey] || {};
      for (const id of ids) {
        const lg = dayLog[id];
        if (lg && lg.time) return lg.time;
      }
      return null;
    }
    // 默认入睡/起床（未打卡时用）
    const DEF_BED = { h: 23, m: 0 };
    const DEF_WAKE = { h: 6, m: 30 };

    let html = '<div class="hd-sleep-title">14天睡眠记录</div>';
    html += '<div class="sleep-chart-wrap">';
    // 左侧时间刻度：10:00 / 0:00 / 22:00（纵向对应柱子的顶 / 虚线 / 底）
    html += '<div class="sleep-axis">'
      +     '<span class="sleep-axis-label" style="top:2px">10:00</span>'
      +     '<span class="sleep-axis-label" style="top:' + (yMid - 6) + 'px">0:00</span>'
      +     '<span class="sleep-axis-label" style="bottom:2px">22:00</span>'
      +   '</div>';
    // 柱子区
    html += '<div class="sleep-chart-bars">';
    // 0 点虚线（相对 bars 容器）
    html += '<div class="sleep-zero-line" style="top:' + yMid + 'px"></div>';
    days14.forEach(d => {
      const label = d.slice(8); // 只取日
      // 入睡：前一天晚上的 sleep 打卡；起床：当天的 wake 打卡
      let bed = DEF_BED, wake = DEF_WAKE;
      let hasData = false;
      if (sleepIds.length) {
        const prev = new Date(d + 'T00:00'); prev.setDate(prev.getDate() - 1);
        const prevKey = isoDate(prev);
        const bt = dayTime(prevKey, sleepIds);
        if (bt) { const p = parseHM(bt); if (p) { bed = roundHalf(p); hasData = true; } }
      }
      if (wakeIds.length) {
        const wt = dayTime(d, wakeIds);
        if (wt) { const p = parseHM(wt); if (p) { wake = roundHalf(p); hasData = true; } }
      }
      // 放松段 = 入睡前 30 分钟
      const relaxH = (bed.h * 60 + bed.m - 30);
      const relax = { h: Math.floor(relaxH / 60) % 24, m: relaxH % 60 };

      const bedRel   = toRel(bed.h, bed.m);
      const wakeRel  = toRel(wake.h, wake.m);
      const relaxRel = toRel(relax.h, relax.m);
      const yWake = posYFromTop(wakeRel);
      const yBed  = posYFromTop(bedRel);
      const yRelax = posYFromTop(relaxRel);
      // 忽略异常（起床早于入睡导致负段）的兜底
      const gray1  = Math.max(yWake, 0);
      const green  = Math.max(yMid - yWake, 0);
      const blue   = Math.max(yBed - yMid, 0);
      const relx   = Math.max(yRelax - yBed, 0);
      const gray2  = Math.max(COL_H - yRelax, 0);

      html += '<div class="sleep-bar-col ' + (hasData ? '' : 'no-data') + '">'
        + '<div class="sleep-bar-stack" style="height:' + COL_H + 'px">'
        + '<div class="sleep-bar-seg sleep-gray" style="height:' + gray1 + 'px"></div>'
        + '<div class="sleep-bar-seg sleep-green" style="height:' + green + 'px"></div>'
        + '<div class="sleep-bar-seg sleep-blue" style="height:' + blue + 'px"></div>'
        + '<div class="sleep-bar-seg sleep-lightblue" style="height:' + relx + 'px"></div>'
        + '<div class="sleep-bar-seg sleep-gray" style="height:' + gray2 + 'px"></div>'
        + '</div>'
        + '<span class="sleep-bar-label">' + label + '</span>'
        + '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function renderTrendChart() {
    // 最近14天
    const days14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days14.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }

    // 聚合每日运动时长
    const sportMap = {};
    (sport.logs || []).forEach(l => {
      if (!sportMap[l.date]) sportMap[l.date] = 0;
      sportMap[l.date] += l.duration || 0;
    });
    const sportData = days14.map(d => sportMap[d] || 0);

    // 取每日最新体重
    const weightMap = {};
    (weight.logs || []).forEach(l => { weightMap[l.date] = l.weight; });
    const weightData = days14.map(d => weightMap[d] || null);

    const hasSport = sportData.some(v => v > 0);
    const hasWeight = weightData.some(v => v !== null);
    if (!hasSport && !hasWeight) {
      return '<div class="hd-trend-title">14天健康趋势</div><div class="hd-trend-chart"><div class="hd-trend-empty">暂无运动和体重数据</div></div>';
    }

    const W = 320, H = 130, pad = { t: 10, r: 10, b: 20, l: 28 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;

    // 运动 Y 轴
    const maxSport = Math.max(...sportData, 30);
    const sportScale = v => pad.t + chartH - (v / maxSport) * chartH;

    // 体重 Y 轴
    const validWeights = weightData.filter(v => v !== null);
    let minWeight = validWeights.length ? Math.min(...validWeights) : 50;
    let maxWeight = validWeights.length ? Math.max(...validWeights) : 80;
    if (minWeight === maxWeight) { minWeight -= 2; maxWeight += 2; }
    const weightRange = maxWeight - minWeight || 1;
    const weightScale = v => pad.t + chartH - ((v - minWeight) / weightRange) * chartH;

    // 构建路径
    const x = i => pad.l + (i / (days14.length - 1)) * chartW;

    let sportPath = '';
    sportData.forEach((v, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      sportPath += `${cmd}${x(i)},${sportScale(v)} `;
    });

    let weightPath = '';
    let firstWeight = true;
    weightData.forEach((v, i) => {
      if (v === null) return;
      const cmd = firstWeight ? 'M' : 'L';
      firstWeight = false;
      weightPath += `${cmd}${x(i)},${weightScale(v)} `;
    });

    // 网格线
    let gridHtml = '';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (chartH / 4) * i;
      gridHtml += `<line class="hd-trend-grid" x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}"/>`;
    }

    // 底部日期标签（只显示部分避免拥挤）
    let labelsHtml = '';
    days14.forEach((d, i) => {
      if (i % 3 === 0 || i === days14.length - 1) {
        labelsHtml += `<text class="hd-trend-label" x="${x(i)}" y="${H - 4}">${d.slice(8)}</text>`;
      }
    });

    // 左侧运动刻度
    let leftAxisHtml = '';
    for (let i = 0; i <= 4; i++) {
      const v = Math.round((maxSport / 4) * (4 - i));
      const y = pad.t + (chartH / 4) * i;
      leftAxisHtml += `<text class="hd-trend-label" x="${pad.l - 6}" y="${y + 3}" text-anchor="end">${v}</text>`;
    }

    // 右侧体重刻度
    let rightAxisHtml = '';
    for (let i = 0; i <= 4; i++) {
      const v = (minWeight + (weightRange / 4) * (4 - i)).toFixed(1);
      const y = pad.t + (chartH / 4) * i;
      rightAxisHtml += `<text class="hd-trend-label" x="${W - pad.r + 6}" y="${y + 3}" text-anchor="start">${v}</text>`;
    }

    // 运动圆点
    const sportDots = sportData.map((v, i) =>
      v > 0 ? `<circle class="hd-trend-dot" cx="${x(i)}" cy="${sportScale(v)}" r="3" fill="var(--accent)"/>` : ''
    ).join('');

    // 体重圆点
    const weightDots = weightData.map((v, i) =>
      v !== null ? `<circle class="hd-trend-dot" cx="${x(i)}" cy="${weightScale(v)}" r="3" fill="var(--accent-2)"/>` : ''
    ).join('');

    return `
      <div class="hd-trend-title">14天健康趋势</div>
      <div class="hd-trend-chart">
        <div class="hd-trend-legend">
          <span><i style="background:var(--accent)"></i>运动（分钟）</span>
          <span><i style="background:var(--accent-2)"></i>体重（kg）</span>
        </div>
        <svg class="hd-trend-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          ${gridHtml}
          <line class="hd-trend-axis" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H - pad.b}"/>
          <line class="hd-trend-axis" x1="${W - pad.r}" y1="${pad.t}" x2="${W - pad.r}" y2="${H - pad.b}"/>
          ${labelsHtml}
          ${leftAxisHtml}
          ${rightAxisHtml}
          ${sportPath ? `<path class="hd-trend-line-sport" d="${sportPath}"/>` : ''}
          ${weightPath ? `<path class="hd-trend-line-weight" d="${weightPath}"/>` : ''}
          ${sportDots}
          ${weightDots}
        </svg>
      </div>
    `;
  }
}

// 更新 quickHealthLog 支持 habit
function quickHealthLog(type) {
  healthSub = type;
  healthEditingPlan = false;
  if (type === 'habit') {
    document.getElementById('healthLogModal').classList.remove('show');
    // 切换到健康页的习惯Tab
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="health"]').classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('pageHealth').classList.add('active');
    document.querySelectorAll('.health-tab').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-sub="habit"]').classList.add('active');
    document.querySelectorAll('.health-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panelHabit').classList.add('active');
    healthSub = 'habit';
    renderHabits();
    return;
  }
  const titleMap = { sport: '记录运动', weight: '记录体重' };
  document.getElementById('healthLogTitle').textContent = titleMap[type] || '记录';
  const body = document.getElementById('healthLogBody');
  if (type === 'sport') {
    body.innerHTML = `<label class="form-label">记录日期</label><input type="date" class="health-input" id="hlDate" value="${todayStr()}"><label class="form-label">记录时间</label><input type="time" class="health-input" id="hlTime" value="${nowTimeStr()}"><label class="form-label">运动时长（分钟）</label><input type="number" class="health-input" id="hlDuration" placeholder="如 30" min="1" max="300" value="30"><label class="form-label">备注（可选）</label><input type="text" class="health-input" id="hlNote" placeholder="如 慢跑">`;
  } else if (type === 'weight') {
    body.innerHTML = `<label class="form-label">记录日期</label><input type="date" class="health-input" id="hlDate" value="${todayStr()}"><label class="form-label">记录时间</label><input type="time" class="health-input" id="hlTime" value="${nowTimeStr()}"><label class="form-label">今日体重 (kg)</label><input type="number" class="health-input" id="hlWeight" placeholder="如 65.5" step="0.1" min="30" max="200">`;
  }
  document.getElementById('healthLogModal').classList.add('show');
}
window.quickHealthLog = quickHealthLog;

// ========== 启动 ==========
applyPrefs();
if (getSession()) {
  enterApp();
} else {
  authPage.style.display = 'flex';
  appShell.style.display = 'none';
}
