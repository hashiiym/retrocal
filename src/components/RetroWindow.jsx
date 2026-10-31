import React from 'react';
import { sound } from '../utils/audio';

export default function RetroWindow({
  title,
  subtitle,
  children,
  onClose,
  headerActions,
  statusText,
  className = '',
  icon,
}) {
  return (
    <div className={`retro-box flex flex-col bg-white overflow-hidden ${className}`}>
      {/* Classic Mac System Pinstripe Window Header */}
      <div className="relative border-b-2 border-black flex items-center justify-between px-2 py-1.5 retro-titlebar-stripes select-none">
        
        {/* Left square control box */}
        <div className="flex items-center gap-1.5 z-10">
          {onClose && (
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="w-4 h-4 bg-white border border-black flex items-center justify-center font-pixel text-[9px] hover:bg-black hover:text-white active:scale-95 transition-none shadow-[1px_1px_0px_#000]"
              title="Close window"
            >
              ■
            </button>
          )}
          {!onClose && (
            <div className="w-4 h-4 bg-white border border-black flex items-center justify-center font-pixel text-[8px]">
              -
            </div>
          )}
        </div>

        {/* Center Title Badge with solid white background to cover stripes */}
        <div className="z-10 bg-white px-3 py-0.5 border border-black flex items-center gap-2 shadow-[1px_1px_0px_#000]">
          {icon && <span className="text-xs">{icon}</span>}
          <h2 className="text-xs sm:text-sm font-pixel font-bold tracking-wider uppercase text-black m-0">
            {title}
          </h2>
          {subtitle && (
            <span className="text-[10px] font-mono text-neutral-600 hidden sm:inline">
              [{subtitle}]
            </span>
          )}
        </div>

        {/* Right header actions or spacer */}
        <div className="flex items-center gap-1 z-10">
          {headerActions}
          <div className="w-4 h-4 bg-white border border-black flex items-center justify-center font-pixel text-[9px] shadow-[1px_1px_0px_#000]">
            ▲
          </div>
        </div>
      </div>

      {/* Main Window Body */}
      <div className="flex-1 overflow-auto bg-white p-3 sm:p-4">
        {children}
      </div>

      {/* Retro Status Bar Footer */}
      {statusText && (
        <div className="border-t-2 border-black bg-neutral-100 px-3 py-1 flex items-center justify-between text-[11px] font-mono select-none">
          <div className="truncate">{statusText}</div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 border border-black bg-white inline-block"></span>
            <span className="w-2 h-2 border border-black bg-black inline-block"></span>
            <span className="text-[10px] opacity-60 ml-1">SYS:READY</span>
          </div>
        </div>
      )}
    </div>
  );
}
