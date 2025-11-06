/**
 * Sorts an HTML table.
 *
 * @param {HTMLTableElement} table The table to sort.
 * @param {number} column The index of the column to sort.
 * @param {boolean} asc Determines if the sorting is ascending.
 */
function sortTableByColumn(table, column, asc = true) {
    const dirModifier = asc ? 1 : -1;
    const tBody = table.tBodies[0];
    const rows = Array.from(tBody.querySelectorAll("tr"));

    // Sort each row
    const sortedRows = rows.sort((a, b) => {
        const aColText = a.querySelector(`td:nth-child(${column + 1})`).textContent.trim();
        const bColText = b.querySelector(`td:nth-child(${column + 1})`).textContent.trim();

        let aVal, bVal;

        // Use column index to determine data type and parse accordingly
        switch (column) {
            case 0: // No.
                aVal = parseInt(aColText, 10);
                bVal = parseInt(bColText, 10);
                break;
            case 2: // Energy Points
                aVal = parseFloat(aColText.replace(/,/g, ''));
                bVal = parseFloat(bColText.replace(/,/g, ''));
                break;
            case 3: // Points Behind
                aVal = aColText === 'N/A' ? 0 : parseFloat(aColText.replace(/M/g, '')) * 1000000;
                bVal = bColText === 'N/A' ? 0 : parseFloat(bColText.replace(/M/g, '')) * 1000000;
                break;
            case 1: // User (default text sort)
            default:
                aVal = aColText.toLowerCase();
                bVal = bColText.toLowerCase();
                break;
        }

        if (aVal < bVal) return -1 * dirModifier;
        if (aVal > bVal) return 1 * dirModifier;
        return 0;
    });

    // Remove all existing TRs from the table
    while (tBody.firstChild) {
        tBody.removeChild(tBody.firstChild);
    }

    // Re-add the newly sorted rows
    tBody.append(...sortedRows);

    // Update header classes for sorting indicators
    table.querySelectorAll("th").forEach(th => th.classList.remove("th-sort-asc", "th-sort-desc"));
    table.querySelector(`th:nth-child(${column + 1})`).classList.toggle("th-sort-asc", asc);
    table.querySelector(`th:nth-child(${column + 1})`).classList.toggle("th-sort-desc", !asc);
}

document.querySelectorAll(".wikitable.sortable th").forEach(headerCell => {
    headerCell.addEventListener("click", () => {
        const tableElement = headerCell.closest("table");
        const headerIndex = Array.from(headerCell.parentElement.children).indexOf(headerCell);
        const currentIsAscending = headerCell.classList.contains("th-sort-asc");

        sortTableByColumn(tableElement, headerIndex, !currentIsAscending);
    });
});

// ---- JSON loader and renderer ----
/**
 * Add comma separators to a number (e.g., 1234567 -> "1,234,567").
 */
function formatNumberWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setStatus(message, type = 'info') {
    const statusEl = document.getElementById('leaderboard-status');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.className = '';
    if (type) statusEl.classList.add(`status-${type}`);
}

/**
 * Render leaderboard rows from parsed JSON data into the table's tbody.
 * Expects data.entries to be an array of objects with fields:
 *   rank, name, profile_url, points (number), pointsBehindRaw (string)
 */
function renderLeaderboardFromJson(data) {
    const table = document.querySelector('.wikitable.sortable');
    if (!table) return;
    const tBody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));

    // Clear existing rows
    tBody.innerHTML = '';

    const entries = Array.isArray(data.entries) ? data.entries : [];

    // Optionally sort by rank to ensure correct order
    entries.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    entries.forEach(entry => {
        const tr = document.createElement('tr');

        // Rank
        const tdRank = document.createElement('td');
        tdRank.textContent = entry.rank != null ? entry.rank : '';
        tr.appendChild(tdRank);

        // User (link to profile)
        const tdUser = document.createElement('td');
        const a = document.createElement('a');
        a.textContent = entry.name || '';
        if (entry.profile_url) {
            a.href = entry.profile_url;
            a.target = '_blank';
            a.rel = 'nofollow noreferrer noopener';
            a.className = 'external text';
        }
        tdUser.appendChild(a);
        tr.appendChild(tdUser);

        // Energy Points
        const tdPoints = document.createElement('td');
        tdPoints.className = 'points';
        tdPoints.textContent = (entry.points != null) ? formatNumberWithCommas(entry.points) : '';
        tr.appendChild(tdPoints);

        // Points Behind
        const tdBehind = document.createElement('td');
        tdBehind.className = 'points';
        tdBehind.textContent = entry.pointsBehindRaw != null ? entry.pointsBehindRaw : (entry.pointsBehind != null ? formatNumberWithCommas(entry.pointsBehind) : '');
        tr.appendChild(tdBehind);

        tBody.appendChild(tr);
    });
}

function getLeaderboardJsonPath() {
    // If the current path includes the leaderboard directory, adjust the path to go up one level.
    if (window.location.pathname.includes('/ep_leaderboard/')) {
        return '../EP_Leaderboard.json';
    }
    // Otherwise, assume the JSON file is in the same directory.
    return 'EP_Leaderboard.json';
}

function fetchAndRender() {
    const jsonPath = getLeaderboardJsonPath();
    setStatus('Loading...', 'loading');
    return fetch(jsonPath)
        .then(resp => {
            if (!resp.ok) throw new Error('Failed to load ' + jsonPath + ' (status: ' + resp.status + ')');
            return resp.json();
        })
        .then(data => {
            renderLeaderboardFromJson(data);
            setStatus('Loaded', 'success');
            // re-enable sorting (headers already wired up on script execution)
            return data;
        })
        .catch(err => {
            setStatus('Could not load leaderboard (see console)', 'error');
            // eslint-disable-next-line no-console
            console.warn('Could not load leaderboard JSON:', err);
            throw err;
        });
}

document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-leaderboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchAndRender().catch(() => {});
        });
    }

    // Initial fetch
    fetchAndRender().catch(() => {});
});