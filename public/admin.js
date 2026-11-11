// Small progressive enhancements for the admin panel. Everything works without JS.
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]')
  if (!btn) return
  await navigator.clipboard.writeText(btn.dataset.copy)
  const label = btn.textContent
  btn.textContent = 'Skopiowano ✓'
  setTimeout(() => (btn.textContent = label), 1500)
})

document.addEventListener('submit', (e) => {
  const msg = e.target.dataset.confirm
  if (msg && !confirm(msg)) e.preventDefault()
})

// Show chosen file names and submit on drop.
const input = document.querySelector('.dropzone input')
if (input) {
  const zone = input.closest('.dropzone')
  const hint = zone.querySelector('span')
  input.addEventListener('change', () => {
    hint.textContent = [...input.files].map((f) => f.name).join(', ') || hint.textContent
  })
  for (const ev of ['dragenter', 'dragover']) zone.addEventListener(ev, () => zone.classList.add('over'))
  for (const ev of ['dragleave', 'drop']) zone.addEventListener(ev, () => zone.classList.remove('over'))
  zone.addEventListener('drop', () => setTimeout(() => input.form.requestSubmit(), 0))
}

// Ctrl+V anywhere on the panel (outside form fields) drops the text into the paste box.
const pasteBox = document.querySelector('.paste textarea')
if (pasteBox) {
  document.addEventListener('paste', (e) => {
    if (e.target.closest('input, textarea')) return
    const text = e.clipboardData.getData('text/plain')
    if (!text) return
    e.preventDefault()
    pasteBox.value = text
    pasteBox.focus()
    pasteBox.scrollIntoView({ block: 'center' })
  })
  // Ctrl/Cmd+Enter submits.
  pasteBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) pasteBox.form.requestSubmit()
  })
}
