const auth = 'Basic ' + Buffer.from('hamitkulya3@icloud.com:S1e0r1t1a89c').toString('base64');

const PLAYER_TEAMS = {
  '76561198847238087': 'SIKLATANLAR',
  '76561198341920431': 'SIKLATANLAR',
  '76561198227665824': 'SIKLATANLAR',
  '76561198298585328': 'SIKLATANLAR',
  '76561198126178777': 'SIKLATANLAR',
  '76561199879135591': 'SIKLATANLAR',
  '76561198931423764': 'BHEAMB',
  '76561198973020202': 'BHEAMB',
  '76561199667420627': 'BHEAMB',
  '76561198787017562': 'BHEAMB',
  '76561199045769578': 'BHEAMB',
  '76561199487734872': 'BHEAMB',
  '76561198955462483': 'BLACK MAMBA',
  '76561199059099181': 'BLACK MAMBA',
  '76561198386239863': 'BLACK MAMBA',
  '76561199380502718': 'BLACK MAMBA',
  '76561199559185953': 'BLACK MAMBA',
  '76561199037532344': 'BLACK MAMBA',
  '76561198033678583': 'BORU',
  '76561199051795583': 'BORU',
  '76561198332518466': 'BORU',
  '76561199401287389': 'BORU',
  '76561199110867495': 'BORU',
  '76561198867919247': 'BORU',
  '76561198312386439': 'BusCourney',
  '76561198367283733': 'BusCourney',
  '76561198191104478': 'BusCourney',
  '76561198074442660': 'BusCourney',
  '76561198284365406': 'BusCourney',
  '76561198324665466': 'BusCourney',
  '76561199144890979': 'CRIMSON REAPERS',
  '76561198134625951': 'CRIMSON REAPERS',
  '76561198380002468': 'CRIMSON REAPERS',
  '76561198074087741': 'CRIMSON REAPERS',
  '76561198340882003': 'CRIMSON REAPERS',
  '76561198044432985': 'CRIMSON REAPERS',
  '76561198160862027': 'GEGENPRES',
  '76561198372270608': 'GEGENPRES',
  '76561199120455536': 'GEGENPRES',
  '76561198192462155': 'GEGENPRES',
  '76561198350960783': 'GEGENPRES',
  '76561198967300942': 'GEGENPRES',
  '76561199099758701': 'Hizalanamayanlar',
  '76561198930081296': 'Hizalanamayanlar',
  '76561198177045161': 'Hizalanamayanlar',
  '76561198157758327': 'Hizalanamayanlar',
  '76561199067959748': 'Hizalanamayanlar',
  '76561199045061644': 'Hizalanamayanlar',
  '76561198153053788': 'AK47 SUPPLIERS',
  '76561199226019040': 'AK47 SUPPLIERS',
  '76561198310852022': 'AK47 SUPPLIERS',
  '76561198796358007': 'AK47 SUPPLIERS',
  '76561199099964835': 'AK47 SUPPLIERS',
  '76561198295103268': 'AK47 SUPPLIERS',
  '76561198333867003': 'METAL DIVISION',
  '76561199001198568': 'METAL DIVISION',
  '76561199104832590': 'METAL DIVISION',
  '76561198452210637': 'METAL DIVISION',
  '76561198376809576': 'METAL DIVISION',
  '76561199428106666': 'METAL DIVISION',
};

async function downloadFile(serverId, path) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const res = await fetch('https://dathost.net/api/0.1/game-servers/' + serverId + '/files/' + encoded, {
    headers: { Authorization: auth }
  });
  if (!res.ok) return null;
  return await res.text();
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(l => {
    const vals = l.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i]);
    return obj;
  });
}

function parseJSON(text) {
  const data = JSON.parse(text);
  const team1 = JSON.parse(data.team1);
  const team2 = JSON.parse(data.team2);
  return {
    map: data.map_name,
    team1_score: parseInt(data.team1_score),
    team2_score: parseInt(data.team2_score),
    team1_name: team1.teamName,
    team2_name: team2.teamName,
  };
}

