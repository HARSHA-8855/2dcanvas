import { useState, useEffect } from 'react';

export function CanvasRulers({ containerRef, coords }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [containerRef]);

  const { width, height } = dimensions;

  const topTicks = [];
  for (let x = 0; x <= width; x += 20) {
    const isMajor = x % 100 === 0;
    topTicks.push(
      <g key={`top-${x}`}>
        <line
          x1={x}
          y1={isMajor ? 6 : 14}
          x2={x}
          y2={20}
          stroke={isMajor ? '#CBD5E1' : '#E2E8F0'}
          strokeWidth="1"
        />
        {isMajor && (
          <text
            x={x + 3}
            y={11}
            fontSize="8"
            fill="#94A3B8"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="500"
          >
            {x}
          </text>
        )}
      </g>
    );
  }

  const leftTicks = [];
  for (let y = 0; y <= height; y += 20) {
    const isMajor = y % 100 === 0;
    leftTicks.push(
      <g key={`left-${y}`}>
        <line
          x1={isMajor ? 6 : 14}
          y1={y}
          x2={20}
          y2={y}
          stroke={isMajor ? '#CBD5E1' : '#E2E8F0'}
          strokeWidth="1"
        />
        {isMajor && (
          <text
            x={2}
            y={y + 10}
            fontSize="8"
            fill="#94A3B8"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="500"
          >
            {y}
          </text>
        )}
      </g>
    );
  }

  return (
    <>
      <div className="ruler-corner" title="Canvas origin (0,0)">
        px
      </div>

      <div className="ruler-top">
        <svg width={width} height={20}>
          {topTicks}
          {coords && coords.x >= 0 && coords.x <= width && (
            <line
              x1={coords.x}
              y1={0}
              x2={coords.x}
              y2={20}
              stroke="#4F46E5"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>

      <div className="ruler-left">
        <svg width={20} height={height}>
          {leftTicks}
          {coords && coords.y >= 0 && coords.y <= height && (
            <line
              x1={0}
              y1={coords.y}
              x2={20}
              y2={coords.y}
              stroke="#4F46E5"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>
    </>
  );
}
