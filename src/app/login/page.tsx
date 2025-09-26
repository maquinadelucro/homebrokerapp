import React from 'react';
import LoginForm from '@/components/login/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 via-transparent to-blue-600/5"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-transparent to-transparent"></div>
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}></div>
      
      {/* Floating Dots */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-500 rounded-full animate-pulse opacity-40"></div>
        <div className="absolute top-3/4 left-1/4 w-1 h-1 bg-blue-500 rounded-full animate-ping opacity-30"></div>
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute top-1/4 right-1/3 w-1 h-1 bg-green-400 rounded-full animate-ping opacity-25"></div>
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute top-1/3 left-3/4 w-1 h-1 bg-emerald-500 rounded-full animate-ping opacity-40"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <LoginForm />
      </div>
    </div>
  );
}