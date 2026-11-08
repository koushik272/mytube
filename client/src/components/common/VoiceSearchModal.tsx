import React, { useState, useEffect } from 'react';
import { Mic, X, Sparkles } from 'lucide-react';
import { useVideo } from '../../context/VideoContext';
import { useNavigate } from 'react-router-dom';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({ isOpen, onClose }) => {
  const { setSearchQuery, showToast } = useVideo();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState('Listening... Speak into your microphone');
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsListening(true);
      setTranscript('Listening... Speak now');

      // Check if browser SpeechRecognition is available
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            const current = event.results[0][0].transcript;
            setTranscript(`"${current}"`);
            if (event.results[0].isFinal) {
              setSearchQuery(current);
              showToast(`Searching for "${current}"`);
              navigate(`/search?q=${encodeURIComponent(current)}`);
              onClose();
            }
          };

          recognition.onerror = () => {
            setTranscript('Try saying: "Cricket highlights" or "Unreal Engine"');
          };

          recognition.start();

          return () => {
            try {
              recognition.stop();
            } catch {
              // ignore
            }
          };
        } catch {
          // fallback
        }
      } else {
        const timer = setTimeout(() => {
          setTranscript('Try clicking one of the suggested voice queries below:');
        }, 1200);
        return () => clearTimeout(timer);
      }
    } else {
      setIsListening(false);
    }
  }, [isOpen, navigate, onClose, setSearchQuery, showToast]);

  if (!isOpen) return null;

  const handleSuggestion = (text: string) => {
    setSearchQuery(text);
    showToast(`Voice Search: "${text}"`);
    navigate(`/search?q=${encodeURIComponent(text)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#212121] rounded-2xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 mb-6">
          Search with your voice
        </h3>

        <div className="flex items-center justify-center my-8">
          <div className="relative">
            {isListening && (
              <>
                <span className="absolute -inset-3 rounded-full bg-red-500/20 animate-ping"></span>
                <span className="absolute -inset-6 rounded-full bg-red-500/10 animate-pulse"></span>
              </>
            )}
            <div className="relative w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg cursor-pointer">
              <Mic className="w-9 h-9" />
            </div>
          </div>
        </div>

        <p className="text-base text-neutral-600 dark:text-neutral-300 min-h-[48px] px-4 font-normal">
          {transcript}
        </p>

        {/* Quick query tags */}
        <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-400 mb-3 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Popular Voice Searches:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Cricket match highlights', 'Blender 3D animation', 'Lo-Fi Chill Beats', 'Quantum computing'].map(
              (query) => (
                <button
                  key={query}
                  onClick={() => handleSuggestion(query)}
                  className="text-xs px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  "{query}"
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
