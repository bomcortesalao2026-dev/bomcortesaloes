import React from 'react';

export const CyberBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ background: 'var(--nexus-bg-gradient)' }}>
      {/* Radial glow superior esquerdo */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '55%',
        height: '55%',
        background: 'radial-gradient(ellipse, rgba(200, 164, 93, 0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Radial glow inferior direito */}
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-5%',
        width: '50%',
        height: '55%',
        background: 'radial-gradient(ellipse, rgba(19, 52, 100, 0.45) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
};

