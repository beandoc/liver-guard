
import React, { useState, useEffect, useRef } from 'react';

const GameCanvas = ({ onComplete, totalPoints = 10 }) => {
  const [points, setPoints] = useState([]);
  const [nextPoint, setNextPoint] = useState(1);
  const [lines, setLines] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Generate random non-overlapping points
    const generatePoints = () => {
      const generated = [];
      const padding = 60; // Increased padding for better mobile safe area
      const minDistance = 70; // Slightly increased for tap targets

      let attempts = 0;
      // Use window size but default to something reasonable if not available (though it always is in browser)
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Simple improved distribution
      while (generated.length < totalPoints && attempts < 2000) {
        const x = Math.random() * (width - padding * 2) + padding;
        const y = Math.random() * (height - padding * 2) + padding;

        const isTooClose = generated.some(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });

        if (!isTooClose) {
          generated.push({ id: generated.length + 1, x, y });
        }
        attempts++;
      }
      return generated;
    };

    const newPoints = generatePoints();
    setPoints(newPoints);
    setStartTime(performance.now());
    setNextPoint(1);
    setLines([]);
  }, [totalPoints]); // Reset when totalPoints changes (mount)

  const handleInteraction = (point) => {
    if (point.id === nextPoint) {
      const now = performance.now();

      // If first point, effectively start timer (though we set it on mount, this resets it for precision)
      if (point.id === 1) {
        setStartTime(now);
      }

      // Add line from previous point if applicable
      if (point.id > 1) {
        const prev = points.find(p => p.id === point.id - 1);
        if (prev) {
          setLines(curr => [...curr, { x1: prev.x, y1: prev.y, x2: point.x, y2: point.y }]);
        }
      }

      setNextPoint(prev => prev + 1);

      // Check completion
      if (point.id === totalPoints) {
        const duration = now - startTime; // Use the initial startTime or the one reset at point 1
        // Wait a tiny bit for the visual feedback of the last point
        setTimeout(() => {
          onComplete(duration);
        }, 300);
      }
    }
  };

  return (
    <div className="canvas-container w-full h-full relative overflow-hidden bg-slate-950" ref={canvasRef}>
      {/* Target Progress Indicator */}
      <div className="absolute top-8 left-0 w-full text-center pointer-events-none z-0">
        <div className="text-[15rem] leading-none font-black text-white/[0.03] animate-pulse select-none">
          {nextPoint}
        </div>
      </div>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-indigo-500/30 backdrop-blur-md z-30 shadow-lg flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Target</span>
        <span className="text-xl font-black text-white">{nextPoint}</span>
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
            strokeWidth="4"
            strokeLinecap="round"
            className="animate-fadeIn"
            style={{ filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.5))' }}
          />
        ))}
      </svg>

      {points.map(point => (
        <div
          key={point.id}
          className={`point ${point.id < nextPoint ? 'completed' : ''} ${point.id === nextPoint ? 'active' : ''} z-20`}
          style={{
            left: point.x,
            top: point.y,
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onMouseDown={(e) => {
            if (point.id === nextPoint) createRipple(e);
            handleInteraction(point);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            if (point.id === nextPoint) createRipple(e.touches[0]);
            handleInteraction(point);
          }}
        >
          {point.id}
        </div>
      ))}
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
