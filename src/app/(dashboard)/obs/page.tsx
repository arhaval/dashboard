'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase client (browser)
// ─────────────────────────────────────────────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CHANNEL = 'obs-overlay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface LogEntry {
  id  : string;
  text: string;
  ts  : number;
}

interface OverlayDef {
  overlay          : string;
  label            : string;
  icon             : string;
  color            : string;
  data?            : Record<string, unknown>;
  hasInput?        : boolean;
  inputPlaceholder?: string;
  hasSecondInput?  : boolean;
  secondInputKey?  : string;
  secondInputPlaceholder?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlay definitions
// ─────────────────────────────────────────────────────────────────────────────
const OVERLAYS: OverlayDef[] = [
  {
    overlay : 'ad',
    label   : 'Reklam Arası',
    icon    : '📢',
    color   : '#FF4D00',
    data    : { duration: 15, title: 'Arhaval', subtitle: 'İzlediğin için teşekkürler!' },
  },
  {
    overlay          : 'banner',
    label            : 'Alt Banner',
    icon             : '🎯',
    color            : '#3B82F6',
    hasInput         : true,
    inputPlaceholder : 'Banner metni...',
  },
  {
    overlay          : 'lower',
    label            : 'Lower Third',
    icon             : '🎤',
    color            : '#8B5CF6',
    hasInput         : true,
    inputPlaceholder : 'İsim...',
    hasSecondInput   : true,
    secondInputKey   : 'sub',
    secondInputPlaceholder: 'Alt başlık (opsiyonel)...',
  },
  {
    overlay          : 'popup',
    label            : 'Köşe Pop-up',
    icon             : '🔔',
    color            : '#6366F1',
    hasInput         : true,
    inputPlaceholder : 'Pop-up metni...',
  },
  {
    overlay          : 'alert',
    label            : 'Merkez Alert',
    icon             : '⚡',
    color            : '#EAB308',
    hasInput         : true,
    inputPlaceholder : 'Alert metni...',
  },
  {
    overlay : 'hype',
    label   : 'HYPE!',
    icon    : '🔥',
    color   : '#F97316',
    data    : {},
  },
  {
    overlay : 'gg',
    label   : 'GG',
    icon    : '🏆',
    color   : '#22C55E',
    data    : {},
  },
  {
    overlay : 'brb',
    label   : 'BRB (aç/kapat)',
    icon    : '⏸️',
    color   : '#6B7280',
    data    : {},
  },
  {
    overlay          : 'score',
    label            : 'Skor Tabelası',
    icon             : '🎮',
    color            : '#EF4444',
    hasInput         : true,
    inputPlaceholder : 'Takım 1 - Skor1 : Takım 2 - Skor2 (örn: ARHAVAL-14:RIVAL-11)',
  },
  {
    overlay : 'clip',
    label   : 'Clip It!',
    icon    : '🎬',
    color   : '#EC4899',
    data    : {},
  },
  {
    overlay          : 'countdown',
    label            : 'Geri Sayım',
    icon             : '⏱️',
    color            : '#14B8A6',
    hasInput         : true,
    inputPlaceholder : 'Başlık (örn: Maç Başlıyor)',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function OBSPage() {
  const channelRef    = useRef<ReturnType<typeof sb.channel> | null>(null);
  const [ready,       setReady]       = useState(false);
  const [logs,        setLogs]        = useState<LogEntry[]>([]);
  const [inputTexts,  setInputTexts]  = useState<Record<string, string>>({});
  const [input2Texts, setInput2Texts] = useState<Record<string, string>>({});
  const [lastTrigger, setLastTrigger] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = useCallback((text: string) => {
    setLogs((p) => [
      ...p.slice(-99),
      { id: Math.random().toString(36).slice(2), text, ts: Date.now() },
    ]);
  }, []);

  // ── Supabase Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    const ch = sb.channel(CHANNEL, { config: { broadcast: { self: false } } });
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setReady(true);
        addLog('✅ Supabase Realtime bağlandı');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setReady(false);
        addLog('❌ Bağlantı kesildi');
      }
    });
    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [addLog]);

  // ── Parse score input ─────────────────────────────────────────────────────
  const parseScore = (raw: string) => {
    // Format: "ARHAVAL-14:RIVAL-11" or "ARHAVAL 14 : RIVAL 11"
    const parts = raw.split(':');
    if (parts.length !== 2) return null;
    const left  = parts[0].trim();
    const right = parts[1].trim();
    const lMatch = left.match(/^(.+?)[- ](\d+)$/);
    const rMatch = right.match(/^(.+?)[- ](\d+)$/);
    if (!lMatch || !rMatch) return null;
    return {
      team1: lMatch[1].trim(), score1: parseInt(lMatch[2]),
      team2: rMatch[1].trim(), score2: parseInt(rMatch[2]),
    };
  };

  // ── Trigger overlay ───────────────────────────────────────────────────────
  const trigger = useCallback(async (ov: OverlayDef) => {
    if (!channelRef.current || !ready) return;

    const text  = inputTexts[ov.overlay]?.trim();
    const text2 = input2Texts[ov.overlay]?.trim();
    let data: Record<string, unknown> = { ...(ov.data ?? {}) };

    if (ov.overlay === 'score' && text) {
      const parsed = parseScore(text);
      if (parsed) data = { ...data, ...parsed };
    } else if (ov.overlay === 'countdown' && text) {
      data = { ...data, text, from: 5 };
    } else if (ov.overlay === 'lower' && text) {
      data = { ...data, name: text };
      if (text2) data.sub = text2;
    } else if (ov.hasInput && text) {
      data = { ...data, text };
    }

    await channelRef.current.send({
      type   : 'broadcast',
      event  : 'trigger',
      payload: { overlay: ov.overlay, data },
    });

    addLog(`🚀 ${ov.label} tetiklendi${text ? ` → "${text}"` : ''}`);
    setLastTrigger(ov.overlay);
    setTimeout(() => setLastTrigger(null), 2000);
  }, [ready, inputTexts, input2Texts, addLog]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">OBS Overlay Kontrol</h1>
            <p className="text-[#6B6B6B] text-sm mt-1">
              Supabase Realtime · Premium GSAP animasyonları · İstediğin yerden kontrol et
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full transition-all ${ready ? 'bg-[#22C55E] shadow-[0_0_10px_#22C55E]' : 'bg-[#EF4444]'}`} />
            <span className="text-sm text-[#A1A1A1] font-mono">
              {ready ? 'CANLI' : 'bağlanıyor...'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* ── Left 2 cols: Overlay buttons ── */}
          <div className="col-span-2 space-y-4">
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-widest mb-4">
                Overlay Tetikleyiciler
              </p>

              <div className="grid grid-cols-2 gap-3">
                {OVERLAYS.map((ov) => {
                  const isActive = lastTrigger === ov.overlay;
                  return (
                    <div
                      key={ov.overlay}
                      className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-lg p-4 space-y-3 transition-all"
                      style={{ borderColor: isActive ? ov.color + '80' : undefined }}
                    >
                      {/* Title */}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl leading-none">{ov.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#FAFAFA] truncate">{ov.label}</p>
                          <p className="text-[10px] text-[#6B6B6B] font-mono">{ov.overlay}</p>
                        </div>
                      </div>

                      {/* Primary text input */}
                      {ov.hasInput && (
                        <input
                          type="text"
                          placeholder={ov.inputPlaceholder}
                          value={inputTexts[ov.overlay] || ''}
                          onChange={(e) => setInputTexts((p) => ({ ...p, [ov.overlay]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && trigger(ov)}
                          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#FF4D00] transition-colors"
                        />
                      )}

                      {/* Secondary text input */}
                      {ov.hasSecondInput && (
                        <input
                          type="text"
                          placeholder={ov.secondInputPlaceholder}
                          value={input2Texts[ov.overlay] || ''}
                          onChange={(e) => setInput2Texts((p) => ({ ...p, [ov.overlay]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && trigger(ov)}
                          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#FF4D00] transition-colors"
                        />
                      )}

                      {/* Trigger button */}
                      <button
                        onClick={() => trigger(ov)}
                        disabled={!ready}
                        className="w-full py-2.5 rounded text-sm font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{
                          background: isActive ? ov.color : 'transparent',
                          border    : `1px solid ${ov.color}`,
                          color     : isActive ? '#fff' : ov.color,
                          boxShadow : isActive ? `0 0 24px ${ov.color}50` : 'none',
                        }}
                      >
                        {isActive ? '✓ Gönderildi!' : 'Tetikle →'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OBS Setup */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-widest">Yayıncıya OBS Kurulum Talimatı</p>
              <div className="space-y-2 text-sm text-[#A1A1A1]">
                <p><span className="text-[#FF4D00] font-bold">1.</span> OBS → Sources → + → <strong className="text-[#FAFAFA]">Browser Source</strong></p>
                <p><span className="text-[#FF4D00] font-bold">2.</span> Boyut: <code className="bg-[#1F1F1F] px-1.5 py-0.5 rounded text-xs text-[#FAFAFA]">1920 × 1080</code> · Şeffaf arka plan ✓ · Custom CSS <strong className="text-[#FAFAFA]">boş bırak</strong></p>
                <p><span className="text-[#FF4D00] font-bold">3.</span> URL:</p>
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded p-3">
                  <code className="text-xs text-[#22C55E] break-all select-all">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/obs-overlay/index.html`
                      : 'https://yonetim.arhaval.com/obs-overlay/index.html'}
                  </code>
                </div>
                <p className="text-xs text-[#6B6B6B]">
                  💡 Test için URL&apos;ye <code className="text-[#FAFAFA]">?test=1</code> ekle — tüm animasyonlar sırayla çalar
                </p>
                <p className="text-xs text-[#6B6B6B]">
                  🎬 Skor formatı: <code className="text-[#FAFAFA]">ARHAVAL-14:RIVAL-11</code>
                </p>
              </div>
            </div>
          </div>

          {/* ── Right col: Log ── */}
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg flex flex-col" style={{ height: '700px' }}>
              <div className="p-3 border-b border-[#2A2A2A] flex items-center justify-between">
                <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-widest">İşlem Günlüğü</p>
                <button
                  onClick={() => setLogs([])}
                  className="text-[10px] text-[#6B6B6B] hover:text-[#A1A1A1] transition-colors"
                >
                  Temizle
                </button>
              </div>
              <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {logs.length === 0 && (
                  <p className="text-xs text-[#6B6B6B] text-center mt-12">Henüz işlem yok</p>
                )}
                {logs.map((l) => (
                  <div key={l.id} className="flex gap-2 text-xs">
                    <span className="text-[#6B6B6B] shrink-0 font-mono tabular-nums">
                      {new Date(l.ts).toLocaleTimeString('tr-TR', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </span>
                    <span className="text-[#A1A1A1]">{l.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info box */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-widest">Nasıl Çalışır</p>
              <div className="space-y-1.5 text-xs text-[#6B6B6B]">
                <p>→ Sen butona basarsın</p>
                <p>→ Supabase Realtime&apos;a gider</p>
                <p>→ Yayıncının OBS&apos;i anında alır</p>
                <p>→ GSAP animasyonu oynar + ses çalar</p>
                <p className="text-[#22C55E] mt-2">11 overlay · GSAP · Web Audio API</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
