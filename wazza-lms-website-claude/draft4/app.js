/**
 * Wazza Academy — Shared Data Layer
 * Handles localStorage persistence and course data loading.
 *
 * Enrollment model:
 *   purchased[]  — courses the user has paid for (set by purchaseCourse)
 *   owned[]      — alias of purchased (kept for backward compat)
 *   progress{}   — per-course lesson progress, notes, lastLesson
 *   activity[]   — activity log (last 50)
 */

// ==========================================
// WazzaCourses — Load & query course data
// ==========================================
const WazzaCourses = {
  _cache: null,

  async loadAll() {
    if (this._cache) return this._cache;
    try {
      const res = await fetch('courses.json');
      const data = await res.json();
      this._cache = data.courses;
      return this._cache;
    } catch (e) {
      console.error('Failed to load courses.json:', e);
      return [];
    }
  },

  async getCourse(id) {
    const courses = await this.loadAll();
    return courses.find(c => c.id === id) || null;
  },

  async getNonBundleCourses() {
    const courses = await this.loadAll();
    return courses.filter(c => !c.isBundle);
  },

  // Get all lessons flat for a course
  getAllLessons(course) {
    if (!course || !course.sections) return [];
    const lessons = [];
    course.sections.forEach(sec => {
      sec.lessons.forEach(l => lessons.push(l));
    });
    return lessons;
  },

  // Get total duration in minutes for a course
  getTotalDuration(course) {
    return this.getAllLessons(course).reduce((sum, l) => sum + (l.duration || 0), 0);
  },

  // Find lesson by id within a course
  getLesson(course, lessonId) {
    return this.getAllLessons(course).find(l => l.id === lessonId) || null;
  },

  // Get lesson index (0-based)
  getLessonIndex(course, lessonId) {
    return this.getAllLessons(course).findIndex(l => l.id === lessonId);
  }
};


// ==========================================
// WazzaAuth — Session & authentication
// ==========================================
const SESSION_KEY = 'wazza_session';
const REG_KEY     = 'wazza_registered_users';

