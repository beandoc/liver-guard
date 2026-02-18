import { useState } from 'react'
import GameCanvas from './components/GameCanvas'
import Results from './components/Results'
import StroopTest from './components/StroopTest'
import { TRANSLATIONS } from './translations'
import './App.css'

function App() {
  const [view, setView] = useState('menu'); // 'menu', 'trails-intro', 'trails-game', 'trails-results', 'stroop'
  const [trailsTime, setTrailsTime] = useState(0);
  const [lang, setLang] = useState('en');

  const t = TRANSLATIONS[lang];

  const startTrails = () => setView('trails-game');

  const handleTrailsComplete = (time) => {
    setTrailsTime(time);
    setView('trails-results');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">

      {/* Main Menu */}
      {view === 'menu' && (
        <div className="glass-panel p-8 max-w-md w-full animate-fadeIn relative">
          <div className="absolute top-4 right-4 flex gap-2">
            {['en', 'hi', 'mr'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1 text-xs rounded border ${lang === l ? 'bg-blue-500 border-blue-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <h1 className="title mb-2 mt-4">{t.title}</h1>
          <p className="text-secondary mb-8">
            {t.subtitle}
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setView('trails-intro')}
              className="btn-primary w-full text-lg flex flex-col items-start px-6 py-3"
            >
              <div className="flex w-full justify-between items-center">
                <span>{t.trails_test}</span>
                <span className="text-sm opacity-70">➜</span>
              </div>
              <span className="text-xs text-blue-200 mt-1 opacity-80 font-normal">{t.detect_overt}</span>
            </button>

            <button
              onClick={() => setView('stroop')}
              className="btn-primary w-full text-lg flex flex-col items-start px-6 py-3"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <div className="flex w-full justify-between items-center">
                <span>{t.stroop_test}</span>
                <span className="text-sm opacity-70">➜</span>
              </div>
              <span className="text-xs text-emerald-100 mt-1 opacity-80 font-normal">{t.detect_minimal}</span>
            </button>
          </div>

          <div className="mt-8 text-xs text-secondary opacity-50">
            {t.clinical_note}
          </div>
        </div>
      )}

      {/* Trails Test Flow */}
      {view === 'trails-intro' && (
        <div className="glass-panel p-8 max-w-md w-full animate-fadeIn">
          <h2 className="title mb-2">{t.trails_intro}</h2>
          <p className="text-secondary mb-8">
            {t.trails_desc}
          </p>
          <button onClick={startTrails} className="btn-primary w-full">{t.trails_start}</button>
          <button onClick={() => setView('menu')} className="text-secondary text-sm mt-4 hover:text-white transition-colors">{t.back}</button>
        </div>
      )}

      {view === 'trails-game' && (
        <GameCanvas onComplete={handleTrailsComplete} totalPoints={10} lang={lang} />
      )}

      {view === 'trails-results' && (
        <Results currentTime={trailsTime} onRetry={() => setView('menu')} lang={lang} />
      )}

      {/* Stroop Test Flow */}
      {view === 'stroop' && (
        <div className="w-full h-full flex flex-col">
          <StroopTest
            onComplete={() => setView('menu')}
            onExit={() => setView('menu')}
            lang={lang}
          />
        </div>
      )}

    </div>
  )
}

export default App
