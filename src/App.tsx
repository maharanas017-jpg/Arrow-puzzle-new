/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Code, DollarSign, Copy, Check, ExternalLink, Download, ShieldCheck, Smartphone, Info, Sparkles, HelpCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'game' | 'code' | 'ads'>('game');
  const [copied, setCopied] = useState(false);

  const gameUrl = '/assets/aistudio/arrow-puzzle_6517ccf4.html';
  const fullGameUrl = window.location.origin + gameUrl;

  const copyLink = () => {
    navigator.clipboard.writeText(fullGameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0826] via-[#1b1448] to-[#0a0724] text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 flex items-center justify-center shadow-lg shadow-purple-500/30 text-2xl font-black">
            ➤
          </div>
          <div>
            <h1 className="font-black text-lg tracking-wider bg-gradient-to-r from-white via-yellow-200 to-pink-400 bg-clip-text text-transparent">
              ARROW PUZZLE
            </h1>
            <p className="text-xs text-white/60">Game Link & AdMob Monetization Guide</p>
          </div>
        </div>

        <nav className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('game')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'game'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            Play Game
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'code'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code className="w-4 h-4" />
            Game Link & Code
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'ads'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Kon Sa Ads Lagaye? (AdMob Guide)
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {activeTab === 'game' && (
          <div className="flex-1 flex flex-col relative w-full h-[calc(100vh-73px)]">
            <iframe
              src={gameUrl}
              className="w-full h-full border-0 absolute inset-0"
              title="Arrow Puzzle Game"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {activeTab === 'code' && (
          <div className="max-w-5xl mx-auto p-6 md:p-10 w-full flex flex-col gap-8 animate-fade-in">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                    Game Link & URL
                  </h2>
                  <p className="text-white/70 text-sm mt-1">
                    Share this direct game link with players, embed it in your website, or use it in your Android APK webview.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/30 hover:scale-105 transition-all text-sm"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Link Copied!' : 'Copy Game Link'}
                  </button>
                  <a
                    href={gameUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 rounded-2xl font-bold transition-all text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Fullscreen
                  </a>
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 font-mono text-sm text-yellow-300 overflow-x-auto">
                <span className="truncate">{fullGameUrl}</span>
                <a
                  href={gameUrl}
                  download="arrow-puzzle.html"
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-sans text-xs font-bold shrink-0 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download HTML
                </a>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  How to Use This Game Code
                </h3>
                <ul className="space-y-3 text-sm text-white/80 list-disc list-inside">
                  <li><strong>Single-File HTML5:</strong> The entire game (HTML, Canvas rendering, procedural level generator, Web Audio sound effects, particle system, UI modals) is contained in one single robust HTML file located at <code className="bg-black/40 px-1.5 py-0.5 rounded text-yellow-300">/public/assets/aistudio/arrow-puzzle_6517ccf4.html</code>.</li>
                  <li><strong>Hosting:</strong> You can host it on Vercel, Netlify, GitHub Pages, or any static web host.</li>
                  <li><strong>Android Wrapper:</strong> Wrap it inside an Android WebView app (Java/Kotlin or Capacitor) to publish on Google Play Store with real AdMob ads.</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  APK & Native Integration
                </h3>
                <ul className="space-y-3 text-sm text-white/80 list-disc list-inside">
                  <li><strong>JavaScript Interface:</strong> The game automatically detects <code className="bg-black/40 px-1.5 py-0.5 rounded text-blue-300">window.AndroidAds</code> and triggers native Rewarded and Interstitial ads.</li>
                  <li><strong>Callbacks:</strong> Calls <code className="bg-black/40 px-1.5 py-0.5 rounded text-blue-300">window.onAdRewarded()</code>, <code className="bg-black/40 px-1.5 py-0.5 rounded text-blue-300">window.onAdClosed()</code>, and <code className="bg-black/40 px-1.5 py-0.5 rounded text-blue-300">window.onAdFailed()</code> to grant coins/hints.</li>
                  <li><strong>Fallback:</strong> When played in a regular browser, it gracefully runs built-in interactive 5-second simulated test ads.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="max-w-4xl mx-auto p-6 md:p-10 w-full flex flex-col gap-8 animate-fade-in">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-black">
                  ₹
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Is Game Mein Kon Se Ads Lagayein? (AdMob Guide)</h2>
                  <p className="text-white/70 text-sm">Complete monetization strategy and AdMob ad unit setup guide in Hindi & English.</p>
                </div>
              </div>

              <div className="space-y-6 text-sm text-white/80 leading-relaxed mt-6">
                <div className="bg-black/40 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-base font-bold text-yellow-300 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> 1. Rewarded Video Ads (सबसे महत्वपूर्ण / Most Important)
                  </h3>
                  <p className="mb-2">
                    Is puzzle game mein players ko <strong>Hints</strong>, <strong>Extra Lives (Revive)</strong>, <strong>Level Skip</strong>, aur <strong>Daily/Shop Free Coins</strong> ke liye Rewarded Ads ki sabse zyada zaroorat hoti hai. Yeh players ko ad dekhne par reward deta hai jisse high eCPM aur revenue milti hai.
                  </p>
                  <p className="text-white/90">
                    <strong>AdMob Unit Type:</strong> Rewarded Ad<br />
                    <strong>Google Test Ad ID:</strong> <code className="bg-black/60 px-2 py-0.5 rounded text-yellow-200">ca-app-pub-3940256099942544/5224354917</code>
                  </p>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-base font-bold text-yellow-300 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> 2. Interstitial Ads (Between Levels)
                  </h3>
                  <p className="mb-2">
                    Jab player koi level complete karta hai ya level retry karta hai, tab full-screen Interstitial Ad show kiya jata hai. Game code mein 45 seconds ka cooldown aur first 2 levels mein ad-free experience ka rule built-in hai taaki user experience kharab na ho aur retention bani rahe.
                  </p>
                  <p className="text-white/90">
                    <strong>AdMob Unit Type:</strong> Interstitial Ad<br />
                    <strong>Google Test Ad ID:</strong> <code className="bg-black/60 px-2 py-0.5 rounded text-yellow-200">ca-app-pub-3940256099942544/1033173712</code>
                  </p>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-base font-bold text-yellow-300 mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" /> How to Replace Test IDs with Real AdMob IDs?
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-white/80 mt-2">
                    <li>Google AdMob account banayein (<a href="https://admob.google.com" target="_blank" rel="noreferrer" className="text-yellow-300 underline">admob.google.com</a>).</li>
                    <li>Apna Android App add karein aur Ad Units (Interstitial & Rewarded) create karein.</li>
                    <li>Game code ke <code className="bg-black/60 px-2 py-0.5 rounded text-yellow-200">CONFIG.adUnits</code> object mein apne real AdMob Unit IDs daalein.</li>
                    <li>Android WebView app mein <code className="bg-black/60 px-2 py-0.5 rounded text-yellow-200">AndroidAds</code> Javascript interface implement karein.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
