<script>
  import { onMount } from 'svelte';
  let { mode = 'pig' } = $props();
  let container;
  let failed = $state(false);
  onMount(() => {
    let scene;
    let cancelled = false;
    import('./scene.js').then(({ mountScene }) => {
      if (cancelled) return;
      try { scene = mountScene(container, mode); }
      catch { failed = true; }
    }).catch(() => { if (!cancelled) failed = true; });
    return () => { cancelled = true; scene?.destroy(); };
  });
</script>

<div class="scene scene--{mode}" bind:this={container} role="img" aria-label={mode === 'pig' ? 'Объёмная розовая свинка с кусочком пиццы и сердечками' : 'Художественная объёмная схема города с дорожкой к дому'}>
  {#if failed}
    <div class="scene-fallback" aria-hidden="true">{mode === 'pig' ? '🐷 🍕' : '📍 🏡 💗'}<span>{mode === 'pig' ? 'особая доставка любви' : 'от тебя — к пицце и объятиям'}</span></div>
  {/if}
</div>
