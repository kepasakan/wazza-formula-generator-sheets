// ==========================================
// WAZZA ACADEMY - DRAFT 3 (SINGLE PAGE LOGIC)
// ==========================================

// 1. Logik Log Masuk (WazzaAuth)
const WazzaAuth = {
    async login(email, password) {
        try {
            const res = await fetch('users.json');
            const data = await res.json();
            const user = data.users.find(u => u.email === email && u.password === password);

            if (user) {
                localStorage.setItem('wazza_session', JSON.stringify(user));
                return { ok: true };
            }
            return { ok: false, error: 'E-mel atau kata laluan salah.' };
        } catch (e) {
            console.error(e);
            return { ok: false, error: 'Ralat sistem. Sila cuba lagi.' };
        }
    },
    logout() {
        localStorage.removeItem('wazza_session');
        window.location.href = 'login.html';
    }
};

// 2. Load data JSON
const WazzaCourses = {
    async loadAll() {
        try {
            const res = await fetch('courses.json');
            const data = await res.json();
            return data.courses;
        } catch (e) {
            console.error('Gagal load courses.json:', e);
            return [];
        }
    }
};

// 3. Logik Single Page
const WazzaDraft3 = {
    currentCourse: null,

    async init() {
        if (!localStorage.getItem('wazza_session')) {
            window.location.href = 'login.html';
            return;
        }
        const courses = await WazzaCourses.loadAll();
        this.renderCoursePicker(courses);
    },

    renderCoursePicker(courses) {
        const grid = document.getElementById('course-list-grid');
        grid.innerHTML = courses.map(c => `
            <div class="course-item-card" onclick="WazzaDraft3.loadCourse('${c.id}')">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📁</div>
                <div style="font-weight: 600; font-size: 1.1rem; color:#fff;">${c.title}</div>
                <div style="font-size: 0.8rem; color: var(--green); margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">${c.category}</div>
            </div>
        `).join('');
    },

    async loadCourse(courseId) {
        const courses = await WazzaCourses.loadAll();
        this.currentCourse = courses.find(c => c.id === courseId);

        if (this.currentCourse) {
            document.getElementById('course-picker').style.display = 'none';
            document.getElementById('empty-state').style.display = 'flex';

            this.renderPlaylist();
            document.querySelector('.logo-text').innerHTML = `Wazza<span class="logo-dot">.</span>${this.currentCourse.category}`;

            // Auto buka menu lepas user pilih kursus
            document.getElementById('sidebar').classList.remove('collapsed');
        }
    },

    renderPlaylist() {
        const container = document.getElementById('playlist-container');
        let html = '';

        this.currentCourse.sections.forEach(section => {
            html += `<div style="padding: 1rem 1.5rem; font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">${section.title}</div>`;

            section.lessons.forEach(lesson => {
                html += `
                <div class="lesson-item" onclick="WazzaDraft3.selectLesson('${lesson.id}')" id="li-${lesson.id}"
                     style="padding: 1rem 1.5rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.2s;">
                  <div style="font-size: 0.9rem; font-weight: 500; margin-bottom: 0.3rem; color: #fff;">${lesson.title}</div>
                  <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">⏱ ${lesson.duration} min</div>
                </div>`;
            });
        });
        container.innerHTML = html;
    },

    selectLesson(lessonId) {
        let lessonData = null;
        this.currentCourse.sections.forEach(sec => {
            const found = sec.lessons.find(l => l.id === lessonId);
            if (found) lessonData = found;
        });
        if (!lessonData) return;

        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('video-section').style.display = 'block';

        const embedUrl = this.toEmbedUrl(lessonData.videoUrl);
        document.getElementById('video-container').innerHTML = `<iframe src="${embedUrl}" allowfullscreen style="width:100%; aspect-ratio:16/9; border:none; border-radius: 8px 8px 0 0;"></iframe>`;
        document.getElementById('yt-fallback-btn').href = lessonData.videoUrl;

        document.getElementById('tab-overview').innerHTML = `
          <h2 style="font-family: 'Space Grotesk'; margin-bottom: 1rem; color: #fff;">${lessonData.title}</h2>
          <p style="color: rgba(255,255,255,0.7); line-height: 1.6; font-size: 0.9rem;">${lessonData.description || 'Tiada penerangan.'}</p>
        `;

        const resContainer = document.getElementById('tab-resources');
        if (lessonData.resources && lessonData.resources.length > 0) {
            let resHtml = '<ul style="list-style:none; padding:0; margin:0;">';
            lessonData.resources.forEach(r => {
                resHtml += `
                <li style="padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:space-between;">
                    <span style="color:#fff; font-size:0.9rem;">${r.icon} ${r.name}</span>
                    <a href="${r.url}" target="_blank" style="color:#34A853; font-size:0.8rem; font-weight:bold; text-decoration:none; padding:0.4rem 0.8rem; background:rgba(52, 168, 83, 0.1); border-radius:6px;">${r.label}</a>
                </li>`;
            });
            resHtml += '</ul>';
            resContainer.innerHTML = resHtml;
        } else {
            resContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 0.9rem;">Tiada sumber tambahan.</p>';
        }

        document.querySelectorAll('.lesson-item').forEach(el => {
            el.style.background = 'transparent';
            el.style.borderLeft = 'none';
        });
        const activeEl = document.getElementById(`li-${lessonId}`);
        activeEl.style.background = 'rgba(52, 168, 83, 0.1)';
        activeEl.style.borderLeft = '3px solid #34A853';
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('collapsed');
    },

    toEmbedUrl(url) {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
    }
};

function showTab(tabId, btnElement) {
    document.querySelectorAll('.tab-panel').forEach(panel => panel.style.display = 'none');
    document.querySelectorAll('.ctab').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-' + tabId).style.display = 'block';
    btnElement.classList.add('active');
}

// Inisialisasi hanya jika ini adalah course page (bukan login page)
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('course-picker')) {
        WazzaDraft3.init();
    }
});