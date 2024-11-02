import React from 'react';

const AnimatedBackground: React.FC = () => (
  <div className="fixed inset-0 w-full h-full overflow-hidden bg-gradient-to-b from-[#0f1729] via-[#1a2744] to-[#2c3a61]">
    {/* Moon */}
    <div className="absolute right-[10%] top-[20%] w-20 h-20 bg-[#b4b4b8] rounded-full shadow-[0_0_50px_#b4b4b8] animate-pulse" />
    
    {/* Stars container */}
    <div className="stars-container relative w-full h-full">
      {/* Generate multiple stars */}
      {[...Array(80)].map((_, i) => (
        <div
          key={`star-${i}`}
          className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}
      
      {/* Shooting stars */}
      {[...Array(6)].map((_, i) => ( 
        <div key={`shooting-star-${i}`} 
            className="absolute w-1 h-1 bg-white rounded-full before:content-[''] before:absolute before:w-32 before:h-[1px] before:bg-gradient-to-r before:from-[#ffffff80] before:to-transparent before:left-full before:top-1/2 before:transform before:-translate-y-1/2 animate-shooting-star" 
            style={{ 
                top: `${Math.random() * 50}%`, 
                left: '100%', 
                animationDelay: `${i * 4}s`, }} /> ))}
      </div>
  </div>
);

export default AnimatedBackground;