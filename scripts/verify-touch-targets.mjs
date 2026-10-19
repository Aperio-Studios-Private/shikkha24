#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseHTML } from 'linkedom'

const DIST_DIR = join(process.cwd(), 'frontend/dist')
const MINIMUM_PX = 48
const SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
].join(',')

function classPixels(className) {
  const spacing = className.match(/^(?:min-[hw]|[hw])-(\d+(?:\.\d+)?)$/)
  if (spacing) return Number(spacing[1]) * 4

  const arbitrary = className.match(/^(?:min-[hw]|[hw])-\[(\d+(?:\.\d+)?)px\]$/)
  return arbitrary ? Number(arbitrary[1]) : null
}

function smallestClass(classes, prefix) {
  const values = classes
    .filter((className) => className.startsWith(prefix))
    .map(classPixels)
    .filter((pixels) => pixels !== null)
  return values.length ? Math.min(...values) : Number.POSITIVE_INFINITY
}

function isExcluded(element) {
  const type = element.getAttribute('type')
  const classes = (element.closest('label')?.getAttribute('class') || '').split(/\s+/)

  return (
    type === 'hidden' ||
    element.getAttribute('aria-hidden') === 'true' ||
    element.getAttribute('tabindex') === '-1' ||
    element.hasAttribute('data-reaction-honeypot') ||
    classes.includes('min-h-12')
  )
}

function findViolations(document) {
  const violations = []

  for (const element of document.querySelectorAll(SELECTOR)) {
    if (isExcluded(element)) continue

    const classes = (element.getAttribute('class') || '').split(/\s+/).filter(Boolean)
    const height = Math.min(smallestClass(classes, 'h-'), smallestClass(classes, 'min-h-'))
    const width = Math.min(smallestClass(classes, 'w-'), smallestClass(classes, 'min-w-'))
    const iconOnly = element.textContent.trim().length === 0

    if (height < MINIMUM_PX || (iconOnly && width < MINIMUM_PX)) {
      violations.push({
        element,
        reason: height < MINIMUM_PX ? `height ${height}px` : `icon-only width ${width}px`,
      })
    }
  }

  return violations
}

async function listHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await listHtmlFiles(path)))
    else if (entry.name.endsWith('.html')) files.push(path)
  }

  return files
}

const files = await listHtmlFiles(DIST_DIR)
const failures = []

for (const file of files) {
  const { document } = parseHTML(await readFile(file, 'utf8'))

  for (const { element, reason } of findViolations(document)) {
    failures.push(`${file.replace(`${DIST_DIR}/`, '')}: ${element.tagName.toLowerCase()} ${reason}`)
  }
}

if (failures.length > 0) {
  console.error(`FAIL  ${failures.length} interactive target(s) below ${MINIMUM_PX}px`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(`PASS  no explicit sub-${MINIMUM_PX}px touch targets in ${files.length} built pages`)
