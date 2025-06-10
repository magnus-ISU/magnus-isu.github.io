<script>
	import { onMount } from 'svelte';

	// Reactive variables to manage state
	let productList = [];
	let selectedProduct = null;
	let imageUrl = '';
	let guessInput = '';
	let feedback = '';
	let guessesLeft = 6;
	let gameOver = false;

	// Fetch data and initialize the game on component mount
	onMount(async () => {
		try {
			// Step 1: Fetch the product list from traderjoesprices.com
			const response = await fetch('https://traderjoesprices.com/');
			console.log(response);
			const html = await response.text();
			console.log(html);
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			// Extract product data from the table (assuming a table exists)
			const table = doc.querySelector('table');
			if (!table) throw new Error('Product table not found');
			const rows = table.querySelectorAll('tr');
			productList = Array.from(rows)
				.slice(1) // Skip header row
				.map((row) => {
					const cells = row.querySelectorAll('td');
					return {
						name: cells[0].textContent.trim(),
						price: parseFloat(cells[1].textContent.trim().replace('$', '')),
						url: cells[2].querySelector('a').href
					};
				});

			// Step 2: Select a random product based on the date and total products
			const today = new Date().toISOString().split('T')[0]; // e.g., '2025-03-08'
			const rng = seededRandom(today);
			const randomIndex = Math.floor(rng * productList.length); // Random index based on total products
			selectedProduct = productList[randomIndex];

			// Step 3: Fetch the product detail page to get the image
			const detailResponse = await fetch(selectedProduct.url);
			const detailHtml = await detailResponse.text();
			const detailDoc = parser.parseFromString(detailHtml, 'text/html');
			const imgElement = detailDoc.querySelector('.product-image img'); // Adjust selector based on actual HTML
			imageUrl = imgElement ? imgElement.src : 'https://via.placeholder.com/200'; // Fallback image if not found
		} catch (error) {
			console.error('Error fetching data:', error);
			feedback = 'Error loading product data. Please try again later.';
		}
	});

	// Handle user's guess submission
	function handleGuess() {
		if (gameOver) return;

		const guess = parseFloat(guessInput);
		// Validate input
		if (isNaN(guess) || guess <= 0) {
			feedback = 'Please enter a valid positive number.';
			return;
		}

		guessesLeft--;

		// Calculate percentage difference
		const difference = (Math.abs(guess - selectedProduct.price) / selectedProduct.price) * 100;

		// Provide feedback based on guess accuracy
		if (difference <= 5) {
			feedback = 'Congratulations! You guessed within 5% of the price!';
			gameOver = true;
		} else if (difference >= 25) {
			feedback =
				'<div style="background-color: red; width: 20px; height: 20px; display: inline-block; margin-right: 5px;"></div> Your guess is 25% or more off.';
		} else {
			feedback = 'Incorrect guess. Try again!';
		}

		// Check if game is over due to no guesses left
		if (guessesLeft === 0 && !gameOver) {
			feedback = `Game over. The price was $${selectedProduct.price.toFixed(2)}.`;
			gameOver = true;
		}

		guessInput = ''; // Clear input after each guess
	}

	function seededRandom(seed) {
		// Initialize state X from the seed, ensuring it's within 0 to m-1
		let X = BigInt(seed) % BigInt(4294967296);

		// LCG parameters as BigInt for accurate arithmetic
		const a = BigInt(1103515245); // Multiplier
		const c = BigInt(12345); // Increment
		const m = BigInt(4294967296); // Modulus (2^32)

		// Update state using LCG formula: X = (a * X + c) mod m
		X = (a * X + c) % m;
		// Convert to a float between 0 (inclusive) and 1 (exclusive)
		return Number(X) / 4294967296;
	}
</script>

<!-- UI Rendering -->
{#if selectedProduct && imageUrl}
	<h1>Guess the Price</h1>
	<p><strong>Product:</strong> {selectedProduct.name}</p>
	<img src={imageUrl} alt={selectedProduct.name} style="max-width: 200px; border-radius: 8px;" />
	<p><strong>Guesses Remaining:</strong> {guessesLeft}</p>

	<div>
		<input
			type="number"
			step="0.01"
			min="0"
			bind:value={guessInput}
			disabled={gameOver}
			placeholder="Enter your guess"
			style="padding: 5px; margin-right: 10px;"
		/>
		<button on:click={handleGuess} disabled={gameOver} style="padding: 5px 10px;">
			Submit Guess
		</button>
	</div>

	<div style="margin-top: 10px;">{@html feedback}</div>
{:else}
	<p>Loading product data...</p>
{/if}

<style>
	h1 {
		font-size: 2em;
		margin-bottom: 20px;
	}
	p {
		font-size: 1.2em;
	}
	div {
		margin: 10px 0;
	}
</style>
