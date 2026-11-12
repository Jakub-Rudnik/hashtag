// Document page: info menu (top right), PDF export, copy link, local dates. The page works without JS.
const menu = document.querySelector('.doc-menu')

document.addEventListener('click', async (e) => {
  if (menu?.open && !menu.contains(e.target)) menu.open = false

  if (e.target.closest('[data-print]')) {
    menu.open = false
    window.print() // print styles in style.css turn the page into a clean A4 document
  }

  const copy = e.target.closest('[data-copy]')
  if (copy) {
    await navigator.clipboard.writeText(location.origin + location.pathname)
    copy.classList.add('copied')
    setTimeout(() => copy.classList.remove('copied'), 1500)
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu?.open) {
    menu.open = false
    menu.querySelector('summary').focus()
  }
})

// Server renders dates in UTC; show the reader's local date and time instead.
const fmt = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })
for (const t of document.querySelectorAll('time[datetime]')) t.textContent = fmt.format(new Date(t.dateTime))