const tasks = [
  { server: '69bf343d8c847eb587aece97', csvs: ['MatchZy_Stats/8/match_data_map0_8.csv', 'MatchZy_Stats/9/match_data_map0_9.csv', 'MatchZy_Stats/10/match_data_map0_10.csv'], jsons: ['MatchZyDataBackup/matchzy_8_0_round18.json', 'MatchZyDataBackup/matchzy_9_0_round18.json', 'MatchZyDataBackup/matchzy_10_0_round19.json'] },
  { server: '69bf3444e41d54a952d5ea9c', csvs: ['MatchZy_Stats/1/match_data_map0_1.csv', 'MatchZy_Stats/2/match_data_map0_2.csv', 'MatchZy_Stats/3/match_data_map0_3.csv'], jsons: ['MatchZyDataBackup/matchzy_1_0_round13.json', 'MatchZyDataBackup/matchzy_2_0_round13.json', 'MatchZyDataBackup/matchzy_3_0_round13.json'] },
  { server: '69bf3451acdce34b64fa1efa', csvs: ['MatchZy_Stats/1/match_data_map0_1.csv', 'MatchZy_Stats/2/match_data_map0_2.csv', 'MatchZy_Stats/3/match_data_map0_3.csv'], jsons: ['MatchZyDataBackup/matchzy_1_0_round22.json', 'MatchZyDataBackup/matchzy_2_0_round41.json', 'MatchZyDataBackup/matchzy_3_0_round14.json'] },
  { server: '69bf34598c847eb587aed1f2', csvs: ['MatchZy_Stats/2/match_data_map0_2.csv', 'MatchZy_Stats/3/match_data_map0_3.csv', 'MatchZy_Stats/4/match_data_map0_4.csv'], jsons: ['MatchZyDataBackup/matchzy_2_0_round19.json', 'MatchZyDataBackup/matchzy_3_0_round18.json', 'MatchZyDataBackup/matchzy_4_0_round22.json'] },
  { server: '69bf345fe41d54a952d5edb3', csvs: ['MatchZy_Stats/4/match_data_map0_4.csv', 'MatchZy_Stats/5/match_data_map0_5.csv', 'MatchZy_Stats/7/match_data_map0_7.csv'], jsons: ['MatchZyDataBackup/matchzy_4_0_round13.json', 'MatchZyDataBackup/matchzy_5_0_round13.json', 'MatchZyDataBackup/matchzy_7_0_round17.json'] },
];

