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
