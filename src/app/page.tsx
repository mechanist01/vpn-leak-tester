'use client';

import VPNLeakTester from './components/VPNLeakTester';

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50 font-mono">
      <VPNLeakTester />
    </main>
  );
}