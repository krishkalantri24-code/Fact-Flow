
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Fact, UserProfile, AppTheme, AppView, Feedback, Reply, QuizQuestion, Deck } from './types';
import { THEME_COLORS, XP_PER_FACT, XP_FOR_FIRST_LEVEL, LIGHT_GRADIENTS, DARK_GRADIENTS, DECK_COLORS } from './constants';
import { getFacts, speakFact, stopSpeech, generateQuiz } from './services/geminiService';
import { HiveTopicSelector } from './components/HiveTopicSelector';
import { Onboarding } from './components/Onboarding';
import { NavBar } from './components/NavBar';
import { XPProgress } from './components/XPProgress';

const Confetti = () => {
  const [particles] = useState(() => Array.from({ length: 60 }).map(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 10 + 4,
    color: ["#FF7518", "#002366", "#3B82F6", "#10B981", "#F43F5E", "#EAB308"][Math.floor(Math.random() * 6)],
    delay: Math.random() * 2,
    duration: Math.random() * 3 + 1.5,
    rot: Math.random() * 360
  })));

  return (
    <div className="fixed inset-0 pointer-events-none z-[400] overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `-10%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
            transform: `rotate(${p.rot}deg)`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-[10px] font-black opacity-30 uppercase tracking-[0.4em] mb-4">{children}</h3>
);

