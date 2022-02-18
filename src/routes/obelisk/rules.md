You rule a city-state, with the following stats:

* Obelisk: Your progress towards winning the game.
* Walls: These help you defend your obelisk from other players
* Barracks: These help you raise an army to prevent other players from completing their obelisks
* Soldiers: This is the number of soldiers in your army

Resources have a minimum of 0, and a maximum of 10 (except soldiers).

Each turn you select one action to take from the following list:

* Declare a Holiday: Gain 1 Soldier
* Build Obelisk: Gain 1 Obelisk
* Build Wall: Gain 1 Wall
* Build Barracks: Gain 1 Barracks
* Recruit Soldiers: You gain soldiers equal to the number of Barracks in your city
* Defend: Double your Wall stat until your next turn
* Attack TARGET_NAME
	* Choose another player.
	* If any other player has attacked that player, you lose one soldier for each soldier of the attacker with the highest number of soldiers.
	* You then lose one soldier for each of your target's Walls.
	* If your target is not Attacking, Recruiting, or on Holiday, you lose one soldier for each of their Soldiers. They also lose 1 soldier for each of your soldiers lost this way.
	* For each soldier you have remaining, remove one of your target's Obelisk. If they reach 0, they lose the game.

You win if you get to 10 Obelisk or all your opponents have 0 Obelisk.