// Scoring for the A1 readiness check.
// Everything here is a pure function: same input -> same output, no React,
// no localStorage, no clock. That makes the rules easy to test and explain.
//
// Answers format: { [questionId]: { selectedIndex, confidence: "sure" | "guessing" } }

// ---------------------------------------------------------------------------
// Thresholds. Kept in one place so the rules are visible and easy to tune.
// ---------------------------------------------------------------------------
export const READY_SKILL = 70 // every skill must reach this for "ready"
export const READY_OVERALL = 75 // ...and the overall average must reach this
export const ALMOST_SKILL = 55 // every skill must reach this for "almost"
export const ALMOST_OVERALL = 60 // ...and the overall average must reach this
export const GUESS_CREDIT = 0.5 // a correct guess earns half a point
export const MEDIUM_WEIGHT = 1.5 // medium questions count 1.5x an easy one
export const RUSHED_MS = 2 * 60 * 1000 // finishing faster than 2 minutes is suspicious
export const MOSTLY_GUESSING = 0.5 // warn when MORE than this share of answers are guesses
export const BORDERLINE_MARGIN = 5 // within this many points of a threshold = "close to the line"

// Not used for scoring, only for the explanation on the results page:
// the real A1 exams (Goethe / ÖSD) are passed with about 60%.
export const EXAM_PASS_MARK = 60

// Fixed skill order. Also used to break ties: grammar first, because grammar
// mistakes carry over into reading, writing and speaking.
export const SKILLS = ['grammar', 'reading', 'vocabulary']

// WHY: medium questions prove more, so they should move the score more.
function weightOf(question) {
  return question.difficulty === 2 ? MEDIUM_WEIGHT : 1
}

// WHY: a correct guess is luck as much as knowledge, so it only earns half
// credit. A wrong answer the learner was SURE about is worse than a wrong
// guess: it shows a misconception, which we flag so we can rank it first.
// An unanswered question counts as wrong, but not as a misconception.
export function scoreQuestion(question, answer) {
  const weight = weightOf(question)
  const isCorrect = answer?.selectedIndex === question.correctIndex
  const isSure = answer?.confidence === 'sure'

  let base = 0
  if (isCorrect) base = isSure ? 1 : GUESS_CREDIT

  return {
    isCorrect,
    points: base * weight,
    maxPoints: weight,
    misconception: !isCorrect && isSure,
  }
}

// WHY: the exam is passed skill by skill, so we score each skill separately
// instead of one total that could hide a weak area. Percent is kept raw
// (not rounded) so a 69.6% never sneaks past a 70% threshold; round only
// when showing it on screen.
export function scoreSkills(questions, answers) {
  const result = {}
  for (const skill of SKILLS) {
    result[skill] = { earned: 0, max: 0, percent: 0 }
  }

  for (const question of questions) {
    const { points, maxPoints } = scoreQuestion(question, answers[question.id])
    result[question.skill].earned += points
    result[question.skill].max += maxPoints
  }

  for (const skill of SKILLS) {
    const s = result[skill]
    s.percent = s.max > 0 ? (s.earned / s.max) * 100 : 0
  }
  return result
}

// WHY: a high average can hide one weak skill (e.g. 100/100/40 averages 80).
// So every skill must clear its own bar AND the average must clear a higher
// bar. We lean strict: "ready" means "likely ready", never "you will pass".
export function getVerdict(skillScores) {
  const percents = SKILLS.map((skill) => skillScores[skill].percent)
  const overall = percents.reduce((sum, p) => sum + p, 0) / SKILLS.length
  const lowest = Math.min(...percents)

  // First skill (in SKILLS order) with the lowest percent, so ties are stable.
  const weakestSkill = SKILLS[percents.indexOf(lowest)]

  let level = 'notYet'
  if (lowest >= READY_SKILL && overall >= READY_OVERALL) level = 'ready'
  else if (lowest >= ALMOST_SKILL && overall >= ALMOST_OVERALL) level = 'almost'

  return { level, overall, weakestSkill }
}

// WHY: the results page colours each skill bar by how close it is to the
// "ready" line. Uses the same thresholds as the verdict, on the raw percent,
// so a bar and the verdict can never disagree.
export function getSkillStatus(percent) {
  if (percent >= READY_SKILL) return 'good'
  if (percent >= ALMOST_SKILL) return 'close'
  return 'low'
}

// WHY: 15 questions is a small sample. One lucky or unlucky answer can move a
// skill by 10+ points, so a score just above or below a line is not a
// reliable verdict. We flag it and suggest a retake to confirm.
// Checks each skill against 70/55 and the overall score against 75/60.
export function isBorderline(skillScores, overall) {
  const near = (value, threshold) => Math.abs(value - threshold) <= BORDERLINE_MARGIN
  const skillNear = SKILLS.some((skill) => {
    const p = skillScores[skill].percent
    return near(p, READY_SKILL) || near(p, ALMOST_SKILL)
  })
  return skillNear || near(overall, READY_OVERALL) || near(overall, ALMOST_OVERALL)
}

