import './style.css';
import { questions } from './questions';
import { getRoute, navigate, onRouteChange } from './router';
import { createStore } from './state';
import { renderCommonInputs } from './ui/inputs';
import { renderLayout } from './ui/layout';
import { renderSidebar } from './ui/sidebar';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('No se encontró #app');

const store = createStore();
const { sidebar, common, content } = renderLayout(app);

function activeId(): string {
  const id = getRoute();
  if (questions.some((q) => q.id === id)) return id;
  return questions[0]?.id ?? '';
}

function renderContent(): void {
  const id = activeId();
  renderSidebar(sidebar, questions, id, (next) => navigate(next));
  content.innerHTML = '';
  const question = questions.find((q) => q.id === id);
  if (question) question.render(content, { store });
  else content.innerHTML = '<p class="text-muted">Próximamente.</p>';
}

renderCommonInputs(common, store);

onRouteChange(renderContent);
store.subscribe(() => {
  const question = questions.find((q) => q.id === activeId());
  if (question) {
    content.innerHTML = '';
    question.render(content, { store });
  }
});
renderContent();