async function main() {
  const allMatches = [];

  for (const task of tasks) {
    const firstCsvText = await downloadFile(task.server, task.csvs[0]);
    if (!firstCsvText) { console.log('SERVER ' + task.server + ': CSV download failed'); continue; }
    const firstRows = parseCSV(firstCsvText);
    const teamsInMatch = new Set();
    for (const row of firstRows) {
      if (row.team === 'Spectator') continue;
      const t = PLAYER_TEAMS[row.steamid64];
      if (t) teamsInMatch.add(t);
    }
    const matchTeams = [...teamsInMatch];

    console.log('\n========================================');
    console.log('MATCH: ' + matchTeams.join(' vs '));
    console.log('SERVER: ' + task.server);
    console.log('========================================');

    const mapResults = [];

    for (let i = 0; i < task.csvs.length; i++) {
      const csvText = i === 0 ? firstCsvText : await downloadFile(task.server, task.csvs[i]);
      const jsonText = await downloadFile(task.server, task.jsons[i]);

      if (!csvText || !jsonText) {
        console.log('Map ' + (i + 1) + ': download failed (csv:' + !!csvText + ' json:' + !!jsonText + ')');
        continue;
      }

      const rows = parseCSV(csvText);
      const scores = parseJSON(jsonText);

      // Find actual team for team1 and team2 using steam IDs
      let team1Actual = '?', team2Actual = '?';
      for (const row of rows) {
        if (row.team === 'Spectator' || !row.steamid64) continue;
        const actualTeam = PLAYER_TEAMS[row.steamid64];
        if (!actualTeam) continue;
        // Check if this player's CSV team matches team1_name or team2_name
        if (row.team === scores.team1_name && team1Actual === '?') team1Actual = actualTeam;
        if (row.team === scores.team2_name && team2Actual === '?') team2Actual = actualTeam;
      }

      const winner = scores.team1_score > scores.team2_score ? team1Actual : team2Actual;
      const rounds = scores.team1_score + scores.team2_score;

      console.log('Map ' + (i + 1) + ': ' + scores.map + ' | ' + team1Actual + ' ' + scores.team1_score + ' - ' + scores.team2_score + ' ' + team2Actual + ' | Winner: ' + winner + ' | Rounds: ' + rounds);

      mapResults.push({ map: scores.map, team1: team1Actual, team2: team2Actual, score1: scores.team1_score, score2: scores.team2_score, winner, rounds });
    }

    // Series result
    const winsA = mapResults.filter(m => m.winner === matchTeams[0]).length;
    const winsB = mapResults.filter(m => m.winner === matchTeams[1]).length;
    const seriesWinner = winsA > winsB ? matchTeams[0] : matchTeams[1];
    console.log('SERIES: ' + matchTeams[0] + ' ' + winsA + ' - ' + winsB + ' ' + matchTeams[1] + ' | Winner: ' + seriesWinner);

    allMatches.push({ teams: matchTeams, maps: mapResults, seriesWinner, winsA, winsB });
  }

  // Player stats across all maps
  console.log('\n\n========== PLAYER STATS ==========');
  const playerStats = {};

  for (const task of tasks) {
    for (const csvPath of task.csvs) {
      const csvText = await downloadFile(task.server, csvPath);
      if (!csvText) continue;
      const rows = parseCSV(csvText);

      // Get rounds from corresponding JSON
      const jsonIdx = task.csvs.indexOf(csvPath);
      const jsonText = await downloadFile(task.server, task.jsons[jsonIdx]);
      let rounds = 0;
      if (jsonText) {
        const jdata = JSON.parse(jsonText);
        rounds = parseInt(jdata.team1_score) + parseInt(jdata.team2_score);
      }

      for (const row of rows) {
        if (row.team === 'Spectator' || !row.steamid64) continue;
        const team = PLAYER_TEAMS[row.steamid64] || '?';
        if (!playerStats[row.steamid64]) {
          playerStats[row.steamid64] = { name: row.name, team, maps: 0, kills: 0, deaths: 0, assists: 0, damage: 0, headshots: 0, rounds: 0 };
        }
        const p = playerStats[row.steamid64];
        p.maps++;
        p.kills += parseInt(row.kills) || 0;
        p.deaths += parseInt(row.deaths) || 0;
        p.assists += parseInt(row.assists) || 0;
        p.damage += parseInt(row.damage) || 0;
        p.headshots += parseInt(row.head_shot_kills) || 0;
        p.rounds += rounds;
      }
    }
  }

  const sortedPlayers = Object.entries(playerStats).sort((a, b) => b[1].kills - a[1].kills);
  console.log('Name'.padEnd(25) + 'Team'.padEnd(18) + 'Maps  K    D    A    DMG    HS   Rounds  ADR');
  for (const [sid, p] of sortedPlayers) {
    const adr = p.rounds > 0 ? (p.damage / p.rounds).toFixed(1) : '0';
    console.log(p.name.padEnd(25) + p.team.padEnd(18) + p.maps + '     ' + p.kills + '    ' + p.deaths + '    ' + p.assists + '    ' + p.damage + '    ' + p.headshots + '    ' + p.rounds + '    ' + adr);
  }

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  for (const m of allMatches) {
    console.log(m.teams[0] + ' ' + m.winsA + ' - ' + m.winsB + ' ' + m.teams[1] + ' | ' + m.seriesWinner + ' wins');
  }

  // Standings
  console.log('\n========== STANDINGS ==========');
  const standings = {};
  for (const m of allMatches) {
    for (const map of m.maps) {
      if (!standings[map.team1]) standings[map.team1] = { played: 0, won: 0, roundsWon: 0, matchWins: 0 };
      if (!standings[map.team2]) standings[map.team2] = { played: 0, won: 0, roundsWon: 0, matchWins: 0 };
      standings[map.team1].played++;
      standings[map.team2].played++;
      standings[map.team1].roundsWon += map.score1;
      standings[map.team2].roundsWon += map.score2;
      if (map.winner === map.team1) standings[map.team1].won++;
      if (map.winner === map.team2) standings[map.team2].won++;
    }
    standings[m.seriesWinner].matchWins++;
  }

  const sorted = Object.entries(standings).sort((a, b) => b[1].won - a[1].won || b[1].roundsWon - a[1].roundsWon);
  console.log('#  Team                    Maps  Won  Rounds  MatchW  Points');
  sorted.forEach(([team, s], i) => {
    console.log((i + 1) + '  ' + team.padEnd(24) + s.played + '     ' + s.won + '    ' + s.roundsWon + '      ' + s.matchWins + '       ' + s.won);
  });
}

main().catch(console.error);