// WHY: totals per topic are what the topic ranking is built on.
// Each topic belongs to one skill (taken from its questions).
function scoreTopics(questions, answers) {
  const byTopic = {}
  for (const question of questions) {
    const s = scoreQuestion(question, answers[question.id])
    const t = (byTopic[question.topic] ??= {
      topicId: question.topic,
      skill: question.skill,
      earned: 0,
      max: 0,
      misconceptions: 0,
      total: 0, // number of questions in this topic
      wrong: 0, // answered wrong (or not answered)
      guessed: 0, // answered right, but marked "Guessing"
    })
    t.earned += s.points
    t.max += s.maxPoints
    t.total += 1
    if (!s.isCorrect) t.wrong += 1
    if (s.isCorrect && answers[question.id]?.confidence === 'guessing') t.guessed += 1
    if (s.misconception) t.misconceptions += 1
  }

  return Object.values(byTopic).map((t) => ({
    ...t,
    lost: t.max - t.earned,
    shareLost: t.max > 0 ? (t.max - t.earned) / t.max : 0,
  }))
}

// WHY this order: confident mistakes (misconceptions) are the most urgent to
// fix, then the topics where the learner lost the biggest share of points.
// The last two tie-breakers (skill order, then topic id) make the ranking
// fully deterministic, so the same answers always give the same advice.
function compareTopics(a, b) {
  return (
    b.misconceptions - a.misconceptions ||
    b.shareLost - a.shareLost ||
    SKILLS.indexOf(a.skill) - SKILLS.indexOf(b.skill) ||
    a.topicId.localeCompare(b.topicId)
  )
}

// WHY: learners need 2–3 concrete things to practise, not a list of 15.
// Topics where points were lost become "practise" cards (max 3). If fewer
// than 2 topics lost points, we still show 2 cards by adding "polish" topics,
// so even a strong learner gets something useful to revise.
export function getWeakTopics(questions, answers, topics) {
  const ranked = scoreTopics(questions, answers).sort(compareTopics)

  const practise = ranked
    .filter((t) => t.lost > 0)
    .slice(0, 3)
    .map((t) => ({ ...t, type: 'practise' }))

  const polish = ranked
    .filter((t) => t.lost === 0)
    .slice(0, Math.max(0, 2 - practise.length))
    .map((t) => ({ ...t, type: 'polish' }))

  return [...practise, ...polish].map((t) => ({
    topicId: t.topicId,
    label: topics[t.topicId]?.label ?? t.topicId,
    tip: topics[t.topicId]?.tip ?? '',
    lost: t.lost,
    misconceptions: t.misconceptions,
    total: t.total,
    wrong: t.wrong,
    guessed: t.guessed,
    type: t.type,
  }))
}

// WHY: a score is only trustworthy if the learner took the check seriously.
// Rushing or guessing most answers makes the result unreliable, so we say so.
export function getWarnings(answers, durationMs) {
  const warnings = []
  const given = Object.values(answers)
  const guesses = given.filter((a) => a.confidence === 'guessing').length

  if (typeof durationMs === 'number' && durationMs < RUSHED_MS) {
    warnings.push({
      code: 'rushed',
      message:
        'You finished in under 2 minutes. If you rushed, this result may not show your real level. Try again slowly.',
    })
  }

  if (given.length > 0 && guesses / given.length > MOSTLY_GUESSING) {
    warnings.push({
      code: 'mostlyGuessing',
      message:
        `You marked ${guesses} of ${given.length} answers as guesses, so this result may be lower than your real level.`,
    })
  }

  return warnings
}

// WHY: the results page needs everything in one object, computed in one place.
// data = the parsed questions.json ({ topics, passages, questions }).
export function getResult(data, answers, durationMs) {
  const { questions, topics } = data
  const skills = scoreSkills(questions, answers)
  const verdict = getVerdict(skills)

  return {
    skills,
    verdict,
    borderline: isBorderline(skills, verdict.overall),
    weakTopics: getWeakTopics(questions, answers, topics),
    warnings: getWarnings(answers, durationMs),
    // Per-question details for the "review answers" screen.
    review: questions.map((question) => ({
      questionId: question.id,
      selectedIndex: answers[question.id]?.selectedIndex ?? null,
      confidence: answers[question.id]?.confidence ?? null,
      ...scoreQuestion(question, answers[question.id]),
    })),
  }
}
