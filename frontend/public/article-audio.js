/**
 * Article audio reader — behaviour for `ArticleAudio.astro`.
 *
 * ## Why this is a classic external script, not a bundled module
 *
 * Astro bundles a bare `<script>` into a `type="module"` file, and modules are
 * **deferred** — they run after the document is parsed but around first paint.
 * The audio bar starts `hidden` (no reserved space) and is revealed by this
 * script, so a deferred reveal *moves everything below it* by the bar's height:
 * measured at 0.036 CLS on the article template, over the 0.02 budget and red in
 * CI (`lighthouserc.json`).
 *
 * A classic same-origin script blocks parsing where it sits, so the reveal
 * happens **before first paint** — the bar is simply part of the first layout,
 * and nothing shifts. `script-src 'self'` in the site CSP allows exactly this
 * (only inline scripts are blocked), which is why the text travels in a
 * `type="application/json"` tag instead of `define:vars`.
 */
;(() => {
  var wrap = document.getElementById('article-audio')
  var playBtn = document.getElementById('audio-play')
  var stopBtn = document.getElementById('audio-stop')
  var label = document.getElementById('audio-play-label')
  var data = document.querySelector('[data-audio-text]')
  if (!wrap || !playBtn || !stopBtn || !data) return

  // No synthesis support → stay hidden. A visible button that does nothing is
  // worse than no button, and a reserved-but-empty box is worse still.
  if (!('speechSynthesis' in window)) return

  var articleText = ''
  try {
    articleText = JSON.parse(data.textContent || '""')
  } catch (error) {
    return
  }
  if (!articleText) return

  wrap.classList.remove('hidden')
  wrap.classList.add('flex')

  var speaking = false

  function refresh() {
    speaking = window.speechSynthesis.speaking
    if (label) label.textContent = speaking ? 'বিরতি' : 'শুনুন'
  }

  playBtn.addEventListener('click', () => {
    if (window.speechSynthesis.speaking) {
      // speaking but paused → resume; speaking → pause.
      if (window.speechSynthesis.paused) window.speechSynthesis.resume()
      else window.speechSynthesis.pause()
      refresh()
      return
    }

    var utterance = new SpeechSynthesisUtterance(articleText)
    // bn-BD is essential: without it a device may use an English voice and read
    // Bengali as gibberish.
    utterance.lang = 'bn-BD'
    utterance.rate = 0.95
    utterance.onend = refresh
    utterance.onstart = refresh

    window.speechSynthesis.speak(utterance)
    refresh()
  })

  stopBtn.addEventListener('click', () => {
    window.speechSynthesis.cancel()
    refresh()
  })

  // Leaving the page must stop audio — a voice continuing after navigation is
  // genuinely alarming.
  window.addEventListener('beforeunload', () => {
    window.speechSynthesis.cancel()
  })
})()
