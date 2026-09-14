import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings2, RotateCcw, Volume2, X, Gauge, Music2, Check } from "lucide-react";

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
  onReset: () => void;
  onTestVoice: () => void;
  isPlayingTest?: boolean;
}

const SPEED_PRESETS = [0.75, 1.0, 1.25, 1.5];

export default function VoiceSettings({
  isOpen,
  onClose,
  speed,
  onSpeedChange,
  pitch,
  onPitchChange,
  onReset,
  onTestVoice,
  isPlayingTest = false,
}: VoiceSettingsProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const getPitchLabel = (val: number) => {
    if (val < 0.8) return "Deeper";
    if (val > 1.2) return "Higher";
    return "Normal";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-10 text-slate-800"
            id="tts-voice-settings-dialog"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Voice Settings</h3>
                  <p className="text-xs text-slate-400">Customize speech rate and pitch</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Close settings"
                id="tts-voice-settings-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sliders & Controls */}
            <div className="space-y-5 pt-4">
              {/* Speed (Rate) Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Gauge size={15} className="text-indigo-600" />
                    Speech Speed
                  </span>
                  <span className="text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-md text-xs">
                    {speed.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={speed}
                  onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                  id="tts-speed-slider"
                />
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  {SPEED_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => onSpeedChange(preset)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        Math.abs(speed - preset) < 0.03
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Music2 size={15} className="text-indigo-600" />
                    Voice Pitch
                  </span>
                  <span className="text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-md text-xs">
                    {pitch.toFixed(2)} ({getPitchLabel(pitch)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={pitch}
                  onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                  id="tts-pitch-slider"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-medium px-1">
                  <span>Deeper (0.5)</span>
                  <span>Normal (1.0)</span>
                  <span>Higher (1.5)</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={onReset}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors font-medium"
                  title="Reset to 1.0x speed and 1.0 pitch"
                  id="tts-reset-btn"
                >
                  <RotateCcw size={14} />
                  <span>Reset Default</span>
                </button>

                <button
                  onClick={onTestVoice}
                  className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all font-semibold shadow-md shadow-indigo-600/20 active:scale-95"
                  title="Listen to sample voice"
                  id="tts-test-voice-btn"
                >
                  <Volume2 size={15} className={isPlayingTest ? "animate-pulse" : ""} />
                  <span>{isPlayingTest ? "Playing..." : "Test Voice"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
