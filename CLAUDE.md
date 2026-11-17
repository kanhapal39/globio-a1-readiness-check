# Project: "Am I exam-ready?" – A1 German readiness check (Globio assignment)
Learners finishing A1 German take a 15-question check before booking the Goethe/ÖSD exam. The app tells them how ready they are per skill and the 2–3 topics to practise.

## Stack
- React + Vite, JavaScript only (no TypeScript).
- Plain CSS, no UI libraries.
- Folders: `src/components`, `src/data`, `src/lib`.

## Rules
- Mobile-first (works at 360px wide), simple English UI, German only in questions.
- No backend, no login. Questions live in src/data/questions.json.
- Scoring lives in src/lib/scoring.js as pure functions with comments.
- Keep code simple and readable; I must explain it in a video.

## Questions
15 multiple-choice: 5 vocabulary, 5 grammar, 5 reading. `src/data/questions.json` has three top-level keys:
- `topics`: map of topic id → `{ label, tip }`. The tip is shown on the results topic cards.
- `passages`: map of passage id → `{ title, text }`. Reading texts; `\n` marks line breaks.
- `questions`: array. Each has: id, skill (`vocabulary` | `grammar` | `reading`), topic (a key in `topics`), difficulty (1 easy, 2 medium), question, options, correctIndex, explanation. Reading questions also have `passageId` (a key in `passages`) instead of an inline passage.

Run `npm run validate` (src/lib/validateQuestions.js) after editing the question bank.

## Scoring
After each answer the learner picks "Sure" or "Guessing".
- Points: correct+sure 1.0, correct+guessing 0.5, wrong 0. Wrong+sure = flagged misconception.
- Medium questions weigh 1.5x easy.
- Skill % = weighted points / weighted max × 100. Overall = average of 3 skills.
- Verdict: Ready = every skill ≥70% AND overall ≥75%. Almost = every skill ≥55% AND overall ≥60%. Otherwise Not yet.

## Results page
Verdict banner + overall %, 3 skill bars with a 70% line, 2–3 topic cards (rank: most wrong+sure answers first, then biggest share of points lost, then skill order grammar > reading > vocabulary, then topic id; if fewer than 2 topics lost points, fill to 2 with "polish" topics), a note that listening/writing/speaking are not tested, buttons to review answers and retake.

## Guardrails
Never say "you will pass" — say "likely ready". Lean strict. Warn if finished in under 2 minutes or if most answers were marked "Guessing". Save progress in localStorage so a refresh doesn't lose it.
