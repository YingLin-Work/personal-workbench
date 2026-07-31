/* ============== 个人工作台 - 业务逻辑 ============== */

// ---------- 存储：账号注册表 + 会话 ----------
const STORAGE_KEY = 'workbench_accounts_v1';  // 所有用户数据
const SESSION_KEY = 'workbench_session_v1';   // 当前登录用户名
const PREFS_KEY = 'workbench_prefs_v1';       // 主题等偏好（与账号无关）

// 单个用户的默认数据
function defaultUserData() {
  return {
    tasks: [
      { id: 1, title: '完成产品需求文档', project: '需求收集', priority: 'high', time: '10:00', note: '与设计同步过', done: false },
      { id: 2, title: '与设计评审交互稿', project: '交互设计', priority: 'mid', time: '14:00', note: '', done: false },
      { id: 3, title: '与开发对齐字段', project: '需求评审', priority: 'mid', time: '16:00', note: '', done: false },
      { id: 4, title: '整理上周周报', project: '需求收集', priority: 'low', time: '18:00', note: '', done: true }
    ],
    projects: [
      { id: 'p1', name: '需求收集', status: 'active', desc: '梳理 Q2 用户反馈，提炼核心需求', members: ['我'], deadline: '02-28' },
      { id: 'p2', name: '产品设计', status: 'active', desc: '完成新版工作台界面设计稿', members: ['我'], deadline: '03-05' },
      { id: 'p3', name: '交互设计', status: 'active', desc: '优化核心流程交互细节', members: ['我'], deadline: '03-10' },
      { id: 'p4', name: '需求评审', status: 'paused', desc: '与开发对齐字段，确认技术方案', members: ['我'], deadline: '03-15' }
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
        { id: 'h4', name: '运动', icon: '🏃', goal: '30分钟', type: 'simple', config: {} }
      ],
      habitLogs: {}  // { '2026-07-31': { 'h1': { time: '23:15', count: 1, duration: 30 }, ... } }
    }
  };
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
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
  return `${y}-${m + 1}-${d}`;
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

    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page' + capitalize(tab)).classList.add('active');

    // 更新顶部标题
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = PAGE_TITLES[tab] || '个人工作台';
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

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------- 任务渲染 ----------
function renderTasks() {
  const list = document.getElementById('taskList');
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  let tasks = state.tasks.slice();

  if (q) {
    tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.project.toLowerCase().includes(q));
  }

  // 按时间排序（同时间按优先级），完成后沉底
  tasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.time !== b.time) return a.time.localeCompare(b.time);
    const order = { high: 0, mid: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  document.getElementById('taskCount').textContent = tasks.length;

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
          <span>· ${escapeHtml(t.project)}</span>
          <span>· ${t.time}</span>
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

function prioLabel(p) { return { high: '高', mid: '中', low: '低' }[p] || '中'; }
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
  document.getElementById('modalTitle').textContent = id ? '编辑任务' : '新增任务';
  if (id) {
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById('taskTitle').value = t.title;
    document.getElementById('taskProject').value = t.project;
    document.getElementById('taskPriority').value = t.priority;
    document.getElementById('taskTime').value = t.time;
    document.getElementById('taskNote').value = t.note || '';
  } else {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskProject').value = '需求收集';
    document.getElementById('taskPriority').value = 'mid';
    document.getElementById('taskTime').value = '09:00';
    document.getElementById('taskNote').value = '';
  }
  modal.classList.add('show');
  setTimeout(() => document.getElementById('taskTitle').focus(), 200);
}

function closeModal() {
  modal.classList.remove('show');
  editingTaskId = null;
}

