import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, CloudRain, Radio, Minimize2, Maximize2, Bell } from 'lucide-react';
import { sound } from './utils/audio';

// Mode configurations (in seconds)
const MODES = {
  focus: { label: 'FOCUS', time: 25 * 60 },
  shortBreak: { label: 'SHORT BREAK', time: 5 * 60 },
  longBreak: { label: 'LONG BREAK', time: 15 * 60 },
};

export default function RetroPomodoro() {
  const [mode, setMode] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.time);
  const [isRunning, setIsRunning] = useState(false);
  const [cycle, setCycle] = useState(1);
  const [isMinimized, setIsMinimized] = useState(false);

  // Ambient sound generator state ('none', 'white', 'rain')
  const [ambientSound, setAmbientSound] = useState('none');
  const [ambientVolume, setAmbientVolume] = useState(0.3);

  // Web Audio API refs for noise generation
  const audioCtxRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const filterNodeRef = useRef(null);

  // Previous seconds for flip animation detection
  const [prevSecs, setPrevSecs] = useState('');
  const [prevMins, setPrevMins] = useState('');
  const [flipSec, setFlipSec] = useState(false);
  const [flipMin, setFlipMin] = useState(false);

  // Countdown timer interval
  useEffect(() => {
    let timer = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode]);

  // Flip trigger on second/minute tick
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  useEffect(() => {
    if (seconds !== prevSecs) {
      setFlipSec(true);
      const t = setTimeout(() => setFlipSec(false), 300);
      setPrevSecs(seconds);
      return () => clearTimeout(t);
    }
  }, [seconds, prevSecs]);

  useEffect(() => {
    if (minutes !== prevMins) {
      setFlipMin(true);
      const t = setTimeout(() => setFlipMin(false), 300);
      setPrevMins(minutes);
      return () => clearTimeout(t);
    }
  }, [minutes, prevMins]);

  // Timer complete handler
  const handleTimerComplete = () => {
    setIsRunning(false);
    sound.playAlarm();

    // Browser notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`[RETROCAL POMODORO] ${MODES[mode].label} COMPLETED!`, {
          body: mode === 'focus' ? 'Great focus session! Time to take a break.' : 'Break ended! Ready to focus again?',
        });
      } catch {}
    }

    // Advance session cycle
    if (mode === 'focus') {
      if (cycle % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(MODES.longBreak.time);
      } else {
        setMode('shortBreak');
        setTimeLeft(MODES.shortBreak.time);
      }
    } else {
      setMode('focus');
      setTimeLeft(MODES.focus.time);
      setCycle((c) => c + 1);
    }
  };

  // Switch timer mode
  const handleModeChange = (newMode) => {
    sound.playClick();
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(MODES[newMode].time);
  };

  // Toggle Start / Pause
  const handleTogglePlay = () => {
    sound.playClick();
    if (!isRunning && timeLeft === 0) {
      setTimeLeft(MODES[mode].time);
    }
    setIsRunning(!isRunning);
  };

  // Reset Timer
  const handleReset = () => {
    sound.playClick();
    setIsRunning(false);
    setTimeLeft(MODES[mode].time);
  };

  // Web Audio API Procedural Noise Synthesizer (White Noise & Rain)
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    const stopAmbientNoise = () => {
      if (noiseSourceRef.current) {
        try {
          noiseSourceRef.current.stop();
          noiseSourceRef.current.disconnect();
        } catch {}
        noiseSourceRef.current = null;
      }
    };

    if (ambientSound === 'none') {
      stopAmbientNoise();
      return;
    }

    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      stopAmbientNoise();

      // Create 5-second looping buffer of noise
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);

      if (ambientSound === 'white') {
        // Pure random white noise
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } else if (ambientSound === 'rain') {
        // Filtered pinkish rain noise with soft drop impulses
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          b6 = white * 0.115926;
          output[i] = pink * 0.11;
        }
      }

      // Loop source
      const whiteNoiseSource = ctx.createBufferSource();
      whiteNoiseSource.buffer = buffer;
      whiteNoiseSource.loop = true;

      // Filter Node
      const filter = ctx.createBiquadFilter();
      if (ambientSound === 'rain') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, ctx.currentTime);
      } else {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(8000, ctx.currentTime);
      }

      // Gain Node (Volume)
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(ambientVolume, ctx.currentTime);

      whiteNoiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoiseSource.start(0);

      noiseSourceRef.current = whiteNoiseSource;
      filterNodeRef.current = filter;
      gainNodeRef.current = gain;
    } catch (err) {
      console.warn('Ambient noise error:', err);
    }

    return () => {
      stopAmbientNoise();
    };
  }, [ambientSound]);

  // Handle ambient volume change
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(ambientVolume, audioCtxRef.current.currentTime);
    }
  }, [ambientVolume]);

  return (
    <aside aria-label="Pomodoro Flip Clock" className="fixed top-12 right-4 z-40 select-none">
      <div className="retro-box bg-white shadow-[4px_4px_0px_#000] border-2 border-black w-72 sm:w-80">
        
        {/* Retro Pinstripe Titlebar Header */}
        <div className="retro-titlebar-stripes border-b-2 border-black px-2 py-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 z-10">
            <button
              onClick={() => { sound.playClick(); setIsMinimized(!isMinimized); }}
              className="w-4 h-4 bg-white border border-black flex items-center justify-center font-pixel text-[9px] hover:bg-black hover:text-white"
              title={isMinimized ? "Expand Pomodoro" : "Minimize Pomodoro"}
            >
              {isMinimized ? '+' : '_'}
            </button>
          </div>

          <div className="z-10 bg-white px-2 py-0.5 border border-black flex items-center gap-1.5 shadow-[1px_1px_0px_#000]">
            <span className="text-[10px]">🍅</span>
            <span className="font-pixel text-[10px] font-bold tracking-wider">RETRO POMODORO</span>
          </div>

          <div className="z-10 flex items-center gap-1">
            <span className={`w-2 h-2 border border-black inline-block ${isRunning ? 'bg-black animate-pulse' : 'bg-white'}`}></span>
          </div>
        </div>

        {/* Minimized floating preview */}
        {isMinimized ? (
          <div 
            onClick={() => { sound.playClick(); setIsMinimized(false); }}
            className="p-2 flex items-center justify-between cursor-pointer hover:bg-neutral-50 font-mono text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[10px] bg-black text-white px-1">
                {MODES[mode].label}
              </span>
              <span className="font-bold text-sm tracking-wider">
                {minutes}:{seconds}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleTogglePlay(); }}
              className="retro-btn px-2 py-0.5 text-[9px] font-pixel"
            >
              {isRunning ? 'PAUSE' : 'START'}
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-3 font-mono text-xs">
            
            {/* Mode Tabs (Focus, Short Break, Long Break) */}
            <div className="grid grid-cols-3 gap-1 border border-black p-0.5 bg-neutral-100">
              {Object.keys(MODES).map((k) => (
                <button
                  key={k}
                  onClick={() => handleModeChange(k)}
                  className={`py-1 text-[9px] font-pixel transition-none truncate ${
                    mode === k ? 'bg-black text-white font-bold' : 'hover:bg-neutral-200 text-black'
                  }`}
                >
                  {k === 'focus' ? 'FOCUS' : k === 'shortBreak' ? 'SHORT' : 'LONG'}
                </button>
              ))}
            </div>

            {/* Retro 1-Bit Flip Clock Display */}
            <div className="p-2.5 bg-neutral-100 border-2 border-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_#000]">
              
              {/* Minutes Flip Card */}
              <div className="relative w-20 sm:w-24 h-16 sm:h-20 bg-black text-white rounded-none border-2 border-black flex flex-col items-center justify-center overflow-hidden shadow-[2px_2px_0px_#888]">
                {/* Horizontal split seam with retro notches */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-neutral-700 z-20"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1 bg-white border-r border-black z-30"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1 bg-white border-l border-black z-30"></div>
                
                {/* Digits */}
                <div className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-center transition-transform duration-150 ${flipMin ? 'scale-y-90' : 'scale-y-100'}`}>
                  {minutes}
                </div>
                <span className="absolute bottom-0.5 text-[8px] font-pixel text-neutral-400">MIN</span>
              </div>

              {/* Blinking Colon Separator */}
              <div className="font-mono text-2xl sm:text-3xl font-extrabold flex flex-col justify-center gap-1.5">
                <span className={`w-2 h-2 bg-black inline-block ${isRunning ? 'animate-pulse' : ''}`}></span>
                <span className={`w-2 h-2 bg-black inline-block ${isRunning ? 'animate-pulse' : ''}`}></span>
              </div>

              {/* Seconds Flip Card */}
              <div className="relative w-20 sm:w-24 h-16 sm:h-20 bg-black text-white rounded-none border-2 border-black flex flex-col items-center justify-center overflow-hidden shadow-[2px_2px_0px_#888]">
                {/* Horizontal split seam with retro notches */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-neutral-700 z-20"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1 bg-white border-r border-black z-30"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1 bg-white border-l border-black z-30"></div>
                
                {/* Digits */}
                <div className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-center transition-transform duration-150 ${flipSec ? 'scale-y-90' : 'scale-y-100'}`}>
                  {seconds}
                </div>
                <span className="absolute bottom-0.5 text-[8px] font-pixel text-neutral-400">SEC</span>
              </div>

            </div>

            {/* Cycle indicators (4-pomodoro set) */}
            <div className="flex items-center justify-between text-[10px] font-mono px-1">
              <span className="font-bold">CYCLE #{cycle}:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((step) => {
                  const currentStepInSet = ((cycle - 1) % 4) + 1;
                  const isDone = step < currentStepInSet;
                  const isCurrent = step === currentStepInSet;

                  return (
                    <div
                      key={step}
                      className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[8px] font-pixel ${
                        isDone ? 'bg-black text-white' : isCurrent && isRunning ? 'bg-black text-white animate-pulse' : 'bg-white'
                      }`}
                      title={`Session ${step}/4`}
                    >
                      {step}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: START/PAUSE, RESET */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTogglePlay}
                className={`py-1.5 text-xs font-pixel flex items-center justify-center gap-1.5 border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] ${
                  isRunning ? 'bg-white text-black hover:bg-neutral-100' : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'PAUSE' : 'START'}</span>
              </button>

              <button
                onClick={handleReset}
                className="py-1.5 text-xs font-pixel flex items-center justify-center gap-1.5 border-2 border-black bg-white hover:bg-neutral-100 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET</span>
              </button>
            </div>

            {/* Ambient Noise Generator (Web Audio API) */}
            <div className="border border-black p-2 bg-neutral-50 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-pixel">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  <span>AMBIENT FOCUS NOISE</span>
                </span>
                <span className="text-[9px] uppercase font-mono font-bold">
                  {ambientSound}
                </span>
              </div>

              {/* Noise mode selector */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => { sound.playClick(); setAmbientSound('none'); }}
                  className={`py-0.5 text-[9px] font-pixel border border-black ${ambientSound === 'none' ? 'bg-black text-white font-bold' : 'bg-white hover:bg-neutral-100'}`}
                >
                  OFF
                </button>
                <button
                  onClick={() => { sound.playClick(); setAmbientSound('white'); }}
                  className={`py-0.5 text-[9px] font-pixel border border-black ${ambientSound === 'white' ? 'bg-black text-white font-bold' : 'bg-white hover:bg-neutral-100'}`}
                >
                  WHITE
                </button>
                <button
                  onClick={() => { sound.playClick(); setAmbientSound('rain'); }}
                  className={`py-0.5 text-[9px] font-pixel border border-black ${ambientSound === 'rain' ? 'bg-black text-white font-bold' : 'bg-white hover:bg-neutral-100'}`}
                >
                  RAIN
                </button>
              </div>

              {/* Volume Slider */}
              {ambientSound !== 'none' && (
                <div className="flex items-center gap-2 pt-1 text-[10px]">
                  <Volume2 className="w-3 h-3 flex-shrink-0" />
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                    className="w-full accent-black cursor-pointer"
                  />
                  <span className="font-mono text-[9px] w-8 text-right">
                    {Math.round(ambientVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </aside>
  );
}
