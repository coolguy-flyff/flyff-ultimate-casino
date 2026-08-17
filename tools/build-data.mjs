/**
 * build-data.mjs — extracts ultimate weapons from the raw Flyffulator dumps
 * in ../data-src into a compact runtime data file, ../data/weapons.js.
 *
 * Usage: node tools/build-data.mjs
 *
 * All values are stored scaled by 10 (integer tenths) so the roll engine can
 * work in exact integer arithmetic and never hit floating-point drift.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data-src');
const OUT_DIR = join(ROOT, 'data');
const OUT_FILE = join(OUT_DIR, 'weapons.js');

/* Roll granularity, in tenths. The increment is a fixed property of the
 * stat: these six roll in 0.1 steps, everything else rolls whole points.
 * Orange bounds are the yellow bounds halved and floored to the increment,
 * so HP 4~9 becomes 2~4 and Critical Damage 1.5~5 becomes 0.7~2.5. */
const STEP_INT = 10;
const STEP_TENTH = 1;

const TENTH_PARAMS = new Set([
  'attackspeed',
  'criticaldamage',
  'criticalchance',
  'blockpenetration',
  'stealhp',
  'attack',
]);

function log(level, message) {

  console[level]('[build-data] ' + message);
}

function readJson(name) {

  return JSON.parse(readFileSync(join(SRC, name), 'utf8'));
}

/* Scales to tenths at 0.01 precision so binary float noise (8.3 * 10 =
 * 82.999…) cancels out, while genuine off-grid bounds like 16.25 survive
 * as 162.5 for buildRange to floor onto the increment grid. */
function toTenths(value) {

  return Math.round(value * 100) / 10;
}

function stepFor(param) {

  return TENTH_PARAMS.has(param) ? STEP_TENTH : STEP_INT;
}

function floorToStep(value10, step10) {

  return Math.floor(value10 / step10) * step10;
}

/* Normalizes an add~addMax pair into a sorted scaled range. Bounds that sit
 * off the stat's increment grid (Maw of Judgement's 12.5~16.25 attack speed)
 * are floored onto it. Negative ranges (e.g. Incoming Damage -4~-7) are kept
 * negative for display; `neg` tells the roll engine to compare magnitudes
 * when checking target minimums. */
function buildRange(param, add, addMax) {

  const step10 = stepFor(param);
  const a = toTenths(add);
  const b = toTenths(addMax);
  const lo = floorToStep(Math.min(a, b), step10);
  const hi = floorToStep(Math.max(a, b), step10);

  if (lo !== Math.min(a, b) || hi !== Math.max(a, b)) {

    log('warn', param + ' ' + add + '~' + addMax + ' is off its increment grid — floored to ' + lo / 10 + '~' + hi / 10);
  }

  return { lo: lo, hi: hi, step: step10, neg: hi < 0 };
}

function halfRange(range) {

  return {
    lo: floorToStep(range.lo / 2, range.step),
    hi: floorToStep(range.hi / 2, range.step),
    step: range.step,
    neg: range.neg,
  };
}

function main() {

  log('info', 'reading source dumps…');

  const items = readJson('items.json');
  const statNamesRaw = readJson('statnames.json');
  const skillsRaw = readJson('skills.json');
  const classesRaw = readJson('classes.json');

  const skillsById = new Map();

  for (const skill of Object.values(skillsRaw)) {

    skillsById.set(skill.id, skill.name.en);
  }

  const classesById = new Map();

  for (const cls of Object.values(classesRaw)) {

    classesById.set(cls.id, cls.name.en);
  }

  const ultimates = Object.values(items).filter(function (item) {

    return item.rarity === 'ultimate' && item.category === 'weapon';
  });

  log('info', 'found ' + ultimates.length + ' ultimate weapons');

  const usedParams = new Set();
  const usedSkills = new Map();

  const weapons = ultimates.map(function (item) {

    const abilities = (item.abilities || []).map(function (ability) {

      usedParams.add(ability.parameter);

      const entry = {
        param: ability.parameter,
        rate: ability.rate === true,
        range: buildRange(ability.parameter, ability.add, ability.addMax),
      };

      if (ability.skill !== undefined) {

        const skillName = skillsById.get(ability.skill);

        if (skillName === undefined) {

          throw new Error('Unknown skill id ' + ability.skill + ' on ' + item.name.en);
        }

        usedSkills.set(ability.skill, skillName);
        entry.skill = ability.skill;
        entry.skillLevel = ability.skillLevel;
      }

      return entry;
    });

    const randomStats = (item.possibleRandomStats || []).map(function (stat) {

      usedParams.add(stat.parameter);

      const yellow = buildRange(stat.parameter, stat.add, stat.addMax);

      return {
        param: stat.parameter,
        rate: stat.rate === true,
        yellow: yellow,
        orange: halfRange(yellow),
      };
    });

    if (randomStats.length < 4) {

      throw new Error(item.name.en + ' has fewer than 4 possible random stats');
    }

    return {
      id: item.id,
      name: item.name.en,
      icon: item.icon,
      level: item.level,
      job: classesById.get(item.class) || 'Unknown',
      subcategory: item.subcategory,
      twoHanded: item.twoHanded === true,
      minAttack: item.minAttack,
      maxAttack: item.maxAttack,
      attackSpeed: item.attackSpeed,
      abilities: abilities,
      randomStats: randomStats,
    };
  });

  weapons.sort(function (a, b) {

    return a.name.localeCompare(b.name);
  });

  const statNames = {};

  for (const param of [...usedParams].sort()) {

    const entry = statNamesRaw[param];

    if (entry === undefined || entry.en === undefined) {

      throw new Error('No English stat name for parameter "' + param + '"');
    }

    statNames[param] = entry.en;
  }

  const skillNames = {};

  for (const [id, name] of [...usedSkills.entries()].sort(function (a, b) { return a[0] - b[0]; })) {

    skillNames[id] = name;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const payload = { statNames: statNames, skillNames: skillNames, weapons: weapons };
  const body = 'window.CASINO_DATA = ' + JSON.stringify(payload) + ';\n';

  writeFileSync(OUT_FILE, '/* Generated by tools/build-data.mjs — do not edit by hand. */\n' + body);

  log('info', 'wrote ' + OUT_FILE + ' (' + body.length + ' bytes, ' + weapons.length + ' weapons, ' + Object.keys(statNames).length + ' stats)');
}

main();
