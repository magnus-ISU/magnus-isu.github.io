export const homebrewMonsterSections = [
	{
		name: 'Dark Woods',
		monsters: [
			{
				name: 'Living Tree',
				tags: 'Solitary, Huge, Intelligent',
				hp: 21,
				armor: 4,
				attacks: [{ name: 'Wooden Limbs', damage: 'd10+3', tags: 'Reach, Forceful, Messy' }],
				description: "So many people think they can just walk straight up to a tree and whack it with an axe. It's so common that this tree doesn't even take it personally, anymore. She just figures that if a few people die unjustly, well, a few trees are dying unjustly also.",
				instinct: 'To protect Nature',
				moves: ['Lash with entangling vines', 'Set down roots', 'Call upon the forest']
			},
			{
				name: 'Pegasus',
				tags: 'Group, Construct',
				hp: 10,
				armor: 2,
				attacks: [{ name: 'Sharp Hooves', damage: 'd8+1', tags: 'Close, Forceful' }],
				special: 'Wings',
				description: "Lovely thing, isn't it? A fine white horse with the wings of a swan. Don't look like it ought to be able to fly, but it does. Hatching from little crystal eggs and bonded with their riders for life. There's still some beauty in the world, mark my words.",
				instinct: 'To carry aloft',
				moves: ['Land atop a foe', 'Fly like the wind', 'Protect their bonded']
			},
			{
				name: 'Pegasi Knight',
				tags: 'Group, Construct',
				hp: 9,
				armor: 3,
				attacks: [{ name: 'Lance', damage: 'd8+1', tags: 'Messy, Reach' }],
				special: 'Mounted',
				description: 'Nature is a beautiful thing, and it must be protected. Who better to protect it, than by taming its greatest majesties? Bonded from birth, the Pegasi Knight and his steed fight as one.',
				instinct: 'To keep the natural order',
				moves: ['Leap from the air', 'Cast a druidic spell']
			},
			{
				name: 'Gorilla-Bird',
				tags: 'Group, Wild',
				hp: 11,
				armor: 2,
				attacks: [{ name: 'Slamming Fists', damage: 'd12', tags: 'Messy' }],
				description: "Is it a bird? Is it a gorilla? Yes, and it is very, very used to being King of wherever it happens to be. Hope that you don't happen to be around also.",
				instinct: 'To dominate competition',
				moves: ['Drop a stone, then slam-dunk on top of it', 'Grab something and take flight', 'Search like a hawk']
			}
		]
	},
	{
		name: 'Cavern Dwellers',
		monsters: [
			{
				name: 'Psychic Jellyfish',
				tags: 'Solitary, Magical, Devious',
				hp: 8,
				attacks: [{ name: 'Acidic Tendril', damage: 'd4', tags: 'Close' }],
				special: 'Telepathy, Bioluminescence',
				description: 'Lights in the water... so pretty... Do you hear the bells?.. do you hear the chimes of light?.. so pretty... I must defend them... I must obey them... must feed them...',
				instinct: 'To subdue',
				moves: ['Overwhelm their mind', 'Digest a subdued enemy, flaring brightly', 'Sacrifice a minion']
			}
		]
	},
	{
		name: 'Twisted Experiments',
		monsters: [
			{
				name: 'Stone Guardian',
				tags: 'Group, Construct',
				hp: 9,
				armor: 3,
				attacks: [{ name: 'Stone Blade', damage: 'd8', tags: 'Close' }],
				description: 'Others get distracted. Others fail to accomplish their purpose. But not the Stone Guardian. Unyielding and eternal the Guardian shall watch its charge.',
				instinct: 'To prevent access',
				moves: ['Apply Crushing Weight', 'Slowly Advance', 'Crack Apart']
			}
		]
	},
	{
		name: 'Folk of the Realm',
		monsters: [
			{
				name: 'Rebel',
				tags: 'Horde, Intelligent, Organized',
				hp: 3,
				armor: 1,
				attacks: [{ name: 'Axe', damage: 'd6', tags: 'Close' }],
				description: "In the countryside they'd be called outlaw and driven off or killed. The city, though, is full of places to hide. Damp basements to pore over maps and to plan and plot against a corrupt system. Like rats, they gnaw away at order, either to supplant it anew or just erode the whole thing. The line between change and chaos is a fine one — some rebels walk that thin line and others just want to see it all torched.",
				instinct: 'To upset order',
				moves: ['Die for a cause', 'Inspire others']
			},
			{
				name: 'Bandit',
				tags: 'Horde, Intelligent, Organized',
				hp: 3,
				armor: 1,
				attacks: [{ name: 'Dirk', damage: 'd6', tags: 'Close' }],
				description: "Desperation is the watchword of banditry. When times are tough, what else is there to do but scavenge a weapon and take up with a clan of nasty men and women? Highway robbery, poaching, scams and cons and murder most foul but we've all got to eat so who can blame them?",
				instinct: 'To rob',
				moves: ['Steal something', 'Demand tribute']
			},
			{
				name: 'Bandit King',
				tags: 'Solitary, Intelligent, Organized',
				hp: 12,
				armor: 1,
				attacks: [{ name: 'Trusty Knife', damage: 'd10', tags: 'Close' }],
				description: 'Better to rule in hell than to serve in heaven. This King got here through hard work and dedication, not some silly bloodline.',
				instinct: 'To lead',
				moves: ['Make a demand', 'Extort', 'Topple power']
			},
			{
				name: 'Soldier',
				tags: 'Horde, Intelligent, Organized',
				hp: 3,
				armor: 1,
				attacks: [{ name: 'Spear', damage: 'd6', tags: 'Close, Reach' }],
				description: "For a commoner with a strong arm, sometimes it's this or be a bandit. It's wear the colors and don ill-fitting armor and march into the unknown with a thousand other scared men and women conscripted to fight the wars of our time.",
				instinct: 'To fight',
				moves: ['March into battle', 'Fight as one']
			},
			{
				name: 'Guardsman',
				tags: 'Group, Intelligent, Organized',
				hp: 6,
				armor: 1,
				attacks: [{ name: 'Spear', damage: 'd8', tags: 'Close, Reach' }],
				description: "Noble protector or merely drunken lout, it often makes no difference to these sorts. Falling shy of a noble knight, the proud town guard is an ancient profession nonetheless. Someone has to be there to keep an eye on the gate when the Black Riders have been spotted in the woods.",
				instinct: 'To do as ordered',
				moves: ['Uphold the law', 'Make a profit']
			},
			{
				name: 'Knight',
				tags: 'Solitary, Intelligent, Organized',
				hp: 12,
				armor: 4,
				attacks: [{ name: 'Sword', damage: 'd10', tags: 'Close' }],
				description: "What youngster doesn't cling to the rail at the mighty joust, blinded by the sun on their glittering armor, wishing they could be the one adorned in steel and riding to please the King and Queen? A knight is many things — a holy warrior, a sworn sword, a villain sometimes, too, but a knight cannot help but be a symbol to all who see her. A knight means something.",
				instinct: 'To live by a code',
				moves: ['Make a moral stand', 'Lead soldiers into battle']
			},
			{
				name: 'Noble',
				tags: 'Solitary, Intelligent',
				description: "Are they granted their place by the gods, perhaps? Is that why they're able to pass their riches and power down by birth? Some trick or enchantment of the blood, maybe. The peasant bends his knee and scrapes and toils and the noble wears the finery of his place and, they say, we all have our burdens to bear.",
				instinct: 'To rule',
				moves: ['Issue an order', 'Offer a reward']
			},
			{
				name: 'Peasant',
				tags: 'Solitary',
				description: "Covered in muck, downtrodden at the bottom of the great chain of being, we all stand on the backs of those who grow our food on their farms. Don't act like you weren't one before you lost what little sense you had, adventurer.",
				instinct: 'To get by',
				moves: ['Plead for help', 'Offer a simple reward and gratitude']
			}
		]
	},
	{
		name: 'Boss Encounters',
		monsters: [
			{
				name: 'Avatar of Darkness',
				tags: 'Solitary, Huge, Magical, Divine',
				hp: 20,
				armor: 4,
				attacks: [{ name: 'Look Upon The Void', damage: 'd6+2' }, { name: 'Touch of Darkness', damage: '3d12 keep lowest 2' }],
				description: "The Avatar of Darkness is the embodiment of our Lord's will. None can stand against it. It engulfs all in darkness, only visible because in the cavernous black halls of our inner sanctum, its essence, its figure, its black blade — like the sun against the wispy clouds are to the hated clerics of light — is far purer than the imitation of darkness this plane is capable of.",
				instinct: 'To bring all under darkness',
				moves: ['Swallow lights with hellfire, weakly glowing and quickly burning out', 'Instill crippling fear to all within its domain', 'Offer easy power without strings to those who resist'],
				notes: "Design Notes: This statblock is for an avatar — killing it might severely weaken the god, drive it from this plane, or outright destroy it as it pours all its power into it. The party needs to figure out how to get around its disintegrating skin to damage it, be able to see the environment in order to plan and be useful, steel themselves against its terror (and its offers of power), defeat its faithful servants, manage to even fight such a monstrous flying avatar, avoid looking at it too long, survive its hellfire or prevent it from being made, prevent it from cancelling their magic with its sword... and then figure out how to bind it in one place long enough to actually kill it. But it could be done. For running this, make hard moves all over and telegraph all the information to the party so they know everything they're up against before they engage."
			}
		]
	}
];
