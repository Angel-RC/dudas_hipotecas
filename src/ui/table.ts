export function renderTable(container: HTMLElement, headers: string[], rows: string[][]): void {
  const columnWidths = headers.map((_, index) =>
    rows.reduce((width, row) => Math.max(width, Array.from(row[index] ?? '').length), 0),
  );
  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-right tabular-nums">
        <thead>
          <tr>${headers
            .map(
              (h, i) =>
                `<th class="border-b border-line bg-canvas px-3 py-3 text-xs font-semibold text-muted ${
                  i === 0 ? 'text-left' : ''
                }">${h}</th>`,
            )
            .join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr class="border-b border-line/60 last:border-0 hover:bg-panel">${r
                  .map(
                    (cell, i) =>
                      `<td class="whitespace-nowrap px-3 py-2 ${i === 0 ? 'text-left' : 'text-right'}"><span data-table-value="${i}" class="inline-block text-right font-mono tabular-nums" style="width: ${columnWidths[i]}ch">${cell}</span></td>`,
                  )
                  .join('')}</tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}
