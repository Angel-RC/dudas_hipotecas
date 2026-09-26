export function renderTable(container: HTMLElement, headers: string[], rows: string[][]): void {
  container.innerHTML = `
    <div class="overflow-x-auto rounded-xl border border-line bg-panel">
      <table class="w-full border-collapse text-right tabular-nums">
        <thead>
          <tr>${headers
            .map(
              (h, i) =>
                `<th class="border-b border-line px-3 py-2 text-xs text-muted ${
                  i === 0 ? 'text-left' : ''
                }">${h}</th>`,
            )
            .join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr class="border-b border-line last:border-0 hover:bg-canvas">${r
                  .map(
                    (cell, i) =>
                      `<td class="whitespace-nowrap px-3 py-2 ${i === 0 ? 'text-left' : ''}">${cell}</td>`,
                  )
                  .join('')}</tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}
