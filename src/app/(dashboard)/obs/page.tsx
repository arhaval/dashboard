'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase
// ─────────────────────────────────────────────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const CHANNEL = 'obs-overlay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface LogEntry   { id: string; text: string; ts: number; type: 'info' | 'success' | 'warn'; }
interface ScoreState { team1: string; score1: number; team2: string; score2: number; map: string; visible: boolean; }
interface PresetStep { overlay: string; data: Record<string, unknown>; delay: number; }
interface Preset     { id: string; label: string; desc: string; icon: string; color: string; sequence: PresetStep[]; }
interface TeamStanding { team_id: string; team_name: string; rank: number; wins: number; losses: number; points: number; maps_won: number; maps_lost: number; }

// ─────────────────────────────────────────────────────────────────────────────
// CS2 Maps
// ─────────────────────────────────────────────────────────────────────────────
const CS2_MAPS = ['MIRAGE', 'INFERNO', 'DUST2', 'NUKE', 'ANCIENT', 'ANUBIS', 'VERTIGO', 'TRAIN', 'OVERPASS', 'CACHE'];

// ─────────────────────────────────────────────────────────────────────────────
// Preset Scenarios
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS: Preset[] = [
  {
    id: 'match_start', label: 'Maç Başlıyor', desc: 'Geri sayım → skor tabelası', icon: '🎮', color: '#14B8A6',
    sequence: [
      { overlay: 'countdown', data: { from: 5, text: 'Maç Başlıyor' }, delay: 0 },
    ],
  },
  {
    id: 'clutch', label: 'Clutch Anı', desc: 'Alert + Hype zincirleme', icon: '💥', color: '#EAB308',
    sequence: [
      { overlay: 'alert', data: { text: 'CLUTCH!', duration: 3 }, delay: 0 },
      { overlay: 'hype',  data: { duration: 3 }, delay: 1400 },
    ],
  },
  {
    id: 'ace', label: 'ACE!', desc: 'Alert + Hype + Clip', icon: '🔫', color: '#EF4444',
    sequence: [
      { overlay: 'alert', data: { text: 'A C E !', duration: 3 }, delay: 0 },
      { overlay: 'hype',  data: { duration: 3 }, delay: 1200 },
      { overlay: 'clip',  data: { text: 'Clip It!', duration: 3 }, delay: 2000 },
    ],
  },
  {
    id: 'round_win', label: 'Round Kazanıldı', desc: 'Alert bildirimi', icon: '✅', color: '#22C55E',
    sequence: [
      { overlay: 'alert', data: { text: 'ROUND KAZANILDI!', duration: 3 }, delay: 0 },
    ],
  },
  {
    id: 'match_end', label: 'Maç Bitti', desc: 'GG konfeti', icon: '🏆', color: '#F5C842',
    sequence: [
      { overlay: 'gg', data: { duration: 6 }, delay: 0 },
    ],
  },
  {
    id: 'break', label: 'Mola / BRB', desc: 'Banner + BRB ekranı', icon: '⏸️', color: '#6B7280',
    sequence: [
      { overlay: 'banner', data: { text: 'Kısa bir mola veriyoruz, hemen döneceğiz!', duration: 6 }, delay: 0 },
      { overlay: 'brb',    data: { text: 'Hemen Geri Dönüyorum' }, delay: 800 },
    ],
  },
  {
    id: 'stream_start', label: 'Yayın Açılışı', desc: 'Geri sayım 10sn', icon: '🎬', color: '#8B5CF6',
    sequence: [
      { overlay: 'countdown', data: { from: 10, text: 'Yayın Başlıyor' }, delay: 0 },
    ],
  },
  {
    id: 'ad_break', label: 'Reklam Arası', desc: '15sn reklam overlay', icon: '📢', color: '#FF4D00',
    sequence: [
      { overlay: 'ad', data: { duration: 15, title: 'Arhaval', subtitle: 'İzlediğin için teşekkürler!' }, delay: 0 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function OBSPage() {
  const channelRef    = useRef<ReturnType<typeof sb.channel> | null>(null);
  const [ready,       setReady]       = useState(false);
  const [logs,        setLogs]        = useState<LogEntry[]>([]);
  const [activePreset,setActivePreset]= useState<string | null>(null);
  const [activeQuick, setActiveQuick] = useState<string | null>(null);
  const [bannerText,  setBannerText]  = useState('');
  const [popupText,   setPopupText]   = useState('');
  const [alertText,   setAlertText]   = useState('');
  const [lowerName,   setLowerName]   = useState('');
  const [lowerSub,    setLowerSub]    = useState('');
  const [cdText,      setCdText]      = useState('Maç Başlıyor');
  const [cdFrom,      setCdFrom]      = useState(5);
  const [score, setScore] = useState<ScoreState>({
    team1: 'ARHAVAL', score1: 0,
    team2: 'RIVAL',   score2: 0,
    map: 'MIRAGE',    visible: false,
  });
  const [urlCopied,    setUrlCopied]    = useState(false);
  const [standings,    setStandings]    = useState<TeamStanding[]>([]);
  const [tsTeam1Id,    setTsTeam1Id]    = useState('');
  const [tsTeam2Id,    setTsTeam2Id]    = useState('');
  const [tsVisible,    setTsVisible]    = useState(false);
  const [tsLabel,      setTsLabel]      = useState('LİG DURUMU');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'success') => {
    setLogs((p) => [...p.slice(-149), { id: Math.random().toString(36).slice(2), text, ts: Date.now(), type }]);
  }, []);

  // ── Realtime bağlantı ─────────────────────────────────────────────────────
  useEffect(() => {
    const ch = sb.channel(CHANNEL, { config: { broadcast: { self: false } } });
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') { setReady(true);  addLog('Supabase Realtime bağlandı', 'info'); }
      else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') { setReady(false); addLog('Bağlantı kesildi', 'warn'); }
    });
    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [addLog]);

  // ── Standings fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchStandings() {
      const { data: matches } = await sb
        .from('cs2_matches')
        .select('team1_id,team2_id,winner_team_id,team1_maps_won,team2_maps_won')
        .eq('status', 'FINISHED');
      const { data: teams } = await sb.from('cs2_teams').select('id,name');
      if (!matches || !teams) return;

      const map: Record<string, { team_id: string; team_name: string; wins: number; losses: number; points: number; maps_won: number; maps_lost: number }> = {};
      for (const t of teams) {
        map[t.id] = { team_id: t.id, team_name: t.name, wins: 0, losses: 0, points: 0, maps_won: 0, maps_lost: 0 };
      }
      for (const m of matches) {
        const t1 = map[m.team1_id]; const t2 = map[m.team2_id];
        if (!t1 || !t2) continue;
        t1.maps_won += m.team1_maps_won; t1.maps_lost += m.team2_maps_won;
        t2.maps_won += m.team2_maps_won; t2.maps_lost += m.team1_maps_won;
        t1.points   += m.team1_maps_won; t2.points    += m.team2_maps_won;
        if (m.winner_team_id === m.team1_id) { t1.wins++; t2.losses++; }
        else if (m.winner_team_id === m.team2_id) { t2.wins++; t1.losses++; }
      }
      const sorted = Object.values(map)
        .sort((a, b) => b.points - a.points || (b.maps_won - b.maps_lost) - (a.maps_won - a.maps_lost))
        .map((s, i) => ({ ...s, rank: i + 1 }));
      setStandings(sorted);
    }
    fetchStandings();
  }, []);

  // ── Core send ─────────────────────────────────────────────────────────────
  const sendTrigger = useCallback(async (overlay: string, data: Record<string, unknown>) => {
    if (!channelRef.current || !ready) return false;
    await channelRef.current.send({ type: 'broadcast', event: 'trigger', payload: { overlay, data } });
    return true;
  }, [ready]);

  // ── Preset runner ─────────────────────────────────────────────────────────
  const runPreset = useCallback(async (preset: Preset) => {
    if (!ready) return;
    setActivePreset(preset.id);
    addLog(`🎬 "${preset.label}" başlatıldı`);
    let cumDelay = 0;
    for (const step of preset.sequence) {
      cumDelay += step.delay;
      const { overlay, data, delay: _d } = step;
      void _d;
      setTimeout(() => sendTrigger(overlay, data), cumDelay);
    }
    setTimeout(() => setActivePreset(null), 2500);
  }, [ready, sendTrigger, addLog]);

  // ── Quick fire ────────────────────────────────────────────────────────────
  const quickFire = useCallback(async (overlay: string, data: Record<string, unknown>, label: string) => {
    const ok = await sendTrigger(overlay, data);
    if (!ok) return;
    addLog(`⚡ ${label}`);
    setActiveQuick(overlay);
    setTimeout(() => setActiveQuick(null), 1800);
  }, [sendTrigger, addLog]);

  // ── Score helpers ─────────────────────────────────────────────────────────
  const adjustScore = useCallback((team: 1 | 2, delta: number) => {
    setScore((s) => {
      const next = { ...s };
      if (team === 1) next.score1 = Math.max(0, s.score1 + delta);
      else            next.score2 = Math.max(0, s.score2 + delta);
      return next;
    });
  }, []);

  const sendScore = useCallback((s: ScoreState) => {
    sendTrigger('score', { team1: s.team1, score1: s.score1, team2: s.team2, score2: s.score2, map: s.map, duration: 0 });
    addLog(`🎮 Skor: ${s.team1} ${s.score1}–${s.score2} ${s.team2} (${s.map})`);
    setScore((prev) => ({ ...prev, visible: true }));
  }, [sendTrigger, addLog]);

  const hideScore = useCallback(() => {
    sendTrigger('score_hide', {});
    addLog('🎮 Skor tabelası kapatıldı', 'info');
    setScore((s) => ({ ...s, visible: false }));
  }, [sendTrigger, addLog]);

  // ── Team Stats ────────────────────────────────────────────────────────────
  const sendTeamStats = useCallback(() => {
    const t1 = standings.find(s => s.team_id === tsTeam1Id);
    const t2 = standings.find(s => s.team_id === tsTeam2Id);
    if (!t1 || !t2) return;
    sendTrigger('team_stats', {
      label: tsLabel,
      team1: { name: t1.team_name, rank: t1.rank, wins: t1.wins, losses: t1.losses, points: t1.points },
      team2: { name: t2.team_name, rank: t2.rank, wins: t2.wins, losses: t2.losses, points: t2.points },
    });
    addLog(`📊 Lig durumu: ${t1.team_name} vs ${t2.team_name}`);
    setTsVisible(true);
  }, [standings, tsTeam1Id, tsTeam2Id, tsLabel, sendTrigger, addLog]);

  const hideTeamStats = useCallback(() => {
    sendTrigger('team_stats_hide', {});
    addLog('📊 Lig durumu overlay kapatıldı', 'info');
    setTsVisible(false);
  }, [sendTrigger, addLog]);

  // ── Copy OBS URL ──────────────────────────────────────────────────────────
  const copyUrl = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/obs-overlay/index.html` : '';
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  };

  const obsUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/obs-overlay/index.html`
    : 'https://yonetim.arhaval.com/obs-overlay/index.html';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 space-y-5">
      <div className="max-w-[1400px] mx-auto space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">OBS Overlay Kontrol</h1>
            <p className="text-[#4A4A4A] text-xs mt-0.5 font-mono">
              GSAP · Web Audio API · Supabase Realtime
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Kill All — emergency clear */}
            <button
              onClick={() => { quickFire('kill_all', {}, 'Tüm overlay\'ler temizlendi'); setTsVisible(false); setScore(s => ({ ...s, visible: false })); }}
              disabled={!ready}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#EF444440] bg-[#EF444410] text-xs text-[#EF4444] hover:bg-[#EF444420] hover:border-[#EF4444] transition-all font-mono disabled:opacity-30"
            >
              ✕ Tümünü Kapat
            </button>
            {/* OBS URL copy */}
            <button
              onClick={copyUrl}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#2A2A2A] bg-[#141414] text-xs text-[#6B6B6B] hover:text-[#A1A1A1] hover:border-[#3A3A3A] transition-all font-mono"
            >
              {urlCopied ? '✓ Kopyalandı' : '⎘ OBS URL'}
            </button>
            {/* Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded border bg-[#141414] transition-all"
              style={{ borderColor: ready ? '#22C55E30' : '#EF444430' }}>
              <div className={`w-2 h-2 rounded-full ${ready ? 'bg-[#22C55E] shadow-[0_0_8px_#22C55E]' : 'bg-[#EF4444] animate-pulse'}`} />
              <span className="text-xs font-mono" style={{ color: ready ? '#22C55E' : '#EF4444' }}>
                {ready ? 'CANLI' : 'BAĞLANIYOR'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Hazır Senaryolar ─────────────────────────────────────────────── */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-widest mb-3">
            Hazır Senaryolar
          </p>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => runPreset(preset)}
                  disabled={!ready}
                  className="relative flex flex-col gap-1 p-3 rounded-lg border text-left transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden group"
                  style={{
                    borderColor : isActive ? preset.color + 'AA' : '#2A2A2A',
                    background  : isActive ? preset.color + '18' : '#1A1A1A',
                    boxShadow   : isActive ? `0 0 20px ${preset.color}30` : 'none',
                  }}
                >
                  {/* Active pulse bar */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 animate-pulse"
                      style={{ background: preset.color }} />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl leading-none">{preset.icon}</span>
                    {preset.sequence.length > 1 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: preset.color + '20', color: preset.color }}>
                        {preset.sequence.length} adım
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[#FAFAFA] leading-tight">{preset.label}</p>
                  <p className="text-[10px] text-[#4A4A4A] leading-tight">{preset.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main 3-column ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-[1fr_1fr_320px] gap-4">

          {/* ── Col 1: Score + Quick Fire ── */}
          <div className="space-y-4">

            {/* CS2 Score Panel */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-widest">Skor Tabelası</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${score.visible ? 'bg-[#22C55E20] text-[#22C55E]' : 'bg-[#2A2A2A] text-[#4A4A4A]'}`}>
                    {score.visible ? '● EKRANDA' : '○ GİZLİ'}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Map */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#4A4A4A] uppercase tracking-widest w-12">Harita</span>
                  <div className="flex gap-1 flex-wrap">
                    {CS2_MAPS.map((m) => (
                      <button key={m} onClick={() => setScore((s) => ({ ...s, map: m }))}
                        className="text-[10px] px-2 py-0.5 rounded transition-all"
                        style={{
                          background: score.map === m ? '#FF4D00' : '#1F1F1F',
                          color     : score.map === m ? '#fff' : '#6B6B6B',
                          border    : `1px solid ${score.map === m ? '#FF4D00' : '#2A2A2A'}`,
                        }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                  {/* Team 1 */}
                  <div className="space-y-2">
                    <input value={score.team1}
                      onChange={(e) => setScore((s) => ({ ...s, team1: e.target.value.toUpperCase() }))}
                      className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded px-3 py-1.5 text-sm font-bold text-[#EF4444] placeholder:text-[#3A3A3A] focus:outline-none focus:border-[#EF4444] uppercase tracking-wide"
                      placeholder="TAKIM 1"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustScore(1, -1)}
                        className="flex-1 py-1.5 rounded border border-[#2A2A2A] text-[#6B6B6B] text-lg font-bold hover:bg-[#1F1F1F] hover:text-[#FAFAFA] transition-all">
                        −
                      </button>
                      <span className="text-4xl font-black text-[#EF4444] font-mono w-14 text-center tabular-nums">
                        {score.score1}
                      </span>
                      <button onClick={() => adjustScore(1, +1)}
                        className="flex-1 py-1.5 rounded border border-[#2A2A2A] text-[#6B6B6B] text-lg font-bold hover:bg-[#1F1F1F] hover:text-[#FAFAFA] transition-all">
                        +
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="text-center">
                    <div className="text-2xl font-black text-[#3A3A3A]">:</div>
                    <div className="text-[9px] text-[#3A3A3A] font-mono mt-0.5">{score.map}</div>
                  </div>

                  {/* Team 2 */}
                  <div className="space-y-2">
                    <input value={score.team2}
                      onChange={(e) => setScore((s) => ({ ...s, team2: e.target.value.toUpperCase() }))}
                      className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded px-3 py-1.5 text-sm font-bold text-[#3B82F6] placeholder:text-[#3A3A3A] focus:outline-none focus:border-[#3B82F6] uppercase tracking-wide text-right"
                      placeholder="TAKIM 2"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustScore(2, -1)}
                        className="flex-1 py-1.5 rounded border border-[#2A2A2A] text-[#6B6B6B] text-lg font-bold hover:bg-[#1F1F1F] hover:text-[#FAFAFA] transition-all">
                        −
                      </button>
                      <span className="text-4xl font-black text-[#3B82F6] font-mono w-14 text-center tabular-nums">
                        {score.score2}
                      </span>
                      <button onClick={() => adjustScore(2, +1)}
                        className="flex-1 py-1.5 rounded border border-[#2A2A2A] text-[#6B6B6B] text-lg font-bold hover:bg-[#1F1F1F] hover:text-[#FAFAFA] transition-all">
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Score Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => sendScore(score)} disabled={!ready}
                    className="py-2.5 rounded text-sm font-bold bg-[#FF4D00] text-white hover:bg-[#FF6B2C] transition-all disabled:opacity-30">
                    {score.visible ? 'Güncelle' : 'Göster'}
                  </button>
                  <button onClick={hideScore} disabled={!ready || !score.visible}
                    className="py-2.5 rounded text-sm font-bold border border-[#2A2A2A] text-[#6B6B6B] hover:bg-[#1F1F1F] hover:text-[#FAFAFA] transition-all disabled:opacity-30">
                    Gizle
                  </button>
                  <button
                    onClick={() => setScore((s) => ({ ...s, score1: 0, score2: 0 }))}
                    className="py-2.5 rounded text-sm font-bold border border-[#2A2A2A] text-[#6B6B6B] hover:bg-[#1F1F1F] hover:text-[#FAFAFA] transition-all">
                    Sıfırla
                  </button>
                </div>
              </div>
            </div>

            {/* Hızlı Aksiyonlar */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
              <p className="text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-widest mb-3">Hızlı Aksiyon</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { overlay: 'hype',  label: 'HYPE!',   icon: '🔥', color: '#F97316' },
                  { overlay: 'clip',  label: 'Clip It!', icon: '🎬', color: '#EC4899' },
                  { overlay: 'gg',    label: 'GG!',      icon: '🏆', color: '#22C55E' },
                  { overlay: 'brb',   label: 'BRB',      icon: '⏸️', color: '#6B7280' },
                ].map((q) => {
                  const isActive = activeQuick === q.overlay;
                  return (
                    <button key={q.overlay}
                      onClick={() => quickFire(q.overlay, {}, `${q.label} tetiklendi`)}
                      disabled={!ready}
                      className="flex items-center justify-center gap-2 py-4 rounded-lg border font-bold text-base transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        borderColor: isActive ? q.color : '#2A2A2A',
                        background : isActive ? q.color + '20' : '#1A1A1A',
                        color      : isActive ? q.color : '#A1A1A1',
                        boxShadow  : isActive ? `0 0 24px ${q.color}40` : 'none',
                      }}>
                      <span className="text-xl">{q.icon}</span>
                      <span>{isActive ? '✓' : q.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Col 2: Metin Overlayleri ── */}
          <div className="space-y-3">

            {/* Lower Third */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎤</span>
                <p className="text-xs font-semibold text-[#FAFAFA]">Lower Third</p>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-auto">lower</span>
              </div>
              <input value={lowerName} onChange={(e) => setLowerName(e.target.value)}
                placeholder="İsim (örn: Arhaval)"
                onKeyDown={(e) => e.key === 'Enter' && quickFire('lower', { name: lowerName, sub: lowerSub, tag: 'ARHAVAL', duration: 6 }, `Lower: ${lowerName}`)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#8B5CF6] transition-colors"
              />
              <input value={lowerSub} onChange={(e) => setLowerSub(e.target.value)}
                placeholder="Alt başlık (örn: CS2 · Hafta 9)"
                onKeyDown={(e) => e.key === 'Enter' && quickFire('lower', { name: lowerName, sub: lowerSub, tag: 'ARHAVAL', duration: 6 }, `Lower: ${lowerName}`)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#8B5CF6] transition-colors"
              />
              <button onClick={() => quickFire('lower', { name: lowerName, sub: lowerSub, tag: 'ARHAVAL', duration: 6 }, `Lower: ${lowerName}`)}
                disabled={!ready || !lowerName}
                className="w-full py-2 rounded text-sm font-bold transition-all border border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF620] disabled:opacity-30 disabled:cursor-not-allowed">
                Ekrana Gönder
              </button>
            </div>

            {/* Alert */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <p className="text-xs font-semibold text-[#FAFAFA]">Merkez Alert</p>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-auto">alert</span>
              </div>
              <input value={alertText} onChange={(e) => setAlertText(e.target.value)}
                placeholder="Alert metni (BÜYÜK harf önerilir)"
                onKeyDown={(e) => e.key === 'Enter' && quickFire('alert', { text: alertText, duration: 4 }, `Alert: ${alertText}`)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#EAB308] transition-colors"
              />
              <div className="grid grid-cols-3 gap-2">
                {['CLUTCH!', 'ROUND!', 'NICE SHOT!'].map((t) => (
                  <button key={t} onClick={() => { setAlertText(t); quickFire('alert', { text: t, duration: 4 }, `Alert: ${t}`); }}
                    disabled={!ready}
                    className="py-1.5 rounded text-xs font-bold border border-[#2A2A2A] text-[#6B6B6B] hover:border-[#EAB308] hover:text-[#EAB308] transition-all disabled:opacity-30">
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={() => quickFire('alert', { text: alertText, duration: 4 }, `Alert: ${alertText}`)}
                disabled={!ready || !alertText}
                className="w-full py-2 rounded text-sm font-bold transition-all border border-[#EAB308] text-[#EAB308] hover:bg-[#EAB30820] disabled:opacity-30 disabled:cursor-not-allowed">
                Gönder
              </button>
            </div>

            {/* Banner */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <p className="text-xs font-semibold text-[#FAFAFA]">Alt Banner</p>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-auto">banner</span>
              </div>
              <input value={bannerText} onChange={(e) => setBannerText(e.target.value)}
                placeholder="Banner metni..."
                onKeyDown={(e) => e.key === 'Enter' && quickFire('banner', { text: bannerText, duration: 8 }, `Banner: ${bannerText}`)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#3B82F6] transition-colors"
              />
              <div className="grid grid-cols-2 gap-2">
                {['Arhaval ile CS2 izliyorsunuz!', 'Discord: discord.gg/arhaval'].map((t) => (
                  <button key={t} onClick={() => { setBannerText(t); quickFire('banner', { text: t, duration: 8 }, `Banner: ${t}`); }}
                    disabled={!ready}
                    className="py-1.5 rounded text-[10px] border border-[#2A2A2A] text-[#4A4A4A] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all text-left px-2 disabled:opacity-30 truncate">
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={() => quickFire('banner', { text: bannerText, duration: 8 }, `Banner: ${bannerText}`)}
                disabled={!ready || !bannerText}
                className="w-full py-2 rounded text-sm font-bold transition-all border border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F620] disabled:opacity-30 disabled:cursor-not-allowed">
                Gönder
              </button>
            </div>

            {/* Popup */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <p className="text-xs font-semibold text-[#FAFAFA]">Köşe Pop-up</p>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-auto">popup</span>
              </div>
              <input value={popupText} onChange={(e) => setPopupText(e.target.value)}
                placeholder="Pop-up metni..."
                onKeyDown={(e) => e.key === 'Enter' && quickFire('popup', { text: popupText, title: 'BİLDİRİM', duration: 6 }, `Popup: ${popupText}`)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#6366F1] transition-colors"
              />
              <button onClick={() => quickFire('popup', { text: popupText, title: 'BİLDİRİM', duration: 6 }, `Popup: ${popupText}`)}
                disabled={!ready || !popupText}
                className="w-full py-2 rounded text-sm font-bold transition-all border border-[#6366F1] text-[#6366F1] hover:bg-[#6366F120] disabled:opacity-30 disabled:cursor-not-allowed">
                Gönder
              </button>
            </div>

            {/* Countdown */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏱️</span>
                <p className="text-xs font-semibold text-[#FAFAFA]">Geri Sayım</p>
                <span className="text-[9px] font-mono text-[#4A4A4A] ml-auto">countdown</span>
              </div>
              <div className="flex gap-2">
                <input value={cdText} onChange={(e) => setCdText(e.target.value)}
                  placeholder="Başlık"
                  className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#14B8A6] transition-colors"
                />
                <select value={cdFrom} onChange={(e) => setCdFrom(Number(e.target.value))}
                  className="bg-[#0A0A0A] border border-[#2A2A2A] rounded px-2 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#14B8A6] transition-colors">
                  {[3, 5, 10, 15, 30].map((n) => <option key={n} value={n}>{n}sn</option>)}
                </select>
              </div>
              <button onClick={() => quickFire('countdown', { from: cdFrom, text: cdText }, `Geri sayım ${cdFrom}sn`)}
                disabled={!ready}
                className="w-full py-2 rounded text-sm font-bold transition-all border border-[#14B8A6] text-[#14B8A6] hover:bg-[#14B8A620] disabled:opacity-30 disabled:cursor-not-allowed">
                Başlat
              </button>
            </div>
          </div>

          {/* ── Col 3: Log ── */}
          <div className="space-y-3">
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg flex flex-col" style={{ height: '780px' }}>
              <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-widest">Canlı Log</p>
                <button onClick={() => setLogs([])}
                  className="text-[10px] text-[#3A3A3A] hover:text-[#6B6B6B] transition-colors font-mono">
                  TEMİZLE
                </button>
              </div>
              <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {logs.length === 0 && (
                  <p className="text-[11px] text-[#3A3A3A] text-center mt-16 font-mono">
                    — log boş —
                  </p>
                )}
                {logs.map((l) => (
                  <div key={l.id} className="flex gap-2 items-start text-[11px]">
                    <span className="text-[#3A3A3A] shrink-0 font-mono tabular-nums pt-px">
                      {new Date(l.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={
                      l.type === 'warn' ? 'text-[#EAB308]' :
                      l.type === 'info' ? 'text-[#3B82F6]' :
                      'text-[#A1A1A1]'
                    }>{l.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OBS URL Box */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-[#4A4A4A] uppercase tracking-widest">OBS Browser Source URL</p>
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded p-2 flex items-center gap-2">
                <code className="text-[10px] text-[#22C55E] flex-1 break-all font-mono">{obsUrl}</code>
                <button onClick={copyUrl}
                  className="shrink-0 text-[10px] px-2 py-1 rounded border border-[#2A2A2A] text-[#4A4A4A] hover:text-[#A1A1A1] transition-colors font-mono">
                  {urlCopied ? '✓' : '⎘'}
                </button>
              </div>
              <p className="text-[10px] text-[#3A3A3A]">1920×1080 · Şeffaf arka plan · Custom CSS boş</p>
            </div>
          </div>

        </div>

        {/* ── Lig Durumu Overlay ───────────────────────────────────────────────── */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <p className="text-xs font-semibold text-[#FAFAFA]">Lig Durumu Overlay</p>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${tsVisible ? 'bg-[#22C55E20] text-[#22C55E]' : 'bg-[#2A2A2A] text-[#4A4A4A]'}`}>
                {tsVisible ? '● EKRANDA' : '○ GİZLİ'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#4A4A4A]">team_stats</span>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end">
            {/* Team 1 */}
            <div className="space-y-1">
              <p className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">Takım 1</p>
              <select
                value={tsTeam1Id}
                onChange={(e) => setTsTeam1Id(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#FF4D00] transition-colors"
              >
                <option value="">Seç...</option>
                {standings.map(s => (
                  <option key={s.team_id} value={s.team_id}>
                    #{s.rank} {s.team_name} ({s.points}p)
                  </option>
                ))}
              </select>
            </div>

            {/* Team 2 */}
            <div className="space-y-1">
              <p className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">Takım 2</p>
              <select
                value={tsTeam2Id}
                onChange={(e) => setTsTeam2Id(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#FF4D00] transition-colors"
              >
                <option value="">Seç...</option>
                {standings.map(s => (
                  <option key={s.team_id} value={s.team_id}>
                    #{s.rank} {s.team_name} ({s.points}p)
                  </option>
                ))}
              </select>
            </div>

            {/* Başlık */}
            <div className="space-y-1">
              <p className="text-[10px] text-[#4A4A4A] uppercase tracking-widest">Başlık</p>
              <input
                value={tsLabel}
                onChange={(e) => setTsLabel(e.target.value)}
                placeholder="LİG DURUMU"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#FF4D00] transition-colors"
              />
            </div>

            <button
              onClick={sendTeamStats}
              disabled={!ready || !tsTeam1Id || !tsTeam2Id}
              className="py-2 px-5 rounded text-sm font-bold bg-[#FF4D00] text-white hover:bg-[#FF6B2C] transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {tsVisible ? 'Güncelle' : 'Göster'}
            </button>

            <button
              onClick={hideTeamStats}
              disabled={!ready || !tsVisible}
              className="py-2 px-5 rounded text-sm font-bold border border-[#2A2A2A] text-[#6B6B6B] hover:bg-[#1F1F1F] hover:text-[#FAFAFA] transition-all disabled:opacity-30 whitespace-nowrap"
            >
              Gizle
            </button>
          </div>

          {/* Mini önizleme */}
          {(tsTeam1Id || tsTeam2Id) && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1F1F1F]">
              {[tsTeam1Id, tsTeam2Id].map((id, i) => {
                const t = standings.find(s => s.team_id === id);
                if (!t) return (
                  <div key={i} className="bg-[#0F0F0F] rounded border border-[#1F1F1F] p-3 flex items-center justify-center">
                    <span className="text-[11px] text-[#3A3A3A]">— seçilmedi —</span>
                  </div>
                );
                return (
                  <div key={i} className="bg-[#0F0F0F] rounded border border-[#1F1F1F] p-3 flex items-center gap-3">
                    <span className="text-2xl font-black text-[#FF4D00] font-mono w-9 text-center leading-none">#{t.rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#FAFAFA] truncate">{t.team_name}</p>
                      <p className="text-[10px] text-[#4A4A4A] font-mono mt-0.5">{t.wins}G · {t.losses}M</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#FF4D00] font-mono leading-none">{t.points}</p>
                      <p className="text-[9px] text-[#4A4A4A] uppercase tracking-wider">puan</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
