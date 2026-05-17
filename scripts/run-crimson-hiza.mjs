// =============================================================================
// CRIMSON REAPERS 3-0 HİZALANAMAYANLAR — 2026-05-12
// Map 1: de_dust2  — CRIMSON 12-1  Hiza (13 rounds)
// Map 2: de_nuke   — CRIMSON 12-7  Hiza (19 rounds)
// Map 3: de_inferno — CRIMSON 12-1 Hiza (13 rounds)
// Toplam: 45 round
// DatHost matchid'leri: 22, 23, 24
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Sabit ID'ler ─────────────────────────────────────────────────────────────
const MATCH_ID     = '474b18ed-586a-4f56-a818-af8c285b684c'; // mevcut PENDING maç
const T_CRIMSON    = 'b41dce47-94cb-43f7-8472-360d0c2e6fa6'; // CRIMSON REAPERS (team2)
const T_HIZA       = 'e42f4a28-7e13-457f-884b-4612b78da7de'; // Hizalanamayanlar (team1)

// Player IDs
const P = {
  BABACAGRI : '31475773-4407-4535-92ac-20bf6ed13f29',
  OGZK      : 'c9710e7b-7354-4681-a636-9bb45d901c6f',
  Electronica: '4e90c758-0219-4ff0-801c-541f64ed1aa3',
  Captain   : '4d9c3286-0c29-4bb9-9aad-d01301bc7ea8',
  DAYI      : '7bfe2b2f-8cf2-46ed-a3bb-7d1287176416',
  Bahattin  : '1710434a-20b7-4ed7-94e4-b7bcf36a1b16',
  Tezcan    : '336b1eb1-3338-4328-9c19-83a47b8cc43e',
  LazRecep  : 'd767e1fc-bbc9-4fa7-a1d1-424724fbdefc',
  Zeki      : '3ffdb4b6-463b-407f-bf6a-fd5961cf82f1',
};

// ─── Agregat istatistikler ────────────────────────────────────────────────────
// maps_played=3, total_rounds=45 (13+19+13)
// ADR = damage_dealt / 45

const TOTAL_ROUNDS = 45;

const players = [
  // CRIMSON REAPERS
  {
    player_id: P.BABACAGRI, team_id: T_CRIMSON,
    steam_id: '76561199144890979', player_name: 'BABACAGRI',
    // Map22:17k/4d/1773dmg/5a/11hs  Map23:9k/12d/995dmg/3a/6hs  Map24:18k/6d/1669dmg/1a/6hs
    kills: 44, deaths: 22, assists: 9, headshots: 23,
    damage_dealt: 4437, maps_played: 3,
  },
  {
    player_id: P.OGZK, team_id: T_CRIMSON,
    steam_id: '76561198044432985', player_name: 'OGZK',
    // Map22:12k/5d/1202dmg/3a/7hs  Map23:13k/15d/1504dmg/10a/9hs  Map24:1k/5d/294dmg/2a/1hs
    kills: 26, deaths: 25, assists: 15, headshots: 17,
    damage_dealt: 3000, maps_played: 3,
  },
  {
    player_id: P.Electronica, team_id: T_CRIMSON,
    steam_id: '76561198074087741', player_name: 'Electronica',
    // Map22:12k/5d/1184dmg/2a/8hs  Map23:20k/14d/2031dmg/4a/12hs  Map24:18k/7d/1732dmg/4a/9hs
    kills: 50, deaths: 26, assists: 10, headshots: 29,
    damage_dealt: 4947, maps_played: 3,
  },
  {
    player_id: P.Captain, team_id: T_CRIMSON,
    steam_id: '76561198134625951', player_name: 'Captain (MG)',
    // Map22:7k/9d/647dmg/3a/0hs  Map23:11k/18d/1081dmg/4a/4hs  Map24:5k/9d/738dmg/3a/3hs
    kills: 23, deaths: 36, assists: 10, headshots: 7,
    damage_dealt: 2466, maps_played: 3,
  },
  {
    player_id: P.DAYI, team_id: T_CRIMSON,
    steam_id: '76561198380002468', player_name: 'DAYI',
    // Map22:6k/4d/693dmg/4a/3hs  Map23:13k/15d/1423dmg/3a/11hs  Map24:12k/10d/1061dmg/3a/9hs
    kills: 31, deaths: 29, assists: 10, headshots: 23,
    damage_dealt: 3177, maps_played: 3,
  },
  // Hizalanamayanlar
  {
    player_id: P.Bahattin, team_id: T_HIZA,
    steam_id: '76561199099758701', player_name: 'Bahattin',
    // Map22:13k/13d/1568dmg/2a/8hs  Map23:20k/15d/2279dmg/9a/5hs  Map24:8k/13d/1031dmg/4a/3hs
    kills: 41, deaths: 41, assists: 15, headshots: 16,
    damage_dealt: 4878, maps_played: 3,
  },
  {
    player_id: P.Tezcan, team_id: T_HIZA,
    steam_id: '76561199067959748', player_name: 'Tezcan',
    // Map22:12k/13d/1624dmg/2a/7hs  Map23:41k/15d/4081dmg/9a/24hs  Map24:12k/13d/1602dmg/2a/3hs
    kills: 65, deaths: 41, assists: 13, headshots: 34,
    damage_dealt: 7307, maps_played: 3,
  },
  {
    player_id: P.LazRecep, team_id: T_HIZA,
    steam_id: '76561198177045161', player_name: 'Laz Recep',
    // Map22:1k/14d/156dmg/1a/1hs  Map23:5k/18d/911dmg/5a/3hs  Map24:6k/14d/767dmg/1a/4hs
    kills: 12, deaths: 46, assists: 7, headshots: 8,
    damage_dealt: 1834, maps_played: 3,
  },
  {
    player_id: P.Zeki, team_id: T_HIZA,
    steam_id: '76561199045061644', player_name: 'Zeki',
    // Map22:0k/14d/137dmg/1a/0hs  Map23:4k/18d/269dmg/1a/0hs  Map24:5k/14d/544dmg/0a/4hs
    kills: 9, deaths: 46, assists: 2, headshots: 4,
    damage_dealt: 950, maps_played: 3,
  },
];

