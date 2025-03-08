<script>
	export let name;
	export let obelisk;
	export let walls;
	export let barracks;
	export let soldiers;
	export let action;
	export let target;
	export let lore;
	export let cities = {};
	export let actions = {};

</script>

<div id="card">
	<h1>
		{name}
	</h1>

	<div id="resources">
		<div>Obelisk: {obelisk} </div>
		<div>Walls: {walls}</div>
		<div>Barracks: {barracks}</div>
		<div>Soldiers: {soldiers}</div>
	</div>
	<div>
		<select bind:value={action}>
			{#each actions as act, i}
				<option value={i}>{act}</option>
			{/each}
		</select>
		{#if action === 6}
			<select bind:value={target} style="float:right">
				{#each Object.entries(cities) as city}
					{#if city[0] != name}
						<option value={city[0]}>{city[0]}</option>
					{/if}
				{/each}
			</select>
		{/if}
		{#if action === 7}
			<input bind:value={target} style="float:right">
		{/if}
	</div>
	<div>{lore}</div>
</div>
<style>
	h1 {
		color: #e04010;
		height: 2rem;
		font-size: 30px;
		margin: 0.3rem;
	}
	#card {
		height: 8rem;
		background-color: #333;
		border-radius: 2rem;
		width: auto;
		padding: 1rem;
		margin: 1rem 1rem;
	}
	#resources {
		display: grid;
		grid-template-columns: 6rem 6rem 6rem 6rem;
		margin: 0 auto;
	}
	input,
	select {
		margin: 1rem 0rem;
	}
</style>
