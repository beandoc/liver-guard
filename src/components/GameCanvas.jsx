import React, { useState, useEffect, useRef } from 'react';

const GameCanvas = ({ onComplete, totalPoints = 10 }) => {
  const [points, setPoints] = useState([]);
  const [nextPoint, setNextPoint] = useState(1);
  const [startTime, setStartTime] = useState(null);
  const [lines, setLines] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Generate random non-overlapping points
    const generatePoints = () => {
      const newPoints = [];
      const padding = 50; // Keep away from edges
      const minDistance = 60; // Minimum distance between points
      
      let attempts = 0;
      while (newPoints.length < totalPoints && attempts < 1000) {
        const x = Math.random() * (window.innerWidth - padding * 2) + padding;
        const y = Math.random() * (window.innerHeight - padding * 2) + padding;
        
        const isTooClose = newPoints.some(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });

        if (!isTooClose) {
          newPoints.push({ id: newPoints.length + 1, x, y });
        }
        attempts++;
      }
      return newPoints;
    };

    setPoints(generatePoints());
    setStartTime(performance.now());
  }, [totalPoints]);

  const handlePointClick = (point) => {
    if (point.id === nextPoint) {
      if (nextPoint === 1) {
        setStartTime(performance.now());
      }
      
      // Add line from previous point if > 1
      if (nextPoint > 1) {
        const prev = points.find(p => p.id === nextPoint - 1);
        setLines([...lines, { x1: prev.x, y1: prev.y, x2: point.x, y2: point.y }]);
      }

      setNextPoint(prev => prev + 1);

      if (point.id === totalPoints) {
        const endTime = performance.now();
        onComplete(endTime - startTime);
      }
    }
  };

  return (
    <div className="canvas-container" ref={canvasRef}>
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {lines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(59, 130, 246, 0.5)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ))}
      </svg>
      {points.map(point => (
        <div
          key={point.id}
          className={`point ${point.id < nextPoint ? 'completed' : ''} ${point.id === nextPoint ? 'active' : ''}`}
          style={{ left: point.x, top: point.y }}
          onClick={() => handlePointClick(point)}
          onTouchStart={(e) => { e.preventDefault(); handlePointClick(point); }}
        >
          {point.id}
        </div>
      ))}
    </div>
  );
};

export default GameCanvas;
