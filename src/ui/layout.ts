export type Layout = {
  sidebar: HTMLElement;
  common: HTMLElement;
  content: HTMLElement;
};

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Elemento no encontrado');
  return value;
}

export function renderLayout(root: HTMLElement): Layout {
  root.innerHTML = `
    <div class="min-h-screen bg-canvas text-ink">
      <div class="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[260px_1fr] md:p-6">
        <aside class="md:sticky md:top-6 md:self-start">
          <h1 class="mb-1 text-xl font-bold">Simulador de hipotecas</h1>
          <p class="mb-4 text-sm text-muted">Sistema francés · respuestas claras</p>
          <nav id="sidebar" class="flex flex-col gap-1"></nav>
        </aside>
        <main class="min-w-0">
          <section id="common" class="mb-6 rounded-xl border border-line bg-panel p-4"></section>
          <div id="content"></div>
        </main>
      </div>
    </div>`;
  return {
    sidebar: must(root.querySelector<HTMLElement>('#sidebar')),
    common: must(root.querySelector<HTMLElement>('#common')),
    content: must(root.querySelector<HTMLElement>('#content')),
  };
}
