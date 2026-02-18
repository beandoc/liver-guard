import { useState } from 'react'
import GameCanvas from './components/GameCanvas'
import Results from './components/Results'
import StroopTest from './components/StroopTest'
import './App.css'

function App() {
  const [view, setView] = useState('menu'); // 'menu', 'trails-intro', 'trails-game', 'trails-results', 'stroop'
  const [trailsTime, setTrailsTime] = useState(0);

  const startTrails = () => setView('trails-game');

  const handleTrailsComplete = (time) => {
    setTrailsTime(time);
    setView('trails-results');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">

      {/* Main Menu */}
      {view === 'menu' && (
        <div className="glass-panel p-8 max-w-md w-full animate-fadeIn">
          <h1 className="title mb-2">HE Cognitive Suite</h1>
          <p className="text-secondary mb-8">
            Select a diagnostic test to begin.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setView('trails-intro')}
              className="btn-primary w-full text-lg flex items-center justify-between px-6"
            >
              <span>Number Connection (Trails)</span>
              <span className="text-sm opacity-70">➜</span>
            </button>

            <button
              onClick={() => setView('stroop')}
              className="btn-primary w-full text-lg flex items-center justify-between px-6"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <span>Stroop Color Test</span>
              <span className="text-sm opacity-70">➜</span>
            </button>
          </div>

          <div className="mt-8 text-xs text-secondary opacity-50">
            For Clinical Research Use Only
          </div>
        </div>
      )}

      {/* Trails Test Flow */}
      {view === 'trails-intro' && (
        <div className="glass-panel p-8 max-w-md w-full animate-fadeIn">
          <h2 className="title mb-2">Trails Test A</h2>
          <p className="text-secondary mb-8">
            Connect numbers 1 to 10 in order as fast as possible.
          </p>
          <button onClick={startTrails} className="btn-primary w-full">Start Test</button>
          <button onClick={() => setView('menu')} className="text-secondary text-sm mt-4 hover:text-white transition-colors">Back to Menu</button>
        </div>
      )}

      {view === 'trails-game' && (
        <GameCanvas onComplete={handleTrailsComplete} totalPoints={10} />
      )}

      {view === 'trails-results' && (
        <Results currentTime={trailsTime} onRetry={() => setView('menu')} />
      )}

      {/* Stroop Test Flow */}
      {view === 'stroop' && (
        <div className="w-full h-full flex flex-col">
          <StroopTest
            onComplete={() => setView('menu')}
            onExit={() => setView('menu')}
          />
        </div>
      )}

    </div>
  )
}

export default App
