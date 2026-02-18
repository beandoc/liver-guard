
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
    <div className="canvas-container w-full h-full relative overflow-hidden bg-slate-900" ref={canvasRef}>
      <svg className="absolute inset-0 pointer-events-none w-full h-full">
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
          className={`point ${point.id < nextPoint ? 'completed' : ''} ${point.id === nextPoint ? 'active' : ''}`}
          style={{ left: point.x, top: point.y }}
          onMouseDown={() => handleInteraction(point)}
          onTouchStart={(e) => { e.preventDefault(); handleInteraction(point); }}
        >
          {point.id}
        </div>
      ))}
    </div>
  );
};

export default GameCanvas;
