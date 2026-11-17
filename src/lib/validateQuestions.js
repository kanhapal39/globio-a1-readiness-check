// Checks that the question bank (src/data/questions.json) is well-formed.
// Run with: npm run validate   (or: node src/lib/validateQuestions.js)

import { readFileSync } from 'node:fs'

const SKILLS = ['vocabulary', 'grammar', 'reading']
const QUESTIONS_PER_SKILL = 5
const TOTAL_QUESTIONS = SKILLS.length * QUESTIONS_PER_SKILL // 15

// Pure function: takes the parsed JSON and returns a list of error messages.
// An empty list means the data is valid.
export function validateQuestions(data) {
  const errors = []
  const { topics = {}, passages = {}, questions = [] } = data

  // 1. Exactly 15 questions.
  if (questions.length !== TOTAL_QUESTIONS) {
    errors.push(`Expected ${TOTAL_QUESTIONS} questions, found ${questions.length}.`)
  }

  // 2. Exactly 5 questions per skill.
  for (const skill of SKILLS) {
    const count = questions.filter((q) => q.skill === skill).length
    if (count !== QUESTIONS_PER_SKILL) {
      errors.push(`Expected ${QUESTIONS_PER_SKILL} "${skill}" questions, found ${count}.`)
    }
  }

  // 3. Per-question checks.
  for (const q of questions) {
    if (!SKILLS.includes(q.skill)) {
      errors.push(`${q.id}: unknown skill "${q.skill}".`)
    }
    if (!topics[q.topic]) {
      errors.push(`${q.id}: topic "${q.topic}" is not in "topics".`)
    }
    if (q.passageId !== undefined && !passages[q.passageId]) {
      errors.push(`${q.id}: passageId "${q.passageId}" is not in "passages".`)
    }
    if (q.skill === 'reading' && q.passageId === undefined) {
      errors.push(`${q.id}: reading question has no passageId.`)
    }
    const inRange =
      Number.isInteger(q.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex < q.options.length
    if (!inRange) {
      errors.push(`${q.id}: correctIndex ${q.correctIndex} is outside its ${q.options.length} options.`)
    }
  }

  return errors
}

// When run directly with node, load the JSON file and print a report.
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = new URL('../data/questions.json', import.meta.url)
  const data = JSON.parse(readFileSync(file, 'utf8'))
  const errors = validateQuestions(data)

  const counts = SKILLS.map((s) => `${s}: ${data.questions.filter((q) => q.skill === s).length}`)
  console.log(`Questions: ${data.questions.length} (${counts.join(', ')})`)
  console.log(`Topics: ${Object.keys(data.topics).length}, passages: ${Object.keys(data.passages).length}`)

  if (errors.length === 0) {
    console.log('✅ Question bank is valid.')
  } else {
    console.log(`❌ ${errors.length} problem(s):`)
    errors.forEach((e) => console.log(`  - ${e}`))
    process.exit(1)
  }
}
