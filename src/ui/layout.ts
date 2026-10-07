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
      <div data-layout-shell class="mx-auto grid max-w-screen-2xl gap-8 p-4 md:grid-cols-[220px_minmax(0,1fr)] md:p-8 xl:gap-10">
        <aside class="md:sticky md:top-6 md:self-start">
          <h1 class="mb-1 text-2xl font-semibold tracking-tight">Simulador de hipotecas</h1>
          <p class="mb-4 text-sm text-muted">Sistema francés · respuestas claras</p>
          <nav id="sidebar" class="flex flex-col gap-1"></nav>
        </aside>
        <main class="min-w-0">
          <header data-page-intro class="mb-6 max-w-4xl">
            <h2 class="mb-2 text-3xl font-semibold tracking-tight">Tu hipoteca, de un vistazo</h2>
            <p class="text-base leading-relaxed text-muted">
              Explora sus principales datos, cómo evolucionan los pagos y las opciones que pueden
              ayudarte a planificar el futuro.
            </p>
          </header>
          <section id="common" class="mb-6 rounded-3xl bg-panel p-5 shadow-sm md:p-7"></section>
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