const App: React.FC = () => {
  const [theme, setTheme] = useState<AppTheme>(() => localStorage.getItem('fact-theme') as AppTheme || 'dark');
  const [view, setView] = useState<AppView>('auth');
  const [facts, setFacts] = useState<Fact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('fact-user');
    return saved ? JSON.parse(saved) : {
      username: "",
      bio: "Collector of curiosities.",
      pfpUrl: `https://picsum.photos/seed/curiosity/300`,
      level: 1,
      xp: 0,
      nextLevelXp: XP_FOR_FIRST_LEVEL,
      streak: 1,
      isCurated: false,
      dailyGoal: 100,
      dailyXp: 0,
      badges: [{ type: 'easy', count: 0 }, { type: 'medium', count: 0 }, { type: 'hard', count: 0 }],
      interests: [],
      dislikedTopics: [],
      decks: [{ id: 'default', name: 'General', color: 'bg-blue-500' }]
    };
  });

  // Retention Features: XP Popups
  const [activeXpPopups, setActiveXpPopups] = useState<{id: string, x: number, y: number}[]>([]);

  // Quiz UI States
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([
    { id: '1', username: 'Fact Flow System', text: 'Welcome! Our algorithms are learning from your interaction.', likes: 12, replies: [], timestamp: Date.now() - 500000 }
  ]);
  const [newFeedbackText, setNewFeedbackText] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [levelUpPopup, setLevelUpPopup] = useState<number | null>(null);
  const [showPfpModal, setShowPfpModal] = useState(false);
  const [showDeckPicker, setShowDeckPicker] = useState<string | null>(null);
  const [activeDeckFilter, setActiveDeckFilter] = useState<string | null>(null);

  const [selectedVoice, setSelectedVoice] = useState<'male' | 'female'>('female');
  const feedRef = useRef<HTMLDivElement>(null);
  const colors = THEME_COLORS[theme];

  // Haptic feedback simulation
  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (navigator.vibrate) {
      const duration = intensity === 'heavy' ? 100 : intensity === 'medium' ? 50 : 20;
      navigator.vibrate(duration);
    }
  };

  // Persistence
  useEffect(() => { localStorage.setItem('fact-user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('fact-theme', theme); }, [theme]);

  const loadMoreFacts = async (isExplore: boolean = false) => {
    if (loading) return;
    setLoading(true);
    const newFacts = await getFacts(isExplore ? [] : user.interests, user.dislikedTopics, isExplore);
    
    const processed: Fact[] = [];
    let lastTopic = facts.length > 0 ? facts[facts.length - 1].topic : "";
    let secondLastTopic = facts.length > 1 ? facts[facts.length - 2].topic : "";
    
    for(const f of newFacts) {
      if (f.topic === lastTopic && f.topic === secondLastTopic) continue;
      processed.push(f);
      secondLastTopic = lastTopic;
      lastTopic = f.topic;
    }

    // Insert Ad every 12 cards
    const adInterval = 12;
    const currentTotal = facts.length;
    if (Math.floor((currentTotal + processed.length) / adInterval) > Math.floor(currentTotal / adInterval)) {
      const adIndex = processed.length > 2 ? 2 : processed.length;
      processed.splice(adIndex, 0, {
        id: `ad-${Date.now()}`,
        topic: "Sponsored",
        content: "AD_PLACEHOLDER",
        sourceName: "Ads",
        sourceUrl: "#",
        liked: false,
        saved: false,
        xpEarned: true,
        isAd: true
      });
    }

    setFacts(prev => [...prev, ...processed]);
    setLoading(false);
  };

  useEffect(() => {
    if (user.username && (view === 'feed' || view === 'explore') && facts.length === 0) {
      loadMoreFacts(view === 'explore');
    }
  }, [view, user.username]);

  const addXP = (amount: number, fromCoord?: {x: number, y: number}) => {
    if (fromCoord) {
      const id = Math.random().toString();
      setActiveXpPopups(prev => [...prev, { id, ...fromCoord }]);
      setTimeout(() => setActiveXpPopups(prev => prev.filter(p => p.id !== id)), 1000);
    }

    setUser(prev => {
      let xp = prev.xp + amount;
      let lvl = prev.level;
      let next = prev.nextLevelXp;
      if (xp >= next) {
        lvl++; xp -= next; next = Math.floor(next * 1.5);
        triggerHaptic('heavy');
        setLevelUpPopup(lvl); setTimeout(() => setLevelUpPopup(null), 4000);
      }
      return { ...prev, xp, level: lvl, nextLevelXp: next };
    });
  };

  const startQuiz = async (diff: 'easy' | 'medium' | 'hard') => {
    const seen = facts.filter(f => f.xpEarned && !f.isAd);
    if (seen.length < 5) {
      alert("Please view at least 5 facts to unlock quizzes.");
      return;
    }
    triggerHaptic('medium');
    setQuizDifficulty(diff);
    setQuizLoading(true);
    const questions = await generateQuiz(seen, diff);
    setQuizQuestions(questions);
    setCurrentQuizIndex(0);
    setQuizFinished(false);
    setQuizLoading(false);
    setSelectedQuizOption(null);
    setShowAnswerFeedback(false);
  };

  const handleQuizAnswer = (index: number) => {
    if (showAnswerFeedback) return;
    setSelectedQuizOption(index);
    setShowAnswerFeedback(true);
    
    const isCorrect = index === quizQuestions[currentQuizIndex].correctIndex;
    triggerHaptic(isCorrect ? 'light' : 'medium');
    
    setTimeout(() => {
      if (isCorrect) {
        const xpGain = quizDifficulty === 'hard' ? 100 : quizDifficulty === 'medium' ? 50 : 25;
        addXP(xpGain);
        if (currentQuizIndex < quizQuestions.length - 1) {
          setCurrentQuizIndex(prev => prev + 1);
          setSelectedQuizOption(null);
          setShowAnswerFeedback(false);
        } else {
          setQuizFinished(true);
          addXP(50); // Completion bonus
        }
      } else {
        setTimeout(() => {
          if (currentQuizIndex < quizQuestions.length - 1) {
            setCurrentQuizIndex(prev => prev + 1);
            setSelectedQuizOption(null);
            setShowAnswerFeedback(false);
          } else {
            setQuizFinished(true);
          }
        }, 1500);
      }
    }, 1200);
  };

  const handleScroll = useCallback(() => {
    if (!feedRef.current || (view !== 'feed' && view !== 'explore')) return;
    const index = Math.round(feedRef.current.scrollTop / window.innerHeight);
    if (index !== currentIndex) {
      stopSpeech(); 
      setIsSpeaking(false);
      setCurrentIndex(index);
      triggerHaptic('light');
      if (index >= facts.length - 3) loadMoreFacts(view === 'explore');
      if (facts[index] && !facts[index].xpEarned) {
        setFacts(p => p.map((f, idx) => idx === index ? { ...f, xpEarned: true } : f));
        addXP(XP_PER_FACT, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }
    }
  }, [currentIndex, facts, loading, view]);

  const handleSaveToDeck = (factId: string, deckId: string) => {
    triggerHaptic('light');
    setFacts(p => p.map(f => f.id === factId ? { ...f, saved: true, deckId } : f));
    setShowDeckPicker(null);
  };

  const createNewDeck = (name: string) => {
    const newDeck: Deck = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      color: DECK_COLORS[user.decks.length % DECK_COLORS.length]
    };
    setUser(u => ({ ...u, decks: [...u.decks, newDeck] }));
    return newDeck.id;
  };

  const handleSpeak = async (text: string) => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    await speakFact(text, selectedVoice, () => setIsSpeaking(true), () => setIsSpeaking(false));
  };

  const handleLikeFeedback = (id: string) => {
    triggerHaptic('light');
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, likes: f.likes + 1 } : f));
  };

  const handleSubmitFeedback = () => {
    if (!newFeedbackText.trim()) return;
    const feedback: Feedback = {
      id: Math.random().toString(36).substring(2),
      username: user.username,
      text: newFeedbackText,
      likes: 0,
      replies: [],
      timestamp: Date.now()
    };
    setFeedbacks(prev => [feedback, ...prev]);
    setNewFeedbackText("");
  };

  const handleSubmitReply = (feedbackId: string) => {
    if (!replyText.trim()) return;
    const reply: Reply = {
      id: Math.random().toString(36).substring(2),
      username: user.username,
      text: replyText,
      timestamp: Date.now()
    };
    setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, replies: [...f.replies, reply] } : f));
    setReplyText("");
    setReplyTarget(null);
  };

  return (
    <div className={`fixed inset-0 overflow-hidden transition-colors duration-500 font-jakarta ${colors.bg} ${colors.text}`}>
      
      {/* XP Floating Popups */}
      {activeXpPopups.map(p => (
        <div key={p.id} style={{ left: p.x, top: p.y }} className="fixed pointer-events-none z-[500] xp-popup text-orange-500 font-black text-2xl drop-shadow-lg">
          +{XP_PER_FACT} XP
        </div>
      ))}

      {/* Loading Screen Overlay */}
      {loading && facts.length === 0 && (view === 'feed' || view === 'explore') && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white dark:bg-black animate-in fade-in duration-300">
          <div className="w-20 h-20 border-8 border-blue-600 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl" />
          <h2 className="text-2xl font-black italic tracking-tight mb-2 text-blue-600">FACT FLOW</h2>
          <p className="text-xs font-bold opacity-40 uppercase tracking-[0.3em] animate-pulse">Syncing Cognitive Stream...</p>
        </div>
      )}

      {view === 'auth' && (
        <div className="flex flex-col items-center justify-center h-full p-10 space-y-8">
          <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center shadow-2xl rotate-12 float-anim">
            <span className="text-4xl text-white font-black">F</span>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black tracking-tighter">FACT FLOW</h1>
            <p className="opacity-60 text-sm px-6">Your daily dose of the world's most fascinating secrets.</p>
          </div>
          <div className="w-full max-w-xs space-y-4">
            <input 
              type="text" 
              placeholder="Enter Your Name" 
              value={user.username}
              className={`w-full p-6 rounded-[32px] ${theme === 'light' ? 'bg-white shadow-xl border border-slate-100' : 'bg-white/5'} outline-none font-bold text-center focus:ring-4 focus:ring-blue-600/20`}
              onChange={e => setUser(u => ({ ...u, username: e.target.value }))}
            />
            <button 
              onClick={() => user.username.length > 2 && setView(user.isCurated ? 'feed' : 'setup')}
              className={`w-full py-6 rounded-full font-black text-white shadow-2xl transition-all active:scale-95 ${user.username.length > 2 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 grayscale opacity-50'}`}
            >
              START DISCOVERING
            </button>
          </div>
        </div>
      )}

      {view === 'setup' && <HiveTopicSelector theme={theme} selectedInterests={user.interests} onToggle={(i) => setUser(p => ({ ...p, interests: p.interests.includes(i) ? p.interests.filter(x => x !== i) : [...p.interests, i] }))} onContinue={() => { setUser(u => ({ ...u, isCurated: true })); setView('onboarding'); }} />}
      
      {view === 'onboarding' && <Onboarding theme={theme} onComplete={() => setView('feed')} />}

      {(view === 'feed' || view === 'explore') && (
        <div ref={feedRef} onScroll={handleScroll} className="snap-y-container h-full w-full relative no-scrollbar">
          {facts.map((fact, i) => (
            <div key={fact.id} className="snap-item w-full h-full flex items-center justify-center p-8 pb-40 relative">
              {fact.isAd ? (
                <div className={`w-full max-w-sm h-[70%] rounded-[56px] shadow-2xl relative overflow-hidden bg-slate-200 dark:bg-slate-900 flex flex-col items-center justify-center p-12 border-4 border-dashed border-slate-400/30 shimmer`}>
                   <div className="text-center space-y-6 opacity-30">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                      <div className="space-y-2">
                        <p className="font-black text-xs uppercase tracking-[0.5em]">AD UNIT</p>
                        <p className="text-[10px] font-bold leading-relaxed">Connecting to Google AdSense...<br/>Revenue helps keep discoveries free.</p>
                      </div>
                   </div>
                   <div className="absolute bottom-10 left-0 right-0 text-center">
                     <p className="text-[8px] font-black uppercase opacity-20 tracking-widest">Swipe to skip advertisement</p>
                   </div>
                </div>
              ) : (
                <div className={`w-full max-w-sm h-[70%] p-10 rounded-[56px] shadow-2xl relative bg-gradient-to-br ${theme === 'light' ? LIGHT_GRADIENTS[i % LIGHT_GRADIENTS.length] : DARK_GRADIENTS[i % DARK_GRADIENTS.length]} transition-all duration-700 transform ${currentIndex === i ? 'scale-100 opacity-100 rotate-0' : 'scale-90 opacity-10 rotate-3'}`}>
                  <div className="flex flex-col items-center justify-center text-center h-full pr-[22%] space-y-8">
                    <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${theme === 'dark' ? 'bg-black/60 border-white/10 text-white' : 'bg-white/80 border-black/10 text-[#002366]'}`}>
                      {fact.topic}
                    </div>
                    <h2 className={`font-black leading-tight tracking-tight px-4 drop-shadow-sm ${theme === 'dark' ? 'text-white' : 'text-[#002366]'} ${fact.content.length > 70 ? 'text-xl' : 'text-2xl'}`}>
                      {fact.content}
                    </h2>
                    <a href={fact.sourceUrl} target="_blank" className="text-[10px] font-black opacity-50 hover:opacity-100 uppercase tracking-widest flex items-center gap-2 bg-black/5 px-4 py-2 rounded-full transition-all">
                      VERIFY FACT
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  </div>
                </div>
              )}

              {/* Interaction Buttons */}
              {!fact.isAd && (
                <div className="absolute right-8 bottom-52 flex flex-col gap-8 items-center z-20">
                  <button onClick={() => { triggerHaptic(); setFacts(p => p.map(f => f.id === fact.id ? { ...f, liked: !f.liked } : f)); }} className={`p-5 rounded-[30px] backdrop-blur-3xl transition-all active:scale-75 shadow-xl ${fact.liked ? 'bg-rose-500 text-white' : 'bg-white/20 text-white border border-white/20'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={fact.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                  <button onClick={() => setShowDeckPicker(fact.id)} className={`p-5 rounded-[30px] backdrop-blur-3xl transition-all active:scale-75 shadow-xl ${fact.saved ? 'bg-sky-500 text-white' : 'bg-white/20 text-white border border-white/20'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={fact.saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  </button>
                  <button onClick={() => handleSpeak(fact.content)} className={`p-5 rounded-[30px] transition-all active:scale-75 shadow-xl ${isSpeaking && currentIndex === i ? 'bg-orange-500 text-white animate-pulse' : 'bg-white/20 text-white backdrop-blur-3xl border border-white/20'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      {isSpeaking && currentIndex === i ? <path d="M6 18h2V6H6v12zM10 22h2V2h-2v20zM14 18h2V6h-2v12zM18 14h2V10h-2v4z"/> : <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>}
                    </svg>
                  </button>
                  <button onClick={() => { triggerHaptic(); navigator.share && navigator.share({ title: 'Fact Flow', text: fact.content }); }} className="p-5 rounded-[30px] bg-white/20 text-white backdrop-blur-3xl shadow-xl border border-white/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
          {loading && (
             <div className="h-32 w-full flex items-center justify-center">
               <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin opacity-40" />
             </div>
          )}
        </div>
      )}

      {showDeckPicker && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className={`${theme === 'light' ? 'bg-white' : 'bg-[#1a1a1a]'} w-full max-w-sm rounded-[48px] p-10 space-y-8 shadow-2xl animate-in slide-in-from-bottom duration-300 border border-white/5`}>
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black tracking-tight">ADD TO DECK</h3>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Organize Your Wisdom</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-h-72 overflow-y-auto no-scrollbar p-1">
              {user.decks.map(deck => (
                <button key={deck.id} onClick={() => handleSaveToDeck(showDeckPicker, deck.id)} className={`p-5 rounded-[32px] ${deck.color} text-white font-black text-xs uppercase text-center shadow-lg active:scale-95 transition-all`}>
                  {deck.name}
                </button>
              ))}
              <button onClick={() => {
                const name = prompt("Name your new deck:");
                if (name) {
                  const id = createNewDeck(name);
                  handleSaveToDeck(showDeckPicker, id);
                }
              }} className={`p-5 rounded-[32px] ${theme === 'light' ? 'bg-slate-100' : 'bg-white/5'} text-slate-500 font-black text-xs uppercase text-center border-2 border-dashed border-slate-300 active:scale-95 transition-all`}>
                + NEW DECK
              </button>
            </div>
            <button onClick={() => setShowDeckPicker(null)} className="w-full py-5 text-xs font-black opacity-40 uppercase tracking-[0.4em] hover:opacity-100 transition-opacity">CLOSE</button>
          </div>
        </div>
      )}

      {view === 'quiz' && (
        <div className={`fixed inset-0 overflow-y-auto pb-48 px-8 pt-24 ${colors.bg}`}>
          <div className="max-w-md mx-auto space-y-10">
            <h1 className="text-4xl font-black tracking-tighter italic border-l-8 border-blue-600 pl-6">RETENTION TEST</h1>
            {quizLoading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="font-black text-[10px] tracking-[0.5em] opacity-40 uppercase">Mapping Neural Response...</p>
              </div>
            ) : quizFinished ? (
              <div className="text-center space-y-10 py-20 animate-in zoom-in duration-500">
                <div className="w-40 h-40 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(16,185,129,0.4)] border-8 border-white">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-black uppercase tracking-tight">Insight Locked</h2>
                  <p className="opacity-60 font-medium leading-relaxed">Verification complete. Cognitive benchmarks have been updated.</p>
                </div>
                <button onClick={() => setView('feed')} className="w-full py-7 bg-blue-600 text-white rounded-[40px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">RESUME DISCOVERY</button>
              </div>
            ) : quizQuestions.length === 0 ? (
              <div className="text-center py-20 space-y-12">
                <div className="opacity-60 space-y-4">
                  <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-[0.3em]">Select Challenge</h3>
                </div>
                <div className="grid gap-6">
                  <button onClick={() => startQuiz('easy')} className="w-full py-7 bg-emerald-500 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">EASY (25 XP)</button>
                  <button onClick={() => startQuiz('medium')} className="w-full py-7 bg-amber-500 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">MEDIUM (50 XP)</button>
                  <button onClick={() => startQuiz('hard')} className="w-full py-7 bg-rose-500 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">HARD (100 XP)</button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between items-center text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">
                  <span>Step {currentQuizIndex + 1} / {quizQuestions.length}</span>
                  <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{quizDifficulty}</span>
                </div>
                <div className={`p-12 rounded-[56px] ${theme === 'light' ? 'bg-white shadow-2xl border border-slate-50' : 'bg-white/5'} border border-slate-200/50`}>
                  <p className="text-2xl font-black leading-tight tracking-tight">{quizQuestions[currentQuizIndex].question}</p>
                </div>
                <div className="grid gap-4">
                  {quizQuestions[currentQuizIndex].options.map((opt, i) => {
                    const isCorrect = i === quizQuestions[currentQuizIndex].correctIndex;
                    const isSelected = i === selectedQuizOption;
                    
                    let btnClass = `${theme === 'light' ? 'bg-white' : 'bg-white/5'} border-2 border-transparent`;
                    if (showAnswerFeedback) {
                      if (isCorrect) btnClass = "bg-green-500 text-white border-green-300 shadow-[0_0_30px_rgba(34,197,94,0.3)]";
                      else if (isSelected) btnClass = "bg-rose-500 text-white border-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.3)]";
                      else btnClass = "opacity-20 grayscale scale-95";
                    }

                    return (
                      <button 
                        key={i} 
                        onClick={() => handleQuizAnswer(i)}
                        className={`p-7 rounded-[40px] text-left font-bold text-base transition-all shadow-lg flex items-center justify-between ${btnClass}`}
                      >
                        <span>{opt}</span>
                        {showAnswerFeedback && isCorrect && <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'saved' && (
        <div className={`fixed inset-0 overflow-y-auto pb-48 px-8 pt-24 ${colors.bg}`}>
          <div className="max-w-md mx-auto space-y-12">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic border-l-8 border-emerald-500 pl-6">ARCHIVE</h1>
            
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
              <button 
                onClick={() => setActiveDeckFilter(null)}
                className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap border transition-all ${activeDeckFilter === null ? 'bg-blue-600 text-white border-transparent shadow-xl' : 'bg-white/5 border-slate-200/50 opacity-50'}`}
              >
                UNIVERSE
              </button>
              {user.decks.map(d => (
                <button 
                  key={d.id} 
                  onClick={() => setActiveDeckFilter(d.id)}
                  className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap border transition-all ${activeDeckFilter === d.id ? `${d.color} text-white border-transparent shadow-xl` : 'bg-white/5 border-slate-200/50 opacity-50'}`}
                >
                  {d.name}
                </button>
              ))}
            </div>

            <div className="grid gap-16">
              {facts.filter(f => f.saved && (activeDeckFilter ? f.deckId === activeDeckFilter : true)).length === 0 ? (
                <div className="py-32 text-center opacity-30 font-black uppercase text-xs tracking-[0.6em] animate-pulse">Deck Data Empty</div>
              ) : (
                facts.filter(f => f.saved && (activeDeckFilter ? f.deckId === activeDeckFilter : true)).map((f, i) => (
                  <div key={f.id} className={`w-full p-10 rounded-[64px] shadow-2xl bg-gradient-to-br ${theme === 'light' ? LIGHT_GRADIENTS[i % LIGHT_GRADIENTS.length] : DARK_GRADIENTS[i % DARK_GRADIENTS.length]} space-y-8 relative group overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500`}>
                    <div className="flex justify-between items-start">
                       <span className="px-5 py-2 bg-black/30 text-white rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md">{f.topic}</span>
                       <button onClick={() => { triggerHaptic(); setFacts(p => p.map(item => item.id === f.id ? { ...item, saved: false } : item)); }} className="p-2 bg-black/10 rounded-full hover:bg-black/30 transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    </div>
                    <p className={`text-lg font-black leading-relaxed ${theme === 'dark' ? 'text-white' : 'text-[#002366]'}`}>{f.content}</p>
                    <button onClick={() => handleSpeak(f.content)} className="flex items-center gap-3 text-[11px] font-black uppercase opacity-60 hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 5L6 9H2v6h4l5 4V5z"/></svg></div> SYNTHESIZE
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'profile' && (
        <div className={`fixed inset-0 overflow-y-auto pb-48 px-8 pt-24 ${colors.bg}`}>
          <div className="max-w-md mx-auto space-y-16">
            <div className="flex flex-col items-center">
              <button onClick={() => { triggerHaptic(); setShowPfpModal(true); }} className="relative mb-8 group active:scale-95 transition-transform">
                <XPProgress xp={user.xp} nextLevelXp={user.nextLevelXp} size={180} strokeWidth={12} color={theme === 'dark' ? '#FF7518' : '#002366'} />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="w-full h-full rounded-full overflow-hidden border-8 border-white shadow-2xl bg-slate-200">
                    <img src={user.pfpUrl} className="w-full h-full object-cover" alt="pfp" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-blue-600 p-3 rounded-full border-4 border-white text-white shadow-2xl">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21l-5-5m0 5l5-5"/></svg>
                </div>
              </button>
              <h1 className="text-4xl font-black uppercase tracking-tighter">{user.username}</h1>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-[11px] font-black bg-blue-100 text-blue-600 px-5 py-2 rounded-full uppercase tracking-widest shadow-sm">RANK: LVL {user.level}</span>
                <span className="text-[11px] font-black bg-orange-100 text-orange-600 px-5 py-2 rounded-full uppercase tracking-widest shadow-sm">{user.streak}D FIRE</span>
              </div>
            </div>

            <div className={`p-12 rounded-[64px] ${theme === 'light' ? 'bg-white shadow-2xl border border-slate-100' : 'bg-white/5 border border-white/5'} space-y-10`}>
              <SectionTitle>Cognitive Summary</SectionTitle>
              <div className="grid grid-cols-3 gap-8">
                {[
                  { l: 'SAVED', v: facts.filter(f => f.saved).length, c: 'text-orange-500' },
                  { l: 'EXP', v: user.xp, c: 'text-blue-500' },
                  { l: 'LEVEL', v: user.level, c: 'text-emerald-500' }
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-3xl font-black ${s.c}`}>{s.v}</div>
                    <div className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mt-2">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <SectionTitle>Configuration</SectionTitle>
              <div className={`rounded-[48px] overflow-hidden ${theme === 'light' ? 'bg-white shadow-2xl border border-slate-100' : 'bg-white/5 border border-white/5'}`}>
                <button onClick={() => { triggerHaptic(); setTheme(t => t === 'dark' ? 'light' : 'dark'); }} className="w-full p-8 flex justify-between items-center hover:bg-black/5 transition-all group">
                  <span className="font-black text-xs uppercase tracking-widest">Dark Mode</span>
                  <div className={`w-14 h-8 rounded-full transition-all duration-300 relative ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${theme === 'dark' ? 'left-7' : 'left-1'}`} />
                  </div>
                </button>
                <div className="h-px bg-slate-200/20 w-full" />
                <button onClick={() => { triggerHaptic(); setSelectedVoice(v => v === 'female' ? 'male' : 'female'); }} className="w-full p-8 flex justify-between items-center hover:bg-black/5 transition-all">
                  <span className="font-black text-xs uppercase tracking-widest">Synthesis Voice</span>
                  <span className="text-[11px] font-black opacity-30 uppercase tracking-widest">{selectedVoice}</span>
                </button>
                <div className="h-px bg-slate-200/20 w-full" />
                <button onClick={() => { triggerHaptic(); setView('feedback'); }} className="w-full p-8 flex justify-between items-center hover:bg-black/5 transition-all">
                  <span className="font-black text-xs uppercase tracking-widest">Feedback Board</span>
                  <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg></div>
                </button>
                <div className="h-px bg-slate-200/20 w-full" />
                <button 
                  onClick={() => { if(confirm("Log out? Local archive will be purged.")) { triggerHaptic('heavy'); localStorage.clear(); window.location.reload(); } }}
                  className="w-full p-8 flex justify-between items-center hover:bg-rose-500/10 text-rose-500 transition-all"
                >
                  <span className="font-black text-xs uppercase tracking-widest">Sign Out</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'feedback' && (
         <div className={`fixed inset-0 overflow-y-auto pb-48 px-8 pt-24 animate-in slide-in-from-right duration-500 ${colors.bg}`}>
            <div className="max-w-md mx-auto space-y-12">
               <button onClick={() => setView('profile')} className="p-5 rounded-[28px] bg-white/10 border border-slate-200/50 hover:bg-white/20 transition-all shadow-xl"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg></button>
               <h1 className="text-4xl font-black tracking-tighter uppercase italic">Board Entries</h1>
               <div className="space-y-6">
                  <textarea 
                    value={newFeedbackText} 
                    onChange={e => setNewFeedbackText(e.target.value)} 
                    placeholder="Log technical suggestions or board notes..." 
                    className={`w-full h-40 p-8 rounded-[48px] ${theme === 'light' ? 'bg-white shadow-2xl' : 'bg-white/5'} border border-slate-200/50 outline-none text-base font-bold resize-none focus:ring-8 focus:ring-blue-600/10 transition-all`} 
                  />
                  <button onClick={() => { triggerHaptic('medium'); handleSubmitFeedback(); }} className="w-full py-6 bg-blue-600 text-white rounded-[40px] font-black uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Submit Feedback</button>
               </div>
               <div className="space-y-12 pb-10">
                  {feedbacks.map(f => (
                     <div key={f.id} className={`p-10 rounded-[64px] ${theme === 'light' ? 'bg-white shadow-2xl' : 'bg-white/5'} border border-slate-200/50 space-y-8 animate-in fade-in duration-500`}>
                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[12px] font-black text-blue-600 uppercase shadow-inner">{f.username.charAt(0)}</div>
                             <span className="text-[11px] font-black opacity-40 uppercase tracking-widest">{f.username}</span>
                           </div>
                           <span className="text-[9px] opacity-20 uppercase font-black">{new Date(f.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-base font-bold leading-relaxed">{f.text}</p>
                        <div className="flex gap-8 border-t border-white/5 pt-6">
                           <button onClick={() => handleLikeFeedback(f.id)} className="text-[10px] font-black opacity-40 hover:opacity-100 uppercase tracking-widest flex items-center gap-2 group transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-active:scale-125 transition-transform"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/></svg> {f.likes}</button>
                           <button onClick={() => setReplyTarget(f.id)} className="text-[10px] font-black opacity-40 hover:opacity-100 uppercase tracking-widest flex items-center gap-2 transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> REPLY</button>
                        </div>
                        {replyTarget === f.id && (
                           <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                             <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type entry response..." className="w-full bg-black/5 border border-slate-200/50 rounded-full px-8 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/10" />
                             <button onClick={() => handleSubmitReply(f.id)} className="w-full py-4 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">TRANSMIT</button>
                           </div>
                        )}
                        {f.replies.map(r => (
                           <div key={r.id} className="ml-10 p-6 rounded-[40px] bg-black/5 border-l-8 border-blue-500 text-sm font-bold shadow-sm">{r.text}</div>
                        ))}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}

      {showPfpModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 p-8 animate-in fade-in duration-300 backdrop-blur-xl">
          <div className="w-full max-w-sm flex flex-col items-center space-y-12">
            <div className="w-80 h-80 rounded-[80px] overflow-hidden border-8 border-white shadow-[0_0_80px_rgba(255,255,255,0.2)] rotate-2 transition-transform active:rotate-0">
              <img src={user.pfpUrl} className="w-full h-full object-cover" alt="Full Avatar" />
            </div>
            <div className="w-full space-y-6">
              <button 
                onClick={() => {
                  const url = prompt("Describe your new avatar (e.g. 'cyberpunk city', 'ancient library'):");
                  if (url) setUser(u => ({ ...u, pfpUrl: url.startsWith('http') ? url : `https://picsum.photos/seed/${url}/600` }));
                  triggerHaptic('medium');
                  setShowPfpModal(false);
                }} 
                className="w-full py-7 bg-blue-600 text-white font-black rounded-[40px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
              >
                GENERATE NEW AVATAR
              </button>
              <button onClick={() => setShowPfpModal(false)} className="w-full py-4 text-white opacity-40 font-black uppercase tracking-[0.4em] hover:opacity-100 transition-opacity">DISMISS</button>
            </div>
          </div>
        </div>
      )}

      {levelUpPopup && (
        <>
          <Confetti />
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-10 animate-in fade-in zoom-in duration-500">
            <div className="text-center">
              <div className="w-64 h-64 bg-blue-600 rounded-[80px] shadow-[0_0_120px_rgba(37,99,235,0.7)] flex items-center justify-center mb-12 rotate-12 mx-auto scale-110 level-up-anim border-8 border-white/20">
                <span className="text-[120px] font-black text-white">{levelUpPopup}</span>
              </div>
              <h1 className="text-7xl font-black text-white mb-6 tracking-tighter uppercase italic drop-shadow-2xl">LEVEL UP</h1>
              <p className="text-blue-400 font-black tracking-[0.8em] text-base uppercase animate-pulse">Syncing Cognitive Architecture...</p>
            </div>
          </div>
        </>
      )}

      {view !== 'auth' && view !== 'setup' && view !== 'onboarding' && <NavBar theme={theme} currentView={view} onViewChange={v => { stopSpeech(); setView(v); }} />}
    </div>
  );
};

export default App;
