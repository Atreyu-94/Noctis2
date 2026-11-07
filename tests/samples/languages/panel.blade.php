{{-- Laravel Blade fixture with a supplied observations collection. --}}
<section class="observations">
  <h1>{{ $title ?? 'Tonight' }}</h1>
  @forelse ($observations as $item)
    <article @class(['target', 'active' => $item->exposure > 0])>
      <strong>{{ $item->target }}</strong>
      <span>{{ number_format($item->exposure * 1.5, 2) }} seconds</span>
    </article>
  @empty
    <p>No observations yet.</p>
  @endforelse
</section>
