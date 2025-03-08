<script>
	import { navItems } from '$lib/config';

	import { currentPage, isMenuOpen } from '../assets/js/store';

	const maybeCloseMenu = () => {
		if (href != $currentPage) {
			isMenuOpen.set(false);
		}
	};
</script>

<footer>
	<nav>
		<ul>
			<li>
				<a href="/">Home</a>
			</li>
			{#each navItems as page}
				<li>
					<a
						href={page.route}
						onclick={maybeCloseMenu}
						class:active={$currentPage.startsWith(page.route)}
					>
						{page.title}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<p>
		"Life is not a finite list of things that you check off before you're allowed to die," Harry
		said firmly. "It's life, you just go on living it. If I'm not doing those things it'll be
		because I've found something better." Dumbledore sighed. His fingers drummed on a clock; as they
		touched it, the numerals changed to an indecipherable script, and the hands briefly appeared in
		different positions. "In the unlikely event that I am permitted to tarry until a hundred and
		fifty," said the old wizard, "I do not think I would mind. But two hundred years would be
		entirely too much of a good thing." "Yes, well," Harry said, his voice a little dry as he
		thought of his Mum and Dad and their allotted span if Harry didn't do something about it, "I
		suspect, Headmaster, that if you came from a culture where people were accustomed to living four
		hundred years, that dying at two hundred would seem just as tragically premature as dying at,
		say, eighty."
	</p>
</footer>

<style>
	footer {
		background: var(--footer-background);
		color: var(--paper);
		padding: 1rem;
		bottom: 0;
		width: 100%;
		border-top: 1px solid var(--dark);
	}

	nav {
		display: grid;
		place-items: center;
	}

	nav ul {
		display: flex;
		gap: 1.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		color: var(--paper);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	a:hover {
		color: #aabbff;
	}

	.active {
		color: #ffaaaa !important;
	}
</style>
