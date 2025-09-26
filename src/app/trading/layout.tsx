import React from 'react';
// Removendo a importação do DebugPanel

export default function TradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="trading-layout">
      {children}
      {/* DebugPanel removido daqui */}
    </div>
  );
}