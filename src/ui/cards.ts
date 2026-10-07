export type Card = { label: string; value: string };

export function renderCards(container: HTMLElement, cards: Card[]): void {
  container.innerHTML = `
    <div class="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
      ${cards
        .map(
          (c) => `
        <div class="min-w-0 py-1">
          <span class="mb-1 block text-xs text-muted">${c.label}</span>
          <span class="block text-xl font-bold tabular-nums">${c.value}</span>
        </div>`,
        )
        .join('')}
    </div>`;
}
