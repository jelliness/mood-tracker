import { renderTrendCard, renderCalendarCard, renderWordCloudCard, initInsights } from './insights.js'
import { renderJar, initJar } from './jar.js'

export function renderDashboard() {
  return `
    <div class="dashboard-layout">
      <aside class="dashboard-jar-panel">
        ${renderJar()}
      </aside>
      <div class="dashboard-trend-panel">
        ${renderTrendCard()}
        ${renderWordCloudCard()}
      </div>
      <aside class="dashboard-cal-panel">
        ${renderCalendarCard()}
      </aside>
    </div>
  `
}

export async function initDashboard() {
  initJar()
  await initInsights()
}
