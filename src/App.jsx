import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { 
  Zap, Eye, Search, Layers, Sparkle, Dumbbell, ShieldCheck, Briefcase, CreditCard, Cpu, 
  Camera, Upload, RefreshCw, Maximize2, X, CheckCircle2, Lock, Unlock, Key, Database, 
  Mail, Send, UserCheck, BarChart3, Microscope, Droplet, FlaskConical, ClipboardList, 
  Calendar, Phone, Info, ShieldAlert, ArrowRight, Activity as Pulse, LogOut, Heart, 
  Compass, Scan, Target, Ruler, FileText, AlertCircle
} from 'lucide-react';

// --- ROBUST ENVIRONMENT HANDSHAKE ---
const getEnvVar = (key, fallback = '') => {
  try {
    // Priority 1: Vite Environment (Vercel)
    if (import.meta.env && import.meta.env[key]) return import.meta.env[key];
    // Priority 2: Global Object (Local Testing)
    if (typeof window !== 'undefined' && window[key]) return window[key];
    return fallback;
  } catch (e) {
    return fallback;
  }
};
{
  "version": 2,
  "cleanUrls": true,
  "trailingSlash": false,
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
// --- SYSTEM INITIALIZATION ---
let app, auth, db, appId, systemStatus = "initializing";
const firebaseConfigRaw = typeof __firebase_config !== 'undefined' ? __firebase_config : getEnvVar('VITE_FIREBASE_CONFIG', '');
const geminiApiKey = getEnvVar('VITE_GEMINI_API_KEY', '');

try {
  if (firebaseConfigRaw && firebaseConfigRaw !== '{}') {
    const config = JSON.parse(firebaseConfigRaw);
    app = !getApps().length ? initializeApp(config) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    systemStatus = "ready";
  } else {
    systemStatus = "missing_config";
  }
} catch (e) {
  console.error("Initialization Fault:", e);
  systemStatus = "config_error";
}

appId = typeof __app_id !== 'undefined' ? __app_id : 'aura-medspa-enterprise-v1';

const App = () => {
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  
  // AI Engine State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMorphing, setIsMorphing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [morphUrl, setMorphUrl] = useState(null);
  
  // Database & Lead State
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [isSavingLead, setIsSavingLead] = useState(false);
  
  // Provider Access
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginKey, setLoginKey] = useState('');
  
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');

  // Hardware State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const DEMO_PROVIDER_KEY = "AURA-2026";

  // 1. Auth Lifecycle
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.warn("Identity Layer Reconnecting..."); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Data Sync
  useEffect(() => {
    if (!user || !isLoggedIn || !db) return;
    try {
      const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
      const unsubscribeLeads = onSnapshot(leadsRef, (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sorted = [...leadsData].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setLeads(sorted);
      }, (err) => console.error("Sync Error:", err));
      return () => unsubscribeLeads();
    } catch (e) { console.error("Database Context Offline"); }
  }, [user, isLoggedIn]);

  const resetBiometricSession = useCallback(() => {
    setImage(null);
    setAnalysisResult(null);
    setMorphUrl(null);
    setLeadName('');
    setLeadEmail('');
    setLeadSubmitted(false);
    setShowLeadForm(false);
    setError(null);
  }, []);

  const stopCamera = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
    } catch (err) { console.error("Hardware Cleanup Fault", err); }
  }, []);

  useEffect(() => {
    if (activeTab !== 'vision') stopCamera();
  }, [activeTab, stopCamera]);

  const startCamera = async () => {
    try {
      resetBiometricSession(); 
      setError(null);
      stopCamera(); 
      const constraints = { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setIsCameraActive(true);
    } catch (err) { 
      setError("Camera Access Denied. Check browser settings."); 
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn("Video play delay."));
    }
  }, [isCameraActive]);

  const capturePhoto = () => {
    try {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0); 
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL('image/png'));
        stopCamera();
      }
    } catch (err) { setError("Capture failed."); }
  };

  const analyzeImage = async () => {
    if (!image || !geminiApiKey) {
      setError("AI Key Missing. Configure VITE_GEMINI_API_KEY in Vercel.");
      return;
    }
    setIsAnalyzing(true); setError(null);
    const b64 = image.split(',')[1];
    const systemPrompt = `MedSpa Diagnostics v5.0. Output STRICT JSON. { "auraScore": 750, "faceType": "", "clinicalRoadmap": [{"name": "", "benefit": "", "rationale": "", "estimatedValue": "$3,200"}], "halos": [] }`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Full diagnostic. 2026 Pricing." }, { inlineData: { mimeType: "image/png", data: b64 } }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText.match(/\{[\s\S]*\}/)[0]);
      setAnalysisResult(parsed);
      setTimeout(() => setShowLeadForm(true), 1500);
    } catch (err) { setError("AI Engine Busy."); } finally { setIsAnalyzing(false); }
  };

  const saveLead = async () => {
    if (!user || !analysisResult || !db) return;
    setIsSavingLead(true);
    const totalPotential = (analysisResult.clinicalRoadmap || []).reduce((acc, curr) => acc + (parseInt(String(curr.estimatedValue || "0").replace(/[^0-9]/g, '')) || 0), 0);
    const leadData = { name: leadName, email: leadEmail, auraScore: analysisResult.auraScore, estValue: `$${totalPotential.toLocaleString()}`, fullRoadmap: analysisResult.clinicalRoadmap, createdAt: serverTimestamp(), userId: user.uid };
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), leadData);
      setLeadSubmitted(true);
    } catch (e) { setError("Database sync failed."); } finally { setIsSavingLead(false); }
  };

  // --- ERROR STATE RENDERER ---
  if (systemStatus !== "ready") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center font-black">
        <div className="max-w-md space-y-6">
          <AlertCircle size={48} className="text-rose-500 mx-auto" />
          <h1 className="text-2xl text-white uppercase italic">System Handshake Failed</h1>
          <p className="text-slate-500 text-sm leading-relaxed italic">
            {systemStatus === "missing_config" ? "VITE_FIREBASE_CONFIG is missing in Vercel settings." : "Environment variable syntax error. Ensure JSON format is correct."}
          </p>
          <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl text-[10px] text-indigo-400 uppercase tracking-widest">
            Diagnostic Code: {systemStatus.toUpperCase()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-indigo-500/30 font-black">
      {/* HEADER */}
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Zap size={18} className="text-indigo-500" /><span className="text-xl uppercase italic text-white tracking-tighter">Aura Gold</span></div>
        <div className="flex gap-4 items-center">
          {!isLoggedIn ? (
            <button onClick={() => setShowLogin(true)} className="text-[10px] text-slate-500 uppercase tracking-widest">Provider Login</button>
          ) : (
            <button onClick={() => { setIsLoggedIn(false); setActiveTab('overview'); }} className="text-[10px] text-rose-500 uppercase tracking-widest">Logout</button>
          )}
        </div>
      </nav>

      {/* MODALS */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] max-w-sm w-full p-10 text-center shadow-2xl">
            <Unlock size={32} className="mx-auto mb-6 text-indigo-500" />
            <input type="password" value={loginKey} onChange={(e) => setLoginKey(e.target.value)} placeholder="Access Key" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-center mb-6 outline-none focus:border-indigo-500" />
            <button onClick={() => { if(loginKey.toUpperCase() === DEMO_PROVIDER_KEY) {setIsLoggedIn(true); setShowLogin(false); setActiveTab('enterprise');} }} className="w-full py-4 bg-indigo-600 rounded-xl uppercase text-[10px] tracking-widest">Authenticate</button>
            <button onClick={() => setShowLogin(false)} className="mt-4 text-[10px] text-slate-600 uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      {showLeadForm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-[2.5rem] max-w-sm w-full p-10 text-center shadow-2xl">
            {!leadSubmitted ? (
              <>
                <h2 className="text-xl text-white uppercase italic mb-6">Activate Clinical Report</h2>
                <div className="space-y-3 mb-6">
                  <input type="text" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Name" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm" />
                  <input type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Email" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm" />
                </div>
                <button onClick={saveLead} className="w-full py-4 bg-indigo-600 rounded-xl uppercase text-[10px] tracking-widest">{isSavingLead ? <RefreshCw className="animate-spin" /> : 'Dispatch Analysis'}</button>
              </>
            ) : (
              <div className="py-6">
                <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-6" />
                <button onClick={() => setShowLeadForm(false)} className="w-full py-4 bg-white text-black rounded-xl uppercase text-[10px] tracking-widest">View Results</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {activeTab === 'vision' ? (
          <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex justify-between items-end">
              <div><h1 className="text-4xl text-white uppercase italic leading-none">Vision Lab</h1><p className="text-slate-500 text-[9px] uppercase tracking-[0.4em] mt-3">Clinical Biometric Mapping</p></div>
              {analysisResult && (<div className="text-right"><div className="text-[10px] text-indigo-500 uppercase">Aura Score</div><div className="text-5xl italic text-white leading-none">{analysisResult.auraScore}</div></div>)}
            </header>

            {!image && !isCameraActive ? (
              <div className="grid md:grid-cols-2 gap-4">
                <button onClick={startCamera} className="p-12 rounded-[2.5rem] bg-indigo-600/5 border border-white/5 flex flex-col items-center gap-4 hover:bg-indigo-600/10 transition-all"><Camera size={32}/><span className="text-[10px] uppercase tracking-widest">Initialize Camera</span></button>
                <button onClick={() => fileInputRef.current.click()} className="p-12 rounded-[2.5rem] bg-slate-900 border border-white/5 flex flex-col items-center gap-4 hover:bg-slate-800 transition-all"><Upload size={32}/><span className="text-[10px] uppercase tracking-widest">Upload File</span></button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { const f = e.target.files[0]; if(f){const r=new FileReader(); r.onload=()=>setImage(r.result); r.readAsDataURL(f);}}} />
              </div>
            ) : isCameraActive ? (
              <div className="relative rounded-[3rem] overflow-hidden aspect-[3/4] max-w-sm mx-auto shadow-2xl border border-white/10">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6"><button onClick={stopCamera} className="p-4 bg-white/10 backdrop-blur-xl rounded-full text-white"><X/></button><button onClick={capturePhoto} className="p-6 bg-white rounded-full text-indigo-600"><Maximize2/></button></div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-5 space-y-4">
                  <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
                    <img src={image} className="w-full" alt="Captured" />
                    {isAnalyzing && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-pulse shadow-[0_0_15px_#6366f1]" />}
                    <button onClick={resetBiometricSession} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full border border-white/10"><RefreshCw size={16}/></button>
                  </div>
                  {!analysisResult && !isAnalyzing && (<button onClick={analyzeImage} className="w-full py-5 bg-white text-black rounded-2xl uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-500/10">Analyze Structural Profile</button>)}
                  {error && <p className="text-[10px] text-rose-500 uppercase tracking-widest text-center">{error}</p>}
                </div>
                <div className="lg:col-span-7 space-y-8 text-white">
                  {analysisResult && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 p-6 rounded-[2rem] border border-white/5"><div className="text-[8px] text-slate-500 uppercase mb-2">Archetype</div><div className="text-lg italic uppercase">{analysisResult.faceType}</div></div>
                        <div className="bg-indigo-600/10 p-6 rounded-[2rem] border border-indigo-500/20"><div className="text-[8px] text-indigo-400 uppercase mb-2">Primary Halo</div><div className="text-lg italic uppercase">{analysisResult.halos?.[0] || "Structural"}</div></div>
                      </div>
                      <section className="space-y-3">
                        <h4 className="text-[10px] text-indigo-500 uppercase tracking-widest px-2">Diagnostic Roadmap</h4>
                        <div className={`space-y-3 ${!isLoggedIn && !leadSubmitted ? 'blur-2xl opacity-30 select-none' : ''}`}>
                          {analysisResult.clinicalRoadmap?.map((item, i) => (
                            <div key={i} className="bg-slate-900 border border-white/5 p-6 rounded-3xl flex justify-between items-center shadow-lg">
                              <div><div className="text-xs uppercase italic text-white mb-1">{item.name}</div><div className="text-[9px] text-indigo-400 uppercase italic">{item.benefit}</div></div>
                              <div className="text-emerald-500 font-bold italic">{item.estimatedValue}</div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'enterprise' ? (
          <div className="space-y-10 animate-in fade-in duration-700">
            <header className="flex justify-between items-end text-white">
              <div><h1 className="text-4xl uppercase italic leading-none">Lead Manager</h1><p className="text-slate-500 text-[9px] uppercase tracking-[0.4em] mt-3">Enterprise Cloud Pipeline</p></div>
              <div className="flex gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-[2rem]"><div className="text-[8px] text-emerald-500 uppercase mb-1">Pipeline</div><div className="text-2xl italic">${(leads.reduce((a, b) => a + (parseInt(b.estValue?.replace(/\D/g,'')) || 0), 0)).toLocaleString()}</div></div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 px-8 py-4 rounded-[2rem]"><div className="text-[8px] text-indigo-500 uppercase mb-1">Total</div><div className="text-2xl italic">{leads.length}</div></div>
              </div>
            </header>
            <div className="space-y-3">
              {leads.map((lead) => (
                <div key={lead.id} className="bg-slate-900/50 border border-white/5 p-5 rounded-3xl flex justify-between items-center group hover:border-indigo-500/40 transition-all">
                  <div className="flex gap-4 items-center"><div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 italic font-bold">{lead.name?.substring(0,2).toUpperCase()}</div><div><div className="text-sm uppercase italic text-white">{lead.name}</div><div className="text-[9px] text-slate-500">{lead.email}</div></div></div>
                  <div className="text-right flex items-center gap-8"><div className="hidden md:block border-l border-white/10 px-8 text-center"><div className="text-[8px] text-slate-500 uppercase">Aura Score</div><div className="text-sm font-bold italic text-white">{lead.auraScore}</div></div><div className="border-l border-white/10 px-8 text-center"><div className="text-[8px] text-slate-500 uppercase">Potential</div><div className="text-sm font-bold italic text-emerald-500">{lead.estValue}</div></div><button onClick={() => setSelectedLead(lead)} className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><UserCheck size={16} /></button></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-700">
             <h1 className="text-5xl md:text-6xl text-white uppercase italic leading-[0.9] text-center mb-16">The Biometric<br/>Revenue Engine.</h1>
             <div className="grid gap-6">
                <div className="p-10 rounded-[3rem] bg-slate-900/40 border border-white/5 flex gap-8 items-start hover:bg-slate-900/60 transition-all"><div className="p-4 bg-indigo-600/10 text-indigo-400 rounded-2xl"><Layers size={24}/></div><div><h3 className="text-xl text-white uppercase italic mb-3">Structural Diagnostics</h3><p className="text-slate-400 text-sm leading-relaxed italic opacity-80">Aura replaces generic contact forms with real-time structural analysis. We justified high-ticket procedures before the patient even walks in.</p></div></div>
                <div className="p-10 rounded-[3rem] bg-indigo-600/5 border border-indigo-500/10 flex gap-8 items-start hover:bg-indigo-600/10 transition-all"><div className="p-4 bg-emerald-600/10 text-emerald-400 rounded-2xl"><CreditCard size={24}/></div><div><h3 className="text-xl text-white uppercase italic mb-3">Enterprise Pipeline</h3><p className="text-slate-400 text-sm leading-relaxed italic opacity-80">Track the dollar value of your biometric funnel. Sync high-intent patient files directly to your CRM with calculated clinical roadmaps.</p></div></div>
             </div>
             <button onClick={() => setActiveTab('vision')} className="w-full py-8 bg-white text-black rounded-[2.5rem] uppercase text-xs tracking-[0.4em] shadow-2xl hover:scale-[1.02] transition-all">Initialize Diagnostic Session</button>
          </div>
        )}
      </main>

      {/* MOBILE NAV */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex bg-black/80 backdrop-blur-2xl border border-white/10 p-2 rounded-full shadow-2xl z-40">
        <button onClick={() => setActiveTab('overview')} className={`p-4 rounded-full ${activeTab === 'overview' ? 'bg-white text-black shadow-lg' : 'text-slate-500'}`}><Layers size={20}/></button>
        <button onClick={() => setActiveTab('vision')} className={`p-4 rounded-full ${activeTab === 'vision' ? 'bg-white text-black shadow-lg' : 'text-slate-500'}`}><Search size={20}/></button>
        {isLoggedIn && <button onClick={() => setActiveTab('enterprise')} className={`p-4 rounded-full ${activeTab === 'enterprise' ? 'bg-white text-black shadow-lg' : 'text-slate-500'}`}><Briefcase size={20}/></button>}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;