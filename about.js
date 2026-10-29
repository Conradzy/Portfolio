const portrait = document.querySelector('.cz-about-portrait-button');
portrait?.addEventListener('click', () => {
  portrait.setAttribute('aria-pressed', String(portrait.getAttribute('aria-pressed') !== 'true'));
});
portrait?.addEventListener('pointerleave', () => portrait.setAttribute('aria-pressed', 'false'));
portrait?.addEventListener('blur', () => portrait.setAttribute('aria-pressed', 'false'));
