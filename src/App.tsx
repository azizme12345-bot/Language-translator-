import { useState, useRef, useEffect, MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Volume2, ArrowRightLeft, Languages, Loader2, VolumeX, History, Trash2, Copy, Check, ArrowLeft, X, Sliders } from "lucide-react";
import { LANGUAGES, getSpeechLang } from "./lib/languages";
import VoiceSettings from "./components/VoiceSettings";

interface HistoryItem {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<"translator" | "history">("translator");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("ur");
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState<"source" | "target" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<number>(() => {
    const saved = localStorage.getItem("tts_speed");
    return saved ? parseFloat(saved) : 1.0;
  });
  const [ttsPitch, setTtsPitch] = useState<number>(() => {
    const saved = localStorage.getItem("tts_pitch");
    return saved ? parseFloat(saved) : 1.0;
  });

  const handleSpeedChange = (speed: number) => {
    setTtsSpeed(speed);
    localStorage.setItem("tts_speed", speed.toString());
  };

  const handlePitchChange = (pitch: number) => {
    setTtsPitch(pitch);
    localStorage.setItem("tts_pitch", pitch.toString());
  };

  const handleResetTts = () => {
    handleSpeedChange(1.0);
    handlePitchChange(1.0);
  };

  const handleTestVoice = () => {
    speakText("Hello! This is a test of voice speed and pitch.", "en", "source");
  };

