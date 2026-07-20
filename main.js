window.showPage = showPage;
window.toggleMenu = toggleMenu;
window.filterGallery = filterGallery;
window.showToast = showToast;


// -- Page Navigation --
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  let target = document.getElementById('page-' + id);
  if (!target) {
    target = document.getElementById('page-404');
    id = '404';
  }
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Update active nav link
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active-nav'));
  const activeLink = document.querySelector(`.nav-links a[onclick*="'${id}'"]`);
  if (activeLink) activeLink.classList.add('active-nav');
}

// -- Mobile Menu --
function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('open');
}

// -- Gallery Filter --
const galleryItems = [
  { cat: 'community', url: '/assets/gallery/community-engagement/IMG-20260703-WA0006.jpg', label: 'Community Engagement' },
  { cat: 'community', url: '/assets/gallery/community-engagement/IMG-20260703-WA0007.jpg', label: 'Community Engagement' },
  { cat: 'community', url: '/assets/gallery/community-engagement/IMG-20260703-WA0012.jpg', label: 'Community Engagement' },
  { cat: 'community', url: '/assets/gallery/community-engagement/IMG-20260703-WA0014.jpg', label: 'Community Engagement' },
  { cat: 'community', url: '/assets/gallery/community-engagement/IMG-20260703-WA0018.jpg', label: 'Community Engagement' },
  { cat: 'community', url: '/assets/gallery/community-engagement/IMG-20260703-WA0023.jpg', label: 'Community Engagement' },
  { cat: 'women', url: '/assets/gallery/womens-month-dialogue/IMG-20260703-WA0008.jpg', label: "Women's Month Dialogue" },
  { cat: 'women', url: '/assets/gallery/womens-month-dialogue/IMG-20260703-WA0011.jpg', label: "Women's Month Dialogue" },
  { cat: 'women', url: '/assets/gallery/womens-month-dialogue/IMG-20260703-WA0013.jpg', label: "Women's Month Dialogue" },
  { cat: 'women', url: '/assets/gallery/womens-month-dialogue/IMG-20260703-WA0016.jpg', label: "Women's Month Dialogue" },
  { cat: 'youth', url: '/assets/gallery/youth-development/IMG-20260703-WA0017.jpg', label: 'Youth Development' },
  { cat: 'youth', url: '/assets/gallery/youth-development/IMG-20260703-WA0019.jpg', label: 'Youth Development' },
  { cat: 'youth', url: '/assets/gallery/youth-development/IMG-20260703-WA0020.jpg', label: 'Youth Development' },
  { cat: 'youth', url: '/assets/gallery/youth-development/IMG-20260703-WA0021.jpg', label: 'Youth Development' },
  { cat: 'youth', url: '/assets/gallery/youth-development/WhatsApp%20Image%202026-07-18%20at%205.07.12%20PM.jpeg', label: 'Youth Development' },
  { cat: 'youth', url: '/assets/gallery/youth-development/WhatsApp%20Image%202026-07-18%20at%205.07.58%20PM.jpeg', label: 'Youth Development' },
  { cat: 'general', url: '/assets/gallery/general/IMG-20260703-WA0022.jpg', label: 'General' },
  { cat: 'general', url: '/assets/gallery/general/IMG-20260703-WA0024.jpg', label: 'General' }
];

function renderGallery(filter) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  const filtered = filter === 'all' ? galleryItems : galleryItems.filter(i => i.cat === filter);
  grid.innerHTML = filtered.map(item => `
    <div class="gallery-item" data-cat="${item.cat}">
      <img src="${item.url}" alt="${item.label}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" />
      <div class="gallery-overlay"><span class="gallery-overlay-text">${item.label}</span></div>
    </div>
  `).join('');
}

function filterGallery(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGallery(cat);
}

// -- Contact Form (fetch → /api/contact) --
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        form.style.display = 'none';
        const successEl = document.getElementById('form-success');
        if (successEl) successEl.classList.add('show');
        showToast('Message sent! We will be in touch within 48 hours.');
        form.reset();
      } else {
        showToast(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Contact form error:', err);
      showToast('Network error. Please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// -- Volunteer Form (fetch → /api/volunteer) --
function initVolunteerForm() {
  const form = document.getElementById('volunteer-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        form.style.display = 'none';
        // Create and show success message
        let successEl = form.parentElement.querySelector('.form-success');
        if (!successEl) {
          successEl = document.createElement('div');
          successEl.className = 'form-success';
          successEl.innerHTML = '<i class="fas fa-check-circle"></i> Thank you for volunteering! We\'ll be in touch soon.';
          form.parentElement.insertBefore(successEl, form.nextSibling);
        }
        successEl.classList.add('show');
        showToast('Application submitted! Thank you for volunteering.');
        form.reset();
      } else {
        showToast(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Volunteer form error:', err);
      showToast('Network error. Please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// -- Toast --
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}



// -- Impact Stats Counter --
function initImpactStats() {
  const statsSection = document.querySelector('.impact-stats');
  if (!statsSection) return;

  const nums = document.querySelectorAll('.impact-num');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        nums.forEach(num => {
          const target = parseInt(num.getAttribute('data-target'), 10);
          if (prefersReducedMotion) {
            num.innerText = target;
          } else {
            animateValue(num, 0, target, 2000);
          }
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(statsSection);
}

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const easeOut = progress * (2 - progress);
    obj.innerText = Math.floor(easeOut * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerText = end;
    }
  };
  window.requestAnimationFrame(step);
}



// -- Init --
document.addEventListener('DOMContentLoaded', () => {
  renderGallery('all');
  initImpactStats();
  if (typeof initContactForm === 'function') initContactForm();
  if (typeof initVolunteerForm === 'function') initVolunteerForm();
});


