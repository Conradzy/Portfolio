const copyButton = document.getElementById('cz-copy-email');
const status = document.getElementById('cz-email-status');
const manual = document.getElementById('cz-email-manual');
const email = 'raymondnapinas12@gmail.com';
let copying = false, clearTimer = 0;

function legacyCopy() {
  const field = document.createElement('textarea');
  field.value = email;
  field.readOnly = true;
  field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.append(field);
  field.select(); field.setSelectionRange(0, email.length);
  try { return document.execCommand('copy'); }
  finally { field.remove(); copyButton.focus({ preventScroll:true }); }
}

copyButton.addEventListener('click', async () => {
  if (copying) return;
  copying = true;
  clearTimeout(clearTimer); status.textContent = ''; manual.hidden = true;
  let copied = false;
  try {
    await navigator.clipboard.writeText(email);
    copied = true;
  } catch {
    try { copied = legacyCopy(); } catch { copied = false; }
  }
  status.textContent = copied ? 'email address copied!' : 'Couldn’t copy automatically. You can copy the address below.';
  manual.hidden = copied;
  copying = false;
  if (copied) clearTimer = setTimeout(() => { status.textContent = ''; }, 4000);
});
