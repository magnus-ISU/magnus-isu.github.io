import { homebrewMonsterSections } from './homebrew/monsters-data.js';

export const monsterSections = [...homebrewMonsterSections];

export const allMonsters = monsterSections.flatMap((s) => s.monsters);
