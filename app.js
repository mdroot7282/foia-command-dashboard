const DIVISIONS = ['DCI', 'DJS', 'DOP', 'DII', 'DFS'];

const ui = {
  kpiTotalOpen: document.getElementById('kpiTotalOpen'),
  kpiDueIn10: document.getElementById('kpiDueIn10'),
  kpiDueIn5: document.getElementById('kpiDueIn5'),
  kpiDueToday: document.getElementById('kpiDueToday'),
  kpiOverdue: document.getElementById('kpiOverdue'),
  kpiAverageDaysOpen: document.getElementById('kpiAverageDaysOpen'),
  kpiClosedThisMonth: document.getElementById('kpiClosedThisMonth'),
  kpiByDivision: document.getElementById('kpiByDivision'),
  divisionWorkloadBody: document.getElementById('divisionWorkloadBody'),
  upcomingDeadlinesList: document.getElementById('upcomingDeadlinesList'),
  requestTableBody: document.getElementById('requestTableBody'),
  detailPanelContent: document.getElementById('detailPanelContent'),
  requestSearch: document.getElementById('requestSearch'),
  darkModeToggle: document.getElementById('darkModeToggle'),
  presentationModeToggle: document.getElementById('presentationModeToggle'),
};

const state = {
  requests: [],
  filtered: [],
  selectedId: null,
};

function parseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleDateString();
}

function dayDiff(startDate, endDate) {
  const ms = startOfDay(endDate).getTime() - startOfDay(startDate).getTime();
  return Math.round(ms / 86400000);
}

function getOpenRequests() {
  return state.requests.filter((request) => request.status.toLowerCase() === 'open');
}

function getDateBuckets(openRequests) {
  const today = startOfDay(new Date());
  return openRequests.reduce(
    (acc, request) => {
      const dueDate = parseDate(request.dueDate);
      if (!dueDate) return acc;
      const daysUntilDue = dayDiff(today, dueDate);
      if (daysUntilDue < 0) {
        acc.overdue += 1;
      } else if (daysUntilDue === 0) {
        acc.dueToday += 1;
      } else {
        if (daysUntilDue <= 10) acc.dueIn10 += 1;
        if (daysUntilDue <= 5) acc.dueIn5 += 1;
      }
      return acc;
    },
    { dueIn10: 0, dueIn5: 0, dueToday: 0, overdue: 0 }
  );
}

function getClosedThisMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return state.requests.filter((request) => {
    if (request.status.toLowerCase() !== 'closed' || !request.closedDate) return false;
    const closedDate = parseDate(request.closedDate);
    return !!closedDate && closedDate.getFullYear() === year && closedDate.getMonth() === month;
  }).length;
}

function getDivisionCounts(openRequests) {
  return DIVISIONS.reduce((acc, division) => {
    acc[division] = openRequests.filter((request) => request.division === division).length;
    return acc;
  }, {});
}

function getAverageDaysOpen(openRequests) {
  if (!openRequests.length) return 0;
  const today = new Date();
  const totalDays = openRequests.reduce((sum, request) => {
    const receivedDate = parseDate(request.receivedDate);
    return receivedDate ? sum + Math.max(0, dayDiff(receivedDate, today)) : sum;
  }, 0);
  return Math.round(totalDays / openRequests.length);
}

function renderKpis() {
  const openRequests = getOpenRequests();
  const dateBuckets = getDateBuckets(openRequests);
  const divisionCounts = getDivisionCounts(openRequests);

  ui.kpiTotalOpen.textContent = String(openRequests.length);
  ui.kpiDueIn10.textContent = String(dateBuckets.dueIn10);
  ui.kpiDueIn5.textContent = String(dateBuckets.dueIn5);
  ui.kpiDueToday.textContent = String(dateBuckets.dueToday);
  ui.kpiOverdue.textContent = String(dateBuckets.overdue);
  ui.kpiAverageDaysOpen.textContent = String(getAverageDaysOpen(openRequests));
  ui.kpiClosedThisMonth.textContent = String(getClosedThisMonth());
  ui.kpiByDivision.textContent = DIVISIONS.map((division) => `${division}: ${divisionCounts[division]}`).join(' | ');
}

function renderDivisionTable() {
  const openRequests = getOpenRequests();
  const today = new Date();

  const rows = DIVISIONS.map((division) => {
    const divisionOpen = openRequests.filter((request) => request.division === division);
    const dueIn10 = divisionOpen.filter((request) => {
      const dueDate = parseDate(request.dueDate);
      return dueDate && dayDiff(today, dueDate) > 0 && dayDiff(today, dueDate) <= 10;
    }).length;
    const overdue = divisionOpen.filter((request) => {
      const dueDate = parseDate(request.dueDate);
      return dueDate && dayDiff(today, dueDate) < 0;
    }).length;

    return `<tr><td>${division}</td><td>${divisionOpen.length}</td><td>${dueIn10}</td><td>${overdue}</td></tr>`;
  }).join('');

  ui.divisionWorkloadBody.innerHTML = rows;
}

