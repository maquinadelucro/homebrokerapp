import React from 'react';
import { useAuthStore } from '@/lib/auth';
import { User } from 'lucide-react';
import Image from 'next/image';

export default function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="bg-black border-b border-zinc-800 p-2 flex justify-between items-center">
      <div className="flex items-center">
        <Image
          src="/assets/sheikbot-logo.png"
          alt="SHEIKBOT"
          width={140}
          height={56}
          className="object-contain"
          style={{ height: "auto" }}
        />
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full bg-zinc-800">
          <User className="h-5 w-5 text-gray-300" />
        </button>
        
        {user && (
          <div className="bg-green-500 text-black font-bold py-2 px-4 rounded-md">
            Logado
          </div>
        )}
      </div>
    </header>
  );
}