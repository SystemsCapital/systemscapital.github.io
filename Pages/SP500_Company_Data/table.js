/* ==========================================================
   SYSTEMS CAPITAL UNIVERSAL TABLE ENGINE (JSON VERSION)
   Full feature parity with original CSV implementation
========================================================== */

const DATA_FILE = "/SP500_Company_Data/SP500_Company_Data.JSON";

document.addEventListener("DOMContentLoaded", initTable);

/* ==========================================================
   INIT
========================================================== */

async function initTable() {
    try {
        const response = await fetch(DATA_FILE + "?v=" + new Date().getTime());
        const data = await response.json();
        buildTable(data);
    } catch (err) {
        console.error(err);
        document.getElementById("table-container").innerHTML =
            "<p style='color:red;text-align:center;'>Failed to load JSON.</p>";
    }
}

/* ==========================================================
   BUILD TABLE
========================================================== */

function buildTable(data) {

    const table = document.getElementById("data-table");
    const headers = Object.keys(data[0]);

    /* ---------- BUILD HEADER ---------- */

    let thead = "<thead><tr>";
    headers.forEach((col, idx) => {
        thead += `
        <th data-col="${idx}" class="dropdown-container">
            ${col} ▼
            <div class="dropdown">
                <div style="position:sticky; top:0; background:white; z-index:1; padding:5px;">
                    <button class="select-all">Select All</button>
                    <button class="apply">Apply</button>
                    <input type="text" placeholder="Search">
                </div>
                <div class="checkboxes" style="max-height:200px; overflow-y:auto;"></div>
            </div>
        </th>`;
    });
    thead += "</tr></thead>";

    /* ---------- BUILD BODY ---------- */

    let tbody = "<tbody>";
    data.forEach(row => {
        tbody += "<tr>";
        headers.forEach(h => {
            const val = row[h];
            tbody += `<td data-value="${val}">${val}</td>`;
        });
        tbody += "</tr>";
    });
    tbody += "</tbody>";

    table.innerHTML = thead + tbody;

    initializeDropdownLogic(table, headers);
}

/* ==========================================================
   DROPDOWN + FILTER + SORT LOGIC
========================================================== */

function initializeDropdownLogic(table, headers) {

    const ths = table.querySelectorAll("th");
    const filters = Array(headers.length).fill(null);
    const sortState = Array(headers.length).fill(null);
    let lastSortedColumn = null;

    ths.forEach(th => {

        const idx = parseInt(th.dataset.col);
        const dropdown = th.querySelector(".dropdown");
        const checkboxContainer = th.querySelector(".checkboxes");

        /* ---------- UNIQUE VALUES ---------- */

        const unique = Array.from(
            new Set(
                Array.from(table.tBodies[0].rows)
                    .map(r => r.cells[idx].dataset.value)
            )
        ).sort((a,b) => b.localeCompare(a)); // Z lower than A

        /* ---------- SORT RADIO BUTTONS ---------- */

        checkboxContainer.insertAdjacentHTML("afterbegin", `
            <label><input type="radio" name="sort${idx}" value="asc"> Sort Asc</label>
            <label><input type="radio" name="sort${idx}" value="desc"> Sort Desc</label>
        `);

        /* ---------- CHECKBOXES ---------- */

        unique.forEach(val => {
            const label = document.createElement("label");
            label.innerHTML =
                `<input type="checkbox" value="${val}" checked> ${val}`;
            checkboxContainer.appendChild(label);
        });

        /* ---------- OPEN/CLOSE ---------- */

        th.addEventListener("click", e => {
            e.stopPropagation();

            document.querySelectorAll(".dropdown").forEach(d => {
                if (d !== dropdown) {
                    d.style.display = "none";
                    d.closest("th").classList.remove("active-dropdown");
                }
            });

            const isVisible = dropdown.style.display === "block";
            dropdown.style.display = isVisible ? "none" : "block";
            th.classList.toggle("active-dropdown", !isVisible);
        });

        dropdown.addEventListener("click", e => e.stopPropagation());

        /* ---------- SEARCH ---------- */

        const searchInput = dropdown.querySelector("input[type=text]");
        searchInput.addEventListener("keyup", () => {
            const filterText = searchInput.value.toLowerCase();
            checkboxContainer.querySelectorAll("label").forEach(label => {
                const cb = label.querySelector("input[type=checkbox]");
                if (cb) {
                    label.style.display =
                        label.textContent.toLowerCase().includes(filterText)
                        ? "block" : "none";
                }
            });
        });

        /* ---------- SELECT ALL ---------- */

        dropdown.querySelector(".select-all")
            .addEventListener("click", e => {
                e.stopPropagation();
                const checkboxes =
                    checkboxContainer.querySelectorAll("input[type=checkbox]");
                const allChecked = Array.from(checkboxes).every(c => c.checked);
                checkboxes.forEach(c => c.checked = !allChecked);
            });

        /* ---------- APPLY ---------- */

        dropdown.querySelector(".apply")
            .addEventListener("click", () => {

                filters[idx] = Array.from(
                    checkboxContainer.querySelectorAll("input[type=checkbox]:checked")
                ).map(c => c.value);

                const selectedSort =
                    dropdown.querySelector(`input[name=sort${idx}]:checked`);

                sortState.fill(null);
                sortState[idx] = selectedSort ? selectedSort.value : null;

                lastSortedColumn = idx;

                applyFiltersAndSort();

                dropdown.style.display = "none";
                th.classList.remove("active-dropdown");
            });
    });

    /* ---------- APPLY FILTERS + SORT ---------- */

    function applyFiltersAndSort() {

        const rowsArr = Array.from(table.tBodies[0].rows);

        // FILTER ROWS
        rowsArr.forEach(row => {
            let show = true;
            filters.forEach((vals, colIdx) => {
                if (vals) {
                    const cellVal = row.cells[colIdx].dataset.value;
                    if (!vals.includes(cellVal)) show = false;
                }
            });
            row.classList.toggle("hidden", !show);
        });

        if (lastSortedColumn !== null) {

            const direction = sortState[lastSortedColumn];
            const ascending = direction === "asc"; // ASC = low→high, DESC = high→low

            const visible = rowsArr.filter(r => !r.classList.contains("hidden"));

            visible.sort((a, b) => {
                let aVal = a.cells[lastSortedColumn].dataset.value.trim();
                 bVal = b.cells[lastSortedColumn].dataset.value.trim();

                 // Remove commas and other non-digit characters except dot and minus
                const aNum = parseFloat(aVal.replace(/[^0-9.-]+/g, ""));
                const bNum = parseFloat(bVal.replace(/[^0-9.-]+/g, ""));

                const aIsNum = !isNaN(aNum);
                const bIsNum = !isNaN(bNum);

                if (aIsNum && bIsNum) {
                    // Proper numeric sort
                    return ascending ? aNum - bNum : bNum - aNum;
                }

                // Fallback: text sort, treat Z as lower than A
                return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });

            visible.forEach(r => table.tBodies[0].appendChild(r));
        }

        // Ensure table container has minimum height to prevent dropdown cutoff
        const tableContainer = document.getElementById("table-container");
        const minHeight = 150; // adjust as needed
        if (tableContainer.offsetHeight < minHeight) {
            tableContainer.style.minHeight = minHeight + "px";
        }
    }

    /* ---------- CANCEL ON OUTSIDE CLICK ---------- */

    document.addEventListener("click", () => {
        ths.forEach(th => {
            const dropdown = th.querySelector(".dropdown");
            if (dropdown.style.display === "block") {
                dropdown.style.display = "none";
                th.classList.remove("active-dropdown");
            }
        });
    });
}

