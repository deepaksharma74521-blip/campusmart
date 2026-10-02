const slides = [...document.querySelectorAll('.slide')];
const dots = document.getElementById('dots');
const currentNo = document.getElementById('currentNo');
const progress = document.getElementById('progressBar');
let index = 0;
let busy = false;

slides.forEach((_, i) => {
  const d = document.createElement('button');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  d.setAttribute('aria-label', `Go to slide ${i + 1}`);
  d.addEventListener('click', () => goTo(i));
  dots.appendChild(d);
});

function render(nextIndex, direction = 1) {
  if (busy || nextIndex === index || nextIndex < 0 || nextIndex >= slides.length) return;
  busy = true;
  const old = slides[index];
  const next = slides[nextIndex];

  // Scroll to top of the next slide on transition
  next.scrollTop = 0;

  old.classList.remove('active');
  if (direction < 0) old.classList.add('exit-left');
  next.classList.remove('exit-left');
  next.style.transform = direction > 0 ? 'translateX(45px) scale(.988)' : 'translateX(-45px) scale(.988)';
  
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      next.classList.add('active');
      next.style.transform = '';
    });
  });

  index = nextIndex;
  currentNo.textContent = String(index + 1).padStart(2, '0');
  progress.style.width = `${((index + 1) / slides.length) * 100}%`;
  [...dots.children].forEach((d, i) => d.classList.toggle('active', i === index));

  setTimeout(() => {
    old.classList.remove('exit-left');
    busy = false;
  }, 550);
}

function goTo(i) { render(i, i > index ? 1 : -1); }
function next() {
  if (index < slides.length - 1) render(index + 1, 1);
}
function prev() {
  if (index > 0) render(index - 1, -1);
}

document.getElementById('next').addEventListener('click', next);
document.getElementById('prev').addEventListener('click', prev);
document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', next));
document.querySelector('[data-restart]').addEventListener('click', () => goTo(0));

document.addEventListener('keydown', e => {
  if (['ArrowRight','PageDown',' '].includes(e.key)) { e.preventDefault(); next(); }
  if (['ArrowLeft','PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
  if (e.key === 'Home') goTo(0);
  if (e.key === 'End') goTo(slides.length - 1);
});

// Accurate mobile touch swipe detection without hijacking vertical scrolling
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = e.changedTouches[0].screenY - touchStartY;
  
  // Trigger slide change only on intentional horizontal swipe (>45px and 1.4x stronger than vertical scroll)
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    dx < 0 ? next() : prev();
  }
}, { passive: true });
