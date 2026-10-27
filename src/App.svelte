<script>
  import { onDestroy, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import Scene from './Scene.svelte';
  import { sound } from './sound.js';

  const addresses = { from: 'ул. Багратиона, 51', to: 'ул. Вашникрадского, 21' };
  let step = $state(0);
  let response = $state(null);
  let escapes = $state(0);
  let noPosition = $state(null);
  let noPhase = $state('ready');
  let noButton = $state();
  let yesButton = $state();
  let heading = $state();
  let burst = $state(null);
  let reducedMotion = $state(false);
  const timers = new Set();

  function later(callback, delay) {
    const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
    timers.add(timer);
  }

  function cancelTimers() {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  }

  $effect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = media.matches;
    const change = event => reducedMotion = event.matches;
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  });

  onDestroy(cancelTimers);

  function showResponse(message, kind, nextStep) {
    if (response) return;
    response = { message, kind };
    later(async () => {
      step = nextStep;
      response = null;
      await tick();
      heading?.focus({ preventScroll: true });
    }, kind === 'alert' ? 2200 : 1800);
  }

  function choose(value) {
    if (response) return;
    if (step === 0) {
      sound(value === 'good' ? 'agree' : 'deny');
      showResponse(value === 'good' ? 'Отлично!' : 'Ничего, будем исправлять.', value === 'good' ? 'happy' : 'warm', 1);
    } else if (step === 1) {
      sound(value === 'yes' ? 'deny' : 'agree');
      showResponse(value === 'yes' ? 'ОТМЕНИ! У НАС ПИЦЦА!' : 'Замечательно!', value === 'yes' ? 'alert' : 'happy', 2);
    }
  }

  function viewport() {
    return {
      width: Math.min(window.innerWidth, window.visualViewport?.width || window.innerWidth),
      height: Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight),
    };
  }

  function moveNo() {
    if (step !== 2 || response || noPhase !== 'ready') return;
    sound('deny');
    escapes += 1;
    const { width, height } = viewport();
    const rect = noButton.getBoundingClientRect();
    const yes = yesButton.getBoundingClientRect();
    const buttonWidth = Math.min(rect.width, width - 32);
    const buttonHeight = rect.height;
    const maxX = Math.max(16, width - buttonWidth - 16);
    const maxY = Math.max(16, height - buttonHeight - 16);
    const spots = [[.05, .12], [.95, .15], [.08, .82], [.93, .45], [.1, .48], [.9, .85]];
    let destination;
    for (let index = 0; index < spots.length; index++) {
      const [x, y] = spots[(escapes - 1 + index) % spots.length];
      const candidate = { x: 16 + (maxX - 16) * x, y: 16 + (maxY - 16) * y, width: buttonWidth, height: buttonHeight };
      const overlapsYes = candidate.x < yes.right + 12 && candidate.x + buttonWidth > yes.left - 12 && candidate.y < yes.bottom + 12 && candidate.y + buttonHeight > yes.top - 12;
      const distance = Math.hypot(candidate.x - rect.x, candidate.y - rect.y);
      if (!overlapsYes && distance > Math.min(100, width / 4)) { destination = candidate; break; }
    }
    noPosition = destination || { x: maxX, y: 16, width: buttonWidth, height: buttonHeight };
    noPhase = 'moving';
    later(() => {
      if (step !== 2 || response) return;
      if (escapes === 6) popNo();
      else noPhase = 'ready';
    }, reducedMotion ? 100 : 380);
  }

  function popNo() {
    if (step !== 2 || response) return;
    const rect = noButton.getBoundingClientRect();
    noPhase = 'popping';
    burst = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    sound('pop');
    later(async () => {
      noPhase = 'gone';
      noPosition = null;
      await tick();
      yesButton?.focus({ preventScroll: true });
    }, reducedMotion ? 100 : 350);
    later(() => { burst = null; }, 800);
  }

  function accept() {
    if (response) return;
    cancelTimers();
    noPosition = null;
    burst = null;
    sound('success');
    showResponse('Ура! Жду тебя, моя Ева.', 'love', 3);
  }

  function resize() {
    if (!noPosition) return;
    const { width, height } = viewport();
    noPosition = { ...noPosition, x: Math.max(16, Math.min(noPosition.x, width - noPosition.width - 16)), y: Math.max(16, Math.min(noPosition.y, height - noPosition.height - 16)) };
  }