const WazzaAuth = {
  // --- Login: check users.json first, then localStorage registered users ---
  async login(email, password) {
    const em = email.trim().toLowerCase();

    // 1. Check users.json (pre-defined / admin users)
    try {
      const res = await fetch('users.json');
      const data = await res.json();
      const found = data.users.find(
        u => u.email.toLowerCase() === em && u.password === password
      );
      if (found) {
        this._startSession(found);
        // Sync purchased courses from users.json into WazzaStore
        found.purchased.forEach(id => WazzaStore.purchaseCourse(id));
        return { ok: true, user: found };
      }
    } catch (e) { console.warn('users.json read failed:', e); }

    // 2. Check locally registered users (localStorage)
    const registered = this._getRegistered();
    const local = registered.find(
      u => u.email.toLowerCase() === em && u.password === password
    );
    if (local) {
      this._startSession(local);
      (local.purchased || []).forEach(id => WazzaStore.purchaseCourse(id));
      return { ok: true, user: local };
    }

    return { ok: false, error: 'Email atau password tidak betul.' };
  },

  // --- Register: save to localStorage (until backend ready) ---
  async register(name, email, password) {
    const em = email.trim().toLowerCase();

    // Check duplicate in users.json
    try {
      const res = await fetch('users.json');
      const data = await res.json();
      if (data.users.find(u => u.email.toLowerCase() === em)) {
        return { ok: false, error: 'Email ini sudah berdaftar.' };
      }
    } catch (e) {}

    // Check duplicate in localStorage
    const registered = this._getRegistered();
    if (registered.find(u => u.email.toLowerCase() === em)) {
      return { ok: false, error: 'Email ini sudah berdaftar.' };
    }

    // Create user
    const newUser = {
      id: 'u_' + Date.now(),
      name: name.trim(),
      email: em,
      password,
      purchased: [],
      role: 'student'
    };
    registered.push(newUser);
    localStorage.setItem(REG_KEY, JSON.stringify(registered));
    this._startSession(newUser);
    return { ok: true, user: newUser };
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  },

  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  isLoggedIn() { return !!this.getSession(); },

  // Redirect to login if not authenticated
  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = 'login.html'; }
  },

  _startSession(user) {
    const session = { id: user.id, name: user.name, email: user.email, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  _getRegistered() {
    try {
      const raw = localStorage.getItem(REG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
};

// ==========================================
// WazzaStore — localStorage persistence (user-scoped)
// ==========================================
// Key is scoped per user so each account has separate progress
function getStoreKey() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    const sess = s ? JSON.parse(s) : null;
    return sess ? `wazza_data_${sess.id}` : 'wazza_academy_data';
  } catch { return 'wazza_academy_data'; }
}
const STORE_KEY = null; // replaced by getStoreKey() below

const WazzaStore = {
  // Get full store
  _getData() {
    try {
      const raw = localStorage.getItem(getStoreKey());
      return raw ? JSON.parse(raw) : { owned: [], progress: {}, activity: [] };
    } catch {
      return { owned: [], progress: {}, activity: [] };
    }
  },

  _save(data) {
    localStorage.setItem(getStoreKey(), JSON.stringify(data));
  },

  // ---- Enrollment ----
  // purchaseCourse = the main way to add a course (simulates payment)
  purchaseCourse(courseId) {
    const data = this._getData();
    if (!data.owned.includes(courseId)) {
      data.owned.push(courseId);
      if (!data.progress[courseId]) {
        data.progress[courseId] = { completed: [], notes: {}, lastLesson: null, lastAccessed: Date.now() };
      }
      this._save(data);
      this.logActivity('enroll', courseId, `Purchased course`);
    }
  },

  // kept for backward compat — same as purchaseCourse
  enrollCourse(courseId) { this.purchaseCourse(courseId); },

  isPurchased(courseId) {
    return this._getData().owned.includes(courseId);
  },

  isEnrolled(courseId) { return this.isPurchased(courseId); },

  getOwnedCourses() {
    return this._getData().owned;
  },

  // Returns {courseId, lessonId} of the most recently accessed course
  getLastAccessed() {
    const data = this._getData();
    let latest = null;
    let latestTs = 0;
    for (const [courseId, prog] of Object.entries(data.progress)) {
      if (prog.lastAccessed && prog.lastAccessed > latestTs) {
        latestTs = prog.lastAccessed;
        latest = { courseId, lessonId: prog.lastLesson };
      }
    }
    return latest;
  },

  // Returns array of courseIds where all lessons are completed
  async getCompletedCourseIds() {
    const data = this._getData();
    const courses = await WazzaCourses.loadAll();
    const completed = [];
    for (const courseId of data.owned) {
      const course = courses.find(c => c.id === courseId);
      if (!course || course.isBundle) continue;
      const all = WazzaCourses.getAllLessons(course);
      const prog = data.progress[courseId] || { completed: [] };
      if (all.length > 0 && prog.completed.length >= all.length) {
        completed.push(courseId);
      }
    }
    return completed;
  },

  // ---- Progress ----
  getProgress(courseId) {
    const data = this._getData();
    return data.progress[courseId] || { completed: [], notes: {}, lastLesson: null, lastAccessed: null };
  },

  markComplete(courseId, lessonId) {
    const data = this._getData();
    if (!data.progress[courseId]) {
      data.progress[courseId] = { completed: [], notes: {}, lastLesson: null, lastAccessed: Date.now() };
    }
    if (!data.progress[courseId].completed.includes(lessonId)) {
      data.progress[courseId].completed.push(lessonId);
    }
    data.progress[courseId].lastLesson = lessonId;
    data.progress[courseId].lastAccessed = Date.now();
    this._save(data);
  },

  unmarkComplete(courseId, lessonId) {
    const data = this._getData();
    if (data.progress[courseId]) {
      data.progress[courseId].completed = data.progress[courseId].completed.filter(id => id !== lessonId);
      this._save(data);
    }
  },

  isLessonComplete(courseId, lessonId) {
    const prog = this.getProgress(courseId);
    return prog.completed.includes(lessonId);
  },

  setLastLesson(courseId, lessonId) {
    const data = this._getData();
    if (!data.progress[courseId]) {
      data.progress[courseId] = { completed: [], notes: {}, lastLesson: null, lastAccessed: Date.now() };
    }
    data.progress[courseId].lastLesson = lessonId;
    data.progress[courseId].lastAccessed = Date.now();
    this._save(data);
  },

  // ---- Notes ----
  saveNote(courseId, lessonId, text) {
    const data = this._getData();
    if (!data.progress[courseId]) {
      data.progress[courseId] = { completed: [], notes: {}, lastLesson: null, lastAccessed: Date.now() };
    }
    data.progress[courseId].notes[lessonId] = text;
    this._save(data);
  },

  getNote(courseId, lessonId) {
    const prog = this.getProgress(courseId);
    return prog.notes[lessonId] || '';
  },

  // ---- Activity Log ----
  logActivity(type, courseId, detail) {
    const data = this._getData();
    data.activity.unshift({
      type,        // 'enroll', 'complete', 'watch', 'download', 'note'
      courseId,
      detail,
      timestamp: Date.now()
    });
    // Keep only last 50
    if (data.activity.length > 50) data.activity = data.activity.slice(0, 50);
    this._save(data);
  },

  getRecentActivity(limit = 10) {
    return this._getData().activity.slice(0, limit);
  },

  // ---- Computed Stats ----
  async getStats() {
    const data = this._getData();
    const owned = data.owned;
    const courses = await WazzaCourses.loadAll();

    let totalLessons = 0;
    let completedLessons = 0;
    let totalWatchedMinutes = 0;
    let completedCourses = 0;

    for (const courseId of owned) {
      const course = courses.find(c => c.id === courseId);
      if (!course || course.isBundle) continue;

      const allLessons = WazzaCourses.getAllLessons(course);
      const prog = data.progress[courseId] || { completed: [] };

      totalLessons += allLessons.length;
      completedLessons += prog.completed.length;

      // Sum duration of completed lessons
      prog.completed.forEach(lid => {
        const lesson = allLessons.find(l => l.id === lid);
        if (lesson) totalWatchedMinutes += lesson.duration;
      });

      // Check if course is fully completed
      if (allLessons.length > 0 && prog.completed.length >= allLessons.length) {
        completedCourses++;
      }
    }

    const avgProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const hoursWatched = Math.round((totalWatchedMinutes / 60) * 10) / 10;

    return {
      coursesOwned: owned.filter(id => {
        const c = courses.find(cc => cc.id === id);
        return c && !c.isBundle;
      }).length,
      hoursWatched,
      avgProgress,
      completedCourses,
      totalLessons,
      completedLessons
    };
  },

  // ---- Reset (for testing) ----
  resetAll() {
    localStorage.removeItem(STORE_KEY);
  }
};


// ==========================================
// Utility functions
// ==========================================
function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function getActivityIcon(type) {
  const icons = { enroll: '🧾', complete: '✅', watch: '▶', download: '📥', note: '📝' };
  return icons[type] || '📌';
}

function getActivityLabel(type) {
  const labels = { enroll: 'ENROLLED', complete: 'COMPLETED', watch: 'WATCHED', download: 'SAVED', note: 'NOTE' };
  return labels[type] || 'ACTION';
}

// SVG icons for course thumbnails
function getCourseIcon(iconType) {
  const icons = {
    grid: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#fff" stroke-width="1.5"/><path d="M3 9h18M3 15h18M9 3v18" stroke="#fff" stroke-width="1.5"/></svg>',
    formula: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h16M4 14h10M4 18h13" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
    chart: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="4" y="13" width="4" height="7" rx="1" fill="#fff"/><rect x="10" y="8" width="4" height="12" rx="1" fill="#fff"/><rect x="16" y="4" width="4" height="16" rx="1" fill="#fff"/></svg>',
    code: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="1.5"/><path d="M12 7v5l3 3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
    layers: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  return icons[iconType] || icons.grid;
}