document.getElementById('modalSave').addEventListener('click', () => {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { showToast('请输入任务标题'); return; }
  const data = {
    title,
    project: document.getElementById('taskProject').value,
    priority: document.getElementById('taskPriority').value,
    time: document.getElementById('taskTime').value,
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
  closeModal();
});

// 搜索
document.getElementById('searchInput')?.addEventListener('input', renderTasks);
document.getElementById('globalSearchInput')?.addEventListener('input', (e) => {
  // PC 全局搜索同步到原搜索框并切换任务页
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = e.target.value;
  renderTasks();
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
    { header: 'weekTasksHeader', body: 'weekTasksBody', arrow: 'weekTasksArrow' }
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

  const firstDay = new Date(calYear, calMonth, 1);
  let start = firstDay.getDay() - 1;
  if (start < 0) start = 6;
  const lastDate = new Date(calYear, calMonth + 1, 0).getDate();
  const prevLastDate = new Date(calYear, calMonth, 0).getDate();

  const today = new Date();
  const isCurMonth = today.getFullYear() === calYear && today.getMonth() === calMonth;
  const todayD = today.getDate();

  // 收集本月哪些日期有任务（task 的 time 映射到 key）
  const taskDays = {};
  (state.tasks || []).forEach(t => {
    const key = fmtDateKey(calYear, calMonth, todayD); // 所有任务默认"今天"
    // 为了演示，我们用 task 的 id 模拟不同日期：id%28+1 分布在当月
    const day = (t.id % 28) + 1;
    const k = fmtDateKey(calYear, calMonth, day);
    if (!taskDays[k]) taskDays[k] = [];
    taskDays[k].push(t);
  });

  // 本周日期范围（周一到周日）
  const todayIdx = today.getDay(); // 0=周日
  const monOffset = todayIdx === 0 ? -6 : 1 - todayIdx;
  const weekStart = new Date(today); weekStart.setDate(today.getDate() + monOffset);
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
  const todayIdx = today.getDay();
  const monOffset = todayIdx === 0 ? -6 : 1 - todayIdx;
  const weekStart = new Date(today); weekStart.setDate(today.getDate() + monOffset);

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

function renderProjects() {
  const projects = state.projects || [];
  document.getElementById('projCount').textContent = projects.length;

  // 顶部汇总：总项目 / 进行中 / 已暂停
  const active = projects.filter(p => p.status === 'active').length;
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

    return `
      <div class="project-full-card">
        <div class="project-full-head">
          <div>
            <div class="project-full-title">${escapeHtml(p.name)}</div>
            <div class="project-full-desc">${escapeHtml(p.desc || '')}</div>
          </div>
          <span class="project-full-tag ${p.status}">${STATUS_LABEL[p.status] || '进行中'}</span>
        </div>
        <div class="project-progress-row">
          <span>${done}/${projTasks.length} 任务</span>
          <span class="pct">${pct}%</span>
        </div>
        <div class="project-progress-bar">
          <div class="project-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="project-full-foot">
          <div class="members">
            ${(p.members || []).map(m => `<span class="member-dot">${escapeHtml(m.slice(0, 2))}</span>`).join('')}
          </div>
          <span>截止 ${escapeHtml(p.deadline || '-')}</span>
        </div>
      </div>
    `;
  }).join('');
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
    const projects = state.projects;
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.done).length;
    const overdueTasks = 0;

    // 四张统计卡
    const elTotal = document.getElementById('statTotalProj');
    const elTotalSub = document.getElementById('statTotalProjSub');
    if (elTotal) elTotal.textContent = projects.length;
    if (elTotalSub) elTotalSub.textContent = projects.length;

    const elActive = document.getElementById('statActive');
    if (elActive) elActive.textContent = projects.filter(p => p.status === 'active').length;
    const elActiveTrend = document.getElementById('statActiveTrend');
    if (elActiveTrend) elActiveTrend.textContent = '—';

    const elDone = document.getElementById('statDone');
    if (elDone) elDone.textContent = doneTasks;
    const elDoneTrend = document.getElementById('statDoneTrend');
    if (elDoneTrend) elDoneTrend.textContent = totalTasks ? Math.round(doneTasks/totalTasks*100) + '%' : '—';

    const elOver = document.getElementById('statOverdue');
    if (elOver) elOver.textContent = overdueTasks;
    const elOverSub = document.getElementById('statOverdueSub');
    if (elOverSub) elOverSub.textContent = overdueTasks;

    // 本月项目进度（= 所有项目的任务完成率）
    const allProjTasks = tasks;
    const allDoneTasks = tasks.filter(t => t.done);
    const projPct = allProjTasks.length ? Math.round(allDoneTasks.length / allProjTasks.length * 100) : 0;

    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const today = d.getDate();

    const elLabel = document.getElementById('progressDateLabel');
    if (elLabel) elLabel.textContent = `${year}年 ${month}月 · 本月项目进度`;
    const elPct = document.getElementById('circlePct');
    if (elPct) elPct.textContent = projPct + '%';
    const elDays = document.getElementById('progressDays');
    if (elDays) elDays.innerHTML = `已完成 <strong>${allDoneTasks.length}</strong>/${allProjTasks.length} 任务`;
    const elCirc = document.getElementById('progressCircle');
    if (elCirc) elCirc.style.background =
      `conic-gradient(var(--accent) 0% ${projPct}%, rgba(255,255,255,0.08) ${projPct}% 100%)`;

    // 年度柱状图：每月固定总高，蓝色=已完成，灰色=未完成，总高统一
    const BAR_H = 70;          // 柱子总高度（px）固定
    const months = ['1','2','3','4','5','6','7','8','9','10','11','12'];
    // 每月"已完成数"（0-10），未完成=10-已完成
    const doneData = [4, 5, 4, 6, 6, 8, 5, 3, 4, 5, 8, 3];
    const chartBars = document.getElementById('chartBars');
    if (chartBars) {
      chartBars.innerHTML = months.map((m, i) => {
        const done = Math.min(10, Math.max(0, doneData[i]));
        const undone = 10 - done;  // 灰色部分
        const doneH = Math.round(done / 10 * BAR_H);
        const emptyH = Math.round(undone / 10 * BAR_H);
        return `
          <div class="chart-month">
            <div class="chart-bar-stack" style="height:${BAR_H}px">
              <div class="chart-bar-fill" style="height:${doneH}px"></div>
            </div>
            <span class="chart-month-label">${m}</span>
          </div>`;
      }).join('');
    }

    // 项目卡片横滑
    const cardList = document.getElementById('overviewProjects');
    if (cardList) {
      if (!projects.length) {
        cardList.innerHTML = '<div style="color:var(--text-2);font-size:12px;padding:10px 0;">暂无项目</div>';
      } else {
        cardList.innerHTML = projects.map(p => {
          const projTasks = tasks.filter(t => t.project === p.name);
          const pDone = projTasks.filter(t => t.done).length;
          const pTotal = projTasks.length;
          const isActive = p.status === 'active';
          return `
            <div class="project-card ${isActive ? 'active' : ''}">
              <div class="project-head">
                <span class="project-tag">${escapeHtml(p.name)}</span>
                <span class="project-id">${pDone}/${pTotal}</span>
              </div>
              <div class="project-title">${escapeHtml(p.name)}</div>
              <div class="project-meta">${p.status === 'active' ? '进行中' : p.status === 'paused' ? '已暂停' : '已完成'} · 截止${escapeHtml(p.deadline||'-')}</div>
            </div>`;
        }).join('');
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
  const evTotal = Object.values(state.events).reduce((a, b) => a + b.length, 0);
  const projTotal = (state.projects || []).length;
  showToast(`已完成 ${done}/${total} 任务 · ${projTotal} 个项目 · ${evTotal} 个日程`);
});

// ---------- 状态栏时间 ----------
function tickTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  document.getElementById('statusTime').textContent = `${hh}:${mm}`;
}
setInterval(tickTime, 30000);
tickTime();

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
  settingsPage.classList.add('show');
}
document.getElementById('settingsBack').addEventListener('click', () => {
  settingsPage.classList.remove('show');
});

