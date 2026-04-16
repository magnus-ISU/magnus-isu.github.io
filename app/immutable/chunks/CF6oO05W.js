const e=`# Playing the Game

Playing Dungeon World means having a conversation. The GM describes a situation, the players say what their characters do, and the rules chime in when triggered. There are no turns or rounds — just the natural flow of the conversation. The GM always ends with **"What do you do?"**

## Stats and Rolls

Your character has six stats: **STR, DEX, CON, INT, WIS, CHA**. Each is a modifier (ranging from -1 to +3) assigned during character creation from the array: **+2, +1, +1, +0, +0, -1**.

When a move says **roll+STAT**, roll 2d6 and add the stat modifier.

- **10+:** Full success.
- **7-9:** Success with a cost, complication, or hard choice.
- **6-:** Mark XP. The GM makes a move against you.

### Hold

Some moves give you **hold some Resource** — a currency you spend later for specific effects, as described by the move.

### Forward

**+1 forward** means +1 to your very next roll only. **+1 ongoing** means +1 to all relevant rolls until a stated condition ends it.

## Harm and Healing

### HP

Your maximum HP is your class's base HP + 9 + (3 x CON). Damage subtracts from HP. HP can never drop below 0 or rise above your maximum.

### Armor

Armor reduces incoming damage by its value. Damage can be reduced to 0 this way. Temporary cover counts as 1-2 armor.

### Damage

Player characters deal damage by rolling their class damage die (plus any bonuses from moves or weapons). When a move says **Deal Damage**, roll your damage die, and apply that damage to each target.

Typically, you will deal damage or suffer attacks based on a single one of your own dice rolls. If multiple creatures attack you at once, roll the highest damage among them and add +1 for each additional attacker.

Environmental damage uses the GM's judgment:
- Scrapes and bruises: d4
- Draws blood: d6
- Might break bones: d8
- Could kill a man: d10

### Healing

- **Bandage:** Spend a few minutes bandaging someone's wounds — consume a ration and a bandage to heal them 4 HP.
- **Make Camp:** Consume a ration and sleep for a few hours to heal half your max HP.
- **Recover:** Rest in comfort and safety for a day to recover all HP. After two days, remove a debility.
- **Magical healing** works as described by the spell or move.

### Death

When you reach 0 HP, you take your **Last Breath** — a roll with no stat added. On a 10+ you cheat death. On a 7-9 Death offers a bargain. On a 6-, your fate is sealed.

If your character dies, make a new character at level 1. The group can instead pursue resurrection.

### Debilities

Debilities are serious conditions beyond ordinary HP loss. Each is tied to a stat and gives **-1 to that stat's modifier**.

- **Weak** (STR) — Can't exert much force.
- **Shaky** (DEX) — Unsteady, trembling.
- **Sick** (CON) — Ill, poisoned, or wasting.
- **Stunned** (INT) — Dazed, brain foggy.
- **Confused** (WIS) — Senses dulled, disoriented.
- **Scarred** (CHA) — Marked, disfigured.

You can only have each debility once. Debilities require rest in safety, medical attention, or magic to remove; without attention, they might even get worse.

## Equipment and Tags

Equipment helps describe what moves you can trigger. You can't Hack & Slash a dragon bare-handed. A good set of climbing gear might let you avoid Defying Danger on a cliff. If your target is sleeping, you're not going to have to roll; you may deal damage or just outright kill them, depending on your weapon and finesse.

In Dungeon World, you're a competent adventurer; you know what you'll be getting into without needing to enumerate every kind of item you'll be taking along. **Adventurer's Gear** contains limited uses of all the mundane tools you might need, but if you need it in a split second, there might not be time to rummage around your backpack.

Items have **tags** — short descriptors like *close*, *messy*, *two-handed*, *clumsy*, or *slow*. Tags describe how the item works in the fiction and sometimes have mechanical effects. A messy weapon might lop off a hand, slow healing might not cut it in a chase, and a *hand* weapon might allow you the advantage if you can get within a halberd's reach.

When you carry more than your **Load**, you're encumbered — **noisy**, **slow**, **hot**, and **quick to tire**, and you take -1 Ongoing.

## Progression

### XP and Leveling Up

You gain XP by:
- Rolling a 6- on any move
- End of Session questions
- Changing a bond

When you have **Level + 7 XP** and some downtime, you can **Level Up**:
- Spend Level+7 XP to increase your Level by 1.
- Choose a new advanced move from your class.
- At even levels, increase a stat modifier by 1 (capped by your Level or +3). If it's CON, also increase your current and max HP by 3.

### End of Session

At the end of each session:
1. Describe how your opinion of or relationship with another character has changed. If no one objects, mark XP.
2. Everyone marks XP for each:
   - Did we learn something new and important about the world?
   - Did we overcome a notable challenge?
   - Did we gain a significant treasure or boon?
3. Award a **star** to someone for a great moment of gameplay.
4. Make a **wish** for what you'd like to see in a future session.

## Bonds

Bonds tie your party together — feelings, shared history, and unresolved tensions between characters. You start with bonds from your class sheet.

**Resolving bonds:** At the end of a session, if a bond no longer describes how you relate to someone, you and that player can agree to resolve it. Mark XP and write a new bond.

**Writing new bonds:** Pick another character. Base it on something from recent play — a place you traveled, a risk you shared, a betrayal. State a belief and an intended action.

## Alignment

Your alignment reflects your character's moral compass: **Good, Lawful, Neutral, Chaotic,** or **Evil**. Each class offers specific alignment moves — actions that earn you XP when you fulfill them. Alignment can change when your character's worldview fundamentally shifts.

## Followers

Followers are NPCs in your employ, defined by **Quality**, **Loyalty**, and **Cost**.

- **Recruit** them in settlements for their unique **Skills**.
- **Pay Up** by meeting their Cost to increase **Loyalty**.
- **Do Their Thing:** When a follower acts within their scope, roll+Quality to see if they succeed.
- **Order Hirelings:** When a follower is in a crazy situation, roll+Loyalty to keep them.
- **Call For Assistance:** When a follower helps your move, take +1 but they share the full risk. If you deal damage, you do so with advantage.

## Magic

Magic encompasses anything beyond the physically possible — wizard spells, cleric miracles, druid shapeshifting, and more. Each class interacts with magic in different ways, discoverable by reading the classes. In general, you may not run out of magical resources to use before you end up causing yourself more trouble than you expected.

**Concentration:** While maintaining an ongoing spell, take -1 ongoing to cast further spells.

## Advantage and Disadvantage

When you have **Advantage**, roll an additonal die and discard the lowest. When you have **Disadvantage**, roll an additional die and discard the highest. They cancel each other out.
`;export{e as default};
