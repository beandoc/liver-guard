
import React from 'react';
import { TRANSLATIONS } from '../translations';

const LandingPage = ({ onStart, lang, setLang }) => {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

    const features = [
        {
            id: 'nct',
            icon: (
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: "Psychomotor Speed",
            desc: "NCT-A & NCT-B protocols measure processing latency accurate to the millisecond."
        },
        {
            id: 'stroop',
            icon: (
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: "Cognitive Control",
            desc: "Stroop interference testing evaluates inhibitory control and selective attention."
        },
        {
            id: 'ocular',
            icon: (
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            ),
            title: "Ocular Biomarkers",
            desc: "AI-driven analysis of saccadic latency, fixation stability, and smooth pursuit gain."
        }
    ];

    return (
        <div className="min-h-screen w-full bg-[#030712] text-white relative overflow-hidden selection:bg-indigo-500/30">

            {/* --- Sophisticated Background --- */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[50%] bg-blue-900/10 rounded-full blur-[100px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-violet-900/10 rounded-full blur-[120px] mix-blend-screen" />
                {/* Grid Overlay for texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]"></div>
            </div>

            {/* --- Navbar --- */}
            <nav className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">Liver<span className="text-indigo-400">Guard</span></span>
                    <span className="hidden md:inline-block ml-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                        Clinical v2.5
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Language Pills */}
                    <div className="flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
                        {['en', 'hi', 'mr'].map((l) => (
                            <button
                                key={l}
                                onClick={() => setLang(l)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${lang === l
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* --- Main Content --- */}
            <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-12 md:pt-24 pb-20 flex flex-col items-center text-center">

                {/* Hero Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8 animate-fadeIn backdrop-blur-md hover:bg-indigo-500/20 transition-colors cursor-default">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    FDA Class II Candidate Algorithm
                </div>

                {/* Hero Headline */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-6 leading-[1.1] max-w-5xl mx-auto animate-slideUp">
                    Precision <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">Neuro-metrics</span> for<br className="hidden md:block" /> Clinical Assessment.
                </h1>

                {/* Hero Subhead */}
                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light animate-slideUp" style={{ animationDelay: '100ms' }}>
                    Quantify cognitive function with millisecond precision.
                    A unified platform for detecting Hepatic Encephalopathy through advanced ocular-motor tracking and psychometric benchmarks.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-4 animate-slideUp" style={{ animationDelay: '200ms' }}>
                    <button
                        onClick={onStart}
                        className="group relative px-8 py-4 bg-white text-indigo-950 rounded-full font-bold text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)] transition-all transform hover:-translate-y-1 overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Initialize Protocol
                            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>

                    <button className="px-8 py-4 rounded-full border border-white/10 text-slate-300 font-medium hover:bg-white/5 hover:text-white transition-all backdrop-blur-sm flex items-center gap-2 justify-center group">
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Physician Dashboard
                    </button>
                </div>

                {/* --- Bento Grid Features --- */}
                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-fadeIn" style={{ animationDelay: '400ms' }}>
                    {features.map((feature, i) => (
                        <div
                            key={feature.id}
                            className="group relative p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 text-left overflow-hidden backdrop-blur-sm"
                        >
                            <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all duration-500"></div>

                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                                    {feature.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- Footer Trust --- */}
                <div className="mt-24 pt-10 border-t border-white/5 w-full flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Fake Logos for "Premium" Feel */}
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 bg-slate-500 rounded-sm"></div>
                            <span className="font-serif italic text-white text-lg">HealthBridge</span>
                        </div>
                        <div className="h-4 w-px bg-white/20 hidden md:block"></div>
                        <div className="flex items-center gap-2">
                            <span className="font-sans font-black text-white text-lg tracking-tighter">NEURO<span className="font-light">LABS</span></span>
                        </div>
                    </div>

                    <div className="text-[10px] text-slate-600 font-mono text-center md:text-right">
                        <div>HIPAA COMPLIANT • ENCRYPTED SESSION • ISO 27001</div>
                        <div className="mt-1">© 2026 LIVERGUARD CLINICAL SYSTEMS. ALL RIGHTS RESERVED.</div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default LandingPage;
