import { useEffect, useRef, useState } from 'react'

const SKILL_LABELS = { vocabulary: 'Vocabulary', grammar: 'Grammar', reading: 'Reading' }

// Short pause after "I'm sure / I'm guessing" so the learner sees their tap
// registered before the next question appears.
const ADVANCE_DELAY_MS = 200

// The quiz screen: progress at the top, then the current question.
// The progress part stays on screen between questions, so screen readers
// announce "Question X of 15" each time it changes (aria-live).
function Quiz({ question, passage, index, total, savedAnswer, onAnswer, onBack }) {
  const progress = ((index + 1) / total) * 100

  return (
    <section className="quiz">
      <div className="quiz-top">
        <div className="quiz-meta">
          <span className="count" aria-live="polite">
            Question {index + 1} of {total}
          </span>
          <span className="skill-tag">{SKILL_LABELS[question.skill]}</span>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-label="Progress"
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* key = question id: a fresh Question (and fresh local state) for every question */}
      <Question
        key={question.id}
        question={question}
        passage={passage}
        savedAnswer={savedAnswer}
        onAnswer={onAnswer}
      />

      {index > 0 && (
        <button className="link-btn" onClick={onBack}>
          ← Back
        </button>
      )}
    </section>
  )
}

function Question({ question, passage, savedAnswer, onAnswer }) {
  // Start with the previous selection when the learner comes back to a question.
  const [selected, setSelected] = useState(savedAnswer?.selectedIndex ?? null)
  const [confidence, setConfidence] = useState(null)

  // Blocks a second tap while we move to the next question.
  const lockedRef = useRef(false)
  const timerRef = useRef(null)
  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Move keyboard / screen-reader focus to the new question's heading.
  // preventScroll: the page already scrolls to the top on each question.
  const headingRef = useRef(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  function selectOption(i) {
    if (lockedRef.current) return
    setSelected(i)
  }

  function chooseConfidence(value) {
    if (lockedRef.current || selected === null) return
    lockedRef.current = true
    setConfidence(value)
    timerRef.current = setTimeout(() => {
      onAnswer(question.id, { selectedIndex: selected, confidence: value })
    }, ADVANCE_DELAY_MS)
  }

  // Keyboard: 1–4 pick an option, S = sure, G = guessing.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      const n = Number(key)
      if (n >= 1 && n <= question.options.length) selectOption(n - 1)
      else if (key === 's') chooseConfidence('sure')
      else if (key === 'g') chooseConfidence('guessing')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <>
      {passage && (
        <div className="card passage" tabIndex={0} aria-label={`Text: ${passage.title}`}>
          <h2>{passage.title}</h2>
          <p lang="de">{passage.text}</p>
        </div>
      )}
      {passage && <p className="scroll-hint">Long text? Scroll inside the box to read it all.</p>}

      <h1 className="question-text" lang="de" tabIndex={-1} ref={headingRef}>
        {question.question}
      </h1>

      <div className="options" role="group" aria-label="Answer options">
        {question.options.map((option, i) => (
          <button
            key={i}
            className={`option ${selected === i ? 'selected' : ''}`}
            aria-pressed={selected === i}
            onClick={() => selectOption(i)}
            lang="de"
          >
            <span className="key" aria-hidden="true">
              {i + 1}
            </span>
            {option}
          </button>
        ))}
      </div>

      {selected !== null && (
        <div className="confidence" role="group" aria-labelledby="confidence-label">
          <p id="confidence-label">How sure are you?</p>
          <div className="confidence-buttons">
            <button
              className="btn btn-primary"
              onClick={() => chooseConfidence('sure')}
              disabled={confidence !== null && confidence !== 'sure'}
            >
              I'm sure
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => chooseConfidence('guessing')}
              disabled={confidence !== null && confidence !== 'guessing'}
            >
              I'm guessing
            </button>
          </div>
          <p className="keyboard-hint">
            Keyboard: 1–{question.options.length} to choose, S = sure, G = guessing
          </p>
        </div>
      )}
    </>
  )
}

export default Quiz