  const recognitionRef = useRef<any>(null);
  const isStartedRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load history from localStorage
    const saved = localStorage.getItem("translation_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    // Initialize SpeechRecognition if available
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript) {
            setSourceText((prev) => prev + (prev ? " " : "") + finalTranscript);
          }
        };

        recognition.onstart = () => {
          setIsListening(true);
          isStartedRef.current = true;
        };

        recognition.onerror = (event: any) => {
          const errType = event?.error;
          // 'aborted' occurs normally when stopping speech recognition or switching tabs/elements
          // 'no-speech' occurs when silence is detected
          if (errType === "aborted" || errType === "no-speech") {
            setIsListening(false);
            isStartedRef.current = false;
            return;
          }

          console.warn("Speech recognition warning:", errType);
          setIsListening(false);
          isStartedRef.current = false;

          if (errType === "not-allowed" || errType === "service-not-allowed") {
            setError("Microphone permission was not granted. Please allow microphone access in your browser.");
          } else if (errType === "audio-capture") {
            setError("No microphone detected. Please connect an audio input device.");
          } else if (errType === "network") {
            setError("Speech recognition network error. Please check your internet connection.");
          } else {
            setError(`Speech recognition encountered an issue (${errType || "unknown"}).`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          isStartedRef.current = false;
        };

        recognitionRef.current = recognition;
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const saveToHistory = (srcText: string, tgtText: string, srcL: string, tgtL: string) => {
    if (!srcText.trim() || !tgtText.trim()) return;
    
    const srcName = LANGUAGES.find((l) => l.code === srcL)?.name || srcL;
    const tgtName = LANGUAGES.find((l) => l.code === tgtL)?.name || tgtL;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      sourceText: srcText,
      targetText: tgtText,
      sourceLang: srcName,
      targetLang: tgtName,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      // Avoid duplicate consecutive exact items
      if (prev.length > 0 && prev[0].sourceText === srcText && prev[0].targetText === tgtText) {
        return prev;
      }
      const updated = [newItem, ...prev].slice(0, 5); // Keep last 5
      localStorage.setItem("translation_history", JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("translation_history");
  };

  const deleteHistoryItem = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem("translation_history", JSON.stringify(updated));
  };

  const toggleListening = () => {
    setError(null);
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isListening || isStartedRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
      isStartedRef.current = false;
    } else {
      const speechLang = getSpeechLang(sourceLang);
      recognitionRef.current.lang = speechLang;
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isStartedRef.current = true;
      } catch (err: any) {
        console.warn("Speech recognition start warning:", err);
        // If already started or in transition, stop and reset
        if (err?.name === "InvalidStateError") {
          try {
            recognitionRef.current.stop();
          } catch (_) {}
        }
        setIsListening(false);
        isStartedRef.current = false;
      }
    }
  };

  const executeTranslation = async (text: string, srcLang: string, tgtLang: string) => {
    if (!text.trim()) {
      setTargetText("");
      return;
    }

    setIsTranslating(true);
    setError(null);

    const sourceLangName = LANGUAGES.find((l) => l.code === srcLang)?.name || srcLang;
    const targetLangName = LANGUAGES.find((l) => l.code === tgtLang)?.name || tgtLang;

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          sourceLang: sourceLangName,
          targetLang: targetLangName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let msg = data.error || "Failed to translate";
        if (response.status === 429 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
          msg = "Translation service quota is busy. Please wait a moment and try again.";
        }
        throw new Error(msg);
      }

      setTargetText(data.translatedText);
      saveToHistory(text, data.translatedText, srcLang, tgtLang);
    } catch (err: any) {
      let friendlyError = err.message || "An error occurred during translation.";
      if (friendlyError.includes("RESOURCE_EXHAUSTED") || friendlyError.includes("quota")) {
        friendlyError = "Translation service quota is busy. Please wait a moment and try again.";
      }
      setError(friendlyError);
    } finally {
      setIsTranslating(false);
    }
  };

  // Auto-translate effect: wait until user finishes typing or stops dictation
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!sourceText.trim() || isListening) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      executeTranslation(sourceText, sourceLang, targetLang);
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sourceText, sourceLang, targetLang, isListening]);

  const handleTranslate = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    executeTranslation(sourceText, sourceLang, targetLang);
  };

  const speakText = (text: string, lang: string, type: "source" | "target") => {
    if (!text) return;
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      if (isPlaying === type) {
        setIsPlaying(null);
        return;
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLang(lang);
    utterance.rate = ttsSpeed;
    utterance.pitch = ttsPitch;
    
    utterance.onstart = () => setIsPlaying(type);
    utterance.onend = () => setIsPlaying(null);
    utterance.onerror = () => setIsPlaying(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleSwapLanguages = () => {
    if (sourceLang === "auto") {
      setSourceLang(targetLang);
      setTargetLang("en");
    } else {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
    }
    setSourceText(targetText);
    setTargetText(sourceText);
  };

  const reuseItem = (item: HistoryItem) => {
    const srcCode = LANGUAGES.find((l) => l.name === item.sourceLang)?.code || "auto";
    const tgtCode = LANGUAGES.find((l) => l.name === item.targetLang)?.code || "ur";
    setSourceLang(srcCode);
    setTargetLang(tgtCode);
    setSourceText(item.sourceText);
    setTargetText(item.targetText);
    setCurrentPage("translator");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Languages size={22} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-500">
            Easy Translate
          </h1>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVoiceSettings(true)}
            className={`flex items-center gap-2 font-medium px-3.5 py-2 rounded-xl transition-colors text-sm ${
              showVoiceSettings
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            title="Voice Settings (Speed & Pitch)"
            id="header-voice-settings-btn"
          >
            <Sliders size={18} />
            <span className="hidden sm:inline">Voice Settings</span>
          </button>

          {currentPage === "translator" ? (
            <button
              onClick={() => setCurrentPage("history")}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium px-4 py-2 rounded-xl transition-colors text-sm"
            >
              <History size={18} />
              <span>History ({history.length})</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentPage("translator")}
              className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 font-medium px-4 py-2 rounded-xl transition-colors text-sm shadow-sm"
            >
              <ArrowLeft size={18} />
              <span>Back to Translator</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-red-500 rounded-full"></div>
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentPage === "translator" ? (
            <motion.div
              key="translator"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col gap-6"
            >
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                {/* Source Area */}
                <div className="flex-1 flex flex-col min-h-[300px] border-b md:border-b-0 md:border-r border-slate-200">
                  {/* Language Selector */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <select
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg py-1.5 px-2 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Textarea */}
                  <div className="flex-1 p-5 relative">
                    <textarea
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Type or speak here..."
                      className="w-full h-full min-h-[200px] resize-none bg-transparent border-none focus:outline-none text-xl sm:text-2xl placeholder:text-slate-300 font-medium"
                    />
                  </div>

                  {/* Action Bar */}
                  <div className="px-5 py-4 flex items-center justify-between border-t border-slate-50">
                    <div className="flex gap-2">
                      <button
                        onClick={toggleListening}
                        className={`p-3 rounded-full transition-all duration-200 shadow-sm ${
                          isListening
                            ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-indigo-600"
                        }`}
                        title={isListening ? "Stop listening" : "Start dictation"}
                      >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                      <button
                        onClick={() => speakText(sourceText, sourceLang, "source")}
                        disabled={!sourceText}
                        className={`p-3 rounded-full transition-all duration-200 shadow-sm ${
                          isPlaying === "source"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-indigo-600"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Listen to original text"
                      >
                        {isPlaying === "source" ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>
                      <button
                        onClick={() => setShowVoiceSettings(true)}
                        className="p-3 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-indigo-600 transition-all duration-200 shadow-sm"
                        title="Voice settings (Speed & Pitch)"
                        id="source-voice-settings-btn"
                      >
                        <Sliders size={20} />
                      </button>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {sourceText.length} chars
                    </span>
                  </div>
                </div>

                {/* Swap Button (Desktop Center) */}
                <div className="hidden md:flex flex-col items-center justify-center -mx-5 z-10">
                  <button
                    onClick={handleSwapLanguages}
                    className="bg-white p-3 rounded-full shadow-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:scale-105 transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    title="Swap languages"
                  >
                    <ArrowRightLeft size={18} />
                  </button>
                </div>

                {/* Mobile Swap Button */}
                <div className="md:hidden flex justify-center -my-4 z-10">
                  <button
                    onClick={handleSwapLanguages}
                    className="bg-white p-2.5 rounded-full shadow-md border border-slate-200 text-slate-500 hover:text-indigo-600 active:scale-95 transition-all"
                  >
                    <ArrowRightLeft size={16} className="rotate-90" />
                  </button>
                </div>

                {/* Target Area */}
                <div className="flex-1 flex flex-col min-h-[300px] bg-slate-50/30">
                  {/* Language Selector */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg py-1.5 px-2 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      {LANGUAGES.filter((lang) => lang.code !== "auto").map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Textarea */}
                  <div className="flex-1 p-5 relative">
                    <textarea
                      value={targetText}
                      readOnly
                      placeholder="Translation will appear here..."
                      className="w-full h-full min-h-[200px] resize-none bg-transparent border-none focus:outline-none text-xl sm:text-2xl text-indigo-900 placeholder:text-slate-300 font-medium"
                    />
                    {isTranslating && (
                      <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="px-5 py-4 flex items-center justify-between border-t border-slate-50">
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => speakText(targetText, targetLang, "target")}
                        disabled={!targetText}
                        className={`p-3 rounded-full transition-all duration-200 shadow-sm ${
                          isPlaying === "target"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 hover:text-indigo-600"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Listen to translation"
                      >
                        {isPlaying === "target" ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>
                      <button
                        onClick={() => setShowVoiceSettings(true)}
                        className="p-3 rounded-full bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 hover:text-indigo-600 transition-all duration-200 shadow-sm"
                        title="Voice settings (Speed & Pitch)"
                        id="target-voice-settings-btn"
                      >
                        <Sliders size={20} />
                      </button>
                    </div>
                    {targetText && (
                      <button
                        onClick={() => copyToClipboard(targetText, "current-target")}
                        className="p-3 rounded-full bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 hover:text-indigo-600 transition-all shadow-sm"
                        title="Copy translation"
                      >
                        {copiedId === "current-target" ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Global Action */}
              <div className="flex justify-center mt-2">
                <button
                  onClick={handleTranslate}
                  disabled={!sourceText.trim() || isTranslating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold py-4 px-12 rounded-full shadow-lg shadow-indigo-600/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 size={22} className="animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Languages size={22} />
                      Translate Now
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            /* History Page */
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Translation History</h2>
                  <p className="text-sm text-slate-500">Showing your last 5 saved translations</p>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <History size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700">No history yet</h3>
                  <p className="text-sm text-slate-400 max-w-sm">
                    Your recent translations will automatically appear here as you translate.
                  </p>
                  <button
                    onClick={() => setCurrentPage("translator")}
                    className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                  >
                    Start Translating
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => reuseItem(item)}
                      className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col gap-4 relative group"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                          <span>{item.sourceLang}</span>
                          <span className="text-slate-400">→</span>
                          <span>{item.targetLang}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl">
                          <span className="text-xs font-medium text-slate-400 block mb-1">Original</span>
                          <p className="text-slate-800 font-medium">{item.sourceText}</p>
                        </div>
                        <div className="bg-indigo-50/50 p-4 rounded-xl relative">
                          <span className="text-xs font-medium text-indigo-400 block mb-1">Translation</span>
                          <p className="text-indigo-950 font-medium">{item.targetText}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.targetText, item.id);
                            }}
                            className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-sm border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Copy translation"
                          >
                            {copiedId === item.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Voice Settings Menu Dialog */}
      <VoiceSettings
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        speed={ttsSpeed}
        onSpeedChange={handleSpeedChange}
        pitch={ttsPitch}
        onPitchChange={handlePitchChange}
        onReset={handleResetTts}
        onTestVoice={handleTestVoice}
        isPlayingTest={isPlaying === "source"}
      />
    </div>
  );
}
