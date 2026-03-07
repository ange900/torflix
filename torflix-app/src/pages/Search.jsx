import { useState, useRef } from 'react';
import { Search as SearchIcon, X, Loader2, Film, Tv, Zap, Mic, MicOff } from 'lucide-react';
import { tmdb } from '../services/tmdb';
import ContentCard from '../components/ContentCard';

const LANGS = [
  { code: 'all', label: 'Tout', flag: '🌍' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'it', label: 'ITA', flag: '🇮🇹' },
  { code: 'en', label: 'ENG', flag: '🇬🇧' },
  { code: 'es', label: 'ESP', flag: '🇪🇸' },
  { code: 'de', label: 'DEU', flag: '🇩🇪' },
  { code: 'pt', label: 'POR', flag: '🇵🇹' },
  { code: 'ar', label: 'ARA', flag: '🇸🇦' },
  { code: 'ja', label: 'JAP', flag: '🇯🇵' },
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('all');
  const [lang, setLang] = useState('all');
  const [listening, setListening] = useState(false);
  const [voiceSupported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const debounce = useRef(null);
  const recognitionRef = useRef(null);

  const doSearch = async (q, t = type, l = lang) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await tmdb.search(q, l !== 'all' ? l : undefined);
      let items = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
      if (t !== 'all') items = items.filter(r => r.media_type === t);
      if (l !== 'all') items = items.filter(r => r.original_language === l);
      setResults(items);
    } catch {} finally { setLoading(false); }
  };

  const onInput = (v) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(v), 400);
  };

  const onType = (t) => { setType(t); if (query.length >= 2) doSearch(query, t, lang); };
  const onLang = (l) => { setLang(l); if (query.length >= 2) doSearch(query, type, l); };

  // Voice search
  const startVoice = () => {
    if (!voiceSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      if (e.results[0].isFinal) {
        doSearch(transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  return (
    <div className="px-4 pt-12 safe-top">
      <h1 className="text-2xl font-bold mb-4">Rechercher</h1>

      <div className="relative mb-4">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input type="text" value={query} onChange={e => onInput(e.target.value)}
          placeholder="Film, série..."
          className="w-full pl-12 pr-20 py-3.5 bg-surface border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-red-600/50" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); }} className="p-1 text-zinc-500">
              <X className="w-4 h-4" />
            </button>
          )}
          {voiceSupported && (
            <button onClick={listening ? stopVoice : startVoice}
              className={`p-2 rounded-full transition-all ${listening ? 'bg-red-600 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}>
              {listening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-zinc-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Listening indicator */}
      {listening && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-red-600/10 border border-red-600/20 rounded-xl">
          <div className="flex gap-1">
            <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            <div className="w-1 h-5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
          </div>
          <span className="text-red-400 text-xs font-medium">Parlez maintenant...</span>
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-2 mb-3">
        {[{ v: 'all', icon: Zap, l: 'Tout' }, { v: 'movie', icon: Film, l: 'Films' }, { v: 'tv', icon: Tv, l: 'Séries' }].map(t => (
          <button key={t.v} onClick={() => onType(t.v)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${type === t.v ? 'bg-red-600 text-white' : 'bg-surface text-zinc-400'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.l}
          </button>
        ))}
      </div>

      {/* Language filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {LANGS.map(l => (
          <button key={l.code} onClick={() => onLang(l.code)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${lang === l.code ? 'bg-blue-600 text-white' : 'bg-surface text-zinc-400'}`}>
            <span>{l.flag}</span>{l.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-red-500 animate-spin" /></div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {results.map(item => <ContentCard key={item.id} item={item} />)}
        </div>
      ) : query.length >= 2 ? (
        <div className="text-center py-16 text-zinc-500">Aucun résultat</div>
      ) : (
        <div className="text-center py-16 text-zinc-600 text-sm">Tapez ou utilisez le micro 🎙️</div>
      )}
    </div>
  );
}
