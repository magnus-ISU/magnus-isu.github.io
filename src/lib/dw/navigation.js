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
		url: 'https://static0.cbrimages.com/wordpress/wp-content/uploads/2021/11/Metallic-Dragon-with-Hoard.jpg',
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
		'https://static0.cbrimages.com/wordpress/wp-content/uploads/2021/03/DD-Ranger.jpg?w=1600&h=1200&fit=crop',
	druid: 'https://cosmicdraft.com/wp-content/uploads/2023/05/Druidcraft-Flowers.png',
	barbarian:
		'https://i0.wp.com/dungeonsanddragonsfan.com/wp-content/uploads/2024/09/path-of-the-wild-heart-barbarian-subclass-dnd-6.png?resize=800%2C450&ssl=1',
	bard: 'https://www.wargamer.com/wp-content/sites/wargamer/2024/06/dnd-dance-bard-nerf.jpg',
	branded: 'https://simple-carry.com/cdn/shop/articles/firemage_1445x.jpg?v=1687386175',
	'dashing-hero': 'https://litrpgreads.com/wp-content/uploads/2023/11/dnd-swashbuckler.jpg',
	princess:
		'https://64.media.tumblr.com/dc8cbb1a46f5ba6512d37eabeb32fe53/49400ecba3e78054-21/s500x750/14cec37c800919fd73ef5f88e9cf63c51224e1cc.pnj',
	'arcane-duelist':
		'https://scontent-sea1-1.xx.fbcdn.net/v/t39.30808-6/611557270_10236484864114506_2387826330232835738_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=e06c5d&_nc_ohc=0MZfQZq5iY4Q7kNvwGxT3IO&_nc_oc=Adq9-p6znBXybnAeGuisRQMgBFymd5CsR2hnBdD1Nep_1Jxv-nUzMx5AtNQLNwQ_rCo&_nc_zt=23&_nc_ht=scontent-sea1-1.xx&_nc_gid=eUgTOVN2DYJ2KYlUeSIkMw&_nc_ss=7a3a8&oh=00_Af2SDf4PQmTmZay1Q177jqpsh6Ov7Pl2n6N9Lr5FTCu7qA&oe=69E6B74A',
	dog: {
		url: 'https://www.oilpaintings.com/images/eugene-verboeckhoven-paintings-sheep-dog-guarding-his-flock/44885/600x600/49804.webp',
		mirror: true,
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
		'https://static.wikia.nocookie.net/medievalhogwartsroleplay/images/0/06/Dungeon_Hall.png',
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
		'https://www.runicdice.com/cdn/shop/articles/Light_Domain_Cleric_Guide_for_Beginners_Mastering_the_Light_Cleric_in_D_D_5e_a07934a9-5e54-4bfe-be90-6889fb4a540a.png?v=1770986261',
	'cleric-spells-srd':
		'https://www.runicdice.com/cdn/shop/articles/Light_Domain_Cleric_Guide_for_Beginners_Mastering_the_Light_Cleric_in_D_D_5e_a07934a9-5e54-4bfe-be90-6889fb4a540a.png?v=1770986261',
	'druid-bindings':
		'https://scontent-sea1-1.xx.fbcdn.net/v/t39.30808-6/535019244_10234767612704294_4457784100332717442_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=e06c5d&_nc_ohc=gd3K4P19Y1YQ7kNvwH8UYVu&_nc_oc=AdomhH8Ulyqp8BPIr9gCQo6w0SJFQXBhg608rKUngZ0IURejqgaPqIuKbF_kWsXFAAQ&_nc_zt=23&_nc_ht=scontent-sea1-1.xx&_nc_gid=qeeML3ud3q80rzTp5vjf_A&_nc_ss=7a3a8&oh=00_Af06j5MTgve2Q9Tw8EmIIT1_L7X6k9jb1fgsqT8APzfGaA&oe=69E6C7A7',
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
				title: 'Fighter',
				slug: 'fighter',
				source: 'homebrew',
				file: 'classes/Fighter',
				homebrew: true,
				srdSlug: 'fighter-srd',
			},
			{
				title: 'Fighter',
				slug: 'fighter-srd',
				source: 'srd',
				file: 'Fighter',
				hidden: true,
				homebrewSlug: 'fighter',
			},
			{
				title: 'Wizard',
				slug: 'wizard',
				source: 'homebrew',
				file: 'classes/Living_Magus',
				homebrew: true,
				srdSlug: 'wizard-srd',
			},
			{
				title: 'Wizard',
				slug: 'wizard-srd',
				source: 'srd',
				file: 'Wizard',
				hidden: true,
				homebrewSlug: 'wizard',
			},
			{
				title: 'Cleric',
				slug: 'cleric',
				source: 'homebrew',
				file: 'classes/Cleric',
				homebrew: true,
				srdSlug: 'cleric-srd',
			},
			{
				title: 'Cleric',
				slug: 'cleric-srd',
				source: 'srd',
				file: 'Cleric',
				hidden: true,
				homebrewSlug: 'cleric',
			},
			{
				title: 'Thief',
				slug: 'thief',
				source: 'homebrew',
				file: 'classes/Thief',
				homebrew: true,
				srdSlug: 'thief-srd',
			},
			{
				title: 'Thief',
				slug: 'thief-srd',
				source: 'srd',
				file: 'Thief',
				hidden: true,
				homebrewSlug: 'thief',
			},
			{
				title: 'Paladin',
				slug: 'paladin',
				source: 'homebrew',
				file: 'classes/Paladin',
				homebrew: true,
				srdSlug: 'paladin-srd',
			},
			{
				title: 'Paladin',
				slug: 'paladin-srd',
				source: 'srd',
				file: 'Paladin',
				hidden: true,
				homebrewSlug: 'paladin',
			},
			{
				title: 'Ranger',
				slug: 'ranger',
				source: 'homebrew',
				file: 'classes/Ranger',
				homebrew: true,
				srdSlug: 'ranger-srd',
			},
			{
				title: 'Ranger',
				slug: 'ranger-srd',
				source: 'srd',
				file: 'Ranger',
				hidden: true,
				homebrewSlug: 'ranger',
			},
			{
				title: 'Druid',
				slug: 'druid',
				source: 'homebrew',
				file: 'classes/Druidess',
				homebrew: true,
				srdSlug: 'druid-srd',
			},
			{
				title: 'Druid',
				slug: 'druid-srd',
				source: 'srd',
				file: 'Druid',
				hidden: true,
				homebrewSlug: 'druid',
			},
			{
				title: 'Barbarian',
				slug: 'barbarian',
				source: 'homebrew',
				file: 'classes/Barbarian',
				homebrew: true,
				srdSlug: 'barbarian-srd',
			},
			{
				title: 'Barbarian',
				slug: 'barbarian-srd',
				source: 'srd',
				file: 'Barbarian',
				hidden: true,
				homebrewSlug: 'barbarian',
			},
			{
				title: 'Bard',
				slug: 'bard',
				source: 'homebrew',
				file: 'classes/Bard',
				homebrew: true,
				srdSlug: 'bard-srd',
			},
			{
				title: 'Bard',
				slug: 'bard-srd',
				source: 'srd',
				file: 'Bard',
				hidden: true,
				homebrewSlug: 'bard',
			},
			{
				title: 'Alchemist',
				slug: 'alchemist',
				source: 'homebrew',
				file: 'classes/Alchemist',
				homebrew: true,
				hidden: true,
			},
			{
				title: 'Illithid Parasite',
				slug: 'illithid-parasite',
				source: 'homebrew',
				file: 'classes/Illithid_Parasite',
				homebrew: true,
				hidden: true,
			},
			{
				title: 'Trenchcoat',
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
