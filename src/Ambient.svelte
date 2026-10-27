<script>
  const details = [
    { kind: 'heart', x: 7, y: 15, mobileX: 9, mobileY: 12, size: 28, tilt: -18 },
    { kind: 'sparkle', x: 35, y: 12, mobileX: 86, mobileY: 8, size: 22, tilt: 12 },
    { kind: 'pizza', x: 87, y: 14, mobileX: 90, mobileY: 39, size: 36, tilt: 18 },
    { kind: 'sparkle', x: 94, y: 45, mobileX: 8, mobileY: 43, size: 19, tilt: -8 },
    { kind: 'heart', x: 79, y: 86, mobileX: 88, mobileY: 91, size: 23, tilt: 17 },
    { kind: 'sparkle', x: 47, y: 83, mobileX: 12, mobileY: 93, size: 25, tilt: 9 },
    { kind: 'pizza', x: 9, y: 85, size: 31, tilt: -22 },
    { kind: 'heart', x: 44, y: 29, size: 19, tilt: 15 },
    { kind: 'sparkle', x: 4, y: 58, size: 18, tilt: -12 },
    { kind: 'heart', x: 66, y: 9, size: 18, tilt: -12 },
    { kind: 'sparkle', x: 91, y: 76, size: 15, tilt: 8 },
    { kind: 'heart', x: 29, y: 92, size: 16, tilt: -8 },
  ];
</script>

<div class="ambient-background" aria-hidden="true">
  <div class="glow glow-rose"></div>
  <div class="glow glow-peach"></div>
  <div class="glow glow-cream"></div>
  <div class="dotted-orbit"></div>
  {#each details as detail, index}
    <div class="detail" class:desktop-only={!detail.mobileX} style={`--x:${detail.x}%;--y:${detail.y}%;--mobile-x:${detail.mobileX ?? detail.x}%;--mobile-y:${detail.mobileY ?? detail.y}%;--size:${detail.size}px;--tilt:${detail.tilt}deg;--duration:${15 + index % 4 * 3}s;--delay:${-index * 2.7}s;`}>
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        {#if detail.kind === 'heart'}
          <path d="M20 33 7 20C-3 10 12 0 20 11 28 0 43 10 33 20Z" fill="currentColor" fill-opacity=".07"/>
        {:else if detail.kind === 'sparkle'}
          <path d="M20 4c1 10 6 15 16 16-10 1-15 6-16 16-1-10-6-15-16-16C14 19 19 14 20 4Z" fill="currentColor" fill-opacity=".1"/>
          <circle cx="33" cy="7" r="1.5" fill="currentColor" stroke="none"/>
        {:else}
          <path d="m9 9 10 26L34 12Q22 1 9 9Z" fill="currentColor" fill-opacity=".05"/>
          <path d="M11 14q10-6 20 3M10 9q12-7 24 3"/>
          <circle cx="20" cy="18" r="2"/><circle cx="22" cy="26" r="1.5"/>
        {/if}
      </svg>
    </div>
  {/each}
</div>

<style>
  .ambient-background { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
  .glow { position: absolute; width: min(80vw, 1000px); aspect-ratio: 1; border-radius: 50%; opacity: .65; animation: glow-drift 28s ease-in-out infinite alternate; }
  .glow-rose { left: -20%; top: -35%; background: radial-gradient(circle, #f3cbd080, transparent 68%); }
  .glow-peach { right: -25%; bottom: -55%; background: radial-gradient(circle, #efc59c70, transparent 68%); animation-delay: -12s; animation-duration: 34s; }
  .glow-cream { left: 18%; top: 15%; width: min(70vw, 800px); background: radial-gradient(circle, #fff8dd85, transparent 65%); animation-delay: -19s; }
  .dotted-orbit { position: absolute; left: -11%; top: 9%; width: 57%; height: 87%; border: 1px dashed #ce9b8830; border-radius: 50%; transform: rotate(-24deg); }
  .detail { position: absolute; left: var(--x); top: var(--y); width: var(--size); height: var(--size); color: #c88882; opacity: .38; transform: translate(-50%, -50%) rotate(var(--tilt)); animation: detail-drift var(--duration) ease-in-out var(--delay) infinite; }
  .detail svg { display: block; width: 100%; height: 100%; }
  @keyframes detail-drift {
    0%, 100% { transform: translate(-50%, -50%) rotate(var(--tilt)); opacity: .28; }
    50% { transform: translate(calc(-50% + 7px), calc(-50% - 13px)) rotate(calc(var(--tilt) + 9deg)); opacity: .5; }
  }
  @keyframes glow-drift {
    from { transform: translate(-2%, -2%) scale(.95); }
    to { transform: translate(5%, 7%) scale(1.08); }
  }
  @media (max-width: 760px) and (orientation: portrait) {
    .detail { left: var(--mobile-x); top: var(--mobile-y); width: calc(var(--size) * .85); height: calc(var(--size) * .85); }
    .desktop-only { display: none; }
    .dotted-orbit { left: -15%; top: -8%; width: 130%; height: 49%; opacity: .65; }
    .glow { width: 140vw; }
    .glow-rose { left: -70%; top: -20%; }
    .glow-peach { right: -80%; bottom: -12%; }
  }
</style>
