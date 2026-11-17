import { useEffect, useMemo, useState } from 'react'
import data from './data/questions.json'
import { getResult } from './lib/scoring.js'
import { loadState, saveState } from './lib/storage.js'
import Landing from './components/Landing.jsx'
import Quiz from './components/Quiz.jsx'
import Results from './components/Results.jsx'
import Review from './components/Review.jsx'

const { questions, passages } = data

// A fresh attempt. finishedAt is set when the last question is answered.
const EMPTY_STATE = {
  screen: 'landing', // "landing" | "quiz" | "results" | "review"
  currentIndex: 0,
  answers: {}, // { [questionId]: { selectedIndex, confidence } }
  startedAt: null,
  finishedAt: null,
}

// Restore saved progress. An unfinished attempt opens on the landing page,
// which then offers "Continue where you left off". Results and review
// screens are restored as they were.
function getInitialState() {
  const saved = loadState()
  if (!saved || !(saved.currentIndex >= 0 && saved.currentIndex < questions.length)) {
    return EMPTY_STATE
  }
  const state = { ...EMPTY_STATE, ...saved }
  if (state.screen === 'quiz') state.screen = 'landing'
  // Results need a finished attempt; otherwise start from the landing page.
  if (state.finishedAt === null && state.screen !== 'quiz') state.screen = 'landing'
  return state
}

function App() {
  const [state, setState] = useState(getInitialState)
  const { screen, currentIndex, answers, startedAt, finishedAt } = state

  // Save on every change so a refresh doesn't lose progress.
  useEffect(() => {
    saveState(state)
  }, [state])

  // Start each new screen or question at the top (matters on phones).
  // (Braces matter: an effect must not return a value, and newer browsers
  // return a Promise from scrollTo.)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen, currentIndex])

  const hasSavedAttempt = startedAt !== null && finishedAt === null

  function startOver() {
    setState({ ...EMPTY_STATE, screen: 'quiz', startedAt: Date.now() })
  }

  function continueAttempt() {
    setState((s) => ({ ...s, screen: 'quiz' }))
  }

  function handleAnswer(questionId, answer) {
    setState((s) => {
      const newAnswers = { ...s.answers, [questionId]: answer }
      const isLast = s.currentIndex === questions.length - 1
      if (isLast) {
        return { ...s, answers: newAnswers, screen: 'results', finishedAt: Date.now() }
      }
      return { ...s, answers: newAnswers, currentIndex: s.currentIndex + 1 }
    })
  }

  function showScreen(name) {
    setState((s) => ({ ...s, screen: name }))
  }

  function goBack() {
    setState((s) => ({ ...s, currentIndex: Math.max(0, s.currentIndex - 1) }))
  }

  // All scoring happens in src/lib/scoring.js; App only passes the data in.
  const result = useMemo(
    () => (finishedAt !== null ? getResult(data, answers, finishedAt - startedAt) : null),
    [answers, finishedAt, startedAt],
  )

  const question = questions[currentIndex]

  return (
    <div className="page">
      <header className="site-header">
        <span className="brand">Globio</span>
        <span className="divider">·</span>A1 Readiness Check
      </header>

      <main className="main">
        {screen === 'landing' && (
          <Landing
            hasSavedAttempt={hasSavedAttempt}
            onStart={startOver}
            onContinue={continueAttempt}
          />
        )}

        {screen === 'quiz' && (
          <Quiz
            question={question}
            passage={question.passageId ? passages[question.passageId] : null}
            index={currentIndex}
            total={questions.length}
            savedAnswer={answers[question.id]}
            onAnswer={handleAnswer}
            onBack={goBack}
          />
        )}

        {screen === 'results' && result && (
          <Results result={result} onReview={() => showScreen('review')} onRetake={startOver} />
        )}

        {screen === 'review' && result && (
          <Review data={data} review={result.review} onBack={() => showScreen('results')} />
        )}
      </main>

      <footer className="site-footer">Built as a Globio product assignment</footer>
    </div>
  )
}

export default App
