<!-- Renders any page at /blog/category/* -->
<script>
import Pagination from '$lib/components/Pagination.svelte';
import PostsList from '$lib/components/PostsList.svelte';

let { data } = $props();

const { page, posts, category, total } = data;
</script>


<svelte:head>
	<title>Category: {category}</title>
</svelte:head>


<h1>Blog category: {category}</h1>

{#if posts.length}
	<PostsList posts={posts} />
	<Pagination currentPage={page} totalPosts={total} path="/blog/category/{category}/page" />
{:else}
	<p><strong>Ope!</strong> Sorry, couldn't find any posts in the category "{category}".</p>

	<p><a href="/blog">Back to blog</a></p>
{/if}