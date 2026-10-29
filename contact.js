function setupEmailCopy(buttonId, statusId, manualId) {
const copyButton = document.getElementById(buttonId);
const status = document.getElementById(statusId);
const manual = document.getElementById(manualId);
if (!copyButton || !status || !manual) return;
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
}

setupEmailCopy('cz-copy-email', 'cz-email-status', 'cz-email-manual');
setupEmailCopy('cz-about-copy-email', 'cz-about-email-status', 'cz-about-email-manual');
