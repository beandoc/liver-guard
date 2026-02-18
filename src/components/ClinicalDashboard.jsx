
import React from 'react';

const ClinicalDashboard = ({ results, onExit }) => {
    // results is an object like: { nctA: { time: 45 }, nctB: { time: 60 }, stroop: { diff: 3.2 }, ocular: { score: 75 } }

    const truncate = (val) => typeof val === 'number' ? val.toFixed(1) : val;

    const getStatus = (score, threshold = 70, invert = false) => {
        if (!score) return { text: 'PENDING', color: 'text-slate-500', bg: 'bg-slate-500/10' };
        const isGood = invert ? score < threshold : score > threshold;
        return isGood
            ? { text: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
            : { text: 'FOLLOW-UP', color: 'text-red-400', bg: 'bg-red-500/10' };
    };

    const nctAStatus = getStatus(results.nctA?.time, 50, true);
    const nctBStatus = getStatus(results.nctB?.time, 100, true);
    const stroopStatus = getStatus(results.stroop?.diff, 5, true);
    const ocularStatus = getStatus(results.ocular?.score, 70);

    const overallRisk = [nctAStatus, nctBStatus, stroopStatus, ocularStatus].filter(s => s.text === 'FOLLOW-UP').length;

    return (
        <div className="min-h-screen w-full bg-slate-950 p-4 md:p-8 flex flex-col items-center animate-fadeIn overflow-y-auto">
            <div className="max-w-4xl w-full space-y-8 pb-12">

                {/* Header */}
                <div className="flex justify-between items-end border-b border-white/5 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Clinical Decision Support</h1>
                        <p className="text-slate-500 text-sm font-mono uppercase tracking-widest mt-1">Session ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                    </div>
                    <button onClick={onExit} className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all text-sm font-bold">
                        Return to Menu
                    </button>
                </div>

                {/* Risk Summary */}
                <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl ${overallRisk > 1 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-60 mb-1">Clinician Summary</div>
                        <h2 className={`text-2xl font-bold ${overallRisk > 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {overallRisk > 1 ? 'MHE Risk Suspected' : 'No Significant Impairment'}
                        </h2>
                        <p className="text-slate-400 text-xs mt-2 max-w-md">
                            Based on {4 - [results.nctA, results.nctB, results.stroop, results.ocular].filter(r => !r).length} biomarkers collected.
                            Correlation with clinical history advised.
                        </p>
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                        <div className="text-4xl font-black text-white">{overallRisk}/4</div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Red Flags</div>
                    </div>
                </div>

                {/* Pillar Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* NCT-A */}
                    <div className="glass-panel p-6 border border-white/5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Pillar I</span>
                                <h3 className="text-lg font-bold text-white">NCT-A Performance</h3>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${nctAStatus.bg} ${nctAStatus.color}`}>{nctAStatus.text}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono font-black text-white">{results.nctA ? truncate(results.nctA.time) : '--'}</span>
                            <span className="text-slate-500 text-xs">seconds</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">Validates psychomotor speed and visual scanning. Target: &lt; 50s</p>
                    </div>

                    {/* NCT-B */}
                    <div className="glass-panel p-6 border border-white/5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">Pillar II</span>
                                <h3 className="text-lg font-bold text-white">NCT-B Analytics</h3>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${nctBStatus.bg} ${nctBStatus.color}`}>{nctBStatus.text}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono font-black text-white">{results.nctB ? truncate(results.nctB.time) : '--'}</span>
                            <span className="text-slate-500 text-xs">seconds</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">High-order executive control and mental flexibility marker. Target: &lt; 100s</p>
                    </div>

                    {/* Stroop */}
                    <div className="glass-panel p-6 border border-white/5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Pillar III</span>
                                <h3 className="text-lg font-bold text-white">Stroop Interference</h3>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${stroopStatus.bg} ${stroopStatus.color}`}>{stroopStatus.text}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono font-black text-white">{results.stroop ? truncate(results.stroop.diff) : '--'}</span>
                            <span className="text-slate-500 text-xs">Δ seconds</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">Measures inhibitory control and selective attention conflict. Target: Δ &lt; 5s</p>
                    </div>

                    {/* Ocular */}
                    <div className="glass-panel p-6 border border-white/5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Pillar IV</span>
                                <h3 className="text-lg font-bold text-white">Ocular-Motor Composite</h3>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${ocularStatus.bg} ${ocularStatus.color}`}>{ocularStatus.text}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono font-black text-white">{results.ocular ? truncate(results.ocular.score) : '--'}</span>
                            <span className="text-slate-500 text-xs">/ 100</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">Neural latency and fixation stability aggregate. Predictive of PHES score.</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button className="flex-1 py-4 bg-indigo-600 rounded-2xl font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all">
                        Export Comprehensive Report
                    </button>
                    <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-slate-300 hover:bg-white/10 active:scale-95 transition-all">
                        Archive Session
                    </button>
                </div>

                <div className="text-[10px] text-slate-600 text-center font-mono">
                    CONFIDENTIAL | DIGITAL BIOMARKER SUITE V2.5 | HIPAA COMPLIANT INTERFACE
                </div>
            </div>
        </div>
    );
};

export default ClinicalDashboard;
