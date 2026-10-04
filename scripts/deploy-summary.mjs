/**
 * Publishing a deploy summary where the reader will actually see it.
 *
 * ## Why this exists
 *
 * Both orchestrators built a markdown report — deleted paths, the extraction
 * mechanism, whether the site answered afterwards — and then handed it to
 * `console.log`. On a developer machine that is exactly right. In a GitHub Actions
 * run it is not: the markdown scrolled past in the step log, while the run
 * summary panel stayed empty. The information a reviewer wants is the plan and the
 * verdict, and those are precisely what the summary panel exists for.
 *
 * So the report goes to `$GITHUB_STEP_SUMMARY` when GitHub provides one, and to
 * stdout when it does not.
 *
 * ## ⚠️ Why it is not both
 *
 * Writing to the summary *and* logging would show every line twice on the run
 * page. The step log already carries the `Mode:`/`Files:`/`Target:` lines from
 * each script's own progress output; the summary is for the report, not for the
 * narration.
 */
import { appendFileSync } from 'node:fs'

/**
 * Emit a markdown report to the GitHub run summary, or to stdout locally.
 *
 * @param {string[]} lines Markdown lines. Joined with newlines.
 * @returns {void}
 */
export function summary(lines) {
  const text = lines.join('\n')
  const target = process.env.GITHUB_STEP_SUMMARY
  if (target) {
    appendFileSync(target, `${text}\n`)
    return
  }
  console.log(text)
}
