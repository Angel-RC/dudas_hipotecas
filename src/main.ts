import './style.css';
import { questions } from './questions';
import { getRoute, navigate, onRouteChange, replaceRoute } from './router';
import { createStore } from './state';
import { renderCommonInputs } from './ui/inputs';
import { renderLayout } from './ui/layout';
import { activeSectionId, renderQuestionSections, repaintQuestionSections } from './ui/sections';
import { renderSidebar, setActiveSidebarItem } from './ui/sidebar';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('No se encontró #app');

const store = createStore();
const { sidebar, common, content } = renderLayout(app);
const questionSections = renderQuestionSections(content, questions, { store });
const sectionElements = questionSections.map(({ element }) => element);
const sectionById = new Map(
  questionSections.map(({ question, element }) => [question.id, element]),
);

function resolveSectionId(id: string): string {
  if (sectionById.has(id)) return id;
  return questionSections[0]?.question.id ?? '';
}

const requestedRoute = getRoute();
const initialSectionId = resolveSectionId(requestedRoute);
if (initialSectionId && requestedRoute !== initialSectionId) replaceRoute(initialSectionId);

function scrollToSection(id: string, behavior: ScrollBehavior): void {
  sectionById.get(id)?.scrollIntoView({ behavior, block: 'start' });
}

let activeId = initialSectionId;
renderSidebar(sidebar, questions, activeId, (id) => {
  if (getRoute() === id) scrollToSection(id, 'smooth');
  else navigate(id);
});

renderCommonInputs(common, store);

function handleRouteChange(id: string): void {
  const resolvedId = resolveSectionId(id);
  if (!resolvedId) return;
  if (resolvedId !== id) replaceRoute(resolvedId);
  activeId = resolvedId;
  setActiveSidebarItem(sidebar, activeId);
  scrollToSection(activeId, 'smooth');
}

function updateActiveSection(): void {
  const visibleId = activeSectionId(sectionElements, window.innerHeight * 0.35);
  if (!visibleId || visibleId === activeId) return;
  activeId = visibleId;
  setActiveSidebarItem(sidebar, activeId);
  if (getRoute() !== activeId) replaceRoute(activeId);
}

onRouteChange(handleRouteChange);
window.addEventListener('scroll', updateActiveSection, { passive: true });
window.addEventListener('resize', updateActiveSection);

if (requestedRoute && sectionById.has(requestedRoute)) {
  scrollToSection(requestedRoute, 'auto');
}
updateActiveSection();

let repaintTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleRepaint(): void {
  if (repaintTimer !== undefined) clearTimeout(repaintTimer);
  repaintTimer = setTimeout(() => {
    repaintQuestionSections(questionSections, { store });
  }, 120);
}

store.subscribe(() => scheduleRepaint());
