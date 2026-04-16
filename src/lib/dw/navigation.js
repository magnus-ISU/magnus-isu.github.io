export const navigation = [
	{
		category: 'Playing',
		items: [
			{ title: 'Introduction', slug: 'introduction', source: 'srd', file: 'Introduction' },
			{
				title: 'Character Creation',
				slug: 'character-creation',
				source: 'homebrew',
				file: 'Character_Creation',
				homebrew: true,
				srdSlug: 'character-creation-srd'
			},
			{
				title: 'Character Creation',
				slug: 'character-creation-srd',
				source: 'srd',
				file: 'Character_Creation',
				homebrewSlug: 'character-creation',
				hidden: true
			},
			{
				title: 'Basic Moves',
				slug: 'basic-moves',
				source: 'homebrew',
				file: 'Basic_Moves',
				homebrew: true,
				srdSlug: 'basic-moves-srd'
			},
			{ title: 'Basic Moves', slug: 'basic-moves-srd', source: 'srd', file: 'Moves', hidden: true, homebrewSlug: 'basic-moves' },
			{
				title: 'Playing the Game',
				slug: 'playing-the-game',
				source: 'srd',
				file: 'Playing_the_Game'
			},
			{
				title: 'Moves Discussion',
				slug: 'moves-discussion',
				source: 'srd',
				file: 'Moves_Discussion'
			},
			{ title: 'Example of Play', slug: 'example-of-play', source: 'srd', file: 'Example' },
			{ title: 'Equipment', slug: 'equipment', source: 'srd', file: 'Equipment' },
			{ title: 'First Session', slug: 'first-session', source: 'srd', file: 'First_Session' },
			{
				title: 'Class Moves Discussion',
				slug: 'class-moves-discussion',
				source: 'srd',
				file: 'Class_Moves_Discussion'
			}
		]
	},
	{
		category: 'Classes',
		items: [
			{
				title: 'Fighter',
				slug: 'fighter',
				source: 'homebrew',
				file: 'classes/Fighter',
				homebrew: true,
				srdSlug: 'fighter-srd'
			},
			{ title: 'Fighter', slug: 'fighter-srd', source: 'srd', file: 'Fighter', hidden: true, homebrewSlug: 'fighter' },
			{
				title: 'Wizard',
				slug: 'wizard',
				source: 'homebrew',
				file: 'classes/Living_Magus',
				homebrew: true,
				srdSlug: 'wizard-srd'
			},
			{ title: 'Wizard', slug: 'wizard-srd', source: 'srd', file: 'Wizard', hidden: true, homebrewSlug: 'wizard' },
			{
				title: 'Cleric',
				slug: 'cleric',
				source: 'homebrew',
				file: 'classes/Cleric',
				homebrew: true,
				srdSlug: 'cleric-srd'
			},
			{ title: 'Cleric', slug: 'cleric-srd', source: 'srd', file: 'Cleric', hidden: true, homebrewSlug: 'cleric' },
			{ title: 'Thief', slug: 'thief', source: 'srd', file: 'Thief' },
			{ title: 'Paladin', slug: 'paladin', source: 'srd', file: 'Paladin' },
			{ title: 'Ranger', slug: 'ranger', source: 'srd', file: 'Ranger' },
			{
				title: 'Druid',
				slug: 'druid',
				source: 'homebrew',
				file: 'classes/Druidess',
				homebrew: true,
				srdSlug: 'druid-srd'
			},
			{ title: 'Druid', slug: 'druid-srd', source: 'srd', file: 'Druid', hidden: true, homebrewSlug: 'druid' },
			{ title: 'Barbarian', slug: 'barbarian', source: 'srd', file: 'Barbarian' },
			{ title: 'Bard', slug: 'bard', source: 'srd', file: 'Bard' },
			{
				title: 'Alchemist',
				slug: 'alchemist',
				source: 'homebrew',
				file: 'classes/Alchemist',
				homebrew: true,
				hidden: true
			},
			{
				title: 'Illithid Parasite',
				slug: 'illithid-parasite',
				source: 'homebrew',
				file: 'classes/Illithid_Parasite',
				homebrew: true,
				hidden: true
			},
			{
				title: 'Trenchcoat',
				slug: 'trenchcoat',
				source: 'homebrew',
				file: 'classes/Trenchcoat',
				homebrew: true,
				hidden: true
			},
			{
				title: 'The Branded',
				slug: 'branded',
				source: 'homebrew',
				file: 'classes/Branded',
				homebrew: true
			},
			{
				title: 'The Dashing Hero',
				slug: 'dashing-hero',
				source: 'homebrew',
				file: 'classes/Dashing_Hero',
				homebrew: true
			},
			{
				title: 'The Princess',
				slug: 'princess',
				source: 'homebrew',
				file: 'classes/Princess',
				homebrew: true
			},
			{
				title: 'The Dog',
				slug: 'dog',
				source: 'homebrew',
				file: 'classes/Dog',
				homebrew: true
			},

			{
				title: 'Arcane Duelist',
				slug: 'arcane-duelist',
				source: 'homebrew',
				file: 'classes/Arcane_Duelist',
				homebrew: true
			}
		]
	},
	{
		category: 'Spells',
		items: [
			{
				title: 'Wizard Spells',
				slug: 'wizard-spells',
				source: 'homebrew',
				file: 'spells/Wizard_Spells',
				homebrew: true,
				srdSlug: 'wizard-spells-srd'
			},
			{ title: 'Wizard Spells', slug: 'wizard-spells-srd', source: 'srd', file: 'Wizard_Spells', hidden: true, homebrewSlug: 'wizard-spells' },
			{
				title: 'Cleric Miracles',
				slug: 'cleric-miracles',
				source: 'homebrew',
				file: 'spells/Cleric_Miracles',
				homebrew: true,
				srdSlug: 'cleric-spells-srd'
			},
			{ title: 'Cleric Spells', slug: 'cleric-spells-srd', source: 'srd', file: 'Cleric_Spells', hidden: true, homebrewSlug: 'cleric-miracles' },
			{
				title: 'Druid Bindings',
				slug: 'druid-bindings',
				source: 'homebrew',
				file: 'spells/Druid_Bindings',
				homebrew: true
			}
		]
	},
	{
		category: 'GMing',
		items: [
			{ title: 'GM', slug: 'gm', source: 'srd', file: 'GM' },
			{ title: 'The World', slug: 'the-world', source: 'srd', file: 'The_World' },
			{ title: 'Fronts', slug: 'fronts', source: 'srd', file: 'Fronts' },
			{
				title: 'Advanced Delving',
				slug: 'advanced-delving',
				source: 'srd',
				file: 'Advanced_Delving'
			}
		]
	},
	{
		category: 'Monsters',
		items: [
			{ title: 'Monsters', slug: 'monsters-srd', source: 'srd', file: 'Monsters' },
			{
				title: 'Cavern Dwellers',
				slug: 'cavern-dwellers',
				source: 'srd',
				file: 'Caverns'
			},
			{ title: 'Dark Woods', slug: 'dark-woods', source: 'srd', file: 'Woods' },
			{
				title: 'Denizens of the Depths',
				slug: 'depths',
				source: 'srd',
				file: 'Depths'
			},
			{
				title: 'Twisted Experiments',
				slug: 'experiments',
				source: 'srd',
				file: 'Experiments'
			},
			{ title: 'The Common Folk', slug: 'folk', source: 'srd', file: 'Folk' },
			{ title: 'Ravenous Hordes', slug: 'hordes', source: 'srd', file: 'Hordes' },
			{ title: 'Planar Powers', slug: 'planes', source: 'srd', file: 'Planes' },
			{ title: 'Swamp Denizens', slug: 'swamp', source: 'srd', file: 'Swamp' },
			{ title: 'Undead Legions', slug: 'undead', source: 'srd', file: 'Undead' },
			{
				title: 'Homebrew Monsters',
				slug: 'monsters-homebrew',
				source: 'homebrew',
				file: 'Monsters',
				homebrew: true
			}
		]
	},
	{
		category: 'Appendices',
		items: [
			{ title: 'Conversion', slug: 'conversion', source: 'srd', file: 'Conversion' },
			{ title: 'NPCs', slug: 'npcs', source: 'srd', file: 'NPCs' },
			{ title: 'Teaching the Game', slug: 'teaching', source: 'srd', file: 'Teaching' },
			{ title: 'Thanks', slug: 'thanks', source: 'srd', file: 'Thanks' }
		]
	}
];

export const contentIndex = {};
navigation.forEach((cat) => {
	cat.items.forEach((item) => {
		contentIndex[item.slug] = item;
	});
});

export const defaultSlug = 'introduction';
