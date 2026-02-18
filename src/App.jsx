
import { useState } from 'react'
import GameCanvas from './components/GameCanvas'
import Results from './components/Results'
import StroopTest from './components/StroopTest'
import OcularMenu from './components/OcularTests/OcularMenu'
import { TRANSLATIONS } from './translations'
import { OCULAR_TRANSLATIONS } from './components/OcularTests/constants'
import './App.css'

function App() {
  const [view, setView] = useState('menu'); // 'menu', 'trails-intro', 'trails-game', 'trails-results', 'stroop', 'ocular'
  const [trailsTime, setTrailsTime] = useState(0);
  const [lang, setLang] = useState('en');

  const t = TRANSLATIONS[lang];
  const t_ocular = OCULAR_TRANSLATIONS[lang] || OCULAR_TRANSLATIONS.en;

  const startTrails = () => setView('trails-game');

  const handleTrailsComplete = (time) => {
    setTrailsTime(time);
    setView('trails-results');
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-slate-950 text-slate-50 p-4 text-center overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-pulse"
          style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }}
        ></div>
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: '1s', backgroundColor: 'rgba(139, 92, 246, 0.15)' }}
        ></div>
      </div>

      {/* Main Menu */}
      {view === 'menu' && (
        <div className="glass-panel p-8 max-w-md w-full animate-fadeIn relative z-10">
          <div className="absolute top-4 right-4 flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-white/5">
            {['en', 'hi', 'mr'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs rounded-md transition-all font-medium ${lang === l
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <h1 className="title mb-2 mt-6">{t.title}</h1>
          <p className="text-secondary mb-8 text-sm">
            {t.subtitle}
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setView('trails-intro')}
              className="btn-primary w-full text-lg flex flex-col items-start px-6 py-4 group"
            >
              <div className="flex w-full justify-between items-center mb-1">
                <span className="font-bold tracking-tight">{t.trails_test}</span>
                <span className="text-sm opacity-70 group-hover:translate-x-1 transition-transform">➜</span>
              </div>
              <span className="text-xs text-blue-200 opacity-80 font-normal text-left">{t.detect_overt}</span>
            </button>

            <button
              onClick={() => setView('stroop')}
              className="btn-primary w-full text-lg flex flex-col items-start px-6 py-4 group relative overflow-hidden"
              style={{ padding: '1rem 1.5rem' }} // Ensure padding override if needed
            >
              {/* Specialized Emerald Gradient Background Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 z-[-1] transition-opacity group-hover:opacity-100"></div>

              <div className="flex w-full justify-between items-center mb-1 relative z-10">
                <span className="font-bold tracking-tight">{t.stroop_test}</span>
                <span className="text-sm opacity-70 group-hover:translate-x-1 transition-transform">➜</span>
              </div>
              <span className="text-xs text-emerald-100 opacity-90 font-normal text-left relative z-10">{t.detect_minimal}</span>
            </button>

            <button
              onClick={() => setView('ocular')}
              className="btn-primary w-full text-lg flex flex-col items-start px-6 py-4 group relative overflow-hidden"
              style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <div className="flex w-full justify-between items-center mb-1 relative z-10">
                <span className="font-bold tracking-tight">{t_ocular.ocular_tests_title}</span>
                <span className="text-sm opacity-70 group-hover:translate-x-1 transition-transform">➜</span>
              </div>
              <span className="text-xs text-indigo-100 opacity-90 font-normal text-left relative z-10">VGST, AST, MGST, SPT, Fixt</span>
            </button>
          </div>

          <div className="mt-8 text-[10px] uppercase tracking-widest text-slate-500 font-semibold opacity-60">
            {t.clinical_note}
          </div>
        </div>
      )}

      {/* Trails Test Flow */}
      {view === 'trails-intro' && (
        <div className="glass-panel p-8 max-w-md w-full animate-fadeIn z-10">
          <h2 className="title mb-2 text-2xl">{t.trails_intro}</h2>
          <p className="text-secondary mb-8 leading-relaxed">
            {t.trails_desc}
          </p>
          <button onClick={startTrails} className="btn-primary w-full">{t.trails_start}</button>
          <button onClick={() => setView('menu')} className="text-secondary text-sm mt-6 hover:text-white transition-colors flex items-center justify-center gap-2 w-full">
            <span>←</span> {t.back}
          </button>
        </div>
      )}

      {view === 'trails-game' && (
        <GameCanvas onComplete={handleTrailsComplete} totalPoints={10} lang={lang} />
      )}

      {view === 'trails-results' && (
        <div className="w-full max-w-md z-10">
          <Results currentTime={trailsTime} onRetry={() => setView('menu')} lang={lang} />
        </div>
      )}

      {/* Stroop Test Flow */}
      {view === 'stroop' && (
        <div className="w-full h-full flex flex-col z-10">
          <StroopTest
            onComplete={() => setView('menu')}
            onExit={() => setView('menu')}
            lang={lang}
          />
        </div>
      )}

      {/* Ocular Tests Flow */}
      {view === 'ocular' && (
        <div className="w-full h-full flex flex-col z-10 overflow-y-auto pt-8">
          <OcularMenu onExit={() => setView('menu')} lang={lang} />
        </div>
      )}

    </div>
  )
}

export default App
