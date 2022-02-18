<script>
	import { browser, dev } from '$app/env';

	import City from "./city.svelte";

	let cities = {};

	let actions = [
		"Declare a Holiday",
		"Build the Obelisk",
		"Fortify the Walls",
		"Construct a Barracks",
		"Recruit more Soldiers",
		"Defend the City",
		"Attack your Foes",
		"Cheat",
	];

	function addCity() {
		/*if (cities["thing"] !== undefined) {
			return;
		}*/
		cities["State " + (1 + Object.entries(cities).length)] = {
			obelisk: 1,
			walls: 1,
			barracks: 1,
			soldiers: 1,
			action: 0,
			target: "",
			lore: "",
		};
	}

	function gameTick() {
		let cityEntries = Object.entries(cities);
		let deadMen = {};
		for (let i = 0; i < cityEntries.length; i++) {
			let cityName = cityEntries[i][0];
			// This has values corresponding to the index in actions[]
			switch(cities[cityName].action) {
			case 0:
				cities[cityName].soldiers++;
				break;
			case 1:
				// wait for building of the Obelisk, as we must see if it gets destroyed first.
				// cities[cityName].obelisk++;
				break;
			case 2:
				// wait for building of the Walls, as we must see if we get attacked first.
				// cities[cityName].walls++;
				break;
			case 3:
				cities[cityName].barracks++;
				break;
			case 4:
				cities[cityName].soldiers += cities[cityName].barracks;
				break;
			case 5:
				// Determined by looking at action in attack
				break;
			case 6:
				// Find the highest other attacking army
				let targetName = cities[cityName].target;
				// If they didn't select a target at the start - this is difficult to change and also funny if it happens so I think we should leave it in
				if (!(targetName in cities)) {
					break;
				}
				let blockingSoldiers = 0;
				for (let j = 0; j < cityEntries.length; j++) {
					if (i === j) {
						continue;
					}
					let otherName = cityEntries[j][0];
					if (cities[otherName].action === 6) {
						if (cities[otherName].target === cities[cityName].target) {
							if (cities[otherName].soldiers > blockingSoldiers) {
								blockingSoldiers = cities[otherName].soldiers;
							}
						}
					}
				}
				// Find the number of defending soldiers
				let defendingSoldiers = cities[targetName].soldiers;
				let defenseless_actions = {0: true, 4: true, 6: true};
				if (defenseless_actions[cities[targetName].action]) {
					defendingSoldiers = 0;
				}
				// Find the number of defending walls
				let defendingWalls = cities[targetName].walls;
				if (cities[targetName].action === 5) {
					defendingWalls *= 2;
				}
				// Mark to remove blocking_soldiers + defending_soldiers + defending_walls from soldiers
				// (can't do it yet because then further calculations of blocking_soldiers, defending_soldiers will be off)
				if (!(cityName in deadMen)) {
					deadMen[cityName] = 0;
				}
				deadMen[cityName] += blockingSoldiers + defendingSoldiers + defendingWalls;
				// Mark to remove dead_men - defending soldiers - defending walls from the defenders
				let deadDefenders = deadMen[cityName] - defendingWalls - blockingSoldiers;
				if (deadDefenders > 0) {
					if (!(targetName in deadMen)) {
						deadMen[targetName] = 0;
					}
					deadMen[targetName] += deadDefenders;
				}
				// Destroy the Obelisk!
				if (cities[cityName].soldiers > deadMen[cityName]) {
					cities[targetName].obelisk = cities[targetName].obelisk - cities[cityName].soldiers + deadMen[cityName];
				}
				if (cities[targetName].obelisk < 0) {
					cities[targetName].obelisk = 0;
					alert(targetName + "'s Obelisk has been demolished!")
				}
				break;
			case 7:
				// Cheating!
				break;
			default:
				alert("Illegal game state reached! action was '" + cities[cityName].action + "'");
			}
		}
		// Remove the dead now that we don't need the old numbers any longer. You cannot train soldiers and lose soldiers, so that is no issue
		let deadMenEntries = Object.entries(deadMen);
		for (let i = 0; i < deadMenEntries.length; i++) {
			let deadCount = deadMenEntries[i][1];
			cities[deadMenEntries[i][0]].soldiers = Math.max(cities[deadMenEntries[i][0]].soldiers - deadCount, 0);
		}
		// Build buildings now that we have lost stuff.
		for (let i = 0; i < cityEntries.length; i++) {
			let cityName = cityEntries[i][0];
			// This has values corresponding to the index in actions[]
			switch(cities[cityName].action) {
			case 1:
				cities[cityName].obelisk++;
				if (cities[cityName].obelisk === 10) {
					alert(cityName + "'s obelisk has been completed! Hooray!");
				}
				break;
			case 2:
				cities[cityName].walls++;
				break;
			case 7:
				// Cheat after we get attacked to always set to the right values
				let cheatStrings = cities[cityName].target.split(" ");
				if (cheatStrings.length != 4) {
					alert("To cheat, put 4 space-seperated integers as the values of your 4 resources. Example: '9 1 3 20'");
					break;
				}
				let cheatValues = [];
				for (let j = 0; j < 4; j++) {
					cheatValues[j] = parseInt(cheatStrings[j]);
					if (cheatValues[j] === NaN) {
						alert("To cheat, put 4 space-seperated integers as the values of your 4 resources. Example: '9 1 3 20'");
						break;
					}
				}
				cities[cityName].obelisk = cheatValues[0];
				cities[cityName].walls = cheatValues[1];
				cities[cityName].barracks = cheatValues[2];
				cities[cityName].soldiers = cheatValues[3];
				break;
			}
		}
	}
