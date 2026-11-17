// Lists every question with the learner's answer, the correct answer and
// the explanation. Correctness comes from result.review (getResult()).
function Review({ data, review, onBack }) {
  const byId = Object.fromEntries(data.questions.map((q) => [q.id, q]))

  return (
    <section className="review">
      <h1>Your answers</h1>

      <ol className="review-list">
        {review.map((item, i) => {
          const q = byId[item.questionId]
          const passage = q.passageId ? data.passages[q.passageId] : null
          const yours = item.selectedIndex === null ? 'No answer' : q.options[item.selectedIndex]
          const confidence =
            item.confidence === 'sure' ? 'Sure' : item.confidence === 'guessing' ? 'Guessing' : '—'

          return (
            <li key={item.questionId} className={`card review-item ${item.isCorrect ? 'is-right' : 'is-wrong'}`}>
              <div className="review-head">
                <span className="review-num">Question {i + 1}</span>
                <span className={`review-mark ${item.isCorrect ? 'mark-right' : 'mark-wrong'}`}>
                  {item.isCorrect ? '✓ Correct' : '✗ Wrong'}
                </span>
              </div>
              {passage && <p className="review-passage">Text: {passage.title}</p>}
              <p className="review-question" lang="de">
                {q.question}
              </p>

              <dl className="review-answers">
                <dt>Your answer</dt>
                <dd lang="de">
                  {yours} <span className="review-confidence">({confidence})</span>
                </dd>
                {!item.isCorrect && (
                  <>
                    <dt>Correct answer</dt>
                    <dd lang="de">{q.options[q.correctIndex]}</dd>
                  </>
                )}
              </dl>

              <p className="review-explanation">{q.explanation}</p>
            </li>
          )
        })}
      </ol>

      <button className="btn btn-primary btn-block" onClick={onBack}>
        Back to results
      </button>
    </section>
  )
}

export default Review