function renderSettingsStats() {
  const tasks = state.tasks || [];
  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const rate = total ? Math.round(done / total * 100) : 0;
  const projActive = (state.projects || []).filter(p => p.status === 'active').length;
  const days = (state.activeDays || []).length;
  const habitTotal = (state.health?.habits || []).length;
  const sportLogs = (state.health?.sport?.logs || []).length;
  const weightLogs = (state.health?.weight?.logs || []).length;

  document.getElementById('settingsStats').innerHTML = `
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
  autoSync: false,
  offlineCacheDays: '3',
  imageSyncRule: 'survey',
  imageMaxSize: '3',
  defaultPriority: 'none',
  defaultRepeat: false,
  workHourDecimals: '1',
  workHourUnit: 'h',
  standardBedtime: '23:00',
  standardWakeTime: '06:30',
  defaultSportDuration: '30',
  healthChartStyle: 'line',
  photoCompress: true,
  theme: 'dark',
  accent: '#3ddc97',
  followSystem: false,
  fontSize: 'normal',
  tags: ['勘测', '绘图', '客户对接', '材料采购', '施工'],
  stageTemplate: ['需求沟通', '方案设计', '施工图绘制', '材料清单', '施工准备', '现场施工', '竣工验收']
};

function loadSettingsPrefs() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_PREFS_KEY) || '{}') };
  } catch (e) { return { ...DEFAULT_SETTINGS }; }
}
function saveSettingsPrefs() {
  const sp = loadSettingsPrefs();
  // 收集UI值
  const autoSync = document.getElementById('autoSync');
  if (autoSync) sp.autoSync = autoSync.checked;
  const offlineCacheDays = document.getElementById('offlineCacheDays');
  if (offlineCacheDays) sp.offlineCacheDays = offlineCacheDays.value;
  const imageSyncRule = document.getElementById('imageSyncRule');
  if (imageSyncRule) sp.imageSyncRule = imageSyncRule.value;
  const imageMaxSize = document.getElementById('imageMaxSize');
  if (imageMaxSize) sp.imageMaxSize = imageMaxSize.value;
  const defaultPriority = document.getElementById('defaultPriority');
  if (defaultPriority) sp.defaultPriority = defaultPriority.value;
  const defaultRepeat = document.getElementById('defaultRepeat');
  if (defaultRepeat) sp.defaultRepeat = defaultRepeat.checked;
  const workHourDecimals = document.getElementById('workHourDecimals');
  if (workHourDecimals) sp.workHourDecimals = workHourDecimals.value;
  const workHourUnit = document.getElementById('workHourUnit');
  if (workHourUnit) sp.workHourUnit = workHourUnit.value;
  const standardBedtime = document.getElementById('standardBedtime');
  if (standardBedtime) sp.standardBedtime = standardBedtime.value;
  const standardWakeTime = document.getElementById('standardWakeTime');
  if (standardWakeTime) sp.standardWakeTime = standardWakeTime.value;
  const defaultSportDuration = document.getElementById('defaultSportDuration');
  if (defaultSportDuration) sp.defaultSportDuration = defaultSportDuration.value;
  const healthChartStyle = document.getElementById('healthChartStyle');
  if (healthChartStyle) sp.healthChartStyle = healthChartStyle.value;
  const photoCompress = document.getElementById('photoCompress');
  if (photoCompress) sp.photoCompress = photoCompress.checked;
  const followSystem = document.getElementById('followSystem');
  if (followSystem) sp.followSystem = followSystem.checked;
  localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp));
  applySettingsToUI(sp);
}

function loadSettingsPrefsToUI() {
  const sp = loadSettingsPrefs();
  const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  setCheck('autoSync', sp.autoSync);
  setVal('offlineCacheDays', sp.offlineCacheDays);
  setVal('imageSyncRule', sp.imageSyncRule);
  setVal('imageMaxSize', sp.imageMaxSize);
  setVal('defaultPriority', sp.defaultPriority);
  setCheck('defaultRepeat', sp.defaultRepeat);
  setVal('workHourDecimals', sp.workHourDecimals);
  setVal('workHourUnit', sp.workHourUnit);
  setVal('standardBedtime', sp.standardBedtime);
  setVal('standardWakeTime', sp.standardWakeTime);
  setVal('defaultSportDuration', sp.defaultSportDuration);
  setVal('healthChartStyle', sp.healthChartStyle);
  setCheck('photoCompress', sp.photoCompress);
  setCheck('followSystem', sp.followSystem);
  // 标签数量
  const tc = document.getElementById('tagCountHint');
  if (tc) tc.textContent = (sp.tags || []).length + ' 个标签';
  // 字体大小
  document.querySelectorAll('#fontSizeControl button').forEach(b => {
    b.classList.toggle('active', b.dataset.size === sp.fontSize);
  });
  // 主题和强调色
  applySettingsToUI(sp);
}

function applySettingsToUI(sp) {
  document.body.classList.toggle('theme-light', sp.theme === 'light');
  document.documentElement.style.setProperty('--accent', sp.accent);
  const accent2Map = {
    '#3ddc97': '#4ad6ff', '#4ad6ff': '#3ddc97',
    '#a78bfa': '#f0abfc', '#ffb84a': '#ff5a5f', '#ff5a5f': '#ffb84a'
  };
  document.documentElement.style.setProperty('--accent-2', accent2Map[sp.accent] || '#4ad6ff');
  // 字体大小
  const sizeMap = { small: '12px', normal: '14px', large: '16px' };
  document.documentElement.style.setProperty('--base-font-size', sizeMap[sp.fontSize] || '14px');
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
// 字体大小控制
document.querySelectorAll('#fontSizeControl button').forEach(b => {
  b.addEventListener('click', () => {
    const sp = loadSettingsPrefs(); sp.fontSize = b.dataset.size;
    localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp));
    applySettingsToUI(sp);
  });
});

// 账号基础 → 打开头像编辑弹层
document.getElementById('rowProfile')?.addEventListener('click', () => {
  settingsPage.classList.remove('show');
  setTimeout(() => {
    document.getElementById('avatarWrap').click();
  }, 300);
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

// 手动同步
document.getElementById('rowManualSync')?.addEventListener('click', () => {
  saveState();
  showToast('数据已同步到本地存储 ✓');
});

// 自定义标签管理
let tagManageModal = null;
document.getElementById('rowTagManage')?.addEventListener('click', () => {
  const sp = loadSettingsPrefs();
  const tags = sp.tags || [];
  if (!tagManageModal) {
    tagManageModal = document.createElement('div');
    tagManageModal.className = 'modal-mask';
    tagManageModal.innerHTML = `
      <div class="modal glass tag-manage-modal">
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
      </div>
    `;
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
  // 移除旧监听器
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

// 项目阶段模板管理
let stageModal = null;
document.getElementById('rowStageTemplate')?.addEventListener('click', () => {
  const sp = loadSettingsPrefs();
  const stages = sp.stageTemplate || [];
  if (!stageModal) {
    stageModal = document.createElement('div');
    stageModal.className = 'modal-mask';
    stageModal.innerHTML = `
      <div class="modal glass">
        <div class="modal-head"><h3>项目阶段模板</h3><button class="modal-close" id="stageModalClose">×</button></div>
        <div class="modal-body">
          <div id="stageList"></div>
          <div class="tag-add-row">
            <input type="text" id="newStageInput" placeholder="输入阶段名称" maxlength="15">
            <button id="addStageBtn">添加</button>
          </div>
          <p style="font-size:11px;color:var(--text-2);margin-top:8px;">新建项目时，可一键套用此模板</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" id="stageModalDone">完成</button>
        </div>
      </div>
    `;
    document.getElementById('appShell').appendChild(stageModal);
    stageModal.addEventListener('click', e => { if (e.target === stageModal) stageModal.classList.remove('show'); });
    document.getElementById('stageModalClose').addEventListener('click', () => stageModal.classList.remove('show'));
    document.getElementById('stageModalDone').addEventListener('click', () => stageModal.classList.remove('show'));
  }

  const renderStages = () => {
    const sp2 = loadSettingsPrefs();
    const stages2 = sp2.stageTemplate || [];
    const list = stageModal.querySelector('#stageList');
    list.innerHTML = stages2.map((s, i) => `
      <div class="stage-item">
        <span class="stage-drag">≡</span>
        <span class="stage-name">${i + 1}. ${escapeHtml(s)}</span>
        <span class="stage-del" data-idx="${i}">×</span>
      </div>
    `).join('');
    list.querySelectorAll('.stage-del').forEach(del => {
      del.addEventListener('click', () => {
        const idx = parseInt(del.dataset.idx);
        const sp3 = loadSettingsPrefs();
        sp3.stageTemplate.splice(idx, 1);
        localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp3));
        renderStages();
      });
    });
  };

  const addBtn = stageModal.querySelector('#addStageBtn');
  const newInput = stageModal.querySelector('#newStageInput');
  const addHandler = () => {
    const name = newInput.value.trim();
    if (!name) { showToast('请输入阶段名称'); return; }
    const sp2 = loadSettingsPrefs();
    sp2.stageTemplate.push(name);
    localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(sp2));
    newInput.value = '';
    renderStages();
  };
  const newAddBtn = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAddBtn, addBtn);
  newAddBtn.addEventListener('click', addHandler);
  const newInput2 = newInput.cloneNode(true);
  newInput.parentNode.replaceChild(newInput2, newInput);
  newInput2.addEventListener('keydown', e => { if (e.key === 'Enter') addHandler(); });

  renderStages();
  stageModal.querySelector('#newStageInput').value = '';
  stageModal.classList.add('show');
});

// 云端数据占用
document.getElementById('rowCloudUsage')?.addEventListener('click', () => {
  const tasksBytes = new Blob([JSON.stringify(state.tasks || [])]).size;
  const projBytes = new Blob([JSON.stringify(state.projects || [])]).size;
  const healthBytes = new Blob([JSON.stringify(state.health || {})]).size;
  const totalKB = Math.round((tasksBytes + projBytes + healthBytes) / 1024 * 10) / 10;
  const localData = new Blob([JSON.stringify(state)]).size;
  const localKB = Math.round(localData / 1024 * 10) / 10;
  alert(`📊 数据占用统计\n\n任务数据：约 ${Math.round(tasksBytes / 1024 * 10) / 10} KB\n项目数据：约 ${Math.round(projBytes / 1024 * 10) / 10} KB\n健康数据：约 ${Math.round(healthBytes / 1024 * 10) / 10} KB\n\n本地总占用：${localKB} KB\n\n（当前为本地存储版，数据保存在浏览器中）`);
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

// 全部导出备份
document.getElementById('rowExportAll')?.addEventListener('click', () => {
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
});

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
  // 同时更新设置中心用户名
  const su = document.getElementById('settingsUsername');
  if (su) su.textContent = currentUser;
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
    el.innerHTML = `
      <h4>🏃 运动计划</h4>
      <div class="health-plan-row"><span>周期：</span>${escapeHtml(plan.period || '未设置')}</div>
      <div class="health-plan-row"><span>时间：</span>${escapeHtml(plan.time || '未设置')}</div>
      <div class="health-plan-row"><span>路线：</span>${escapeHtml(plan.route || '未设置')}</div>
      <button class="health-plan-edit" onclick="editPlan('sport')">✎ 编辑计划</button>`;
  } else if (healthSub === 'weight') {
    el.innerHTML = `
      <h4>⚖ 体重目标</h4>
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
      <select id="hlPeriod"><option>每天</option><option>每周一三五</option><option>每周二四六</option><option>周末</option></select>
      <label class="form-label">执行时段</label>
      <input type="text" id="hlTime" value="${escapeHtml(plan.time||'18:00-19:00')}" placeholder="如 18:00-19:00">
      <label class="form-label">运动路线</label>
      <input type="text" id="hlRoute" value="${escapeHtml(plan.route||'')}" placeholder="如 小区跑道">`;
    setTimeout(() => { document.getElementById('hlPeriod').value = plan.period || '每天'; }, 50);
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
        <label class="form-label">运动时长（分钟）</label>
        <input type="number" id="hlDuration" placeholder="如 30" min="1" max="300" value="30">
        <label class="form-label">备注（可选）</label>
        <input type="text" id="hlNote" placeholder="如 慢跑">`;
    } else {
      body.innerHTML = `
        <label class="form-label">今日体重 (kg)</label>
        <input type="number" id="hlWeight" placeholder="如 65.5" step="0.1" min="30" max="200">`;
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
      h.plan.time = document.getElementById('hlTime')?.value || '18:00-19:00';
      h.plan.route = document.getElementById('hlRoute')?.value || '';
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
      if (dur <= 0) { showToast('请输入运动时长'); return; }
      h.logs.push({ id: uid(), date: today, duration: dur, note });
    } else if (healthSub === 'weight') {
      const w = parseFloat(document.getElementById('hlWeight')?.value) || 0;
      if (w <= 0) { showToast('请输入体重'); return; }
      h.logs.push({ id: uid(), date: today, weight: w });
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

function renderHabits() {
  if (!state.health.habits) state.health.habits = defaultUserData().health.habits;
  if (!state.health.habitLogs) state.health.habitLogs = {};
  migrateHabitLogs();
  // 兼容旧 habit 无 type
  state.health.habits.forEach(h => { if (!h.type) { h.type = 'simple'; h.config = {}; } });

  const habits = state.health.habits;
  const today = todayStr();
  const todayLogs = state.health.habitLogs[today] || {};

  const grid = document.getElementById('habitGrid');
  if (!habits.length) {
    grid.innerHTML = '<div class="empty-tip" style="grid-column:span 2;">点击上方「+ 添加习惯」开始</div>';
    return;
  }
  grid.innerHTML = habits.map(h => {
    const log = todayLogs[h.id];
    let done = !!log;
    let info = '';
    if (h.type === 'water') {
      const cups = log ? Math.floor((log.count || 0) / 300) : 0;
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
      <button class="habit-card-del" onclick="event.stopPropagation();deleteHabit('${h.id}')">删除</button>
    </div>`;
  }).join('');
}

function toggleHabit(id) {
  const today = todayStr();
  if (!state.health.habitLogs[today]) state.health.habitLogs[today] = {};
  const todayLogs = state.health.habitLogs[today];
  const habit = (state.health.habits || []).find(h => h.id === id);
  if (!habit) return;

  // 已打卡则取消
  if (todayLogs[id]) {
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
    const perTap = config.perTap || 300;
    const prev = todayLogs[id] ? (todayLogs[id].count || 0) : 0;
    const cups = config.cups || 8;
    const newCount = prev + perTap;
    const newCups = Math.floor(newCount / 300);
    todayLogs[id] = { count: newCount };
    if (newCount >= cups * 300) {
      showToast(`喝水 +${perTap}ml，已达成今日目标 ${cups} 杯 🎉`);
    } else {
      showToast(`喝水 +${perTap}ml (${newCups}/${cups} 杯) ✓`);
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

// 添加习惯弹层
function resetHabitAddModal() {
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

document.getElementById('habitAddClose').addEventListener('click', () => document.getElementById('habitAddModal').classList.remove('show'));
document.getElementById('habitAddCancel').addEventListener('click', () => document.getElementById('habitAddModal').classList.remove('show'));
document.getElementById('habitAddModal').addEventListener('click', e => {
  if (e.target === document.getElementById('habitAddModal')) document.getElementById('habitAddModal').classList.remove('show');
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

  state.health.habits.push({ id: 'h' + uid(), name, icon, goal, type: habitType, config });
  saveState();
  document.getElementById('habitAddModal').classList.remove('show');
  renderHabits();
  renderHealthDashboard();
  showToast('习惯已添加');
});

// ========== FAB 菜单 ==========
let fabOpen = false;

document.querySelectorAll('.fab-menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const action = item.dataset.action;
    closeFabMenu();

    if (action === 'task') openModal();
    else if (action === 'project') {
      const name = prompt('输入项目名称：');
      if (!name || !name.trim()) return;
      state.projects.push({ id: 'p' + uid(), name: name.trim(), status: 'active', desc: '', members: ['我'], deadline: '' });
      saveState();
      renderProjects();
      renderOverview();
      showToast('项目已添加');
    } else if (action === 'sport') {
      // 打开运动计划编辑
      editPlan('sport');
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

  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    weekDays.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  }
  const weekSet = new Set(weekDays);
  const sportMin = (sport.logs || []).filter(l => weekSet.has(l.date)).reduce((s, l) => s + (l.duration || 0), 0);
  const today = todayStr();
  const todayLogs = state.health.habitLogs ? (state.health.habitLogs[today] || {}) : {};
  const todayCount = Object.keys(todayLogs).length;

  el.innerHTML = `
    <div class="hd-row">
      <div class="hd-card">
        <div class="hd-card-icon">🏃</div>
        <div class="hd-card-val">${escapeHtml(sport.plan.period||'未设置')}</div>
        <div class="hd-card-label">运动计划</div>
      </div>
      <div class="hd-card accent">
        <div class="hd-card-icon">⏱</div>
        <div class="hd-card-val">${sportMin}</div>
        <div class="hd-card-label">本周运动（分钟）</div>
      </div>
      <div class="hd-card">
        <div class="hd-card-icon">✅</div>
        <div class="hd-card-val">${todayCount}/${habits.length}</div>
        <div class="hd-card-label">今日打卡</div>
      </div>
    </div>
    <div class="hd-plan">
      <strong>运动：</strong>${escapeHtml(sport.plan.period||'未设置')} ${escapeHtml(sport.plan.time||'')} · ${escapeHtml(sport.plan.route||'')}
    </div>
    ${renderSleepChart()}
    ${renderTrendChart()}
    <div class="hd-quick-actions">
      <button class="hd-quick-btn sport" onclick="quickHealthLog('sport')">🏃 运动</button>
      <button class="hd-quick-btn weight" onclick="quickHealthLog('weight')">⚖ 体重</button>
      <button class="hd-quick-btn sleep" onclick="quickHealthLog('habit')">✅ 打卡</button>
    </div>
  `;

  function renderSleepChart() {
    // 最近14天
    const days14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days14.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }

    // 默认睡眠：前一天23:00入睡，当天6:30起床
    // 柱子范围：前一天12:00 → 当天12:00（24小时）
    // 中间虚线 = 当天0:00
    // 0点以上（当天0:00-12:00）= 绿色
    // 0点以下（前一天12:00-当天0:00）= 蓝色

    const COL_H = 144;  // 24小时 = 144px（1px = 10分钟）
    const MID = 72;     // 0点线 = 12小时处

    // 默认睡眠：前一天22:30放松，23:00入睡，当天6:30起床
    function toRel(h, m) {
      // 以当天0点为基准，前一天12:00=-720，当天12:00=720
      if (h >= 12) return -(24 - h) * 60 - m;  // 前一天12:00-23:59
      return h * 60 + m;                         // 当天0:00-11:59
    }
    const relaxRel = toRel(22, 30); // -90
    const bedRel = toRel(23, 0);    // -60
    const wakeRel = toRel(6, 30);   // +390

    function posYFromTop(relMin) {
      return Math.round((720 - relMin) / (24 * 60) * COL_H);
    }

    const yWake_top = posYFromTop(wakeRel);   // 6:30 从顶部位置
    const yMid = posYFromTop(0);              // 0:00 = MID
    const yBed = posYFromTop(bedRel);         // 23:00 从顶部位置
    const yRelax = posYFromTop(relaxRel);     // 22:30 从顶部位置

    // 从顶部到底部顺序：
    // 灰色1: 当天12:00 → 6:30
    const gray1 = yWake_top;
    // 绿色: 6:30 → 0:00
    const greenH = yMid - yWake_top;
    // 蓝色: 0:00 → 23:00（前一天晚上）
    const blueSleep = yBed - yMid;
    // 蓝色/浅蓝: 23:00 → 22:30（入睡前半小时）
    const blueRelax = yRelax - yBed;
    // 灰色2: 22:30 → 前一天12:00
    const gray2 = COL_H - yRelax;

    let html = '<div class="hd-sleep-title">💤 最近14天睡眠记录</div>';
    html += '<div class="sleep-chart-wrap">';
    html += '<div class="sleep-zero-line" style="top:' + MID + 'px"></div>';
    html += '<div class="sleep-chart-bars">';

    days14.forEach(d => {
      const label = d.slice(8); // 只取日
      html += '<div class="sleep-bar-col">'
        + '<div class="sleep-bar-stack" style="height:' + COL_H + 'px">'
        + '<div class="sleep-bar-seg sleep-gray" style="height:' + gray1 + 'px"></div>'
        + '<div class="sleep-bar-seg sleep-green" style="height:' + greenH + 'px"></div>'
        + '<div class="sleep-bar-seg sleep-blue" style="height:' + blueSleep + 'px"></div>'
        + '<div class="sleep-bar-seg sleep-blue" style="height:' + blueRelax + 'px"></div>'
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
      return '<div class="hd-trend-chart"><div class="hd-trend-title">📈 14天健康趋势</div><div class="hd-trend-empty">暂无运动和体重数据</div></div>';
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
      <div class="hd-trend-chart">
        <div class="hd-trend-title">📈 14天健康趋势</div>
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
    body.innerHTML = `<label class="form-label">运动时长（分钟）</label><input type="number" id="hlDuration" placeholder="如 30" min="1" max="300" value="30"><label class="form-label">备注（可选）</label><input type="text" id="hlNote" placeholder="如 慢跑">`;
  } else if (type === 'weight') {
    body.innerHTML = `<label class="form-label">今日体重 (kg)</label><input type="number" id="hlWeight" placeholder="如 65.5" step="0.1" min="30" max="200">`;
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
