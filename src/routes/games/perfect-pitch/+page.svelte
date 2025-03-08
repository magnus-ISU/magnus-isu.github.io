<script lang="ts">
	import { onMount } from 'svelte';

	// Core state
	type Level = {
		points: number;
		notes: string[];
		noteToGuess: string;
		isPlaying: boolean;
		userGuess: undefined | string;
		levelCleared: boolean;
	};
	let level: undefined | Level = $state(undefined);
	let streak: number = $state(0);
	let lifetime_points: number = $state(0);
	let last_score: undefined | { date: string; points: number; doublePoints: boolean } =
		$state(undefined);

	// Audio handling
	const audioCache: Record<string, HTMLAudioElement> = {};

	// Game levels configuration
	const levels: {
		points: number;
		name: string;
		description: string;
		notes: string[];
	}[] = [
		{
			points: 1,
			name: 'Level 1: Basic C Notes',
			description: 'Distinguish between middle C (C4), C5 (octave above), and C3 (octave below)',
			notes: ['C3', 'C4', 'C5']
		},
		{
			points: 2,
			name: 'Level 2: Extended C Range',
			description: 'Adds C3.5 and C4.5 (E notes, which are halfway between these octaves)',
			notes: ['C3', 'E3', 'C4', 'E4', 'C5']
		},
		{
			points: 3,
			name: 'Level 3: More Intermediate Notes',
			description: 'Adds more notes between octaves (C, D, E, F, G, A, B)',
			notes: [
				'C3',
				'D3',
				'E3',
				'F3',
				'G3',
				'A3',
				'B3',
				'C4',
				'D4',
				'E4',
				'F4',
				'G4',
				'A4',
				'B4',
				'C5',
				'D5',
				'E5',
				'F5',
				'G5',
				'A5',
				'B5'
			]
		},
		{
			points: 4,
			name: 'Level 4: All Natural Notes',
			description: 'All natural notes across 3 octaves',
			notes: [
				'C2',
				'D2',
				'E2',
				'F2',
				'G2',
				'A2',
				'B2',
				'C3',
				'D3',
				'E3',
				'F3',
				'G3',
				'A3',
				'B3',
				'C4',
				'D4',
				'E4',
				'F4',
				'G4',
				'A4',
				'B4',
				'C5',
				'D5',
				'E5',
				'F5',
				'G5',
				'A5',
				'B5',
				'C6',
				'D6',
				'E6',
				'F6',
				'G6',
				'A6',
				'B6'
			]
		},
		{
			points: 5,
			name: 'Level 5: All Notes (Sharps and Flats)',
			description: 'All notes including sharps and flats across 3 octaves',
			notes: [
				'C2',
				'Db2',
				'D2',
				'Eb2',
				'E2',
				'F2',
				'Gb2',
				'G2',
				'Ab2',
				'A2',
				'Bb2',
				'B2',
				'C3',
				'Db3',
				'D3',
				'Eb3',
				'E3',
				'F3',
				'Gb3',
				'G3',
				'Ab3',
				'A3',
				'Bb3',
				'B3',
				'C4',
				'Db4',
				'D4',
				'Eb4',
				'E4',
				'F4',
				'Gb4',
				'G4',
				'Ab4',
				'A4',
				'Bb4',
				'B4',
				'C5',
				'Db5',
				'D5',
				'Eb5',
				'E5',
				'F5',
				'Gb5',
				'G5',
				'Ab5',
				'A5',
				'Bb5',
				'B5',
				'C6',
				'Db6',
				'D6',
				'Eb6',
				'E6',
				'F6',
				'Gb6',
				'G6',
				'Ab6',
				'A6',
				'Bb6',
				'B6'
			]
		}
	];

	// Function to start practice at a specific level
	function startLevel(levelIndex: number) {
		const levelConfig = levels[levelIndex];

		if (!levelConfig) return;

		// Initialize the level
		level = {
			points: levelConfig.points,
			notes: levelConfig.notes,
			noteToGuess: '',
			isPlaying: false,
			userGuess: undefined,
			levelCleared: false
		};

		// Reset streak for the new level
		streak = 0;

		// Generate first note to guess
		generateNewNote();
	}

	// Generate a new note for the user to guess
	function generateNewNote() {
		if (!level) return;

		const randomNoteIndex = Math.floor(Math.random() * level.notes.length);
		const noteToGuess = level.notes[randomNoteIndex];

		level.noteToGuess = noteToGuess;
		level.isPlaying = false;
		level.userGuess = undefined;

		// Preload the audio
		preloadAudio(noteToGuess);

		// Automatically play the note after a short delay
		setTimeout(() => {
			playCurrentNote();
		}, 300);
	}

	// Play the current note
	function playCurrentNote() {
		if (!level || !level.noteToGuess) return;

		playNote(level.noteToGuess);
		level.isPlaying = true;

		// Reset isPlaying after a short delay to allow replaying
		setTimeout(() => {
			if (level) {
				level.isPlaying = false;
			}
		}, 1000);
	}

	// Preload audio file
	function preloadAudio(noteId: string) {
		// If already cached, don't reload
		if (audioCache[noteId]) return;

		const audio = new Audio(`/piano-mp3/piano-mp3/${noteId}.mp3`);
		audio.load();
		audioCache[noteId] = audio;
	}

	// Play a note by its ID
	function playNote(noteId: string) {
		if (audioCache[noteId]) {
			// Reset the audio if it's already been played
			audioCache[noteId].currentTime = 0;
			audioCache[noteId].play();
		} else {
			// Create and play if not cached
			const audio = new Audio(`/piano-mp3/piano-mp3/${noteId}.mp3`);
			audio.play();
			audioCache[noteId] = audio;
		}
	}

	// Handle user's guess
	function makeGuess(note: string, octave: number) {
		if (!level || level.userGuess !== undefined) return;

		const fullGuess = `${note}${octave}`;
		level.userGuess = fullGuess;

		const isCorrect = fullGuess === level.noteToGuess;

		if (isCorrect) {
			streak++;

			// Award points if streak reaches 20
			if (streak === 20) {
				beatLevel(level);
			}

			// Short delay before the next note
			setTimeout(() => {
				generateNewNote();
			}, 1000);
		} else {
			// Reset streak on wrong answer
			streak = 0;

			// Allow retry after a short delay
			setTimeout(() => {
				if (level) {
					level.userGuess = undefined;
					// Auto-play the note again when retry is available
					playCurrentNote();
				}
			}, 1500);
		}
	}

	// Add points to lifetime total
	function beatLevel(level: Level) {
		level.levelCleared = true;

		const today = new Date().toISOString().split('T')[0];
		const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

		// Calculate how many points to award
		let points = level.points;
		let pointsToAdd = points;
		let pointsMultiplier = 1;

		if (last_score) {
			if (last_score.date === today) {
				pointsMultiplier = last_score.doublePoints ? 2 : 1;
				// Already got some points today
				if (points > last_score.points) {
					// If new level is higher than previous one, add the difference
					const difference = points - last_score.points;
					pointsToAdd = difference * pointsMultiplier;
				} else return; // No need to update anything
			} else if (last_score.date === yesterday) {
				// Yesterday's score exists, double points today
				pointsToAdd = points * 2;
				pointsMultiplier = 2;
			}
		}

		lifetime_points += pointsToAdd;
		last_score = {
			date: today,
			points: points,
			doublePoints: pointsMultiplier === 2
		};

		// Save to localStorage
		saveProgress();
	}

	// Save progress to localStorage
	function saveProgress() {
		const data = {
			lifetime_points,
			last_score
		};

		localStorage.setItem('perfectPitchProgress', JSON.stringify(data));
	}

	// Load progress from localStorage
	function loadProgress() {
		const savedData = localStorage.getItem('perfectPitchProgress');

		if (savedData) {
			try {
				const data = JSON.parse(savedData);
				lifetime_points = data.lifetime_points || 0;

				// Handle migration from old format to new format with doublePoints
				if (data.last_score) {
					last_score = data.last_score;
				}
			} catch (e) {
				console.error('Error loading saved progress:', e);
			}
		}
	}

	// Get feedback class for a specific note button
	function getFeedbackClass(note: string, octave: number): string {
		if (!level || level.userGuess === undefined) return '';

		const fullNote = `${note}${octave}`;
		const correct = fullNote === level.noteToGuess;
		const wasGuessed = fullNote === level.userGuess;

		if (wasGuessed) {
			return correct ? 'correct' : 'incorrect';
		} else if (level.noteToGuess === fullNote && level.userGuess) {
			return 'correct-answer';
		}

		return '';
	}

	// Exit current practice session
	function exitPractice() {
		level = undefined;
		streak = 0;
	}

	// Load saved progress on component mount
	onMount(() => {
		loadProgress();
	});
