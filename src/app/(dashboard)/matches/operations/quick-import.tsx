'use client';

import { useState, useActionState } from 'react';
import { importFromDathost, importFromCSV, scanServerCSVs, fetchServerCSV } from '../match-actions';
import { CS2_MAPS } from '@/constants';
import type { DatHostServer } from '@/types';

type ImportState = {
  error?: string;
  success?: boolean;
  matchId?: string;
  team1Name?: string;
  team2Name?: string;
  score?: string;
  map?: string;
  playersCount?: number;
  mapNumber?: number;
} | null;

type ServerMatch = {
  matchId: string;
  mapNumber: number;
  team1Name: string;
  team1Score: number;
  team2Name: string;
  team2Score: number;
  mapName: string;
  csvPath: string | null;
  csvName: string | null;
};

export function QuickImport({ servers }: { servers: DatHostServer[] }) {
  const [tab, setTab] = useState<'server' | 'csv' | 'dathost'>('server');

  return (
    <div className="rounded-md border border-[#2A2A2A] bg-[#141414] p-4 space-y-3">
      <h3 className="text-sm font-medium text-[#FAFAFA]">Maç Verisi İçe Aktar</h3>
      <p className="text-xs text-[#6B6B6B]">
        Takımlar, oyuncular ve istatistikler otomatik oluşturulur
      </p>

      <div className="flex gap-1 rounded bg-[#0A0A0A] p-1">
        <TabButton active={tab === 'server'} onClick={() => setTab('server')}>
          Sunucudan Çek
        </TabButton>
        <TabButton active={tab === 'csv'} onClick={() => setTab('csv')}>
          CSV Yükle
        </TabButton>
        <TabButton active={tab === 'dathost'} onClick={() => setTab('dathost')}>
          DatHost Match ID
        </TabButton>
      </div>

      {tab === 'server' && <ServerScanTab servers={servers} />}
      {tab === 'csv' && <CSVUploadTab />}
      {tab === 'dathost' && <DatHostImportTab />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-[#1F1F1F] text-[#FAFAFA]' : 'text-[#6B6B6B] hover:text-[#A1A1A1]'
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Server Scan (primary method)
// ---------------------------------------------------------------------------
function ServerScanTab({ servers }: { servers: DatHostServer[] }) {
  const [selectedServer, setSelectedServer] = useState('');
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState<ServerMatch[]>([]);
  const [scanError, setScanError] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>(null);

  const handleScan = async () => {
    if (!selectedServer) return;
    setScanning(true);
    setScanError('');
    setMatches([]);
    setImportState(null);

    const fd = new FormData();
    // Find the dathost_server_id from our registered server
    const server = servers.find((s) => s.id === selectedServer);
    if (!server) { setScanError('Sunucu bulunamadı'); setScanning(false); return; }

    fd.set('dathost_server_id', server.dathost_server_id);
    const result = await scanServerCSVs(fd);

    if ('error' in result) {
      setScanError(result.error as string);
    } else {
      setMatches((result as { matches: ServerMatch[] }).matches);
    }
    setScanning(false);
  };

  const handleImport = async (match: ServerMatch) => {
    if (!match.csvPath) return;
    setImportingId(match.matchId);
    setImportState(null);

    const server = servers.find((s) => s.id === selectedServer);
    if (!server) return;

    // Fetch CSV content
    const fetchFd = new FormData();
    fetchFd.set('dathost_server_id', server.dathost_server_id);
    fetchFd.set('csv_path', match.csvPath);
    const fetchResult = await fetchServerCSV(fetchFd);

    if ('error' in fetchResult) {
      setImportState({ error: fetchResult.error as string });
      setImportingId(null);
      return;
    }

    // Import with pre-filled data from SQLite
    const importFd = new FormData();
    importFd.set('csv_text', (fetchResult as { csvText: string }).csvText);
    importFd.set('map', match.mapName || 'de_dust2');
    importFd.set('team1_score', String(match.team1Score));
    importFd.set('team2_score', String(match.team2Score));
    importFd.set('team1_name', match.team1Name);
    importFd.set('team2_name', match.team2Name);

    const importResult = await importFromCSV(importFd);
    if ('error' in importResult) {
      setImportState({ error: importResult.error as string });
    } else {
      const r = importResult as Record<string, unknown>;
      setImportState({
        success: true,
        matchId: r.matchId as string,
        team1Name: r.team1Name as string,
        team2Name: r.team2Name as string,
        playersCount: r.playersCount as number,
        mapNumber: r.mapNumber as number,
      });
      // Remove imported match from list
      setMatches((prev) => prev.filter((m) => m.matchId !== match.matchId));
    }
    setImportingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={selectedServer}
          onChange={(e) => setSelectedServer(e.target.value)}
          className="flex-1 rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA]"
        >
          <option value="">Sunucu seçin</option>
          {servers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={handleScan}
          disabled={scanning || !selectedServer}
          className="rounded bg-[#FF4D00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50 whitespace-nowrap"
        >
          {scanning ? 'Taranıyor...' : 'Maçları Tara'}
        </button>
      </div>

      {servers.length === 0 && (
        <p className="text-xs text-[#6B6B6B]">
          Henüz sunucu eklenmemiş. Aşağıdaki Sunucu Yönetimi bölümünden ekleyin.
        </p>
      )}

      {scanError && <p className="text-sm text-red-400">{scanError}</p>}

      {matches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[#A1A1A1]">{matches.length} maç bulundu:</p>
          {matches.map((m) => (
            <div
              key={m.matchId}
              className="flex items-center justify-between rounded border border-[#2A2A2A] bg-[#0A0A0A] p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#FAFAFA]">
                    {m.team1Name}
                  </span>
                  <span className="rounded bg-[#1F1F1F] px-2 py-0.5 text-xs font-mono font-bold text-[#FF4D00]">
                    {m.team1Score} - {m.team2Score}
                  </span>
                  <span className="text-sm font-medium text-[#FAFAFA]">
                    {m.team2Name}
                  </span>
                </div>
                <p className="text-xs text-[#6B6B6B]">
                  {m.mapName ? m.mapName.replace('de_', '') : 'Bilinmeyen harita'} — Maç #{m.matchId}
                </p>
              </div>
              <button
                onClick={() => handleImport(m)}
                disabled={!m.csvPath || importingId === m.matchId}
                className="rounded bg-[#FF4D00] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50"
              >
                {importingId === m.matchId ? 'Aktarılıyor...' : 'İçe Aktar'}
              </button>
            </div>
          ))}
        </div>
      )}

      <ImportResult state={importState} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: CSV File Upload
// ---------------------------------------------------------------------------
function CSVUploadTab() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: ImportState, formData: FormData) => {
      const result = await importFromCSV(formData);
      if ('error' in result) return { error: result.error as string };
      const r = result as Record<string, unknown>;
      return {
        success: true,
        matchId: r.matchId as string,
        team1Name: r.team1Name as string,
        team2Name: r.team2Name as string,
        playersCount: r.playersCount as number,
        mapNumber: r.mapNumber as number,
      };
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[#6B6B6B]">Takım 1 Adı (opsiyonel)</label>
          <input
            name="team1_name"
            placeholder="CSV'den otomatik alınır"
            className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#6B6B6B]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#6B6B6B]">Takım 2 Adı (opsiyonel)</label>
          <input
            name="team2_name"
            placeholder="CSV'den otomatik alınır"
            className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#6B6B6B]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[#6B6B6B]">Harita</label>
          <select
            name="map"
            required
            className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA]"
          >
            <option value="">Seçin</option>
            {CS2_MAPS.map((m) => (
              <option key={m} value={m}>{m.replace('de_', '')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#6B6B6B]">Takım 1 Skor</label>
          <input
            name="team1_score"
            type="number"
            min={0}
            required
            className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#6B6B6B]">Takım 2 Skor</label>
          <input
            name="team2_score"
            type="number"
            min={0}
            required
            className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[#6B6B6B]">CSV Dosyası</label>
        <input
          name="csv_file"
          type="file"
          accept=".csv"
          required
          className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#A1A1A1] file:mr-2 file:rounded file:border-0 file:bg-[#1F1F1F] file:px-3 file:py-1 file:text-xs file:text-[#FAFAFA]"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-[#FF4D00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50"
      >
        {isPending ? 'İçe aktarılıyor...' : 'CSV İçe Aktar'}
      </button>

      <ImportResult state={state} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: DatHost Match ID
// ---------------------------------------------------------------------------
function DatHostImportTab() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: ImportState, formData: FormData) => {
      const result = await importFromDathost(formData);
      if ('error' in result) return { error: result.error as string };
      const r = result as Record<string, unknown>;
      return {
        success: true,
        matchId: r.matchId as string,
        team1Name: r.team1Name as string,
        team2Name: r.team2Name as string,
        score: r.score as string,
        map: r.map as string,
        playersCount: r.playersCount as number,
        mapNumber: r.mapNumber as number,
      };
    },
    null,
  );

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex items-end gap-2">
        <div className="flex-1">
          <input
            name="dathost_match_id"
            required
            placeholder="DatHost Match ID yapıştırın"
            className="w-full rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#6B6B6B] font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-[#FF4D00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50 whitespace-nowrap"
        >
          {isPending ? 'Çekiliyor...' : 'İçe Aktar'}
        </button>
      </form>

      <ImportResult state={state} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared result display
// ---------------------------------------------------------------------------
function ImportResult({ state }: { state: ImportState }) {
  if (!state) return null;

  if (state.error) {
    return <p className="text-sm text-red-400">{state.error}</p>;
  }

  if (state.success) {
    return (
      <div className="rounded border border-green-500/20 bg-green-500/10 p-3 space-y-1">
        <p className="text-sm font-medium text-green-400">Başarıyla içe aktarıldı!</p>
        <p className="text-xs text-[#A1A1A1]">
          {state.team1Name} vs {state.team2Name}
          {state.map && ` — ${state.map.replace('de_', '')}`}
          {state.score && ` — ${state.score}`}
          {state.playersCount && ` (${state.playersCount} oyuncu)`}
        </p>
        {state.matchId && (
          <a
            href={`/matches/${state.matchId}`}
            className="inline-block mt-1 text-xs text-[#FF4D00] hover:text-[#FF6B2C]"
          >
            Maç detayına git →
          </a>
        )}
      </div>
    );
  }

  return null;
}
