// First screen: explains the check and starts (or resumes) an attempt.
function Landing({ hasSavedAttempt, onStart, onContinue }) {
  return (
    <section className="landing">
      <h1>Am I exam-ready?</h1>
      <p className="subtitle">
        A 10-minute check before you book your A1 German exam (Goethe / ÖSD).
      </p>

      <ul className="facts">
        <li>
          <span className="dot" aria-hidden="true" />
          15 questions
        </li>
        <li>
          <span className="dot" aria-hidden="true" />
          Vocabulary, grammar, reading
        </li>
        <li>
          <span className="dot" aria-hidden="true" />
          About 10 minutes, no sign-up
        </li>
      </ul>

      <p className="honesty-note">
        After each answer, tell us if you were sure. Honest answers give you a more accurate
        result.
      </p>

      <div className="actions">
        {hasSavedAttempt ? (
          <>
            <button className="btn btn-primary btn-block" onClick={onContinue}>
              Continue where you left off
            </button>
            <button className="btn btn-secondary btn-block" onClick={onStart}>
              Start over
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-block" onClick={onStart}>
            Start the check
          </button>
        )}
      </div>
    </section>
  )
}

export default Landing