async function main() {
  console.log('=== CRIMSON REAPERS 3-0 HİZALANAMAYANLAR import başlıyor ===\n');

  // 1. cs2_matches güncelle
  const { error: matchErr } = await sb.from('cs2_matches').update({
    status          : 'FINISHED',
    match_date      : '2026-05-12',
    winner_team_id  : T_CRIMSON,
    team1_maps_won  : 0,   // Hizalanamayanlar (team1)
    team2_maps_won  : 3,   // CRIMSON REAPERS (team2)
  }).eq('id', MATCH_ID);

  if (matchErr) { console.error('Match update hatası:', matchErr); process.exit(1); }
  console.log('✓ cs2_matches güncellendi:', MATCH_ID);

  // 2. Seri özet map kaydı ekle (map="series")
  const { data: mapData, error: mapErr } = await sb.from('cs2_match_maps').insert({
    match_id       : MATCH_ID,
    map            : 'series',
    map_number     : 1,
    team1_score    : 0,         // Hizalanamayanlar maps won
    team2_score    : 3,         // CRIMSON REAPERS maps won
    rounds_played  : TOTAL_ROUNDS,
    winner_team_id : T_CRIMSON,
    dathost_status : 'FINISHED',
    ended_at       : '2026-05-12 21:00:00+03',
  }).select('id').single();

  if (mapErr) { console.error('Map insert hatası:', mapErr); process.exit(1); }
  const seriesMapId = mapData.id;
  console.log('✓ cs2_match_maps (series) eklendi:', seriesMapId);

  // 3. Oyuncu istatistiklerini ekle
  let ok = 0, fail = 0;
  for (const p of players) {
    const adr = Math.round((p.damage_dealt / TOTAL_ROUNDS) * 10) / 10;
    const { error } = await sb.from('cs2_match_players').insert({
      map_id      : seriesMapId,
      player_id   : p.player_id,
      team_id     : p.team_id,
      steam_id    : p.steam_id,
      player_name : p.player_name,
      kills       : p.kills,
      deaths      : p.deaths,
      assists     : p.assists,
      headshots   : p.headshots,
      damage_dealt: p.damage_dealt,
      maps_played : p.maps_played,
      adr         : adr,
      mvps        : 0,
      score       : 0,
      kills_pistol : 0,
      kills_sniper : 0,
      entry_attempts: 0,
      entry_successes: 0,
      clutch_attempts: 0,
      clutch_wins: 0,
    });
    if (error) {
      console.error(`✗ ${p.player_name}:`, error.message);
      fail++;
    } else {
      console.log(`✓ ${p.player_name}: ${p.kills}K/${p.deaths}D ADR=${adr}`);
      ok++;
    }
  }

  console.log(`\n=== Tamamlandı: ${ok} oyuncu eklendi, ${fail} hata ===`);
  console.log('Seri: CRIMSON REAPERS 3-0 Hizalanamayanlar');
  console.log('Haritalar: de_dust2 (12-1) | de_nuke (12-7) | de_inferno (12-1)');
  console.log('Toplam round: 45');
}

main().catch(console.error);
