export default [
	{
		name: 'Angel',
		tags: 'Solitary, Terrifying, Divine, Intelligent, Organized',
		hp: 18,
		armor: 4,
		attacks: [
			{
				name: 'Sword of Flames',
				damage: '2d10 keep highest 1 +4',
				tags: 'Close, Forceful, ignores armor',
			},
		],
		special: 'Wings',
		description:
			'“So was it written that the heavens opened up to Avra’hal and did an angel from the clouds emerge to speak unto her and so did it appear to her as her firstborn daughter—beautiful, of ebon skin and golden eyes—and did Avra’hal weep to see it. ‘Be not afraid,’ it commanded her. ‘Go to the villages I have shown you in your dreams and unto them show the word I have written on your soul.’ Avra’hal wept and wept and did agree to do this and did take up her sword and tome and did into the villages go, a great thirst for blood on her lips for the word the angel wrote upon the soul of Avra’hal was ‘kill’.”',
		instinct: 'To share divine will',
		moves: ['Deliver visions and prophecy', 'Stir mortals to action', 'Expose sin and injustice'],
	},
	{
		name: 'Barbed Devil',
		tags: 'Solitary, Large, Planar, Terrifying',
		hp: 16,
		armor: 3,
		attacks: [{ name: 'Spines', damage: 'd10+3', tags: 'Close, Reach, Messy, 3 piercing' }],
		special: 'Spines',
		description:
			'There are a thousand forms of devil, maybe more. Some common and some unique. Each time the Inquisitors discover a new one they write it into the Tormentors Codex and the knowledge is shared among the abbeys in the hope that atrocities of that particular sort won’t find their way into the world again. The barbed devil has long been known to the brothers and sisters of the Inquisition. It appears only at a site of great violence or when called by a wayward summoner. Covered in sharp quills, this particular demon revels in the spilling of blood, preferably by impaling victims piecemeal or in whole upon its thorns and letting them die there. Cruel but not particularly effective beyond slaughter. A low inquisitorial priority.',
		instinct: 'To rend flesh and spill blood',
		moves: ['Impale someone', 'Kill indiscriminately'],
	},
	{
		name: 'Chain Devil',
		tags: 'Solitary, Planar',
		hp: 12,
		armor: 3,
		attacks: [{ name: 'Crush', damage: 'd10', tags: 'Close, Reach, ignores armor' }],
		description:
			'Do you think the phrase “drag him to hell” means nothing? It is unfortunately literal, in the case of the chain devil. Appearing differently to each victim, this summoned creature has but a single purpose: to wrap its victim up in binding coils and take it away to a place of torment. Sometimes it will come as a man-shaped mass of rusting iron, hooks and coils of mismatched links. Other times, a roiling tangle of rope or kelp or twisted bloody bedsheets. The results are always the same.',
		instinct: 'To capture',
		moves: ['Take a captive', 'Return to whence it came', 'Torture with glee'],
	},
	{
		name: 'Concept Elemental',
		tags: 'Solitary, Devious, Planar, Amorphous',
		special: 'Ideal form',
		description:
			'The planes are not as literal as our world. Clothed in the elemental chaos are places of stranger stuff than air and water. Here, rivers of time crash upon shores of crystal fear. Bleak storms of nightmare roil and churn in a laughter-bright sky. Sometimes, the spirits of these places can be lured into our world, though they are infinitely more unpredictable and strange than mere fire or earth might be. Easier to make mistakes, too—one might try calling up a wealth elemental and be surprised to find a murder elemental instead.',
		instinct: 'To perfect its concept',
		moves: ['Demonstrate its concept in its purest form'],
	},
	{
		name: 'Corrupter',
		tags: 'Solitary, Devious, Planar, Hoarder',
		hp: 12,
		armor: 0,
		attacks: [{ name: 'Secret dagger', damage: '2d8 keep lowest 1', tags: 'Close' }],
		description:
			'“Surely, my good man, you must know why I am here. Must know who I am. You said the words. You spilled the blood and followed the instructions almost to the letter. Your pronunciation was a bit off but that’s to be expected. I’ve come to give you what you’ve always wanted, friend. Glory, love, money? Paltry things when you’ve the vaults of hell to plumb. Don’t look so shocked, you knew what this was. You have but one thing we desire. Promise it to us, and the world shall be yours for the taking. Trust me.”',
		instinct: 'To bargain',
		moves: [
			'Offer a deal with horrible consequences',
			'Plumb the vaults of hell for a bargaining chip',
			'Make a show of power',
		],
	},
	{
		name: 'Djinn',
		tags: 'Group, Large, Magical',
		hp: 14,
		armor: 4,
		attacks: [{ name: 'Flame', damage: 'd8+1', tags: 'Close, Reach, ignores armor' }],
		special: 'Made of flame',
		description:
			'“Stop rubbing that lamp, you idiot. I do not care what you have read, it will not grant you wishes. I brought you here to show you something real, something true. See this mural? It shows the ancient city. The true city that came before. They called it Majilis and it was made of brass by the spirits. They had golem servants and human lovers and, in that day, it was said you could trade them a year of your life for a favor. We are not here to gather treasure this night, fool, we are here to learn. The djinn still sometimes come to these places, and you must understand their history if you are to know how to behave. They are powerful and wicked and proud and you must know them if you hope to survive a summoning. Now, bring the lamp here and we will light it, it grows dark and these ruins are dangerous at night.”',
		instinct: 'To burn eternally',
		moves: ['Grant power for a price', 'Summon the forces of the City of Brass'],
	},
	{
		name: 'Hell Hound',
		tags: 'Group, Planar, Organized',
		hp: 10,
		armor: 1,
		attacks: [{ name: 'Fiery Bite', damage: 'd8', tags: 'Close' }],
		special: 'Hide of shadow',
		description:
			'When one reneges on a deal, does not the debtor come for payment? Does the owed party not send someone to collect what is due? So too with the Powers Below. They only want what is theirs. A howling pack of shadows, flame and jagged bone, driven by the hunting horn. They will not cease, they cannot be evaded.',
		instinct: 'To pursue',
		moves: [
			'Follow despite all obstacles',
			'Spew fire',
			'Summon the forces of hell on their target',
		],
	},
	{
		name: 'Imp',
		tags: 'Horde, Planar, Intelligent, Organized',
		hp: 7,
		armor: 1,
		attacks: [{ name: 'Flame gout', damage: 'd6', tags: 'Close, Near, Far, ignores armor' }],
		description:
			'These tiny observer-demons often act as a first-time binding subject by neophyte warlocks. They can be found infesting arcane cabals, drinking potions when no one watches, and chasing pets and servants with tiny pitchforks. A caricature of true demonhood, these little creatures are, thankfully, not too difficult to bind or extinguish.',
		instinct: 'To harass',
		moves: ['Send information back to hell', 'Cause mischief'],
	},
	{
		name: 'Inevitable',
		tags: 'Group, Large, Magical, Cautious, Amorphous, Planar',
		hp: 21,
		armor: 5,
		attacks: [{ name: 'Hammer', damage: 'd10+1', tags: 'Close, Reach' }],
		special: 'Made of Order',
		description:
			'All things come to an end. Reality bleeds from the cut of entropy’s knife. At the edge of time itself stand the inevitable. Massive, powerful and seemingly carved from star-stuff themselves, the inevitable intervene only where magic or calamity have undone the skein of fate. Where the arrogant and powerful boil the substance of destiny away and seek to undermine the very laws of reality, the inevitable arrive to guide things back to the proper order. Unshakable, seemingly immune to mortal harm and utterly enigmatic, it is said that the Inevitable are all that will remain when time’s long thread has run out.',
		instinct: 'To preserve order',
		moves: ['End a spell or effect', 'Enforce a law of nature or man', 'Give a glimpse of destiny'],
	},
	{
		name: 'Larvae',
		tags: 'Horde, Devious, Planar, Intelligent',
		hp: 10,
		armor: 0,
		attacks: [{ name: 'Slime', damage: '2d4 keep lowest 1', tags: 'Close' }],
		description:
			'Those who have seen visions of the Planes Below, and survived with their sanity intact, speak of masses of these writhing wretches. Maggots with the faces of men and women, crying out for salvation in a nest of flames. Sometimes, they can be goaded out through a rip in the planar caul and emerge, wriggling and in torment, into our world. Once here, they spread misery and sickness during their mayfly lives before expiring into a slurry of gore. All in all, an enticement to do good deeds in life.',
		instinct: 'To suffer',
		moves: ['Fill them with despair', 'Beg for mercy', 'Draw evil attention'],
	},
	{
		name: 'Nightmare',
		tags: 'Horde, Large, Magical, Terrifying, Planar',
		hp: 7,
		armor: 4,
		attacks: [{ name: 'Trample', damage: 'd6+1', tags: 'Close, Reach' }],
		special: 'Flame and shadow',
		description:
			'The herd came from a pact made in the days when folk still inhabited the Blasted Steppes. Horselords, they were, who travelled those lands. Born in the saddle, it was said. One of theirs, in a bid to dominate his peers, made a black pact with some fell power and traded away his finest horses. He had some power, sure—but what’s a thousand year dynasty when a life is so short? Now the fiends of the pit ride on the finest horses ever seen. Coats of shining oil and manes of tormented flame: these are steeds of hell’s cavalry.',
		instinct: 'To ride rampant',
		moves: ['Sheath a rider in hellish flame', 'Drive them away'],
	},
	{
		name: 'Quasit',
		tags: 'Horde, Planar',
		hp: 7,
		armor: 2,
		attacks: [{ name: 'Hellish weaponry', damage: 'd6', tags: 'Close' }],
		special: 'Adaptable form',
		description:
			'An imp with some ambition. A quasit is a kind of foot soldier in the demon realm. A commoner, armed with fangs or claws or wings or some other thing to give it just a little edge over its hellish peers. Commonly bound by warlocks to carry heavy loads or build bridges or guard their twisted towers, a quasit can take on many forms, none of them pleasant.',
		instinct: 'To serve',
		moves: ['Attack with abandon', 'Inflict pain'],
	},
	{
		name: 'The Tarrasque',
		tags: 'Solitary, Huge, Planar',
		special: 'Impervious',
		description:
			'The Tarrasque. Legendary unstoppable juggernaut—eater of cities and swallower of ships, horses, and knights. A creature unseen in an age but about whom all kinds of stories are told. One thread of truth weaves through these stories. It cannot be killed. No blade can pierce its stony shell nor spell penetrate the shield it somehow bears. Stories say, though, that the will of one pure soul can send it to slumber, though what that means and, by the gods, where such a thing might be found, pray we do not ever need to learn. It slumbers. Somewhere in the periphery of the planar edge, it sleeps for now.',
		instinct: 'To consume',
		moves: [
			'Swallow a person, group, or place whole',
			'Release a remnant of a long-eaten place from its gullet',
		],
	},
	{
		name: 'Word Demon',
		tags: 'Solitary, Planar, Magical',
		description:
			'All of mortal magic is just words. Spells are prayers, rote formula, runes cast, or songs sung. Letters, words, sentences, and syntax strung together in a language that the whole world itself might understand. By way of words we can make our fellows cry or exult, can paint pictures and whisper desire to the gods. No little wonder, then, that in all that power is intent. That every word we utter, if repeated and meaning or emotion given to it, can spark a kind of unintentional summoning. Word daemons are called by accident, appear at random and are often short-lived, but come to attend a particular word. Capricious, unpredictable and dangerous, yes—but possibly useful, depending on the word.',
		instinct: 'To further their word',
		moves: ['Cast a spell related to their word', 'Bring their word into abundance'],
	},
];
