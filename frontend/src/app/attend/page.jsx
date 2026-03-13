'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import QRAttendance from '@/components/QRScanner';

// Lazy-load FaceScanner (heavy — loads face-api.js models)
const FaceScanner = dynamic(() => import('@/components/FaceScanner'), {
  loading: () => (
    <div className="min-h-screen gradient-brand flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent
                        rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading Face Recognition...</p>
        <p className="text-xs text-gray-400 mt-1">Downloading ML models (~15 MB)</p>
      </div>
    </div>
  ),
  ssr: false,
});

function AttendPageContent() {
  const params = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'face' ? 'face' : 'qr');

  if (mode === 'face') {
    return (
      <div className="min-h-screen gradient-brand flex items-center justify-center p-4">
        <FaceScanner
          onSuccess={(data) => {
            setTimeout(() => setMode('qr'), 3000);
          }}
          onCancel={() => setMode('qr')}
        />
      </div>
    );
  }

  return <QRAttendance />;
}

export default function AttendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-brand flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/50 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <AttendPageContent />
    </Suspense>
  );
}
