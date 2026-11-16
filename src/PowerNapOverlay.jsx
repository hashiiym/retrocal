import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from './utils/audio';

// ─── Web Audio API: synthesize a loud looping alarm beep ─────────────────────
function createAlarmEngine() {
  let audioCtx = null;
  let intervalId = null;

  function getCtx() {
    if (!audioCtx || audioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function beep() {
    try {
      const ctx = getCtx();
      // Double-pulse pattern: two 880Hz square-wave bursts
      const pulses = [0, 0.18];
      pulses.forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
        gain.gain.setValueAtTime(0.6, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.16);
      });
    } catch {
      // audio context unavailable
    }
  }

  return {
    start() {
      beep(); // immediate first beep
      intervalId = setInterval(beep, 700);
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PowerNapOverlay({ isOpen, onClose }) {
  const [napMinutes, setNapMinutes] = useState(10);
  const [timeLeft, setTimeLeft] = useState(10 * 60); // seconds
  const [isActive, setIsActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const intervalRef = useRef(null);
  const flashRef = useRef(null);
  const alarmRef = useRef(null);

  // Lazily initialise alarm engine (client-side only)
  function getAlarm() {
    if (!alarmRef.current) alarmRef.current = createAlarmEngine();
    return alarmRef.current;
  }

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(flashRef.current);
      getAlarm().stop();
    };
  }, []);

  // ── Reset state when overlay is closed ───────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      handleStop();
    }
  }, [isOpen]);

  // ── Countdown tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          triggerAlarm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isActive]);

  // ── Flash effect while ringing ────────────────────────────────────────────
  useEffect(() => {
    if (!isRinging) {
      clearInterval(flashRef.current);
      setFlashOn(false);
      return;
    }
    flashRef.current = setInterval(() => setFlashOn((f) => !f), 300);
    return () => clearInterval(flashRef.current);
  }, [isRinging]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleStart() {
    sound.playClick();
    const secs = Math.max(1, Math.min(180, napMinutes)) * 60;
    setTimeLeft(secs);
    setIsActive(true);
    setIsRinging(false);
  }

  function handleCancel() {
    sound.playClick();
    setIsActive(false);
    setIsRinging(false);
    clearInterval(intervalRef.current);
    getAlarm().stop();
    setTimeLeft(napMinutes * 60);
  }

  function handleStop() {
    setIsActive(false);
    setIsRinging(false);
    clearInterval(intervalRef.current);
    clearInterval(flashRef.current);
    getAlarm().stop();
    setTimeLeft(napMinutes * 60);
  }

  function handleDismiss() {
    sound.playClick();
    handleStop();
  }

  function triggerAlarm() {
    setIsActive(false);
    setIsRinging(true);
    getAlarm().start();
  }

  function handleNapMinutesChange(e) {
    const val = Math.max(1, Math.min(180, Number(e.target.value) || 1));
    setNapMinutes(val);
    setTimeLeft(val * 60);
  }

  if (!isOpen) return null;

  // ── Ringing State ─────────────────────────────────────────────────────────
  if (isRinging) {
    return (
      <div
        className={`fixed inset-0 z-[70] flex flex-col items-center justify-center font-mono select-none transition-none ${
          flashOn ? 'bg-white text-black' : 'bg-black text-white'
        }`}
      >
        <div className={`border-4 p-10 text-center shadow-[8px_8px_0px] transition-none ${
          flashOn ? 'border-black shadow-black' : 'border-white shadow-white'
        }`}>
          <div className="font-pixel text-3xl sm:text-4xl tracking-widest mb-2 uppercase">
            ⚠ WAKE UP ⚠
          </div>
          <div className="font-mono text-7xl sm:text-9xl font-bold tracking-widest mb-6">
            00:00
          </div>
          <div className="text-lg font-mono mb-8 tracking-wider uppercase">
            NAP COMPLETE — ALARM ACTIVE
          </div>
          <button
            onClick={handleDismiss}
            className={`px-8 py-4 border-4 font-pixel text-xl tracking-widest uppercase cursor-pointer transition-none ${
              flashOn
                ? 'border-black bg-black text-white hover:bg-white hover:text-black'
                : 'border-white bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            [ WAKE UP / STOP ALARM ]
          </button>
        </div>
      </div>
    );
  }

  // ── Active Countdown State ────────────────────────────────────────────────
  if (isActive) {
    const pct = timeLeft / (napMinutes * 60);
    return (
      <div className="fixed inset-0 z-[70] bg-black text-white flex flex-col items-center justify-center font-mono select-none">
        {/* Close / cancel via X in corner */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-6 text-white font-pixel text-sm border border-white px-2 py-0.5 hover:bg-white hover:text-black cursor-pointer"
          title="Cancel nap"
        >
          ✕ CLOSE
        </button>

        <div className="border-2 border-white p-10 text-center shadow-[6px_6px_0px_rgba(255,255,255,0.3)] max-w-lg w-full mx-4">
          <div className="font-pixel text-xs tracking-widest uppercase text-neutral-400 mb-4">
            ■ POWER NAP ACTIVE ■
          </div>

          {/* Giant countdown */}
          <div className="font-mono text-8xl sm:text-[9rem] font-bold tracking-widest leading-none mb-2">
            {formatTime(timeLeft)}
          </div>

          {/* Progress bar */}
          <div className="w-full border border-neutral-600 h-2 mt-6 mb-8">
            <div
              className="h-full bg-white transition-all duration-1000"
              style={{ width: `${pct * 100}%` }}
            />
          </div>

          <div className="text-xs font-mono text-neutral-500 mb-6 tracking-wider">
            NAP SET FOR {napMinutes} MIN — ALARM WILL SOUND AT 00:00
          </div>

          <button
            onClick={handleCancel}
            className="px-6 py-2 border-2 border-white bg-black text-white font-pixel text-sm tracking-widest uppercase hover:bg-white hover:text-black cursor-pointer shadow-[3px_3px_0px_rgba(255,255,255,0.4)]"
          >
            [ CANCEL ]
          </button>
        </div>
      </div>
    );
  }

  // ── Setup State ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[70] bg-black bg-opacity-80 flex items-center justify-center font-mono select-none">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-8 max-w-sm w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={() => { sound.playClick(); onClose(); }}
          className="absolute top-3 right-3 border-2 border-black px-2 py-0 font-pixel text-xs hover:bg-black hover:text-white cursor-pointer"
          title="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="font-pixel text-xs tracking-widest text-neutral-500 mb-1 uppercase">
            ■ POWER NAP TIMER ■
          </div>
          <div className="font-pixel text-xl font-bold tracking-wide uppercase">
            [zZ] SET NAP DURATION
          </div>
          <div className="text-[11px] font-mono text-neutral-500 mt-1">
            Alarm sounds when countdown reaches 00:00
          </div>
        </div>

        {/* Minute input */}
        <div className="mb-6">
          <label className="block text-xs font-pixel tracking-widest uppercase mb-2">
            NAP DURATION (MINUTES)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { const v = Math.max(1, napMinutes - 5); setNapMinutes(v); setTimeLeft(v * 60); }}
              className="border-2 border-black px-3 py-1 font-pixel text-sm hover:bg-black hover:text-white cursor-pointer"
            >
              −5
            </button>
            <input
              type="number"
              min="1"
              max="180"
              value={napMinutes}
              onChange={handleNapMinutesChange}
              className="border-2 border-black text-center font-mono text-2xl font-bold w-20 py-1 outline-none focus:border-black"
            />
            <button
              onClick={() => { const v = Math.min(180, napMinutes + 5); setNapMinutes(v); setTimeLeft(v * 60); }}
              className="border-2 border-black px-3 py-1 font-pixel text-sm hover:bg-black hover:text-white cursor-pointer"
            >
              +5
            </button>
          </div>
        </div>

        {/* Quick presets */}
        <div className="mb-6">
          <div className="text-[10px] font-pixel tracking-widest uppercase text-neutral-500 mb-2">QUICK PRESETS</div>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15, 20, 30, 45].map((m) => (
              <button
                key={m}
                onClick={() => { sound.playClick(); setNapMinutes(m); setTimeLeft(m * 60); }}
                className={`border border-black px-2 py-0.5 font-pixel text-[10px] cursor-pointer hover:bg-black hover:text-white ${
                  napMinutes === m ? 'bg-black text-white' : 'bg-white'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {/* Preview time */}
        <div className="border border-black bg-black text-white text-center py-3 mb-6 font-mono text-4xl font-bold tracking-widest">
          {formatTime(napMinutes * 60)}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="w-full border-4 border-black bg-black text-white font-pixel text-sm py-3 tracking-widest uppercase hover:bg-white hover:text-black cursor-pointer shadow-[4px_4px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px]"
        >
          [ START NAP ]
        </button>
      </div>
    </div>
  );
}
