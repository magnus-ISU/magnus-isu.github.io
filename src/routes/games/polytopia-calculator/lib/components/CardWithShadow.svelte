<script>
let { children, style = '', class: className = '', ...rest } = $props();
</script>

<div class="card-with-shadow {className}" {style} role="presentation" {...rest}>
	{@render children?.()}
</div>

<style>
.card-with-shadow {
	padding: 2%;
	background-color: #2a2a2a;
	color: #e8e8e8;
	border: 1px solid #3a3a3a;
	border-radius: 8px;
	margin-bottom: 8px;
	box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.6), 0 6px 10px rgba(0, 0, 0, 0.4), 0 1px 18px rgba(0, 0, 0, 0.35);
}
</style>
