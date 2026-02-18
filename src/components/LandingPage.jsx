
import React from 'react';
import { TRANSLATIONS } from '../translations';

const LandingPage = ({ onStart, lang, setLang }) => {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden bg-slate-950">
            {/* Design Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] bg-indigo-500/10 animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[100px] bg-blue-600/10 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="max-w-5xl w-full flex flex-col items-center text-center space-y-12 animate-fadeIn">
                {/* Language Switcher */}
                <div className="absolute top-8 right-8 flex gap-2">
                    {['en', 'hi', 'mr'].map((l) => (
                        <button
                            key={l}
                            onClick={() => setLang(l)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${lang === l ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                        >
                            {l.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Hero Section */}
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest animate-bounce">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Clinical v2.5 Verified
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-tight">
                        HE Cognitive <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500">Biomarker Suite</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl leading-relaxed">
                        A state-of-the-art digital assessment platform for Hepatic Encephalopathy.
                        Detecting subtle cognitive changes through eye-tracking, executive function, and psychomotor speed.
                    </p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                    {[
                        { title: 'NCT-A', icon: 'Ⅰ', desc: 'Psychomotor Speed' },
                        { title: 'NCT-B', icon: 'Ⅱ', desc: 'Executive Function' },
                        { title: 'Stroop', icon: 'Ⅲ', desc: 'Cognitive Interference' },
                        { title: 'Ocular', icon: 'Ⅳ', desc: 'Neural Biomarkers' }
                    ].map((f, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left group hover:bg-indigo-500/5 hover:border-indigo-500/20 transition-all cursor-default">
                            <div className="text-2xl font-bold text-indigo-400 mb-2">{f.icon}</div>
                            <div className="text-white font-bold mb-1">{f.title}</div>
                            <div className="text-slate-500 text-xs">{f.desc}</div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <button
                        onClick={onStart}
                        className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-3"
                    >
                        Start Clinical Session
                        <span className="text-2xl">→</span>
                    </button>
                    <button className="px-8 py-5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-bold border border-white/10 transition-all">
                        Physician Dashboard
                    </button>
                </div>

                {/* Footer Branding */}
                <div className="pt-12 border-t border-white/5 w-full flex flex-col items-center gap-4">
                    <div className="text-[10px] uppercase tracking-[0.4em] text-slate-600 font-bold">Supported Institutional Protocol</div>
                    <div className="flex gap-8 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Placeholder for Medical Logos */}
                        <div className="font-serif text-xl text-white italic">HealthBridge Clinical</div>
                        <div className="font-sans text-xl text-white font-black tracking-tighter">LIVER<span>GUARD</span></div>
                        <div className="font-mono text-xl text-white">NeuroMetric Labs</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
