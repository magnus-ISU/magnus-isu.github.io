import { monsterSections } from './monsters.js';

export const pageArt = {
	// Playing
	introduction: {
		url: 'https://www.enworld.org/attachments/flying_castle_by_asganafer-d6ufj92-png.73830/',
		mirror: true,
	},
	'character-creation':
		'https://assetsio.gnwcdn.com/D%26D-carfeul-planning-artwork.jpg?width=690&quality=85&format=jpg&dpr=3&auto=webp',
	'basic-moves':
		'https://travisdanielbow.weebly.com/uploads/3/8/3/9/38395353/dragon-s-fury-by-benwootten-d574oag_orig.jpg',
	'playing-the-game':
		'https://images.stockcake.com/public/7/e/e/7ee410d1-36aa-4cfc-b20c-a4db0d45314c_large/wizard-reading-spellbook-stockcake.jpg',
	'moves-discussion':
		'https://assetsio.gnwcdn.com/0_TheKingsDilemma.png?width=1200&height=600&fit=crop&enable=upscale&auto=webp',
	'example-of-play':
		'https://static0.cbrimages.com/wordpress/wp-content/uploads/2021/08/DD-Fighter-dead-giant.jpg',
	equipment: {
		url: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/c0236e8e-8042-4ee1-8dd6-c64bb219d5be/dg3jlt8-886c488f-7b24-46c0-968f-5169e03eea7f.png/v1/fill/w_1920,h_1280,q_80,strp/dnd__inner_interior_blacksmith__by_bergionstyle_dg3jlt8-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTI4MCIsInBhdGgiOiIvZi9jMDIzNmU4ZS04MDQyLTRlZTEtOGRkNi1jNjRiYjIxOWQ1YmUvZGczamx0OC04ODZjNDg4Zi03YjI0LTQ2YzAtOTY4Zi01MTY5ZTAzZWVhN2YucG5nIiwid2lkdGgiOiI8PTE5MjAifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ._U_Dhcg1SNZtTx9TCqCl1QZxLAlimOUSvbZlpb8FoBg',
		mirror: false,
	},
	'magic-items': {
		url: 'https://i.pinimg.com/736x/c7/75/26/c77526a4563cde545b1c5078b0097021.jpg',
		mirror: true,
	},
	'first-session':
		'https://www.wargamer.com/wp-content/sites/wargamer/2024/06/dnd-crystal-caves-adventure-lesbian-couple.jpg',
	'class-moves-discussion':
		'https://i0.wp.com/dungeonsanddragonsfan.com/wp-content/uploads/2025/07/dungeon-master-university-hero.png?fit=800%2C450&ssl=1',
	// Classes
	fighter:
		'https://everhearthinn.com/wp-content/uploads/2022/08/Fighter-5E-Class-Guide-Featured-Image.webp',
	wizard:
		'https://imgcdn.stablediffusionweb.com/2025/1/28/efdf78a6-f201-4b00-bd0d-3f7cf0eb87f8.jpg',
	cleric: 'https://i.pinimg.com/736x/35/40/48/354048c51b3a8d929d93bd5dd5b85a8b.jpg',
	thief:
		'https://static0.cbrimages.com/wordpress/wp-content/uploads/2021/02/DD-Assassin-Rogue.jpg?w=1600&h=900&fit=crop',
	paladin: 'https://nat1gaming.com/wp-content/uploads/2024/10/Silverblade-Paladin-MtG-Art.webp',
	ranger:
		'https://static0.thegamerimages.com/wordpress/wp-content/uploads/2023/10/ranger-s-hawk-by-robin-olausson-1.jpg?q=50&fit=crop&w=825&dpr=1.5',
	druid: 'https://cosmicdraft.com/wp-content/uploads/2023/05/Druidcraft-Flowers.png',
	barbarian:
		'https://i0.wp.com/dungeonsanddragonsfan.com/wp-content/uploads/2024/09/path-of-the-wild-heart-barbarian-subclass-dnd-6.png?resize=800%2C450&ssl=1',
	bard: 'https://www.wargamer.com/wp-content/sites/wargamer/2024/06/dnd-dance-bard-nerf.jpg',
	branded: 'https://simple-carry.com/cdn/shop/articles/firemage_1445x.jpg?v=1687386175',
	'dashing-hero': 'https://litrpgreads.com/wp-content/uploads/2023/11/dnd-swashbuckler.jpg',
	princess:
		'https://wallup.net/wp-content/uploads/2018/09/28/961597-fantasy-original-girl-woman-character-long-hair-beautiful-princess-horse.jpg',
	'arcane-duelist':
		'https://i0.wp.com/dungeonmister.com/wp-content/uploads/2024/06/soulknife.jpg?resize=510%2C267&ssl=1',
	dog: {
		url: 'https://static.vecteezy.com/system/resources/previews/063/105/369/large_2x/german-shepherd-standing-in-mountain-meadow-at-sunrise-with-golden-light-free-photo.jpg',
		mirror: false,
	},
	// Monster Zones
	'cavern-dwellers':
		'https://cros.land/wp-content/uploads/2021/07/crystal_caves_by_josheiten_d5z8fes-pre.jpeg',
	'dark-woods':
		'https://static.wixstatic.com/media/70fbf4_efa7a0b016194fb1bcad489b08b80f64~mv2.jpeg/v1/fill/w_568,h_378,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/70fbf4_efa7a0b016194fb1bcad489b08b80f64~mv2.jpeg',
	'lower-depths':
		'https://static0.thegamerimages.com/wordpress/wp-content/uploads/2023/07/forgotten-realms-swamp-cave-swamp-by-piotr-dura.jpg',
	'twisted-experiments':
		'https://i0.wp.com/dungeonsanddragonsfan.com/wp-content/uploads/2025/05/dnd-reanimator-artificer-subclass-hero.png?fit=800%2C450&ssl=1',
	'the-common-folk': 'https://www.aidedd.org/monster/img/bandit.jpg',
	'ravenous-hordes':
		'https://scontent-sea1-1.xx.fbcdn.net/v/t39.30808-6/484151884_2299055003814839_3187383080746407242_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=e06c5d&_nc_ohc=Ujz8IbJ5InUQ7kNvwF_rJzQ&_nc_oc=Adqeuqy3pEbZIdyPQeZ2SbyCipRzzwX_FyNj0m_839Izq2AXgNLG2XaX46tnwYZd4lQ&_nc_zt=23&_nc_ht=scontent-sea1-1.xx&_nc_gid=uqJZn0S7DQkLjqcJKiI1Ig&_nc_ss=7a3a8&oh=00_Af0f6FTkol7hged-AwqrGammRvQSnPS79Tvp_DtRWV6knA&oe=69E6C7C2',
	'planar-powers': 'https://i.redd.it/r8wvm0ou93k91.jpg',
	'swamp-denizens':
		'https://spriggans-den.com/wp-content/uploads/2019/05/the_marsh_by_johnofthenorth-d5wajrj-e1559130315634.jpg',
	'undead-legions':
		'https://www.worldanvil.com/uploads/images/b7e966bce728ddbaf67f65ddca76e6c0.jpg',
	'wild-beasts':
		'https://cdna.artstation.com/p/assets/images/images/056/629/076/large/joacim-lord-jl-wolf-ambush-final.jpg?1669730976',
	'godlike-beings':
		'https://static.wikia.nocookie.net/pathfinderenchanter/images/c/c0/Fire_demon-wallpaper-2560x1920.jpg',
	'random-homebrew': {
		url: 'https://media.craiyon.com/2025-07-16/pX0exCUOT-ysW9IzON9zMA.webp',
		mirror: true,
	},
	// GMing
	gm: 'https://i0.wp.com/dungeonsanddragonsfan.com/wp-content/uploads/2024/09/dnd-gods-2024-6.png?resize=800%2C450&ssl=1',
	'the-world':
		'https://images.squarespace-cdn.com/content/v1/5dadaf88e03a4e6bb69307dd/904f0cc0-7846-4576-ac91-176528727e4b/Vhaledhon+No+Text+Map+Blog.jpg',
	fronts: 'https://www.slashfilm.com/img/gallery/dark-tower-tv-series-cast/intro-import.jpg',
	'advanced-delving':
		'https://i.pinimg.com/736x/e4/14/9b/e4149b3cd7fc0a532bd536760976354f.jpg',
	// Appendices
	conversion:
		'https://static0.gamerantimages.com/wordpress/wp-content/uploads/2021/02/tasha-with-spellbooks.jpg',
	npcs: 'https://i.redd.it/zekid8146y3g1.jpeg',
	teaching:
		'https://static0.srcdn.com/wordpress/wp-content/uploads/2022/11/dnd-school-of-adventure-campaign.jpg',
	thanks: 'https://www.dndspeak.com/wp-content/uploads/2021/04/RoyalFamily-1.jpg',
	// Special pages
	'monsters-srd':
		'https://cdn.shopify.com/s/files/1/0828/6568/4757/files/chinese-god-dragon_480x480.jpg?v=1718627014',
	encounters: 'https://static.wikia.nocookie.net/forgottenrealms/images/f/f3/Black_Pits_art.png',
	'all-monsters':
		'https://static0.thegamerimages.com/wordpress/wp-content/uploads/wm/2025/01/d-d-monster-manual-2024.jpg?w=1600&h=900&fit=crop',
	'user-monsters': 'https://i.pinimg.com/originals/e7/9f/0c/e79f0c7fe795133f04cfda406bfb6290.jpg',
	// Spells
	'wizard-spells':
		'https://mysterydicegoblin.com/cdn/shop/articles/a93025da-294f-4951-bb6d-ff3735e83838.webp?v=1724242177',
	'wizard-spells-srd':
		'https://mysterydicegoblin.com/cdn/shop/articles/a93025da-294f-4951-bb6d-ff3735e83838.webp?v=1724242177',
	'cleric-miracles':
		'https://www.wargamer.com/wp-content/sites/wargamer/2021/05/dnd-5e-cleric-life-cleric-casting-spell.jpg',
	'cleric-spells-srd':
		'https://www.runicdice.com/cdn/shop/articles/Light_Domain_Cleric_Guide_for_Beginners_Mastering_the_Light_Cleric_in_D_D_5e_a07934a9-5e54-4bfe-be90-6889fb4a540a.png?v=1770986261',
	'druid-bindings':
		'https://scontent-dfw5-1.xx.fbcdn.net/v/t39.30808-6/535019244_10234767612704294_4457784100332717442_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=e06c5d&_nc_ohc=NgyQASvxctwQ7kNvwGkuBKn&_nc_oc=Adp9f4T4As636q_I1-mY7AD75tcT-Q32WNXNDvQ8byY1fo53xvRQ_1chpVQ5DEwEVbU&_nc_zt=23&_nc_ht=scontent-dfw5-1.xx&_nc_gid=uHkyCyBoiMQksO9tjFK6rg&_nc_ss=7a3a8&oh=00_Af3-gyc4BxeYpCSZ-NgjHJB3HezwiBrD7d9z9WNbDQg3tg&oe=69EE07E7',
};

