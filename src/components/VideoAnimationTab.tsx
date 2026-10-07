import React, { useState } from 'react';
import { 
  Video, 
  Film, 
  Sparkles, 
  Camera, 
  Sliders, 
  Play, 
  Layers, 
  Palette, 
  CheckCircle2, 
  Cpu, 
  Volume2
} from 'lucide-react';

export const VideoAnimationTab: React.FC = () => {
  const [scriptPrompt, setScriptPrompt] = useState('An engineer debugging a distributed systems incident at 2 AM, discovers a glowing anomaly in the terminal.');
  const [pipelineState, setPipelineState] = useState<'idle' | 'generating' | 'ready'>('idle');

  const sampleStoryboard = [
    {
      shot: '01',
      camera: 'Extreme Close-Up (ECU)',
      action: 'Tired eyes reflecting cascading red log lines on terminal monitor.',
      audio: 'Rhythmic mechanical keyboard clatter, soft server hum.',
      dialogue: 'Elena (Tense): "The latch isn\'t releasing..."',
      duration: '3.5s'
    },
    {
      shot: '02',
      camera: 'Medium Shot (MS)',
      action: 'Elena leans forward into screen. Terminal text pauses, cyan particle glitch emerges.',
      audio: 'Subtle bass drone swells, audio high-cut filter kicks in.',
      dialogue: 'Elena (Whisper): "What is that?"',
      duration: '4.2s'
    },
    {
      shot: '03',
      camera: 'Low Angle Tracking',
      action: 'Terminal glow expands across the desk, illuminating mechanical schematics.',
      audio: 'Warm chord resolve, digital ripple chime.',
      dialogue: 'AI Assistant (Calm): "Fable ledger locked. Invariant verified."',
      duration: '5.0s'
    }
  ];

  const handleSimulate = () => {
    setPipelineState('generating');
    setTimeout(() => {
      setPipelineState('ready');
    }, 900);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-400" />
            Video & Animation Engine Hub (`skills/video/SKILL.md`)
          </h2>
          <p className="text-xs text-slate-400">
            Cinematic pipeline orchestration: ViMax storyboard generation, Remotion React titles, and AI4Animation kinematics.
          </p>
        </div>
      </div>

      {/* Engine Comparison Trio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-purple-400" />
              ViMax Engine
            </span>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              MIT Vendored
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Novel / script to cinematic film. Camera-anchored visual descriptions, audio tracks, emotional arc planning, and reaction close-ups.
          </p>
          <div className="mt-3 text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded">
            vendor/vimax/
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Remotion Studio
            </span>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              React Starter
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Programmatic video in pure React: mood-driven title cards, dynamic AI clip captions, audio waveforms, and 60fps canvas rendering.
          </p>
          <div className="mt-3 text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded">
            vendor/remotion-starter/
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              AI4Animation
            </span>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Deep Kinematics
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Muscle-driven character motion, neural autoencoder manifolds, FABRIK inverse kinematics, and biped/quadruped path planning.
          </p>
          <div className="mt-3 text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded">
            vendor/ai4animation/
          </div>
        </div>
      </div>

      {/* Interactive ViMax Storyboard Generator */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            ViMax Story / Script Input:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={scriptPrompt}
              onChange={(e) => setScriptPrompt(e.target.value)}
              placeholder="Describe scene concept or script premise..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-400/50"
            />
            <button
              onClick={handleSimulate}
              disabled={pipelineState === 'generating'}
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Generate ViMax Storyboard</span>
            </button>
          </div>
        </div>

        {pipelineState === 'ready' && (
          <div className="space-y-4 pt-3 border-t border-slate-850 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ViMax Shot List Schema (Camera-Anchored):
              </span>
              <span className="text-[11px] text-slate-400">Scene 1 · 3 Planned Shots · 12.7s total</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sampleStoryboard.map((shot, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-purple-300">
                        SHOT #{shot.shot}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {shot.duration}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-white mb-1.5 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-purple-400" />
                      {shot.camera}
                    </div>

                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                      {shot.action}
                    </p>

                    <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded mb-2 border border-slate-800/80 flex items-start gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{shot.audio}</span>
                    </div>
                  </div>

                  <div className="text-[11px] italic text-amber-200/90 pt-2 border-t border-slate-850">
                    {shot.dialogue}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
