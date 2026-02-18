import React, { useEffect, useState } from 'react';

const Results = ({ currentTime, onRetry }) => {
    const [previousTime, setPreviousTime] = useState(null);
    const [percentageChange, setPercentageChange] = useState(0);

    useEffect(() => {
        const storedTime = localStorage.getItem('hept_trail_last_time');

        if (storedTime) {
            const prev = parseFloat(storedTime);
            setPreviousTime(prev);

            const change = ((currentTime - prev) / prev) * 100;
            setPercentageChange(change);
        }

        // Save current time for next attempt
        localStorage.setItem('hept_trail_last_time', currentTime.toString());
    }, [currentTime]);

    const formatTime = (ms) => (ms / 1000).toFixed(2) + 's';

    const isWorse = previousTime && percentageChange > 50;

    return (
        <div className="glass-panel result-card">
            <h2 className="title">Test Complete</h2>

            <div className="my-8">
                <div className="stat-label">Time Taken</div>
                <div className="stat-value text-blue-400">
                    {formatTime(currentTime)}
                </div>
            </div>

            {previousTime && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="stat-label text-xs">Previous Best</div>
                        <div className="text-xl font-bold mt-1 text-slate-300">
                            {formatTime(previousTime)}
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${isWorse ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <div className="stat-label text-xs">Change</div>
                        <div className={`text-xl font-bold mt-1 ${isWorse ? 'text-red-400' : 'text-emerald-400'}`}>
                            {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                        </div>
                    </div>
                </div>
            )}

            {isWorse && (
                <div className="warning-badge animate-pulse mb-6">
                    ⚠️ Warning: Time increased by &gt;50%. Use caution.
                </div>
            )}

            <button onClick={onRetry} className="btn-primary w-full mt-4">
                Try Again
            </button>
        </div>
    );
};

export default Results;