</script>

<pre class="centered">u/revesvan's
                                  ╱╲
                                  ||
   ________ ___.          .__     ||          ____  __.
   \_____  \\_ |__   ____ |  |    ||    _____|    |/ _|
    /   |   \| __ \_/ __ \|  |    ||   /  ___/      &lsaquo; 
   /    |    \ \_\ \  ___/|  |__ |  |  \___ \|    |  \ 
   \_______  /___  /\___  &rsaquo;____/_|__|_/____  &rsaquo;____|__ \
           \/    \/     \/     ╱______╲    \/        \/
</pre>

<div id="cities">
{#each Object.entries(cities) as city}
	<City name={city[0]} obelisk={city[1].obelisk} walls={city[1].walls} barracks={city[1].barracks} soldiers={city[1].soldiers} bind:action={city[1].action} bind:target={city[1].target} bind:lore={city[1].lore} {cities} {actions} />
{/each}
</div>

{#if Object.entries(cities).length === 0}
	<button on:click={addCity} >
		Begin the Obelisk...
	</button>
{:else}
	<div style="display: flex; flex-direction:row; justify-content: center; align-items: center; width: 100%">
		<button on:click={gameTick} >
			End this Turn
		</button>
		<button on:click={addCity} >
			Add another city-state
		</button>
	</div>
{/if}

<p class="lore">
	King, you must now gather your masons and bolster your defenses, for you have heard the plea of the gods. You must build an Obelisk.
</p>
<p class="lore">
	It will scrape the heavens and be immortal in its glory, and your name will be forever carved among its great stones. But hurry, for across the lands, the lords of strange lands have also heard the call. And should their efforts succeed while you tarry, your worship will go unheard, and your name die with you.
</p>

<div id="rules">
	<p>You rule a city-state, with the following stats:</p>
	<ul>
		<li>Obelisk: Your progress towards winning the game.</li>
		<li>Walls: These help you defend your obelisk from other players</li>
		<li>Barracks: These help you raise an army to prevent other players from completing their obelisks</li>
		<li>Soldiers: This is the number of soldiers in your army</li>
	</ul>
	<p>Resources have a minimum of 0, and a maximum of 10 (except soldiers).</p>
	<p>Each turn you select one action to take from the following list:</p>
	<ul>
		<li>Declare a Holiday: Gain 1 Soldier</li>
		<li>Build Obelisk: Gain 1 Obelisk</li>
		<li>Build Wall: Gain 1 Wall</li>
		<li>Build Barracks: Gain 1 Barracks</li>
		<li>Recruit Soldiers: You gain soldiers equal to the number of Barracks in your city</li>
		<li>Defend: Double your Wall stat until your next turn</li>
		<li>Attack
			<ul>
				<li>Choose another player.</li>
				<li>If any other player has attacked that player, you lose one soldier for each soldier of the attacker with the highest number of soldiers.</li>
				<li>You then lose one soldier for each of your target’s Walls.</li>
				<li>If your target is not Attacking, Recruiting, or on Holiday, you lose one soldier for each of their Soldiers. They also lose 1 soldier for each of your soldiers lost this way.</li>
				<li>For each soldier you have remaining, remove one of your target’s Obelisk. If they reach 0, they lose the game.</li>
			</ul>
		</li>
	</ul>
	<p>You win if you get to 10 Obelisk or all your opponents have 0 Obelisk.</p>
</div>

<style>
	.centered {
		margin: 0 auto;
		width: 34rem;
	}
	.lore {
		color: #a0b0e0;
	}
	#rules {
		color: #bbbbbb
	}
	button {
		width: 12rem;
		height: 2rem;
		border-radius: .8rem;
		margin: 1rem auto;
		display: inline;
	}
	#cities {
		display: grid;
		grid-template-columns: repeat( auto-fit, minmax(31rem, 1fr) );
	}
</style>