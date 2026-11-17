// Tests for scoring.js using Node's built-in test runner. Run: npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getResult, getSkillStatus, isBorderline } from './scoring.js'

const data = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url), 'utf8'))
const { questions } = data
const byId = Object.fromEntries(questions.map((q) => [q.id, q]))
const FIVE_MINUTES = 5 * 60 * 1000

// Helpers to build answers.
const right = (id, confidence = 'sure') => ({ selectedIndex: byId[id].correctIndex, confidence })
const wrong = (id, confidence = 'guessing') => ({
  selectedIndex: (byId[id].correctIndex + 1) % byId[id].options.length,
  confidence,
})
const allRight = (confidence = 'sure') =>
  Object.fromEntries(questions.map((q) => [q.id, right(q.id, confidence)]))

test('all correct + sure -> ready, 100%', () => {
  const r = getResult(data, allRight('sure'), FIVE_MINUTES)
  assert.equal(r.verdict.level, 'ready')
  assert.equal(r.verdict.overall, 100)
  for (const s of Object.values(r.skills)) assert.equal(s.percent, 100)
  assert.deepEqual(r.warnings, [])
})

test('all correct but all guessing -> 50%, notYet, mostlyGuessing warning', () => {
  const r = getResult(data, allRight('guessing'), FIVE_MINUTES)
  assert.equal(r.verdict.overall, 50)
  assert.equal(r.verdict.level, 'notYet')
  assert.ok(r.warnings.some((w) => w.code === 'mostlyGuessing'))
})

test('vocabulary 100%, reading 100%, grammar ~40% -> notYet (weakest-skill gate)', () => {
  const answers = allRight('sure')
  // Grammar: keep g2 (medium) + g3 (easy) right = 2.5 of 6 points ≈ 41.7%.
  for (const id of ['g1', 'g4', 'g5']) answers[id] = wrong(id)

  const r = getResult(data, answers, FIVE_MINUTES)
  assert.ok(Math.abs(r.skills.grammar.percent - 41.67) < 0.01)
  assert.ok(r.verdict.overall >= 75, 'average alone would look "ready"')
  assert.equal(r.verdict.level, 'notYet')
  assert.equal(r.verdict.weakestSkill, 'grammar')
})

test('a wrong+sure answer -> its topic ranks first in weak topics', () => {
  const answers = allRight('sure')
  answers.v4 = wrong('v4', 'sure') // daily_life: misconception, loses 1 of 3.5 (29%)
  answers.g2 = wrong('g2', 'guessing') // articles: loses 1.5 of 2.5 (60%), no misconception

  const r = getResult(data, answers, FIVE_MINUTES)
  assert.equal(r.weakTopics[0].topicId, 'daily_life')
  assert.equal(r.weakTopics[0].misconceptions, 1)
  assert.equal(r.weakTopics[1].topicId, 'articles')
  assert.ok(r.weakTopics.every((t) => t.type === 'practise'))
})

test('perfect score -> still returns 2 "polish" topics', () => {
  const r = getResult(data, allRight('sure'), FIVE_MINUTES)
  assert.equal(r.weakTopics.length, 2)
  assert.ok(r.weakTopics.every((t) => t.type === 'polish'))
  assert.ok(r.weakTopics.every((t) => t.tip.length > 0))
})

test('same answers twice -> identical weak topics (deterministic)', () => {
  const answers = allRight('guessing')
  answers.g5 = wrong('g5', 'sure')
  answers.r3 = wrong('r3')
  const first = getResult(data, answers, FIVE_MINUTES).weakTopics
  const second = getResult(data, structuredClone(answers), FIVE_MINUTES).weakTopics
  assert.deepEqual(first, second)
  assert.ok(first.length <= 3)
})

test('duration 60s -> rushed warning', () => {
  const r = getResult(data, allRight('sure'), 60 * 1000)
  assert.ok(r.warnings.some((w) => w.code === 'rushed'))
})

test('weak topics report wrong/guessed counts; skill status bands', () => {
  const answers = allRight('sure')
  answers.g1 = wrong('g1', 'sure')
  answers.g2 = wrong('g2')
  const articles = getResult(data, answers, FIVE_MINUTES).weakTopics.find((t) => t.topicId === 'articles')
  assert.equal(articles.wrong, 2)
  assert.equal(articles.total, 2)
  assert.equal(articles.misconceptions, 1)
  assert.equal(getSkillStatus(70), 'good')
  assert.equal(getSkillStatus(69.9), 'close')
  assert.equal(getSkillStatus(54.9), 'low')
})

test('borderline flag: within 5 points of a threshold', () => {
  // Grammar 66.7% is 3.3 points under the 70% ready line -> borderline.
  const almost = allRight('sure')
  almost.g1 = wrong('g1')
  almost.g3 = wrong('g3')
  assert.equal(getResult(data, almost, FIVE_MINUTES).borderline, true)

  // 100% everywhere is far from every line -> not borderline.
  assert.equal(getResult(data, allRight('sure'), FIVE_MINUTES).borderline, false)

  // Edges, with skills far from every line except where stated.
  const skills = (g, r, v) => ({ grammar: { percent: g }, reading: { percent: r }, vocabulary: { percent: v } })
  assert.equal(isBorderline(skills(90, 90, 90), 90), false)
  assert.equal(isBorderline(skills(90, 90, 65), 90), true) // skill 5 below 70
  assert.equal(isBorderline(skills(90, 90, 64.9), 90), false) // 5.1 below 70, 9.9 above 55
  assert.equal(isBorderline(skills(90, 90, 90), 79), true) // overall 4 above 75
  assert.equal(isBorderline(skills(40, 40, 40), 40), false)
})
