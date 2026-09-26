export type Card = { label: string; value: string };

export function renderCards(container: HTMLElement, cards: Card[]): void {
  container.innerHTML = `
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      ${cards
        .map(
          (c) => `
        <div class="rounded-xl border border-line bg-panel p-4">
          <span class="mb-1 block text-xs text-muted">${c.label}</span>
          <span class="block text-xl font-bold">${c.value}</span>
        </div>`,
        )
        .join('')}
    </div>`;
}
