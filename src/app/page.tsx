'use client';

import { Header } from '@/components/Header/Header';
import { RightBar } from '@/components/RightBar/RightBar';
import { SpreadChart } from '@/components/Chart/SpreadChart';
import { useSubscription } from '@/hooks/useSubscription';
import { useUiStore } from '@/store/uiStore';

export default function Home() {
  // Owns the single WebSocket connection for the app.
  useSubscription();

  const layout = useUiStore((s) => s.layout);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header />
      <div
        className={`flex min-h-0 flex-1 gap-[10px] p-[10px] ${
          layout === 'left' ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <main className="flex min-w-0 flex-1 flex-col">
          <SpreadChart />
        </main>
        <RightBar />
      </div>
    </div>
  );
}
