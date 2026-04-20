'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export interface PrelaunchRewardModalProps {
  xp: number;
  points: number;
  solves: number;
  onDismiss: () => void;
}

const COUNTER_DURATION = 1400;

function useCountUp(target: number) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / COUNTER_DURATION, 1);
      setDisplay(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return display;
}

export default function PrelaunchRewardModal({ xp, points, solves, onDismiss }: PrelaunchRewardModalProps) {
  const displayXp = useCountUp(xp);
  const displayPoints = useCountUp(points);

  useEffect(() => {
    const t = setTimeout(() => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#FFD700', '#FDE74C', '#7DF9AA', '#60CFFF', '#FF6B6B'] });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="prelaunch-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      >
        <motion.div
          key="prelaunch-card"
          initial={{ scale: 0.78, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.78, opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="relative w-full max-w-sm rounded-2xl overflow-hidden text-center"
          style={{
            background: 'linear-gradient(160deg, rgba(10,8,0,0.99) 0%, rgba(2,4,2,0.99) 100%)',
            border: '2px solid rgba(255,208,0,0.55)',
            boxShadow: '0 0 64px rgba(255,208,0,0.2), 0 24px 80px rgba(0,0,0,0.9)',
          }}
        >
          {/* Top shimmer */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #FFD700 40%, #FDE74C 60%, transparent)' }}
          />

          <div className="p-8">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase mb-5"
              style={{ background: 'rgba(125,249,170,0.12)', border: '1px solid rgba(125,249,170,0.35)', color: '#7DF9AA' }}
            >
              ✅ Pre-Launch Rewards Deposited
            </div>

            {/* Headline */}
            <h2 className="text-2xl font-extrabold text-white mb-2 leading-tight">
              Welcome to PuzzleWarz!
            </h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: '#9CA3AF' }}>
              Your {solves === 1 ? 'pre-launch solve has' : `${solves} pre-launch solves have`} been added
              to your new account.
            </p>

            {/* Reward counters */}
            <div
              className="flex items-center justify-center gap-6 mb-6 p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* XP */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold tabular-nums leading-none" style={{ color: '#FDE74C' }}>
                    +{displayXp}
                  </span>
                  <span className="text-base font-bold mb-1" style={{ color: '#FFB86B' }}>XP</span>
                </div>
                <span className="text-xs font-mono" style={{ color: '#6B7280' }}>Experience</span>
              </div>

              <div className="w-px h-12 self-center" style={{ background: 'rgba(255,255,255,0.1)' }} />

              {/* Points */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold tabular-nums leading-none" style={{ color: '#7DF9AA' }}>
                    +{displayPoints}
                  </span>
                </div>
                <span className="text-xs font-mono" style={{ color: '#6B7280' }}>Points</span>
              </div>
            </div>

            <button
              onClick={onDismiss}
              className="w-full py-3 rounded-xl font-extrabold text-sm tracking-wide transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(90deg, #FDE74C, #FFB86B)', color: '#020202' }}
            >
              Let&apos;s Go — Sign In →
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