</script>

<svelte:window onresize={resize} />

{#snippet heart()}
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.5 4.8a5.4 5.4 0 0 0-7.6 0l-.9.9-.9-.9a5.4 5.4 0 0 0-7.6 7.6L12 21l8.5-8.6a5.4 5.4 0 0 0 0-7.6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
{/snippet}

<main class="stage" class:finale={step === 3} inert={Boolean(response)}>
  <div class="pig-panel"><Scene /></div>

  <section class="question-panel" aria-label="Приглашение для Евы">
    {#if step === 0}
      <h1 tabindex="-1" bind:this={heading}>Ева, как твоё<br/><em>настроение сегодня?</em></h1>
      <div class="answers">
        <button class="answer-button affirmative" onclick={() => choose('good')}><span class="face" aria-hidden="true">☺</span>Хорошо</button>
        <button class="answer-button negative" onclick={() => choose('bad')}><span class="face" aria-hidden="true">☹</span>Плохо</button>
      </div>
    {:else if step === 1}
      <h1 tabindex="-1" bind:this={heading}>Есть ли у тебя<br/><em>планы на вечер?</em></h1>
      <div class="answers">
        <button class="answer-button affirmative" onclick={() => choose('yes')}>Да, есть</button>
        <button class="answer-button negative" onclick={() => choose('no')}>Пока нет</button>
      </div>
    {:else if step === 2}
      <h1 tabindex="-1" bind:this={heading}>Придёшь ко мне<br/><em>покушать пиццу?</em></h1>
      <div class="answers invite-answers" class:only-yes={noPhase === 'gone'}>
        <button bind:this={yesButton} class="answer-button affirmative yes-button" onclick={accept}>Да, я приду! {@render heart()}</button>
        {#if noPhase !== 'gone'}
          <button bind:this={noButton} class="answer-button negative no-button" class:escaped={noPosition} class:popping={noPhase === 'popping'} disabled={noPhase !== 'ready'} style={noPosition ? `left:${noPosition.x}px;top:${noPosition.y}px;width:${noPosition.width}px;height:${noPosition.height}px;` : ''} onclick={moveNo}>Нет</button>
        {/if}
      </div>
    {:else}
      <h1 class="final-heading" tabindex="-1" bind:this={heading}>Жду тебя,<br/> <em>моя Ева.</em><span aria-hidden="true"> ♡</span></h1>
      <div class="route-card"><Scene mode="route"/></div>
      <div class="addresses">
        <div><span class="address-dot"></span><small>ОТ ТЕБЯ</small><strong>{addresses.from}</strong></div>
        <div><span class="address-dot finish">♡</span><small>К ПИЦЦЕ И ОБЪЯТИЯМ</small><strong>{addresses.to}</strong></div>
      </div>
      <p class="map-disclaimer">Донецк · схема условная, адреса требуют уточнения</p>
    {/if}
  </section>
</main>

{#if response}
  <div class="response-screen response--{response.kind}" role="status" aria-live="polite" aria-atomic="true" transition:fade={{ duration: reducedMotion ? 0 : 150 }}>
    <span class="response-symbol" aria-hidden="true">{response.kind === 'alert' ? '×' : response.kind === 'warm' || response.kind === 'love' ? '♡' : '✓'}</span>
    <p class="response-title">{response.message}</p>
  </div>
{/if}

{#if burst && !reducedMotion}
  <div class="balloon-burst" style={`left:${burst.x}px;top:${burst.y}px;`} aria-hidden="true">
    {#each Array(12) as _, index}<i style={`--angle:${index * 30}deg;--distance:${65 + (index % 3) * 23}px;--color:${index % 2 ? '#ce646c' : '#eeb5a5'};`}></i>{/each}
    <span></span>
  </div>
{/if}
