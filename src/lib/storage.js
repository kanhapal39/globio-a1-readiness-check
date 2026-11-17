// Saves and restores the learner's progress in localStorage.
// Every call is wrapped in try/catch: in private mode, or when storage is
// blocked or full, the app must keep working (it just won't remember).

const STORAGE_KEY = 'globio-a1-readiness-v1'

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore: saving is a convenience, not a requirement.
  }
}
