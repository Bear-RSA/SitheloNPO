// -- Page Navigation --
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + id);
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
  { cat: 'school',    icon: '<i class="fas fa-graduation-cap"></i>', label: 'Back-to-School Drive',       sub: 'Montclair Primary, 2025' },
  { cat: 'skills',   icon: '<i class="fas fa-cut"></i>', label: 'Sewing & Crafts Training',   sub: 'Skills Programme, 2024' },
  { cat: 'women',    icon: '<i class="fas fa-female"></i>', label: "Women's Month Dialogue",      sub: 'August 2024' },
  { cat: 'youth',    icon: '<i class="fas fa-seedling"></i>', label: 'Youth Mentorship Session',   sub: 'Durban South, 2024' },
  { cat: 'community',icon: '<i class="fas fa-city"></i>', label: 'Community Outreach Day',     sub: 'Montclair, 2024' },
  { cat: 'school',   icon: '<i class="fas fa-book"></i>', label: 'Stationery Collection',       sub: 'School Drive 2024' },
  { cat: 'skills',   icon: '<i class="fas fa-tools"></i>', label: 'Vocational Trade Workshop',  sub: 'Skills Centre, 2024' },
  { cat: 'women',    icon: '<i class="fas fa-heart"></i>', label: 'Leadership Training',         sub: "Women's Programme" },
  { cat: 'community',icon: '<i class="fas fa-shoe-prints"></i>', label: 'Winter Warmth &mdash; Shoe Drive', sub: 'June 2024' },
];

function renderGallery(filter) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  const filtered = filter === 'all' ? galleryItems : galleryItems.filter(i => i.cat === filter);
  grid.innerHTML = filtered.map(item => `
    <div class="gallery-item" data-cat="${item.cat}">
      <div class="gallery-item-inner">
        <div class="gallery-placeholder-icon">${item.icon}</div>
        <div class="gallery-placeholder-label">${item.label}</div>
        <div class="gallery-placeholder-sub">${item.sub}</div>
      </div>
      <div class="gallery-overlay"><span class="gallery-overlay-text">${item.label}</span></div>
    </div>
  `).join('');
}

function filterGallery(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGallery(cat);
}

// -- Contact Form --
function submitForm() {
  const name  = document.getElementById('f-name')?.value.trim();
  const email = document.getElementById('f-email')?.value.trim();
  const msg   = document.getElementById('f-msg')?.value.trim();
  if (!name || !email || !msg) {
    showToast('Please fill in all required fields.');
    return;
  }
  document.getElementById('contact-form').style.display = 'none';
  document.getElementById('form-success').classList.add('show');
  showToast('Message sent! We will be in touch within 48 hours.');
}

// -- Toast --
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ============================================================
// -- PayFast Donation Form Logic --
// ============================================================

/**
 * prepareDonation()
 * Called via onsubmit on the donate form. Validates input, syncs
 * the hidden PayFast fields (amount, name_first, email_address),
 * and allows the native form POST to PayFast sandbox to proceed.
 *
 * Returns true  → form submits to PayFast
 * Returns false → submission is blocked (validation failed)
 */
function prepareDonation() {
  const nameInput   = document.getElementById('d-name');
  const emailInput  = document.getElementById('d-email');
  const customInput = document.getElementById('d-custom');
  const amountField = document.getElementById('pf-amount');

  // 1. Determine final amount: custom overrides radio selection
  let finalAmount;
  const customVal = parseFloat(customInput?.value);
  if (!isNaN(customVal) && customVal >= 10) {
    finalAmount = customVal.toFixed(2);
  } else {
    // Use the selected radio value
    const selected = document.querySelector('input[name="donate_amount"]:checked');
    finalAmount = selected ? parseFloat(selected.value).toFixed(2) : '250.00';
  }

  // 2. Validate minimum amount
  if (parseFloat(finalAmount) < 10) {
    showToast('Please enter a donation amount of at least R10.');
    return false;
  }

  // 3. Validate name and email
  const name = nameInput?.value.trim();
  const email = emailInput?.value.trim();
  if (!name) {
    showToast('Please enter your name.');
    nameInput?.focus();
    return false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.');
    emailInput?.focus();
    return false;
  }

  // 4. Sync hidden PayFast fields
  amountField.value = finalAmount;
  document.getElementById('pf-name-first').value = name;
  document.getElementById('pf-email-address').value = email;

  // 5. Show confirmation toast
  showToast(`Redirecting to PayFast — R${finalAmount} donation. Thank you!`);

  // Allow form to submit natively to PayFast
  return true;
}

/**
 * initDonationForm()
 * Sets up event listeners for the donation amount radio buttons
 * and custom input. Dynamically sets return/cancel/notify URLs
 * based on the current window origin.
 */
function initDonationForm() {
  const labels   = document.querySelectorAll('.donate-amount-label');
  const customIn = document.getElementById('d-custom');
  const amountHidden = document.getElementById('pf-amount');

  if (!labels.length) return; // Not on donate page yet

  // -- Set PayFast return URLs dynamically --
  // In development (Vite), this will be localhost:5173
  // In production, this will be your live domain
  const origin = window.location.origin;
  const returnUrl = document.getElementById('pf-return-url');
  const cancelUrl = document.getElementById('pf-cancel-url');
  const notifyUrl = document.getElementById('pf-notify-url');

  if (returnUrl) returnUrl.value = origin + '/success.html';
  if (cancelUrl) cancelUrl.value = origin + '/cancel.html';
  // ITN notify URL should point to your server (Express backend)
  // For local dev, PayFast can't reach localhost — use a tunnel or leave blank
  if (notifyUrl) notifyUrl.value = origin + '/api/payfast/notify';

  // -- Radio button selection handling --
  labels.forEach(label => {
    label.addEventListener('click', () => {
      // Clear custom input when a preset is selected
      if (customIn) customIn.value = '';

      // Update visual state
      labels.forEach(l => {
        l.classList.remove('active');
        l.style.borderColor = 'var(--silver-light)';
      });
      label.classList.add('active');
      label.style.borderColor = 'var(--magenta)';

      // Check the radio
      const radio = label.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      // Sync hidden amount field
      const val = label.getAttribute('data-amount');
      if (amountHidden && val) {
        amountHidden.value = parseFloat(val).toFixed(2);
      }
    });
  });

  // -- Custom amount input handling --
  if (customIn) {
    customIn.addEventListener('input', () => {
      const val = parseFloat(customIn.value);
      if (!isNaN(val) && val >= 10) {
        // Deselect all radio buttons visually
        labels.forEach(l => {
          l.classList.remove('active');
          l.style.borderColor = 'var(--silver-light)';
          const radio = l.querySelector('input[type="radio"]');
          if (radio) radio.checked = false;
        });
        // Sync hidden amount
        if (amountHidden) amountHidden.value = val.toFixed(2);
      }
    });
  }
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
  initDonationForm();
  initImpactStats();
});
