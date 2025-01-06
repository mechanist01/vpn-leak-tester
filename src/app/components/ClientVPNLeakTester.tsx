// app/components/ClientVPNLeakTester.tsx
"use client"

import dynamic from 'next/dynamic'

const VPNLeakTester = dynamic(
  () => import('./VPNLeakTester'),
  { 
    ssr: false,
    loading: () => <div>Loading...</div>
  }
)

export default function ClientVPNLeakTester() {
  return <VPNLeakTester />
}