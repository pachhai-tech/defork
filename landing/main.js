(function(){
  const cfg = (window.__LANDING__ || {})
  const app = cfg.DAPP_URL || '../dapp/index.html'
  const docs = cfg.DOCS_URL || '../docs/index.html'
  for (const id of ['appLink','ctaApp']) {
    const a = document.getElementById(id); if (a) a.href = app
  }
  for (const id of ['docsLink','ctaDocs']) {
    const a = document.getElementById(id); if (a) a.href = docs
  }

  const form = document.getElementById('waitlist')
  const msg = document.getElementById('formMsg')
  const email = document.getElementById('email')
  if (!cfg.FORM_ENDPOINT) {
    form.style.display = 'none'
  } else {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      msg.textContent = 'Sending…'
      try {
        const res = await fetch(cfg.FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value, ts: Math.floor(Date.now()/1000) })
        })
        if (res.ok) { msg.textContent = 'Thanks! Check your inbox.'; email.value = '' }
        else { msg.textContent = 'Something went wrong.' }
      } catch {
        msg.textContent = 'Network error.'
      }
    })
  }
})()

  // Status ribbon: fetch latest GitHub release and extract CID from body
  (async function(){
    try {
      const owner = cfg.GITHUB_OWNER, repo = cfg.GITHUB_REPO
      if (!owner || !repo) return
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers: { 'Accept':'application/vnd.github+json' } })
      if (!res.ok) return
      const rel = await res.json()
      const tag = rel.tag_name || rel.name || ''
      const body = rel.body || ''
      let cid = ''
      const m = body.match(/CID:\s*([a-z0-9]+)\b/i)
      if (m) cid = m[1]
      const ribbon = document.getElementById('statusRibbon')
      if (!ribbon) return
      const parts = []
      if (tag) parts.push(`Latest: <strong>${tag}</strong>`)
      if (cid) parts.push(`<a href="https://ipfs.io/ipfs/${cid}/" target="_blank" rel="noreferrer">IPFS: ${cid.slice(0,6)}…</a>`)
      if (cfg.DAPP_URL) parts.push(`<a href="${cfg.DAPP_URL}" target="_blank" rel="noreferrer">Open dApp</a>`)
      ribbon.innerHTML = parts.join('<span class="sep">•</span>')
      if (parts.length) ribbon.classList.remove('hidden')
    } catch {}
  })()

  // Plausible (optional, cookie-free)
  (function(){
    const d = (window.__LANDING__||{}).PLAUSIBLE_DOMAIN
    const src = (window.__LANDING__||{}).PLAUSIBLE_SCRIPT || 'https://plausible.io/js/script.js'
    if (!d) return
    const s = document.createElement('script')
    s.setAttribute('defer','')
    s.setAttribute('data-domain', d)
    s.src = src
    document.head.appendChild(s)
  })()