</script>

<header>
	<h1>Perfect Pitch Trainer</h1>
	<div class="stats">
		<div class="stat">
			<span class="stat-label">Lifetime Points:</span>
			<span class="stat-value">{lifetime_points}</span>
		</div>
		{#if last_score}
			<div class="stat">
				<span class="stat-label">Last Score:</span>
				<span class="stat-value"
					>{last_score.points} pts on {last_score.date}
					{last_score.doublePoints ? '(Double points today!)' : ''}</span
				>
			</div>
		{/if}
		{#if level}
			<div class="stat streak">
				<span class="stat-label">Current Streak:</span>
				<span class="stat-value">{streak}</span>
			</div>
		{/if}
	</div>
</header>

<div class="content">
	{#if level === undefined}
		<!-- Level Selection Screen -->
		<div class="level-selection">
			<h2>Select a Level</h2>
			<div class="levels-grid">
				{#each levels as levelConfig, index}
					<button class="level-btn" onclick={() => startLevel(index)}>
						<h3>{levelConfig.name}</h3>
						<p>{levelConfig.description}</p>
					</button>
				{/each}
			</div>
		</div>
	{:else}
		<!-- Practice Screen -->
		<div class="practice-area">
			<div class="level-cleared" style={level.levelCleared ? '' : 'visibility: hidden;'}>
				<span>🎉 Congratulations! You've cleared this level for today! 🎉</span>
			</div>

			<div class="controls">
				<button class="play-btn" onclick={playCurrentNote} disabled={level.isPlaying}>
					{level.isPlaying ? 'Playing...' : 'Play Note'}
				</button>
				<button class="exit-btn" onclick={exitPractice}>Exit Practice</button>
			</div>

			<div class="keyboard-container">
				{#each [...new Set(level.notes.map((note) => note.slice(-1)))] as octave}
					<div class="octave-row">
						<div class="octave-label">Octave {octave}</div>
						<div class="keyboard">
							{#each [...new Set(level.notes
										.filter((n) => n.endsWith(octave))
										.map((n) => n.slice(0, -1)))] as note}
								<button
									class="note-btn {getFeedbackClass(note, parseInt(octave))}"
									onclick={() => makeGuess(note, parseInt(octave))}
									disabled={level.userGuess !== undefined}
								>
									{note}{octave}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<div class="feedback-container">
				{#if level.userGuess !== undefined}
					<div class="feedback">
						{#if level.userGuess === level.noteToGuess}
							<div class="feedback-correct">Correct!</div>
						{:else}
							<div class="feedback-incorrect">
								Incorrect. The correct note was {level.noteToGuess}.
							</div>
						{/if}
					</div>
				{:else}
					<div class="feedback feedback-placeholder">
						<div class="feedback-correct">Correct!</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.content {
		background-color: #2d2d2d;
		border-radius: 8px;
		padding: 20px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		max-width: 1000px;
		margin: 0 auto;
		padding: 20px;
		background-color: #1e1e1e;
		color: white;
	}

	header {
		text-align: center;
		margin-bottom: 30px;
	}

	h1 {
		color: white;
		margin-bottom: 10px;
	}

	h2 {
		color: white;
	}

	.stats {
		display: flex;
		justify-content: center;
		gap: 20px;
		margin-top: 10px;
	}

	.stat {
		background-color: #2d2d2d;
		color: white;
		padding: 10px 15px;
		border-radius: 5px;
	}

	.streak {
		background-color: #2d5e2d;
	}

	.stat-label {
		font-weight: bold;
		margin-right: 5px;
	}

	.level-selection h2 {
		text-align: center;
		margin-bottom: 20px;
	}

	.levels-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 15px;
	}

	.level-btn {
		background-color: #333;
		color: white;
		border: 1px solid #444;
		border-radius: 5px;
		padding: 15px;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.level-btn:hover {
		background-color: #444;
		transform: translateY(-2px);
	}

	.level-btn h3 {
		margin-top: 0;
		color: white;
	}

	.level-btn p {
		color: #ccc;
		font-size: 14px;
		margin-bottom: 0;
	}

	.practice-area {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.level-cleared {
		background-color: #2d5e2d;
		color: white;
		text-align: center;
		padding: 12px;
		border-radius: 4px;
		font-weight: bold;
		margin-bottom: 10px;
	}

	.controls {
		display: flex;
		justify-content: center;
		gap: 15px;
		margin-bottom: 10px;
	}

	.play-btn,
	.exit-btn {
		padding: 10px 20px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
	}

	.play-btn {
		background-color: #4caf50;
		color: white;
	}

	.play-btn:disabled {
		background-color: #2d5e2d;
		cursor: not-allowed;
	}

	.exit-btn {
		background-color: #f44336;
		color: white;
	}

	.keyboard-container {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.octave-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.octave-label {
		width: 100px;
		text-align: right;
		font-weight: bold;
		color: #ddd;
	}

	.keyboard {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		flex: 1;
	}

	.note-btn {
		padding: 10px;
		min-width: 60px;
		border: 1px solid #444;
		border-radius: 4px;
		background-color: #333;
		color: white;
		cursor: pointer;
		font-size: 14px;
	}

	.note-btn:hover:not(:disabled) {
		background-color: #444;
	}

	.note-btn:disabled {
		cursor: not-allowed;
		opacity: 0.8;
	}

	.note-btn.correct {
		background-color: #2d5e2d;
		border-color: #4caf50;
		color: white;
	}

	.note-btn.incorrect {
		background-color: #5e2d2d;
		border-color: #f44336;
		color: white;
		transition: background-color 1.5s;
	}

	.note-btn.correct-answer {
		background-color: #2d5e2d;
		border-color: #4caf50;
		color: white;
		animation: pulse 1s infinite;
	}

	.feedback-container {
		min-height: 60px;
	}

	.feedback {
		text-align: center;
		padding: 10px;
		border-radius: 4px;
	}

	.feedback-placeholder {
		visibility: hidden;
	}

	.feedback-correct {
		background-color: #2d5e2d;
		color: white;
		padding: 10px;
		border-radius: 4px;
	}

	.feedback-incorrect {
		background-color: #5e2d2d;
		color: white;
		padding: 10px;
		border-radius: 4px;
		transition: background-color 1.5s;
	}

	@keyframes pulse {
		0% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.6;
		}
	}
</style>
