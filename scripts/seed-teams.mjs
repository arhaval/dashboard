// Seed teams and players from tournament PDF data
// Run: node scripts/seed-teams.mjs

import { readFileSync } from 'fs';

// Load env
const envFile = readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const eq = line.indexOf('=');
  if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, method = 'GET', body = null) {
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };
  if (method === 'POST') headers['Prefer'] = 'return=representation';

  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const TEAMS = [
  {
    name: 'SIKLATANLAR', tag: 'SIKLA',
    players: [
      { name: 'MHK', steam_id: '76561198847238087' },
      { name: 'TRrosh', steam_id: '76561198341920431' },
      { name: 'BLACKBIRD', steam_id: '76561198227665824' },
      { name: 'Aibo', steam_id: '76561198298585328' },
      { name: 'Sharpe', steam_id: '76561198126178777' },
      { name: 'Pyro', steam_id: '76561199879135591' },
    ],
  },
  {
    name: 'BHEAMB', tag: 'BHEAM',
    players: [
      { name: 'MARATON', steam_id: '76561198931423764' },
      { name: 'Tech', steam_id: '76561198973020200' },
      { name: 'gmert0712', steam_id: '76561199667420627' },
      { name: 'SINYOR0', steam_id: '76561198787017562' },
      { name: 'Kantares', steam_id: '76561199045769500' },
      { name: 'Halil-Karac4', steam_id: '76561199487734800' },
    ],
  },
  {
    name: 'BLACK MAMBA', tag: 'MAMBA',
    players: [
      { name: 'Fatih', steam_id: '76561198955462483' },
      { name: 'XANAX-1mg', steam_id: '76561199059099181' },
      { name: 'TheJaveLin', steam_id: '76561198386239863' },
      { name: 'APOLLO', steam_id: '76561199380502718' },
      { name: 'GULLU', steam_id: '76561199559185953' },
      { name: 'Ozibaba', steam_id: '76561199037532344' },
    ],
  },
  {
    name: 'AK47 SUPPLIERS', tag: 'AK47',
    players: [
      { name: 'BEDOOO', steam_id: '76561198310852022' },
      { name: 'G.H.O.S.T.', steam_id: '76561198796358007' },
      { name: 'aim kaydi dilek tut', steam_id: '76561198153053788' },
      { name: 'settingler', steam_id: '76561198295103268' },
      { name: 'Ryuka', steam_id: '76561199099964835' },
      { name: 'ARKANTOS', steam_id: '76561199226019040' },
    ],
  },
  {
    name: 'METAL DIVISION', tag: 'METAL',
    players: [
      { name: 'Pasuel', steam_id: '76561198376809576' },
      { name: 'FARKETMEZ.cc', steam_id: '76561199001198568' },
      { name: 'Greaw', steam_id: '76561199104832590' },
      { name: 'Alucard', steam_id: '76561198333867003' },
      { name: 'MayoNeTT', steam_id: '76561198452210637' },
      { name: 'RIP', steam_id: '76561199428106666' },
    ],
  },
  {
    name: 'Hizalanamayanlar', tag: 'HIZAL',
    players: [
      { name: 'Murat', steam_id: '76561198157758327' },
      { name: 'Bahattin', steam_id: '76561199099758701' },
      { name: 'Kamil', steam_id: '76561198930081296' },
      { name: 'Tezcan', steam_id: '76561199067959748' },
      { name: 'Laz Recep', steam_id: '76561198177045161' },
      { name: 'Zeki', steam_id: '76561199045061644' },
    ],
  },
  {
    name: 'BORU', tag: 'BORU',
    players: [
      { name: 'f1st_k', steam_id: '76561199051795583' },
      { name: 'Toska', steam_id: '76561198867919247' },
      { name: 'Saul_Goodman', steam_id: '76561199110867495' },
      { name: 'Natural Intelligence', steam_id: '76561199401287389' },
      { name: 'Chedjou', steam_id: '76561198033678583' },
      { name: 'L3o', steam_id: '76561198332518466' },
    ],
  },
  {
    name: 'GEGENPRES', tag: 'GEGEN',
    players: [
      { name: 'Jackies', steam_id: '76561199120455536' },
      { name: 'Altarin oglu Tarkan', steam_id: '76561198160862027' },
      { name: 'Vendetta', steam_id: '76561198967300942' },
      { name: 'Trader', steam_id: '76561198350960783' },
      { name: 'BENETO', steam_id: '76561198372270608' },
      { name: 'Pac', steam_id: '76561198192462155' },
    ],
  },
  {
    name: 'BusCourney', tag: 'BUSC',
    players: [
      { name: 'smoothopeerator', steam_id: '76561198284365406' },
      { name: 'Nightwatch', steam_id: '76561198074442660' },
      { name: 'TERMINATOR', steam_id: '76561198324665466' },
      { name: 'ELektroBEyiN', steam_id: '76561198191104478' },
      { name: 'ATO', steam_id: '76561198312386439' },
      { name: 'CANTURK', steam_id: '76561198367283733' },
    ],
  },
  {
    name: 'CRIMSON REAPERS', tag: 'CRMSN',
    players: [
      { name: 'Mr.Boombastic', steam_id: '76561198340882003' },
      { name: 'Electronica', steam_id: '76561198074087741' },
      { name: 'DAYI', steam_id: '76561198380002468' },
      { name: 'BABACAGRI', steam_id: '76561199144890979' },
      { name: 'OGZK', steam_id: '76561198044432985' },
      { name: 'Captain', steam_id: '76561198134625951' },
    ],
  },
];

async function seed() {
  console.log('Seeding 10 teams + 60 players...\n');

  for (const team of TEAMS) {
    const existing = await sb(`cs2_teams?name=eq.${encodeURIComponent(team.name)}&select=id`);
    let teamId;

    if (existing.length > 0) {
      teamId = existing[0].id;
      console.log(`= Team exists: ${team.name} (${teamId})`);
    } else {
      const [created] = await sb('cs2_teams', 'POST', { name: team.name, tag: team.tag });
      teamId = created.id;
      console.log(`+ Created team: ${team.name} [${team.tag}] (${teamId})`);
    }

    for (const p of team.players) {
      const ep = await sb(`cs2_players?steam_id=eq.${p.steam_id}&select=id`);
      if (ep.length > 0) {
        console.log(`  = Player exists: ${p.name}`);
        continue;
      }
      try {
        await sb('cs2_players', 'POST', { team_id: teamId, name: p.name, steam_id: p.steam_id });
        console.log(`  + Added: ${p.name} (${p.steam_id})`);
      } catch (err) {
        console.error(`  x Failed: ${p.name} - ${err.message}`);
      }
    }
    console.log('');
  }
  console.log('Done!');
}

seed().catch(console.error);
