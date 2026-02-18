
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

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
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
        <div
          className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full blur-[80px] animate-pulse"
          style={{ animationDelay: '2s', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
        ></div>
      </div>

      {/* Main Menu */}
      {view === 'menu' && (
        <div className="glass-panel p-6 md:p-8 max-w-lg w-full animate-fadeIn relative z-10 shadow-2xl border border-white/5 overflow-hidden">
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

          <div className="mb-8 mt-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20">
              🧠
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-indigo-100 to-slate-400 bg-clip-text text-transparent mb-2">
              {t.title}
            </h1>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setView('trails-intro')}
              className="w-full text-lg flex flex-col items-start px-6 py-5 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-900/40 to-slate-900/40 hover:from-blue-900/60 hover:to-slate-800/60 hover:border-blue-400/40 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex w-full justify-between items-center mb-1 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold border border-blue-500/30">A</span>
                  <span className="font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors">{t.trails_test}</span>
                </div>
                <span className="text-sm text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">➜</span>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-blue-200 font-medium text-left pl-11 relative z-10 transition-colors">{t.detect_overt}</span>
            </button>

            <button
              onClick={() => setView('stroop')}
              className="w-full text-lg flex flex-col items-start px-6 py-5 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/40 to-slate-900/40 hover:from-emerald-900/60 hover:to-slate-800/60 hover:border-emerald-400/40 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex w-full justify-between items-center mb-1 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold border border-emerald-500/30">ii</span>
                  <span className="font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors">{t.stroop_test}</span>
                </div>
                <span className="text-sm text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all">➜</span>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-emerald-200 font-medium text-left pl-11 relative z-10 transition-colors">{t.detect_minimal}</span>
            </button>

            <button
              onClick={() => setView('ocular')}
              className="w-full text-lg flex flex-col items-start px-6 py-5 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/40 to-slate-900/40 hover:from-indigo-900/60 hover:to-slate-800/60 hover:border-indigo-400/40 transition-all group relative overflow-hidden shadow-[0_4px_20px_rgba(99,102,241,0.1)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.2)]"
            >
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex w-full justify-between items-center mb-1 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold border border-indigo-500/30">👁</span>
                  <span className="font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors">{t_ocular.ocular_tests_title}</span>
                </div>
                <span className="text-sm text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">➜</span>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-indigo-200 font-medium text-left pl-11 relative z-10 transition-colors">Digital Biomarker Analysis (Webcam)</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-[10px] uppercase tracking-widest text-slate-500 font-semibold opacity-60">
            {t.clinical_note}
          </div>
        </div>
      )}

      {/* Trails Test Flow */}
      {view === 'trails-intro' && (
        <div className="glass-panel p-8 max-w-md w-full animate-fadeIn z-10 relative">
          <button onClick={() => setView('menu')} className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10 group">
            <span className="group-hover:-translate-x-1 transition-transform block">←</span>
          </button>
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 text-xl font-bold border border-blue-500/30 mx-auto mb-4">A</div>
          <h2 className="title mb-4 text-2xl">{t.trails_intro}</h2>
          <p className="text-secondary mb-8 leading-relaxed text-sm bg-slate-800/50 p-4 rounded-xl border border-white/5">
            {t.trails_desc}
          </p>
          <button onClick={startTrails} className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-blue-900/20">{t.trails_start}</button>
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
        <div className="fixed inset-0 w-full h-full flex flex-col z-50 bg-slate-950 overflow-y-auto pt-8">
          <OcularMenu onExit={() => setView('menu')} lang={lang} />
        </div>
      )}

    </div>
  )
}

export default App
