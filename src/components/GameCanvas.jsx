
import React, { useState, useEffect, useRef } from 'react';

const NCT_B_LABELS = ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E', '6', 'F', '7', 'G', '8', 'H', '9', 'I', '10', 'J', '11', 'K', '12', 'L', '13'];

const GameCanvas = ({ onComplete, onExit, testType = 'A', totalPoints = 25 }) => {
  const [points, setPoints] = useState([]);
  const [nextIndex, setNextIndex] = useState(0);
  const [lines, setLines] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [errorFlash, setErrorFlash] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const canvasRef = useRef(null);

  // Viewport Warning
  const isSmallViewport = window.innerWidth < 360;

  useEffect(() => {
    const generatePoints = () => {
      const generated = [];
      const isMobile = window.innerWidth < 640;
      const padding = isMobile ? 30 : 60; // Tighter padding for mobile
      // Dynamic minimum distance to prevent overcrowding on small screens
      const minDistance = isMobile ? 42 : Math.max(50, window.innerWidth / 12);

      let attempts = 0;
      const width = window.innerWidth;
      const height = window.innerHeight;

      const numPoints = testType === 'B' ? 25 : totalPoints;

      while (generated.length < numPoints && attempts < 5000) {
        const x = Math.random() * (width - padding * 2) + padding;
        const y = Math.random() * (height - padding * 2) + padding;

        const isTooClose = generated.some(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });

        if (!isTooClose) {
          const label = testType === 'B' ? NCT_B_LABELS[generated.length] : (generated.length + 1).toString();
          generated.push({ index: generated.length, label, x, y });
        }
        attempts++;
      }
      return generated;
    };

    const newPoints = generatePoints();
    setPoints(newPoints);
    setStartTime(performance.now());
    setNextIndex(0);
    setLines([]);
    setElapsed(0);
  }, [testType, totalPoints]);

  // Live Timer Logic (D8)
  useEffect(() => {
    let interval;
    if (startTime && nextIndex < points.length && nextIndex > 0) {
      interval = setInterval(() => {
        setElapsed((performance.now() - startTime) / 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [startTime, nextIndex, points.length]);

  const handleInteraction = (point) => {
    if (point.index === nextIndex) {
      const now = performance.now();

      if (point.index === 0) {
        setStartTime(now);
      }

      if (point.index > 0) {
        const prev = points.find(p => p.index === point.index - 1);
        if (prev) {
          setLines(curr => [...curr, { x1: prev.x, y1: prev.y, x2: point.x, y2: point.y }]);
        }
      }

      setNextIndex(prev => prev + 1);

      if (point.index === points.length - 1) {
        const duration = now - (startTime || now);
        setTimeout(() => {
          onComplete(duration);
        }, 300);
      }
    } else if (point.index > nextIndex) {
      // Wrong point clicked - visual feedback
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 200);
    }
  };

  const getTargetLabel = () => {
    if (nextIndex < points.length) {
      return points[nextIndex].label;
    }
    return '';
  };

  return (
    <div
      className={`canvas-container w-full h-full relative overflow-hidden transition-colors duration-200 ${errorFlash ? 'bg-red-950/20' : 'bg-slate-950'}`}
      ref={canvasRef}
      role="main"
      aria-label={`${testType === 'A' ? 'NCT-A' : 'NCT-B'} Trail Making Test`}
    >
      {/* Viewport Warning (D7) */}
      {isSmallViewport && (
        <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-amber-500 mb-4 text-4xl">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Screen Too Small</h2>
          <p className="text-slate-400 text-sm">NCT protocol requires a larger screen area for clinical validity. Please use a device with at least 360px width.</p>
        </div>
      )}

      {/* Exit Button (D6) */}
      <div className="absolute top-6 left-6 z-50">
        {!exitConfirm ? (
          <button
            onClick={() => setExitConfirm(true)}
            className="w-10 h-10 rounded-full bg-slate-800/80 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors backdrop-blur-md"
            aria-label="Exit Test"
          >
            ✕
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/30 p-1 pl-4 rounded-full backdrop-blur-md animate-scaleIn">
            <span className="text-xs font-bold text-red-200">Abort?</span>
            <button onClick={onExit} className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">Yes</button>
            <button onClick={() => setExitConfirm(false)} className="px-3 py-1 rounded-full text-xs font-bold text-slate-300">No</button>
          </div>
        )}
      </div>

      {/* Target Progress Indicator */}
      <div className="absolute top-1/2 left-0 w-full text-center pointer-events-none -translate-y-1/2 z-0">
        <div className="text-[20rem] leading-none font-black text-white/[0.02] select-none uppercase">
          {getTargetLabel()}
        </div>
      </div>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-slate-800/80 border border-indigo-500/30 backdrop-blur-md z-30 shadow-xl flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Target</span>
          <span className="text-2xl font-black text-white">{getTargetLabel()}</span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Progress</span>
          <span className="text-sm font-mono text-slate-300">{nextIndex}/{points.length}</span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Time</span>
          <span className="text-sm font-mono text-emerald-400">{elapsed.toFixed(1)}s</span>
        </div>
      </div>

      <svg className="absolute inset-0 pointer-events-none w-full h-full z-10">
        {lines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-fadeIn"
            style={{ filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.5))' }}
          />
        ))}
      </svg>

      {points.map(point => (
        <div
          key={point.index}
          className={`trail-node ${point.index < nextIndex ? 'completed' : ''} ${point.index === nextIndex ? 'active' : ''} z-20`}
          style={{
            left: point.x,
            top: point.y,
          }}
          onMouseDown={(e) => {
            if (point.index === nextIndex) createRipple(e);
            handleInteraction(point);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            if (point.index === nextIndex) createRipple(e.touches[0]);
            handleInteraction(point);
          }}
        >
          {point.label}
        </div>
      ))}

      <style>{`
        .trail-node {
            position: absolute;
            width: 44px;
            height: 44px;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: rgba(15, 23, 42, 0.8);
            border: 2px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            user-select: none;
            backdrop-filter: blur(4px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .trail-node.active {
            border-color: #6366f1;
            color: white;
            background: #6366f1;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
            scale: 1.1;
            z-index: 30;
        }
        .trail-node.completed {
            background: rgba(16, 185, 129, 0.2);
            border-color: rgba(16, 185, 129, 0.4);
            color: rgba(16, 185, 129, 0.8);
            scale: 0.9;
        }
        .tap-ripple {
            position: absolute;
            background: rgba(99, 102, 241, 0.4);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple-animation 0.4s ease-out;
            pointer-events: none;
            z-index: 40;
        }
        @keyframes ripple-animation {
            to { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );

  function createRipple(e) {
    if (!canvasRef.current) return;
    const ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ripple.style.left = `${x - 25}px`;
    ripple.style.top = `${y - 25}px`;
    ripple.style.width = '50px';
    ripple.style.height = '50px';

    canvasRef.current.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  }
};

export default GameCanvas;
