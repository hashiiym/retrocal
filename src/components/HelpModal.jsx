import React from 'react';
import RetroWindow from './RetroWindow';
import { sound } from '../utils/audio';

export default function HelpModal({ isOpen, onClose, onOpenApiGuide }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="w-full max-w-lg">
        <RetroWindow
          title="ABOUT RETROCAL TASK MANAGER"
          subtitle="MANUAL & GUIDE"
          onClose={onClose}
          icon="ℹ️"
        >
          <div className="space-y-4 font-mono text-xs">
            {/* Logo banner */}
            <div className="border-2 border-black p-3 bg-neutral-100 flex items-center gap-3">
              <div className="w-12 h-12 border-2 border-black bg-white flex items-center justify-center font-pixel text-xl font-bold shadow-[2px_2px_0px_#000]">
                ■
              </div>
              <div>
                <h3 className="font-pixel text-sm font-bold">RETROCAL TASK MANAGER</h3>
                <p className="text-[10px] text-neutral-600 font-mono mt-0.5">
                  Version 1.0 — Strict Monochrome Productivity Workstation
                </p>
              </div>
            </div>

            {/* Philosophy */}
            <div className="space-y-1">
              <span className="font-pixel text-[11px] font-bold block">&gt; DESIGN PHILOSOPHY</span>
              <p className="text-neutral-700 leading-relaxed">
                RetroCal combines the utilitarian elegance of early 1980s personal computer operating systems (early Macintosh System 6/7, MS-DOS, GEM) with modern real-time cloud sync and calendar integration. Zero colorful distractions. High contrast typography. 100% focus.
              </p>
            </div>

            {/* Shortcuts */}
            <div className="border border-black p-2 bg-white space-y-1">
              <span className="font-pixel text-[10px] font-bold block">KEYBOARD SHORTCUTS & TIPS:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-800">
                <div><kbd className="border border-black px-1 font-bold bg-neutral-100">+ NEW</kbd> Create New Task</div>
                <div><kbd className="border border-black px-1 font-bold bg-neutral-100">Click [ ]</kbd> Toggle Completion</div>
                <div><kbd className="border border-black px-1 font-bold bg-neutral-100">SND:ON</kbd> Web Audio 8-bit Sound</div>
                <div><kbd className="border border-black px-1 font-bold bg-neutral-100">SYLLABUS</kbd> Academic Tracker</div>
              </div>
            </div>

            {/* Cloud Sync explanation */}
            <div className="border border-black p-2 bg-white space-y-1">
              <span className="font-pixel text-[10px] font-bold block">MULTI-DEVICE CLOUD SYNC:</span>
              <p className="text-[11px] text-neutral-700">
                Tasks synchronize across tabs automatically via the browser's BroadcastChannel. To connect multiple physical devices (e.g. mobile phone and laptop), connect your Supabase project URL & Key in the Auth menu!
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { onClose(); onOpenApiGuide(); }}
                className="retro-btn px-3 py-1 text-[10px] font-bold"
              >
                VIEW REQUIRED APIS &gt;&gt;
              </button>
              <button
                type="button"
                onClick={onClose}
                className="retro-btn-black px-4 py-1 text-xs"
              >
                DISMISS
              </button>
            </div>
          </div>
        </RetroWindow>
      </div>
    </div>
  );
}
