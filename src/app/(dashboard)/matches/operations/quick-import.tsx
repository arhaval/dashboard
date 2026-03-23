'use client';

import { useState, useActionState } from 'react';
import { importFromDathost, importFromCSV, scanServerCSVs, fetchServerCSV } from '../match-actions';
import { CS2_MAPS } from '@/constants';

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

type ScanResult = {
  matchId: string;
  csvPath: string;
  csvName: string;
};

export function QuickImport() {
  const [tab, setTab] = useState<'csv' | 'server' | 'dathost'>('csv');

  return (
    <div className="rounded-md border border-[#2A2A2A] bg-[#141414] p-4 space-y-3">
      <h3 className="text-sm font-medium text-[#FAFAFA]">Maç Verisi İçe Aktar</h3>
      <p className="text-xs text-[#6B6B6B]">
        Takımlar, oyuncular ve istatistikler otomatik oluşturulur
      </p>

      {/* Tab selector */}
      <div className="flex gap-1 rounded bg-[#0A0A0A] p-1">
        <button
          onClick={() => setTab('csv')}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'csv'
              ? 'bg-[#1F1F1F] text-[#FAFAFA]'
              : 'text-[#6B6B6B] hover:text-[#A1A1A1]'
          }`}
        >
          CSV Yükle
        </button>
        <button
          onClick={() => setTab('server')}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'server'
              ? 'bg-[#1F1F1F] text-[#FAFAFA]'
              : 'text-[#6B6B6B] hover:text-[#A1A1A1]'
          }`}
        >
          Sunucudan Çek
        </button>
        <button
          onClick={() => setTab('dathost')}
          className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'dathost'
              ? 'bg-[#1F1F1F] text-[#FAFAFA]'
              : 'text-[#6B6B6B] hover:text-[#A1A1A1]'
          }`}
        >
          DatHost Match ID
        </button>
      </div>

      {tab === 'csv' && <CSVUploadTab />}
      {tab === 'server' && <ServerScanTab />}
      {tab === 'dathost' && <DatHostImportTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: CSV File Upload
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
// Tab 2: Server Scan (DatHost File API)
// ---------------------------------------------------------------------------
function ServerScanTab() {
  const [serverId, setServerId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [csvFiles, setCsvFiles] = useState<ScanResult[]>([]);
  const [scanError, setScanError] = useState('');
  const [importing, setImporting] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>(null);

  // Step 1: scan for CSV files
  const handleScan = async () => {
    if (!serverId.trim()) return;
    setScanning(true);
    setScanError('');
    setCsvFiles([]);
    setImportState(null);

    const fd = new FormData();
    fd.set('dathost_server_id', serverId.trim());
    const result = await scanServerCSVs(fd);

    if ('error' in result) {
      setScanError(result.error as string);
    } else {
      setCsvFiles((result as { files: ScanResult[] }).files);
    }
    setScanning(false);
  };

  // Step 2: fetch CSV and show import form
  const handleImportCSV = async (csvPath: string, mapName: string, team1Score: string, team2Score: string) => {
    setImporting(csvPath);
    setImportState(null);

    // First fetch the CSV content
    const fetchFd = new FormData();
    fetchFd.set('dathost_server_id', serverId.trim());
    fetchFd.set('csv_path', csvPath);
    const fetchResult = await fetchServerCSV(fetchFd);

    if ('error' in fetchResult) {
      setImportState({ error: fetchResult.error as string });
      setImporting(null);
      return;
    }

    // Then import it
    const importFd = new FormData();
    importFd.set('csv_text', (fetchResult as { csvText: string }).csvText);
    importFd.set('map', mapName);
    importFd.set('team1_score', team1Score);
    importFd.set('team2_score', team2Score);

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
    }
    setImporting(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={serverId}
          onChange={(e) => setServerId(e.target.value)}
          placeholder="DatHost Server ID"
          className="flex-1 rounded border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#6B6B6B] font-mono"
        />
        <button
          onClick={handleScan}
          disabled={scanning || !serverId.trim()}
          className="rounded bg-[#FF4D00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50 whitespace-nowrap"
        >
          {scanning ? 'Taranıyor...' : 'Dosyaları Tara'}
        </button>
      </div>

      {scanError && <p className="text-sm text-red-400">{scanError}</p>}

      {csvFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[#A1A1A1]">{csvFiles.length} CSV dosyası bulundu:</p>
          {csvFiles.map((f) => (
            <ServerCSVRow
              key={f.csvPath}
              file={f}
              importing={importing === f.csvPath}
              onImport={(map, s1, s2) => handleImportCSV(f.csvPath, map, s1, s2)}
            />
          ))}
        </div>
      )}

      <ImportResult state={importState} />
    </div>
  );
}

function ServerCSVRow({
  file,
  importing,
  onImport,
}: {
  file: ScanResult;
  importing: boolean;
  onImport: (map: string, score1: string, score2: string) => void;
}) {
  const [map, setMap] = useState('');
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');

  return (
    <div className="rounded border border-[#2A2A2A] bg-[#0A0A0A] p-3 space-y-2">
      <p className="text-xs font-mono text-[#A1A1A1]">
        Maç #{file.matchId} — {file.csvName}
      </p>
      <div className="flex gap-2 items-end">
        <select
          value={map}
          onChange={(e) => setMap(e.target.value)}
          className="rounded border border-[#2A2A2A] bg-[#141414] px-2 py-1.5 text-xs text-[#FAFAFA]"
        >
          <option value="">Harita</option>
          {CS2_MAPS.map((m) => (
            <option key={m} value={m}>{m.replace('de_', '')}</option>
          ))}
        </select>
        <input
          value={s1}
          onChange={(e) => setS1(e.target.value)}
          placeholder="T1"
          type="number"
          min={0}
          className="w-16 rounded border border-[#2A2A2A] bg-[#141414] px-2 py-1.5 text-xs text-[#FAFAFA]"
        />
        <span className="text-xs text-[#6B6B6B]">-</span>
        <input
          value={s2}
          onChange={(e) => setS2(e.target.value)}
          placeholder="T2"
          type="number"
          min={0}
          className="w-16 rounded border border-[#2A2A2A] bg-[#141414] px-2 py-1.5 text-xs text-[#FAFAFA]"
        />
        <button
          onClick={() => onImport(map, s1, s2)}
          disabled={importing || !map || !s1 || !s2}
          className="rounded bg-[#FF4D00] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50"
        >
          {importing ? '...' : 'İçe Aktar'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: DatHost Match ID (existing)
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