function renderUpcomingDeadlines() {
  const today = new Date();
  const upcoming = getOpenRequests()
    .map((request) => ({ request, dueDate: parseDate(request.dueDate) }))
    .filter((entry) => entry.dueDate && dayDiff(today, entry.dueDate) >= 0)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 6);

  if (!upcoming.length) {
    ui.upcomingDeadlinesList.innerHTML = '<li>No upcoming open request deadlines.</li>';
    return;
  }

  ui.upcomingDeadlinesList.innerHTML = upcoming
    .map(({ request, dueDate }) => {
      const dueIn = dayDiff(today, dueDate);
      const dueLabel = dueIn === 0 ? 'Due today' : `Due in ${dueIn} day${dueIn === 1 ? '' : 's'}`;
      return `<li><strong>${request.requestId}</strong> — ${request.subject}<div class="deadline-meta">${request.division} | ${dueLabel} (${formatDate(request.dueDate)})</div></li>`;
    })
    .join('');
}

function statusClass(request) {
  if (request.status.toLowerCase() !== 'open') return 'status-closed';
  const dueDate = parseDate(request.dueDate);
  if (dueDate && dayDiff(new Date(), dueDate) < 0) return 'status-overdue';
  return 'status-open';
}

function renderRequestTable() {
  if (!state.filtered.length) {
    ui.requestTableBody.innerHTML = '<tr><td colspan="8">No requests match your search.</td></tr>';
    return;
  }

  const today = new Date();
  ui.requestTableBody.innerHTML = state.filtered
    .map((request) => {
      const isActive = request.requestId === state.selectedId;
      const received = parseDate(request.receivedDate);
      const daysOpen = received ? Math.max(0, dayDiff(received, today)) : '-';
      return `<tr class="selectable-row${isActive ? ' active' : ''}" data-request-id="${request.requestId}">
        <td>${request.requestId}</td>
        <td>${request.requester}</td>
        <td>${request.division}</td>
        <td>${request.subject}</td>
        <td>${formatDate(request.receivedDate)}</td>
        <td>${formatDate(request.dueDate)}</td>
        <td class="${statusClass(request)}">${request.status}</td>
        <td>${daysOpen}</td>
      </tr>`;
    })
    .join('');
}

function renderDetailPanel() {
  const selected = state.requests.find((request) => request.requestId === state.selectedId);
  if (!selected) {
    ui.detailPanelContent.innerHTML = '<p>Select a request to view details.</p>';
    return;
  }

  const selectedReceivedDate = parseDate(selected.receivedDate);

  const fields = [
    ['Request ID', selected.requestId],
    ['Requester', selected.requester],
    ['Division', selected.division],
    ['Subject', selected.subject],
    ['Received Date', formatDate(selected.receivedDate)],
    ['Due Date', formatDate(selected.dueDate)],
    ['Status', selected.status],
    ['Assigned To', selected.assignedTo],
    ['Days Open', selectedReceivedDate ? Math.max(0, dayDiff(selectedReceivedDate, new Date())) : '-'],
    ['Notes', selected.notes || 'No notes entered.'],
  ];

  ui.detailPanelContent.innerHTML = fields
    .map(
      ([label, value]) => `<div class="detail-row"><div class="detail-label">${label}</div><div class="detail-value">${value}</div></div>`
    )
    .join('');
}

function renderAll() {
  renderKpis();
  renderDivisionTable();
  renderUpcomingDeadlines();
  renderRequestTable();
  renderDetailPanel();
}

function applySearchFilter() {
  const query = ui.requestSearch.value.trim().toLowerCase();
  if (!query) {
    state.filtered = [...state.requests];
  } else {
    state.filtered = state.requests.filter((request) =>
      [request.requestId, request.requester, request.division, request.subject, request.status]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }

  if (!state.filtered.some((request) => request.requestId === state.selectedId)) {
    state.selectedId = state.filtered[0]?.requestId || null;
  }

  renderRequestTable();
  renderDetailPanel();
}

function handleTableSelection(event) {
  const row = event.target.closest('tr[data-request-id]');
  if (!row) return;
  state.selectedId = row.getAttribute('data-request-id');
  renderRequestTable();
  renderDetailPanel();
}

function setupControls() {
  ui.requestSearch.addEventListener('input', applySearchFilter);
  ui.requestTableBody.addEventListener('click', handleTableSelection);

  ui.darkModeToggle.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = nextTheme;
  });

  ui.presentationModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('presentation-mode');
  });
}

async function init() {
  try {
    const response = await fetch('foia-data.json');
    if (!response.ok) throw new Error('Unable to load FOIA data.');
    const data = await response.json();

    state.requests = Array.isArray(data.requests) ? data.requests : [];
    state.filtered = [...state.requests];
    state.selectedId = state.filtered[0]?.requestId || null;

    setupControls();
    renderAll();
  } catch (error) {
    ui.detailPanelContent.innerHTML = `<p>${error.message}</p>`;
  }
}

init();
