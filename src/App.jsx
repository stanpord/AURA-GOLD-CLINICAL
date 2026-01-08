import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { 
  Zap, Eye, Search, Layers, Sparkle, Dumbbell, ShieldCheck, Briefcase, CreditCard, Cpu, 
  Camera, Upload, RefreshCw, Maximize2, X, CheckCircle2, Lock, Unlock, Key, Database, 
  Mail, Send, UserCheck, BarChart3, Microscope, Droplet, FlaskConical, ClipboardList, 
  Calendar, Phone, Info, ShieldAlert, ArrowRight, Activity as Pulse, LogOut, Heart, 
  Compass, Scan, Target, Ruler, FileText, Globe
} from 'lucide-react';

// --- PRODUCTION READY ENVIRONMENT HANDSHAKE ---
const getEnvVar = (key, fallback = '{}') => {
  try {
    // Check for Vite Env (Vercel Production)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
    // Check for Global Env (Gemini Preview)
    if (key === 'VITE_FIREBASE_CONFIG' && typeof __firebase_config !== 'undefined') {
      return __firebase_config;
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
};

const firebaseConfigRaw = getEnvVar('VITE_FIREBASE_CONFIG', '{}');
const apiKey = getEnvVar('VITE_GEMINI_API_KEY', '');

let app, auth, db, appId;
try {
  const config = JSON.parse(firebaseConfigRaw);
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'aura-medspa-enterprise-v1';
} catch (e) {
  console.warn("Clinical Node: Initializing with local context...");
}

const App = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMorphing, setIsMorphing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [morphUrl, setMorphUrl] = useState(null);
  
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [isSavingLead, setIsSavingLead] = useState(false);
  
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginKey, setLoginKey] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');

  const [isCameraActive, setIsCameraActive] = useState(false);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const DEMO_PROVIDER_KEY = "AURA-2026";

  useEffect(() => {
    const initAuth = async () => {
      if (!auth) return;
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.warn("Identity Layer handshake..."); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isLoggedIn || !db) return;
    try {
      const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
      const unsubscribeLeads = onSnapshot(leadsRef, (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sorted = [...leadsData].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setLeads(sorted);
      });
      return () => unsubscribeLeads();
    } catch (e) { console.error("Database Context Error"); }
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

  const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

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
      setError("Hardware Locked. Check browser permissions."); 
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn("Hardware initialization delay."));
    }
  }, [isCameraActive]);

  const capturePhoto = () => {
    try {
      if (videoRef.current && canvasRef.current && streamRef.current) {
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      resetBiometricSession();
      const r = new FileReader();
      r.onloadend = () => { setImage(r.result); };
      r.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    if (!apiKey) {
      setError("AI Service Disconnected. Check Vercel Env Vars.");
      return;
    }
    setIsAnalyzing(true); setError(null);
    const b64 = image.split(',')[1];
    
    const systemPrompt = `MedSpa Diagnostics v5.0. Output STRICT JSON.
    SCHEMA: { 
      "auraScore": 750, 
      "faceType": "", 
      "clinicalRoadmap": [
        {"name": "", "benefit": "", "rationale": "", "estimatedValue": "$3,200", "impactScore": "Primary Foundation"}
      ], 
      "halos": [] 
    }`;

    try {
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Compute comprehensive diagnostic. Use 2026 pricing. Include Peptides and IVs." }, { inlineData: { mimeType: "image/png", data: b64 } }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Format error");
      const parsed = JSON.parse(jsonMatch[0]);
      setAnalysisResult(parsed);
      setTimeout(() => setShowLeadForm(true), 1500);
    } catch (err) { setError("AI Engine busy. Please retry."); } finally { setIsAnalyzing(false); }
  };

  const generateMorph = async () => {
    if (!image || !apiKey) return;
    setIsMorphing(true); setError(null);
    const b64 = image.split(',')[1];
    try {
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Maintain identity 100%. Professional medical simulation." }, { inlineData: { mimeType: "image/png", data: b64 } }] }],
          generationConfig: { responseModalities: ["IMAGE"] }
        })
      });
      const b64Img = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (b64Img) setMorphUrl(`data:image/png;base64,${b64Img}`);
      else throw new Error("Handshake Timeout");
    } catch (err) { setError("Identity Engine busy."); } finally { setIsMorphing(false); }
  };

  const saveLead = async () => {
    if (!user || !analysisResult || !leadName || !leadEmail || !db) return;
    setIsSavingLead(true);
    const totalPotential = analysisResult.clinicalRoadmap?.reduce((acc, curr) => acc + (parseInt(String(curr.estimatedValue || "0").replace(/[^0-9]/g, '')) || 0), 0) || 2800;
    const leadData = { 
      name: leadName, 
      email: leadEmail, 
      auraScore: analysisResult.auraScore, 
      faceType: analysisResult.faceType, 
      estValue: `$${totalPotential.toLocaleString()}`, 
      fullRoadmap: analysisResult.clinicalRoadmap, 
      createdAt: serverTimestamp(), 
      userId: user.uid 
    };
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), leadData);
      setLeadSubmitted(true);
    } catch (e) { 
      console.error("Cloud write failed."); 
      setError("Sync failed. Check Authorized Domains in Firebase.");
    } finally { setIsSavingLead(false); }
  };

  const categories = [
    { id: 'overview', name: 'Foundation', icon: <Layers size={14} /> },
    { id: 'vision', name: 'Vision Lab', icon: <Search size={14} /> },
    { id: 'bio', name: 'Wellness', icon: <Sparkle size={14} /> },
    ...(isLoggedIn ? [{ id: 'enterprise', name: 'Leads', icon: <Briefcase size={14} /> }] : [])
  ];

  const protocolDetails = {
    overview: { 
      title: "Foundation Protocol", 
      description: "Enterprise structural diagnostics for high-ticket patient qualification.", 
      content: [
        { label: "Unified Anatomy Mapping", text: "Cohesive structural analysis of dermal laxity, fat pad migration, and periosteal foundation." }, 
        { label: "Maxillary Recession Modeling", text: "Predictive skeletal imaging to assess the loss of mid-face support." },
        { label: "Mandibular Tensile Analysis", text: "Evaluating structural tension across the jawline to justify lower-face restoration." },
        { label: "Periorbital Vector Mapping", text: "Calculating ocular hollow depth and brow symmetry." }
      ] 
    },
    bio: { 
      title: "Bio-Wellness Stack", 
      description: "Advanced Longevity & Subscription Protocols.", 
      content: [
        { label: "NAD+ DNA Repair (IV)", text: "Mitochondrial energy load-in designed to defend against cellular senescence." }, 
        { label: "Aura Glow Cocktails", text: "High-dose Glutathione and Vitamin C infusions for systemic radiance." },
        { label: "GHK-Cu & BPC-157 (Peptides)", text: "Tissue-signaling peptides that accelerate collagen synthesis." },
        { label: "Metabolic Secretagogues", text: "Monthly CJC-1295 and Ipamorelin protocols for growth factor production." }
      ] 
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden pb-32 font-black">
      <style>{`.mirror-video { transform: scaleX(-1); } .no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2rem] max-w-sm w-full p-8 shadow-2xl text-center">
            <Unlock className="mx-auto mb-4 text-indigo-400" size={32} />
            <h2 className="text-xl font-black uppercase mb-6 text-white leading-none">Clinic Node Login</h2>
            <input type="password" value={loginKey} onChange={(e) => setLoginKey(e.target.value)} placeholder="Enterprise Key" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-center outline-none focus:border-indigo-500 text-white font-black mb-4" />
            <button onClick={() => { if(loginKey.toUpperCase() === DEMO_PROVIDER_KEY) {setIsLoggedIn(true); setShowLogin(false); setActiveTab('enterprise');} else {setLoginError('Invalid');} }} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest transition-all active:scale-95">Authenticate System</button>
            <button onClick={() => setShowLogin(false)} className="w-full text-slate-600 text-[10px] uppercase font-black mt-4 hover:text-white transition-colors">Cancel Access</button>
          </div>
        </div>
      )}

      {/* LEAD CAPTURE MODAL */}
      {showLeadForm && analysisResult && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl">
            {!leadSubmitted ? (
              <div className="space-y-4 text-center">
                <ClipboardList className="mx-auto text-indigo-400" size={32} />
                <h2 className="text-xl uppercase leading-tight text-white font-black">Unlock Clinical Roadmap</h2>
                <input type="text" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Patient Name" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 text-white font-black" />
                <input type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Patient Email" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 text-white font-black" />
                <button disabled={isSavingLead || !leadName || !leadEmail} onClick={saveLead} className="w-full py-4 bg-indigo-600 text-white rounded-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 font-black transition-all active:scale-95">{isSavingLead ? <RefreshCw className="animate-spin" /> : 'Dispatch Full Report'}</button>
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="mx-auto text-emerald-400 mb-4" size={40} />
                <h2 className="text-xl uppercase mb-2 text-white font-black">Diagnostic Unlocked</h2>
                <button onClick={() => setShowLeadForm(false)} className="w-full py-4 bg-white text-black rounded-xl uppercase text-[10px] tracking-widest mt-6 transition-all active:scale-95 font-black">View Clinical Results</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between font-black">
        <div className="flex items-center gap-2"><Zap size={18} className="text-indigo-500" /><span className="text-xl tracking-tighter uppercase italic text-white font-black">Aura Biometrics</span></div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-1">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => { setActiveTab(cat.id); setMorphUrl(null); }} className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest border transition-all ${activeTab === cat.id ? 'bg-white text-black border-white shadow-xl scale-105' : 'text-slate-500 border-transparent hover:border-white/10'}`}>{cat.name}</button>
            ))}
          </div>
          {isLoggedIn ? (
            <button onClick={() => setIsLoggedIn(false)} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"><LogOut size={12} /> Logout</button>
          ) : (
            <button onClick={() => setShowLogin(true)} className="text-[10px] text-slate-500 hover:text-indigo-400 font-black uppercase tracking-widest transition-colors">Provider Login</button>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 font-black">
        {(() => {
          switch (activeTab) {
            case 'vision':
              return (
                <div className="space-y-8 animate-in fade-in duration-700">
                  <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div><h1 className="text-3xl uppercase tracking-tight text-white leading-none font-black">Vision Lab</h1><p className="text-slate-500 uppercase text-[9px] tracking-widest italic mt-2 opacity-60">Identity preserved clinical mapping</p></div>
                    {analysisResult && (<div className="text-right"><div className="text-[9px] text-indigo-400 uppercase mb-1">Score</div><div className="text-4xl italic text-white tabular-nums leading-none font-black">{analysisResult.auraScore}<span className="text-indigo-500 text-lg">/1000</span></div></div>)}
                  </header>
                  {!image && !isCameraActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button onClick={startCamera} className="p-8 rounded-[2rem] bg-indigo-600/5 border border-indigo-500/10 flex flex-col items-center justify-center gap-4 hover:bg-indigo-600/10 transition-all text-indigo-300 active:scale-95"><Camera size={28}/><span className="uppercase text-[10px] tracking-widest">Open Biometric Cam</span></button>
                      <button onClick={() => fileInputRef.current?.click()} className="p-8 rounded-[2rem] bg-slate-900 border border-white/5 flex flex-col items-center justify-center gap-4 hover:bg-slate-800 transition-all text-slate-400 active:scale-95"><Upload size={28}/><span className="uppercase text-[10px] tracking-widest">Import Patient File</span></button>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    </div>
                  ) : isCameraActive ? (
                    <div className="relative rounded-[2rem] overflow-hidden bg-black aspect-[3/4] max-w-sm mx-auto shadow-2xl border border-white/10">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror-video" />
                      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6"><button onClick={stopCamera} className="p-4 bg-white/5 backdrop-blur-xl rounded-full text-white border border-white/10 active:scale-90 transition-all"><X size={20}/></button><button onClick={capturePhoto} className="p-6 bg-white rounded-full text-indigo-600 shadow-2xl active:scale-90 transition-all"><Maximize2 size={24}/></button></div>
                    </div>
                  ) : (
                    <div className="grid lg:grid-cols-12 gap-8 items-start">
                      <div className="lg:col-span-5 space-y-4">
                        <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-900"><img src={image} className="w-full grayscale-[0.2]" alt="Patient" />{isAnalyzing && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-[scan_2s_infinite]" />}<button onClick={resetBiometricSession} className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 transition-all active:rotate-180"><RefreshCw size={16}/></button></div>
                        {!analysisResult && !isAnalyzing && (<button onClick={analyzeImage} className="w-full py-4 bg-white text-black font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">Generate Diagnostic</button>)}
                        {analysisResult && !morphUrl && (<button onClick={generateMorph} disabled={isMorphing} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">{isMorphing ? 'Anchoring...' : 'Visualize Potential'}</button>)}
                        {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl text-[10px] uppercase tracking-widest text-center">{error}</div>}
                      </div>
                      <div className="lg:col-span-7 space-y-8 text-white">
                        {morphUrl && (<div className="animate-in zoom-in-95 space-y-3"><div className="text-[8px] text-indigo-400 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={12} /> Biometric Simulation Locked</div><div className="rounded-[2rem] overflow-hidden border border-indigo-500/40 shadow-2xl"><img src={morphUrl} alt="Morph" className="w-full h-auto" /></div></div>)}
                        {analysisResult && (
                          <div className="grid gap-4 animate-in slide-in-from-right-10 duration-700">
                            <div className="grid grid-cols-2 gap-3 h-20">
                                <div className="bg-slate-900 border border-white/10 rounded-2xl p-3 flex flex-col justify-center overflow-hidden break-words shadow-lg">
                                    <div className="text-[7px] text-slate-500 uppercase mb-0.5 tracking-widest leading-none">Archetype</div>
                                    <div className="text-[13px] font-black italic uppercase leading-none break-words line-clamp-2 text-white">{String(analysisResult?.faceType || 'Refined')}</div>
                                </div>
                                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-3 flex flex-col justify-center overflow-hidden break-words shadow-lg">
                                    <div className="text-[7px] text-indigo-400 uppercase mb-0.5 tracking-widest leading-none">Primary Halo</div>
                                    <div className="text-[12px] font-bold italic leading-none break-words line-clamp-2 text-white">{String(analysisResult?.halos?.[0] || 'Structural Harmony')}</div>
                                </div>
                            </div>
                            <section className="space-y-3 relative">
                              <h4 className="text-[9px] text-indigo-400 uppercase tracking-widest px-1 font-black">Diagnostic Roadmap (Impact Hierarchy)</h4>
                              <div className={`grid gap-3 transition-all ${!isLoggedIn && !leadSubmitted ? 'blur-xl opacity-30 select-none pointer-events-none' : ''}`}>
                                {analysisResult.clinicalRoadmap?.map((service, i) => (
                                  <div key={i} className={`p-4 rounded-2xl flex flex-col gap-3 transition-all ${i === 0 ? 'bg-indigo-600/10 border border-indigo-500/30 shadow-lg' : 'bg-slate-900 border border-white/5 opacity-80'}`}>
                                      <div className="flex justify-between items-center">
                                          <div className="flex gap-3 items-center">
                                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-indigo-500' : 'bg-white/5 text-indigo-400'}`}>
                                                  {i === 0 ? <Zap size={18} /> : <Microscope size={16} />}
                                              </div>
                                              <div>
                                                  <div className="flex items-center gap-2"><h5 className="font-black text-white text-[11px] uppercase italic tracking-wide">{service.name}</h5>{i === 0 && <span className="text-[7px] bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Impact</span>}</div>
                                                  <p className="text-indigo-400 text-[8px] mt-1 uppercase italic leading-none">{service.benefit}</p>
                                              </div>
                                          </div>
                                          <div className="text-[11px] text-emerald-400 tabular-nums font-black">{service.estimatedValue}</div>
                                      </div>
                                      <div className="p-3 bg-black/40 border border-white/5 rounded-xl"><p className="text-[10px] text-slate-400 italic leading-relaxed font-medium">"{service.rationale}"</p></div>
                                  </div>
                                ))}
                              </div>
                              {!isLoggedIn && !leadSubmitted && (
                                <div className="absolute inset-0 flex items-center justify-center"><div className="text-center p-6 bg-black/60 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-2xl"><Lock size={20} className="mx-auto mb-3 text-indigo-400" /><button onClick={() => setShowLeadForm(true)} className="px-6 py-3 bg-white text-black font-black text-[9px] uppercase rounded-lg tracking-widest shadow-xl transition-all active:scale-95">Unlock Clinical Roadmap</button></div></div>
                              )}
                            </section>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            case 'enterprise':
              return isLoggedIn && (
                <div className="animate-in fade-in duration-700 space-y-10">
                   <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-white">
                     <div><h1 className="text-3xl font-black uppercase tracking-tight leading-none">Lead Manager</h1><p className="text-slate-500 uppercase text-[9px] font-bold tracking-widest mt-2 italic opacity-60">Real-Time Enterprise Cloud Sync</p></div>
                     <div className="flex gap-2">
                       <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-2xl font-black"><div className="text-[7px] text-emerald-400 uppercase mb-1 tracking-widest">Pipeline</div><div className="text-xl italic text-white leading-none">${(leads.reduce((acc, lead) => acc + (parseInt(String(lead.estValue || "").replace(/[^0-9]/g, '')) || 0), 0)).toLocaleString()}</div></div>
                       <div className="bg-indigo-500/10 border border-indigo-500/20 px-6 py-4 rounded-2xl font-black"><div className="text-[7px] text-indigo-400 uppercase mb-1 tracking-widest">Total</div><div className="text-xl italic text-white leading-none">{leads.length}</div></div>
                     </div>
                   </header>
                   <div className="space-y-3">
                      {leads.length === 0 ? (
                        <div className="p-20 text-center bg-slate-900/40 rounded-[2rem] border border-white/5 border-dashed">
                          <Database size={32} className="mx-auto mb-4 text-slate-700" />
                          <p className="text-slate-500 text-[10px] uppercase tracking-widest italic font-black">Awaiting Biometric Sync</p>
                        </div>
                      ) : (
                        <div className="space-y-2">{(leads ?? []).map((lead) => (
                            <div key={lead.id} className="bg-slate-900/50 border border-white/5 rounded-2xl hover:border-indigo-500/30 transition-all p-4"><div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 text-white">
                                <div className="col-span-6 flex items-center gap-4"><div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 font-black text-[10px] uppercase italic">{String(lead.name || "").substring(0,2)}</div><div className="min-w-0 font-black"><div className="font-black text-sm uppercase truncate">{String(lead.name || "")}</div><div className="text-[9px] text-slate-500 truncate font-bold">{String(lead.email || "")}</div></div></div>
                                <div className="col-span-4 text-center hidden md:block border-l border-white/5"><div className="text-[7px] text-slate-500 uppercase tracking-widest leading-none">Potential</div><div className="text-sm font-black italic text-emerald-400 leading-none mt-1">{String(lead.estValue || "")}</div></div>
                                <div className="col-span-2 flex justify-end"><button onClick={() => setSelectedLead(lead)} className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-lg"><UserCheck size={16} /></button></div>
                            </div></div>
                          ))}</div>
                      )}
                   </div>
                </div>
              );
            case 'overview':
            case 'bio':
              const details = protocolDetails[activeTab];
              return (
                <div className="animate-in fade-in duration-700 max-w-3xl mx-auto space-y-6 font-black">
                   <h1 className="text-3xl md:text-4xl font-black uppercase text-white leading-none">{details.title}</h1>
                   <p className="text-slate-400 text-sm font-medium leading-relaxed italic opacity-80">{details.description}</p>
                   <div className="grid gap-4">
                     {details.content.map((item, idx) => (
                       <div key={idx} className="p-8 rounded-[2rem] border border-white/5 bg-slate-900/40">
                          <div className="flex gap-4 items-start font-black">
                            <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400"><Zap size={18} /></div>
                            <div><h3 className="text-lg uppercase mb-2 text-white leading-none font-black">{item.label}</h3><p className="text-slate-400 font-medium text-xs tracking-wide leading-relaxed">{item.text}</p></div>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              );
            default: return null;
          }
        })()}
      </main>
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex bg-black/80 backdrop-blur-2xl border border-white/10 p-1.5 rounded-full shadow-2xl z-40">
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => { setActiveTab(cat.id); setMorphUrl(null); }} className={`p-3 rounded-full transition-all ${activeTab === cat.id ? 'bg-white text-black shadow-lg scale-105' : 'text-slate-500'}`}>{cat.icon}</button>
        ))}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;