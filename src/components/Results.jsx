import {
  getSkillStatus,
  READY_SKILL,
  READY_OVERALL,
  ALMOST_SKILL,
  ALMOST_OVERALL,
  GUESS_CREDIT,
  MEDIUM_WEIGHT,
  EXAM_PASS_MARK,
} from '../lib/scoring.js'

// Display text only. All numbers come from getResult() in src/lib/scoring.js.
const VERDICTS = {
  ready: {
    title: "You're likely ready to book",
    text: 'Your answers show a solid A1 base. Keep practising so you stay confident on exam day.',
  },
  almost: {
    title: 'Almost there — practise 1–2 weeks, then retake',
    text: "You're close. Focus on the topics below, then take the check again.",
  },
  notYet: {
    title: 'Not yet — build the basics first',
    text: "That's okay — everyone starts somewhere. Work through the topics below step by step.",
  },
}

const SKILLS = [
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'reading', label: 'Reading' },
]

// Text next to each bar, so the status never relies on colour alone.
const STATUS_TEXT = { good: 'Ready', close: 'Close', low: 'Needs work' }

// Plain-English summary of what went wrong in one topic.
function describeTopic(topic) {
  if (topic.type === 'polish') {
    return `All ${topic.total} correct and sure. A quick review keeps it fresh.`
  }
  const parts = []
  if (topic.wrong > 0) parts.push(`${topic.wrong} of ${topic.total} wrong`)
  if (topic.guessed > 0) {
    parts.push(`${topic.guessed} right but guessed`)
  }
  let text = parts.join(', ') + '.'
  if (topic.misconceptions > 0) {
    text += ' You were sure about a wrong answer, so this is worth fixing first.'
  }
  return text
}

function Results({ result, onReview, onRetake }) {
  const { verdict, skills, warnings, weakTopics, borderline } = result
  const v = VERDICTS[verdict.level]

  // Only call out a "weakest" skill when the skills actually differ.
  const percents = SKILLS.map((s) => skills[s.id].percent)
  const showWeakest = Math.min(...percents) !== Math.max(...percents)

  const practise = weakTopics.filter((t) => t.type === 'practise')
  const polish = weakTopics.filter((t) => t.type === 'polish')

  return (
    <section className="results">
      {/* 1. Verdict */}
      <div className={`verdict verdict-${verdict.level}`} role="status">
        <p className="verdict-score">
          <span className="verdict-percent">{Math.round(verdict.overall)}%</span> overall
        </p>
        <h1>{v.title}</h1>
        <p className="verdict-text">{v.text}</p>
      </div>

      {/* 2. Warnings */}
      {warnings.map((w) => (
        <div key={w.code} className="notice">
          <span className="notice-icon" aria-hidden="true">!</span>
          <p>{w.message}</p>
        </div>
      ))}
      {borderline && (
        <div className="notice">
          <span className="notice-icon" aria-hidden="true">~</span>
          <p>You're close to the line. Retake after a few days of practice to confirm.</p>
        </div>
      )}

      {/* 3. Skills */}
      <h2 className="section-title">Your skills</h2>
      <div className="card skills">
        <div className="bar-scale" aria-hidden="true">
          <span style={{ left: `${READY_SKILL}%` }}>ready line</span>
        </div>
        {SKILLS.map(({ id, label }) => {
          const percent = Math.round(skills[id].percent)
          const status = getSkillStatus(skills[id].percent)
          const isWeakest = showWeakest && verdict.weakestSkill === id
          return (
            <div key={id} className={`skill ${isWeakest ? 'skill-weakest' : ''}`}>
              <div className="skill-head">
                <span className="skill-name">
                  {label}
                  {isWeakest && <span className="weakest-tag">Weakest</span>}
                </span>
                <span className="skill-value">
                  {percent}% · {STATUS_TEXT[status]}
                </span>
              </div>
              <div
                className="bar"
                role="img"
                aria-label={`${label}: ${percent}%, ${STATUS_TEXT[status]}. Ready line is ${READY_SKILL}%.`}
              >
                <div className={`bar-fill bar-${status}`} style={{ width: `${percent}%` }} />
                <div className="bar-marker" style={{ left: `${READY_SKILL}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 4. Topics */}
      {practise.length > 0 && <h2 className="section-title">Practise before booking</h2>}
      {practise.map((t) => (
        <TopicCard key={t.topicId} topic={t} />
      ))}
      {polish.length > 0 && <h2 className="section-title">Polish these</h2>}
      {polish.map((t) => (
        <TopicCard key={t.topicId} topic={t} />
      ))}

      {/* 5. What this check doesn't cover */}
      <div className="card note">
        This check covers vocabulary, grammar and reading. The real exam also tests listening,
        writing and speaking — practise those too.
      </div>

      {/* 6. Actions */}
      <div className="actions">
        <button className="btn btn-primary btn-block" onClick={onReview}>
          Review my answers
        </button>
        <button className="btn btn-secondary btn-block" onClick={onRetake}>
          Retake the test
        </button>
      </div>

      {/* 7. How it works. All numbers come from the constants in scoring.js. */}
      <details className="card explainer">
        <summary>How is this calculated?</summary>
        <h3>Points per question</h3>
        <ul>
          <li>Correct and “I'm sure” = 1 point.</li>
          <li>Correct and “I'm guessing” = {GUESS_CREDIT} points. A lucky guess isn't the same as knowing it.</li>
          <li>Wrong = 0 points.</li>
          <li>Medium questions count {MEDIUM_WEIGHT}× as much as easy ones.</li>
        </ul>
        <p>Each skill's score is the points you earned out of the points possible. Your overall score is the average of the three skills.</p>

        <h3>When we say “ready”</h3>
        <p>
          “Likely ready” needs every skill at {READY_SKILL}% or more and an overall score of{' '}
          {READY_OVERALL}% or more. That's above the exam's pass mark of about {EXAM_PASS_MARK}% on
          purpose: a false “ready” costs you the exam fee, so we'd rather be strict.
        </p>
        <p>
          “Almost there” needs every skill at {ALMOST_SKILL}% or more and {ALMOST_OVERALL}% overall.
        </p>

        <h3>Why one weak skill blocks “ready”</h3>
        <p>
          The real exam gives you a score for every section, so a weak skill shows up on exam day
          even if your other skills are strong. That's why a high average alone isn't enough here.
        </p>
      </details>
    </section>
  )
}

function TopicCard({ topic }) {
  return (
    <div className={`card topic topic-${topic.type}`}>
      <h3>{topic.label}</h3>
      <p className="topic-what">{describeTopic(topic)}</p>
      <p className="topic-tip">
        <strong>Tip:</strong> {topic.tip}
      </p>
    </div>
  )
}

export default Results