export const navigation = [
	{
		category: 'Playing',
		items: [
			{ title: 'Introduction', slug: 'introduction', source: 'srd', file: 'Introduction' },
			{
				title: 'Playing the Game',
				slug: 'playing-the-game',
				source: 'homebrew',
				file: 'Playing_the_Game',
				homebrew: true,
				srdSlug: 'playing-the-game-srd',
			},
			{
				title: 'Playing the Game',
				slug: 'playing-the-game-srd',
				source: 'srd',
				file: 'Playing_the_Game',
				hidden: true,
				homebrewSlug: 'playing-the-game',
			},
			{
				title: 'Character Creation',
				slug: 'character-creation',
				source: 'homebrew',
				file: 'Character_Creation',
				homebrew: true,
				srdSlug: 'character-creation-srd',
			},
			{
				title: 'Character Creation',
				slug: 'character-creation-srd',
				source: 'srd',
				file: 'Character_Creation',
				homebrewSlug: 'character-creation',
				hidden: true,
			},
			{
				title: 'Basic Moves',
				slug: 'basic-moves',
				source: 'homebrew',
				file: 'Basic_Moves',
				homebrew: true,
				srdSlug: 'basic-moves-srd',
			},
			{
				title: 'Basic Moves',
				slug: 'basic-moves-srd',
				source: 'srd',
				file: 'Moves',
				hidden: true,
				homebrewSlug: 'basic-moves',
			},
			{
				title: 'Equipment',
				slug: 'equipment',
				source: 'homebrew',
				file: 'Equipment',
				homebrew: true,
				srdSlug: 'equipment-srd',
			},
			{
				title: 'Equipment',
				slug: 'equipment-srd',
				source: 'srd',
				file: 'Equipment',
				hidden: true,
				homebrewSlug: 'equipment',
			},
			{
				title: 'Magic Items',
				slug: 'magic-items',
				source: 'homebrew',
				file: 'Magic_Items',
				homebrew: true,
				srdSlug: 'magic-items-srd',
			},
			{
				title: 'Magic Items',
				slug: 'magic-items-srd',
				source: 'srd',
				file: 'Magic_Items',
				hidden: true,
				homebrewSlug: 'magic-items',
			},
		],
	},
	{
		category: 'Characters',
		items: [
			{ title: 'Character Sheet', slug: 'character-sheet', skipSlug: true },
			{ title: 'Encounters', slug: 'encounters' },
			{ title: 'User Monsters', slug: 'user-monsters', skipSlug: true },
		],
	},
	{
		category: 'Classes',
		items: [
			{
				title: 'The Fighter',
				slug: 'fighter',
				source: 'homebrew',
				file: 'classes/Fighter',
				homebrew: true,
				srdSlug: 'fighter-srd',
			},
			{
				title: 'The Fighter',
				slug: 'fighter-srd',
				source: 'srd',
				file: 'Fighter',
				hidden: true,
				homebrewSlug: 'fighter',
			},
			{
				title: 'The Wizard',
				slug: 'wizard',
				source: 'homebrew',
				file: 'classes/Living_Magus',
				homebrew: true,
				srdSlug: 'wizard-srd',
			},
			{
				title: 'The Wizard',
				slug: 'wizard-srd',
				source: 'srd',
				file: 'Wizard',
				hidden: true,
				homebrewSlug: 'wizard',
			},
			{
				title: 'The Cleric',
				slug: 'cleric',
				source: 'homebrew',
				file: 'classes/Cleric',
				homebrew: true,
				srdSlug: 'cleric-srd',
			},
			{
				title: 'The Cleric',
				slug: 'cleric-srd',
				source: 'srd',
				file: 'Cleric',
				hidden: true,
				homebrewSlug: 'cleric',
			},
			{
				title: 'The Thief',
				slug: 'thief',
				source: 'homebrew',
				file: 'classes/Thief',
				homebrew: true,
				srdSlug: 'thief-srd',
			},
			{
				title: 'The Thief',
				slug: 'thief-srd',
				source: 'srd',
				file: 'Thief',
				hidden: true,
				homebrewSlug: 'thief',
			},
			{
				title: 'The Paladin',
				slug: 'paladin',
				source: 'homebrew',
				file: 'classes/Paladin',
				homebrew: true,
				srdSlug: 'paladin-srd',
			},
			{
				title: 'The Paladin',
				slug: 'paladin-srd',
				source: 'srd',
				file: 'Paladin',
				hidden: true,
				homebrewSlug: 'paladin',
			},
			{
				title: 'The Ranger',
				slug: 'ranger',
				source: 'homebrew',
				file: 'classes/Ranger',
				homebrew: true,
				srdSlug: 'ranger-srd',
			},
			{
				title: 'The Ranger',
				slug: 'ranger-srd',
				source: 'srd',
				file: 'Ranger',
				hidden: true,
				homebrewSlug: 'ranger',
			},
			{
				title: 'The Druid',
				slug: 'druid',
				source: 'homebrew',
				file: 'classes/Druidess',
				homebrew: true,
				srdSlug: 'druid-srd',
			},
			{
				title: 'The Druid',
				slug: 'druid-srd',
				source: 'srd',
				file: 'Druid',
				hidden: true,
				homebrewSlug: 'druid',
			},
			{
				title: 'The Barbarian',
				slug: 'barbarian',
				source: 'homebrew',
				file: 'classes/Barbarian',
				homebrew: true,
				srdSlug: 'barbarian-srd',
			},
			{
				title: 'The Barbarian',
				slug: 'barbarian-srd',
				source: 'srd',
				file: 'Barbarian',
				hidden: true,
				homebrewSlug: 'barbarian',
			},
			{
				title: 'The Bard',
				slug: 'bard',
				source: 'homebrew',
				file: 'classes/Bard',
				homebrew: true,
				srdSlug: 'bard-srd',
			},
			{
				title: 'The Bard',
				slug: 'bard-srd',
				source: 'srd',
				file: 'Bard',
				hidden: true,
				homebrewSlug: 'bard',
			},
			{
				title: 'The Alchemist',
				slug: 'alchemist',
				source: 'homebrew',
				file: 'classes/Alchemist',
				homebrew: true,
				hidden: true,
			},
			{
				title: 'The Illithid Parasite',
				slug: 'illithid-parasite',
				source: 'homebrew',
				file: 'classes/Illithid_Parasite',
				homebrew: true,
				hidden: true,
			},
			{
				title: 'The Trenchcoat',
				slug: 'trenchcoat',
				source: 'homebrew',
				file: 'classes/Trenchcoat',
				homebrew: true,
				hidden: true,
			},
			{
				title: 'The Branded',
				slug: 'branded',
				source: 'homebrew',
				file: 'classes/Branded',
				homebrew: true,
			},
			{
				title: 'The Dashing Hero',
				slug: 'dashing-hero',
				source: 'homebrew',
				file: 'classes/Dashing_Hero',
				homebrew: true,
			},
			{
				title: 'The Princess',
				slug: 'princess',
				source: 'homebrew',
				file: 'classes/Princess',
				homebrew: true,
			},
			{
				title: 'The Dog',
				slug: 'dog',
				source: 'homebrew',
				file: 'classes/Dog',
				homebrew: true,
			},

			{
				title: 'Arcane Duelist',
				slug: 'arcane-duelist',
				source: 'homebrew',
				file: 'classes/Arcane_Duelist',
				homebrew: true,
			},
		],
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
				srdSlug: 'wizard-spells-srd',
			},
			{
				title: 'Wizard Spells',
				slug: 'wizard-spells-srd',
				source: 'srd',
				file: 'Wizard_Spells',
				hidden: true,
				homebrewSlug: 'wizard-spells',
			},
			{
				title: 'Cleric Miracles',
				slug: 'cleric-miracles',
				source: 'homebrew',
				file: 'spells/Cleric_Miracles',
				homebrew: true,
				srdSlug: 'cleric-spells-srd',
			},
			{
				title: 'Cleric Spells',
				slug: 'cleric-spells-srd',
				source: 'srd',
				file: 'Cleric_Spells',
				hidden: true,
				homebrewSlug: 'cleric-miracles',
			},
			{
				title: 'Druid Bindings',
				slug: 'druid-bindings',
				source: 'homebrew',
				file: 'spells/Druid_Bindings',
				homebrew: true,
			},
		],
	},
	{
		category: 'Detailed Introduction',
		items: [
			{ title: 'Example of Play', slug: 'example-of-play', source: 'srd', file: 'Example' },
			{ title: 'First Session', slug: 'first-session', source: 'srd', file: 'First_Session' },
			{
				title: 'Moves Discussion',
				slug: 'moves-discussion',
				source: 'srd',
				file: 'Moves_Discussion',
			},
			{
				title: 'Class Moves Discussion',
				slug: 'class-moves-discussion',
				source: 'srd',
				file: 'Class_Moves_Discussion',
			},
		],
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
				file: 'Advanced_Delving',
			},
		],
	},
	{
		category: 'Monsters',
		items: [
			{ title: 'About Monsters', slug: 'monsters-srd', source: 'srd', file: 'Monsters' },
			{ title: 'All Monsters', slug: 'all-monsters', render: 'monsters' },
			...monsterSections.map((s) => ({
				title: s.name,
				slug: s.slug,
				render: 'monsters',
				monsterSection: s.slug,
				...(s.homebrew && { homebrew: true }),
			})),
		],
	},
	{
		category: 'Appendices',
		items: [
			{ title: 'Conversion', slug: 'conversion', source: 'srd', file: 'Conversion' },
			{ title: 'NPCs', slug: 'npcs', source: 'srd', file: 'NPCs' },
			{ title: 'Teaching the Game', slug: 'teaching', source: 'srd', file: 'Teaching' },
			{ title: 'Thanks', slug: 'thanks', source: 'srd', file: 'Thanks' },
		],
	},
];

export const contentIndex = {};
navigation.forEach((cat) => {
	cat.items.forEach((item) => {
		contentIndex[item.slug] = item;
	});
});

export const defaultSlug = 'introduction';
