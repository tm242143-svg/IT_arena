/* ============================================================
   IT ARENA - ADMIN.JS
   ============================================================ */

const {
    createClient
} = supabase;

const quizSupabase = window.quizSupabase || createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
);


/* ============================================================
   DOM HELPERS
   ============================================================ */

const $ = (id) => document.getElementById(id);


/* ============================================================
   ADMIN MESSAGE
   ============================================================ */

function showMessage(message, type = "success") {

    const el = $("adminMessage");

    if (!el) return;

    el.textContent = message;
    el.className = `admin-message ${type}`;

    clearTimeout(window.__adminMessageTimer);

    window.__adminMessageTimer = setTimeout(() => {

        el.textContent = "";
        el.className = "admin-message";

    }, 5000);
}


/* ============================================================
   CSV HELPER
   ============================================================ */

function escapeCSV(value) {

    if (value === null || value === undefined) {
        return "";
    }

    const text = String(value);

    return `"${text.replace(/"/g, '""')}"`;
}


function downloadCSV(filename, rows) {

    if (!rows || !rows.length) {

        showMessage(
            "No data available to download.",
            "error"
        );

        return;
    }

    const headers = Object.keys(rows[0]);

    const csv = [
        headers.map(escapeCSV).join(","),

        ...rows.map(row =>
            headers
                .map(header => escapeCSV(row[header]))
                .join(",")
        )

    ].join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}


/* ============================================================
   DATE FORMAT
   ============================================================ */

function formatDate(value) {

    if (!value) return "";

    try {

        return new Date(value).toLocaleString();

    } catch {

        return value;
    }
}


/* ============================================================
   AUTH CHECK
   ============================================================ */

async function checkAdmin() {

    const {
        data: {
            user
        },
        error
    } = await quizSupabase.auth.getUser();

    if (error || !user) {

        window.location.href = "login.html";

        return null;
    }

    return user;
}


/* ============================================================
   ADMIN PROFILE CHECK
   ============================================================ */

async function checkAdminRole(user) {

    if (!user) return false;

    const {
        data,
        error
    } = await quizSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {

        console.error(
            "Admin role error:",
            error
        );

        showMessage(
            "Unable to verify admin access.",
            "error"
        );

        return false;
    }

    if (!data || data.role !== "admin") {

        showMessage(
            "Admin access required.",
            "error"
        );

        setTimeout(() => {

            window.location.href =
                "dashboard.html";

        }, 1200);

        return false;
    }

    return true;
}


/* ============================================================
   LOAD STATISTICS
   ============================================================ */

async function loadStatistics() {

    try {

        /* -------------------------------
           QUESTIONS
        ------------------------------- */

        const {
            count: questionCount,
            error: questionError
        } = await quizSupabase
            .from("questions")
            .select("*", {
                count: "exact",
                head: true
            });

        if (questionError) {
            console.error(questionError);
        }

        if ($("totalQuestions")) {

            $("totalQuestions").textContent =
                questionCount || 0;
        }


        /* -------------------------------
           STUDENTS
        ------------------------------- */

        const {
            count: studentCount,
            error: studentError
        } = await quizSupabase
            .from("profiles")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("role", "student");

        if (studentError) {
            console.error(studentError);
        }

        if ($("totalStudents")) {

            $("totalStudents").textContent =
                studentCount || 0;
        }


        /* -------------------------------
           COMPLETED ATTEMPTS
        ------------------------------- */

        const {
            data: attempts,
            error: attemptError
        } = await quizSupabase.rpc(
            "get_admin_results"
        );

        if (attemptError) {

            console.error(
                "Attempt statistics error:",
                attemptError
            );

        } else {

            if ($("totalAttempts")) {

                $("totalAttempts").textContent =
                    attempts?.length || 0;
            }
        }

    } catch (error) {

        console.error(
            "Statistics error:",
            error
        );
    }
}


/* ============================================================
   LOAD COMPLETED RESULTS
   ============================================================ */

async function loadResults() {

    const body = $("resultsBody");

    if (!body) return;

    body.innerHTML = `
        <tr>
            <td colspan="6">
                Loading…
            </td>
        </tr>
    `;

    const {
        data,
        error
    } = await quizSupabase.rpc(
        "get_admin_results"
    );

    if (error) {

        console.error(
            "Results error:",
            error
        );

        body.innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load results.
                </td>
            </tr>
        `;

        return;
    }

    if (!data || data.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="6">
                    No completed attempts found.
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML = "";

    data.forEach(row => {

        const tr = document.createElement("tr");

        const score =
            row.score ??
            row.points ??
            0;

        const percentage =
            row.percentage ??
            row.percent ??
            0;

        const student =
            row.student_name ??
            row.name ??
            row.full_name ??
            "Unknown";

        const email =
            row.email ??
            "";

        const subject =
            row.subject ??
            row.category ??
            "";

        const completed =
            row.completed_at ??
            row.created_at ??
            row.finished_at ??
            "";

        tr.innerHTML = `
            <td>${escapeHTML(student)}</td>

            <td>${escapeHTML(email)}</td>

            <td>${escapeHTML(subject)}</td>

            <td>${escapeHTML(score)}</td>

            <td>${escapeHTML(percentage)}%</td>

            <td>${escapeHTML(
                formatDate(completed)
            )}</td>
        `;

        body.appendChild(tr);

    });
}


/* ============================================================
   DOWNLOAD WHO FINISHED REPORT
   ============================================================ */

async function downloadWhoFinishedReport() {

    showMessage(
        "Preparing completed attempts report..."
    );

    try {

        const {
            data,
            error
        } = await quizSupabase.rpc(
            "get_admin_results"
        );

        if (error) {

            console.error(
                "Who finished report error:",
                error
            );

            showMessage(
                "Unable to generate completed attempts report.",
                "error"
            );

            return;
        }

        if (!data || data.length === 0) {

            showMessage(
                "There are no completed attempts to export.",
                "error"
            );

            return;
        }

        const rows = data.map(row => {

            const score =
                row.score ??
                row.points ??
                0;

            const percentage =
                row.percentage ??
                row.percent ??
                0;

            return {

                Student:
                    row.student_name ??
                    row.name ??
                    row.full_name ??
                    "Unknown",

                Email:
                    row.email ??
                    "",

                Subject:
                    row.subject ??
                    row.category ??
                    "",

                Score:
                    score,

                Percentage:
                    percentage,

                "Completed At":
                    formatDate(
                        row.completed_at ??
                        row.created_at ??
                        row.finished_at
                    )
            };
        });

        downloadCSV(
            "IT_Arena_Who_Finished_Report.csv",
            rows
        );

        showMessage(
            `${rows.length} completed attempt(s) exported successfully.`
        );

    } catch (error) {

        console.error(error);

        showMessage(
            "Failed to download completed attempts report.",
            "error"
        );
    }
}


/* ============================================================
   LOAD STUDENTS / WARNINGS / BLOCKS
   ============================================================ */

async function loadStudents() {

    const body = $("studentsBody");

    if (!body) return;

    body.innerHTML = `
        <tr>
            <td colspan="5">
                Loading…
            </td>
        </tr>
    `;

    const {
        data,
        error
    } = await quizSupabase
        .from("profiles")
        .select(`
            id,
            full_name,
            email,
            warning_count,
            blocked,
            role
        `)
        .eq("role", "student")
        .order(
            "full_name",
            {
                ascending: true
            }
        );

    if (error) {

        console.error(
            "Students error:",
            error
        );

        body.innerHTML = `
            <tr>
                <td colspan="5">
                    Unable to load students.
                </td>
            </tr>
        `;

        return;
    }

    if (!data || data.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="5">
                    No students found.
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML = "";

    data.forEach(student => {

        const warnings =
            Number(
                student.warning_count || 0
            );

        const blocked =
            Boolean(student.blocked);

        const tr =
            document.createElement("tr");

        tr.innerHTML = `

            <td>
                ${escapeHTML(
                    student.full_name ||
                    "Unknown"
                )}
            </td>

            <td>
                ${escapeHTML(
                    student.email || ""
                )}
            </td>

            <td>
                ${warnings}
            </td>

            <td>

                <span class="status ${
                    blocked
                        ? "blocked"
                        : "active"
                }">

                    ${
                        blocked
                            ? "Blocked"
                            : "Active"
                    }

                </span>

            </td>

            <td>

                ${
                    blocked

                    ? `
                        <button
                            type="button"
                            class="btn ghost small"
                            data-unblock="${student.id}">
                            Unblock
                        </button>
                    `

                    : `
                        <span
                            style="opacity:.55">
                            No action
                        </span>
                    `
                }

            </td>
        `;

        body.appendChild(tr);
    });


    /* -------------------------------
       UNBLOCK BUTTONS
    ------------------------------- */

    body
        .querySelectorAll(
            "[data-unblock]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.unblock;

                    await unblockStudent(id);
                }
            );

        });
}


/* ============================================================
   DOWNLOAD WARNINGS & BLOCKS REPORT
   ============================================================ */

async function downloadWarningsBlocksReport() {

    showMessage(
        "Preparing warnings & blocks report..."
    );

    try {

        const {
            data,
            error
        } = await quizSupabase
            .from("profiles")
            .select(`
                id,
                full_name,
                email,
                warning_count,
                blocked,
                role
            `)
            .eq("role", "student")
            .order(
                "full_name",
                {
                    ascending: true
                }
            );

        if (error) {

            console.error(
                "Warnings report error:",
                error
            );

            showMessage(
                "Unable to generate warnings & blocks report.",
                "error"
            );

            return;
        }

        if (!data || data.length === 0) {

            showMessage(
                "There are no students to export.",
                "error"
            );

            return;
        }

        const rows = data.map(student => {

            const warnings =
                Number(
                    student.warning_count || 0
                );

            const blocked =
                Boolean(student.blocked);

            return {

                Student:
                    student.full_name ||
                    "Unknown",

                Email:
                    student.email ||
                    "",

                Warnings:
                    warnings,

                Status:
                    blocked
                        ? "Blocked"
                        : "Active"
            };

        });

        downloadCSV(
            "IT_Arena_Warnings_Blocks_Report.csv",
            rows
        );

        showMessage(
            `${rows.length} student record(s) exported successfully.`
        );

    } catch (error) {

        console.error(error);

        showMessage(
            "Failed to download warnings & blocks report.",
            "error"
        );
    }
}


/* ============================================================
   UNBLOCK STUDENT
   ============================================================ */

async function unblockStudent(studentId) {

    if (!studentId) return;

    const confirmed =
        window.confirm(
            "Are you sure you want to unblock this student?"
        );

    if (!confirmed) return;

    const {
        error
    } = await quizSupabase
        .from("profiles")
        .update({
            blocked: false,
            warning_count: 0
        })
        .eq(
            "id",
            studentId
        );

    if (error) {

        console.error(
            "Unblock error:",
            error
        );

        showMessage(
            "Unable to unblock student.",
            "error"
        );

        return;
    }

    showMessage(
        "Student unblocked successfully."
    );

    await loadStudents();
    await loadStatistics();
}


/* ============================================================
   LOAD QUESTIONS
   ============================================================ */

let allQuestions = [];


async function loadQuestions() {

    const body = $("questionsBody");

    if (!body) return;

    body.innerHTML = `
        <tr>
            <td colspan="5">
                Loading…
            </td>
        </tr>
    `;

    const {
        data,
        error
    } = await quizSupabase
        .from("questions")
        .select(`
            id,
            category,
            question,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
        `)
        .order(
            "id",
            {
                ascending: false
            }
        );

    if (error) {

        console.error(
            "Questions error:",
            error
        );

        body.innerHTML = `
            <tr>
                <td colspan="5">
                    Unable to load questions.
                </td>
            </tr>
        `;

        return;
    }

    allQuestions = data || [];

    populateSubjectFilter();

    renderQuestions();
}


/* ============================================================
   SUBJECT FILTER
   ============================================================ */

function populateSubjectFilter() {

    const select =
        $("subjectFilter");

    if (!select) return;

    const current =
        select.value;

    const subjects = [
        ...new Set(
            allQuestions
                .map(q =>
                    q.category
                )
                .filter(Boolean)
        )
    ].sort();

    select.innerHTML = `
        <option value="">
            All Subjects
        </option>
    `;

    subjects.forEach(subject => {

        const option =
            document.createElement("option");

        option.value = subject;
        option.textContent = subject;

        select.appendChild(option);
    });

    if (
        subjects.includes(current)
    ) {

        select.value = current;
    }
}


/* ============================================================
   RENDER QUESTIONS
   ============================================================ */

function renderQuestions() {

    const body =
        $("questionsBody");

    if (!body) return;

    const search =
        (
            $("questionSearch")?.value ||
            ""
        )
        .trim()
        .toLowerCase();

    const subject =
        $("subjectFilter")?.value ||
        "";

    const filtered =
        allQuestions.filter(q => {

            const matchesSearch =
                !search ||
                String(
                    q.question || ""
                )
                    .toLowerCase()
                    .includes(search) ||
                String(
                    q.category || ""
                )
                    .toLowerCase()
                    .includes(search);

            const matchesSubject =
                !subject ||
                q.category === subject;

            return (
                matchesSearch &&
                matchesSubject
            );
        });

    if (!filtered.length) {

        body.innerHTML = `
            <tr>
                <td colspan="5">
                    No matching questions found.
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML = "";

    filtered.forEach(q => {

        const tr =
            document.createElement("tr");

        tr.innerHTML = `

            <td>
                ${escapeHTML(q.id)}
            </td>

            <td>
                ${escapeHTML(
                    q.category || ""
                )}
            </td>

            <td>
                ${escapeHTML(
                    q.question || ""
                )}
            </td>

            <td>
                <strong>
                    ${escapeHTML(
                        q.correct_answer || ""
                    )}
                </strong>
            </td>

            <td>

                <div class="action-buttons">

                    <button
                        type="button"
                        class="btn danger small"
                        data-delete-question="${q.id}">

                        Delete

                    </button>

                </div>

            </td>
        `;

        body.appendChild(tr);
    });


    body
        .querySelectorAll(
            "[data-delete-question]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset
                            .deleteQuestion;

                    await deleteQuestion(id);
                }
            );

        });
}


/* ============================================================
   DELETE QUESTION
   ============================================================ */

async function deleteQuestion(id) {

    if (!id) return;

    const confirmed =
        window.confirm(
            "Delete this question?"
        );

    if (!confirmed) return;

    const {
        error
    } = await quizSupabase
        .from("questions")
        .delete()
        .eq("id", id);

    if (error) {

        console.error(
            "Delete question error:",
            error
        );

        showMessage(
            "Unable to delete question.",
            "error"
        );

        return;
    }

    showMessage(
        "Question deleted successfully."
    );

    await loadQuestions();
    await loadStatistics();
}


/* ============================================================
   CREATE QUESTION
   ============================================================ */

async function createQuestion(event) {

    event.preventDefault();

    const category =
        $("category")?.value.trim();

    const question =
        $("question")?.value.trim();

    const optionA =
        $("optionA")?.value.trim();

    const optionB =
        $("optionB")?.value.trim();

    const optionC =
        $("optionC")?.value.trim();

    const optionD =
        $("optionD")?.value.trim();

    const correctAnswer =
        $("correctAnswer")?.value;

    if (
        !category ||
        !question ||
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD ||
        !correctAnswer
    ) {

        showMessage(
            "Please fill in all question fields.",
            "error"
        );

        return;
    }

    const button =
        event.submitter;

    if (button) {
        button.disabled = true;
    }

    const {
        error
    } = await quizSupabase
        .from("questions")
        .insert({
            category,
            question,
            option_a: optionA,
            option_b: optionB,
            option_c: optionC,
            option_d: optionD,
            correct_answer: correctAnswer
        });

    if (button) {
        button.disabled = false;
    }

    if (error) {

        console.error(
            "Create question error:",
            error
        );

        showMessage(
            "Unable to create question.",
            "error"
        );

        return;
    }

    showMessage(
        "Question created successfully."
    );

    $("questionForm").reset();

    await loadQuestions();
    await loadStatistics();
}


/* ============================================================
   CSV PARSER
   ============================================================ */

function parseCSV(text) {

    const rows = [];

    let row = [];

    let cell = "";

    let insideQuotes = false;

    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];

        const next =
            text[i + 1];

        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            cell += '"';

            i++;

            continue;
        }

        if (char === '"') {

            insideQuotes =
                !insideQuotes;

            continue;
        }

        if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(cell);

            cell = "";

            continue;
        }

        if (
            (char === "\n" ||
                char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {
                i++;
            }

            row.push(cell);

            cell = "";

            if (
                row.some(
                    value =>
                        value.trim() !== ""
                )
            ) {

                rows.push(row);
            }

            row = [];

            continue;
        }

        cell += char;
    }

    row.push(cell);

    if (
        row.some(
            value =>
                value.trim() !== ""
        )
    ) {

        rows.push(row);
    }

    return rows;
}


/* ============================================================
   CSV VALIDATION
   ============================================================ */

let validatedCSVRows = [];


function validateCSVData(rows) {

    const requiredHeaders = [
        "category",
        "question",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "correct_answer"
    ];

    const errors = [];

    const validRows = [];

    if (!rows.length) {

        errors.push(
            "CSV file is empty."
        );

        return {
            validRows,
            errors
        };
    }

    const headers =
        rows[0].map(
            h =>
                h
                    .trim()
                    .toLowerCase()
        );

    requiredHeaders.forEach(header => {

        if (
            !headers.includes(header)
        ) {

            errors.push(
                `Missing column: ${header}`
            );
        }

    });

    if (errors.length) {

        return {
            validRows,
            errors
        };
    }

    const index = {};

    headers.forEach(
        (header, i) => {
            index[header] = i;
        }
    );


    for (
        let i = 1;
        i < rows.length;
        i++
    ) {

        const raw =
            rows[i];

        const rowNumber =
            i + 1;

        const record = {

            category:
                (
                    raw[index.category] ||
                    ""
                ).trim(),

            question:
                (
                    raw[index.question] ||
                    ""
                ).trim(),

            option_a:
                (
                    raw[index.option_a] ||
                    ""
                ).trim(),

            option_b:
                (
                    raw[index.option_b] ||
                    ""
                ).trim(),

            option_c:
                (
                    raw[index.option_c] ||
                    ""
                ).trim(),

            option_d:
                (
                    raw[index.option_d] ||
                    ""
                ).trim(),

            correct_answer:
                (
                    raw[index.correct_answer] ||
                    ""
                )
                .trim()
                .toUpperCase()
        };


        const rowErrors = [];

        if (!record.category) {

            rowErrors.push(
                "Category is empty"
            );
        }

        if (!record.question) {

            rowErrors.push(
                "Question is empty"
            );
        }

        if (!record.option_a) {

            rowErrors.push(
                "Option A is empty"
            );
        }

        if (!record.option_b) {

            rowErrors.push(
                "Option B is empty"
            );
        }

        if (!record.option_c) {

            rowErrors.push(
                "Option C is empty"
            );
        }

        if (!record.option_d) {

            rowErrors.push(
                "Option D is empty"
            );
        }

        if (
            !["A", "B", "C", "D"]
                .includes(
                    record.correct_answer
                )
        ) {

            rowErrors.push(
                "Correct answer must be A, B, C or D"
            );
        }

        if (rowErrors.length) {

            errors.push(
                `Row ${rowNumber}: ${rowErrors.join(", ")}`
            );

            validRows.push({
                ...record,
                __valid: false,
                __row: rowNumber,
                __errors: rowErrors
            });

        } else {

            validRows.push({
                ...record,
                __valid: true,
                __row: rowNumber,
                __errors: []
            });
        }
    }

    return {
        validRows,
        errors
    };
}


/* ============================================================
   SHOW CSV SUMMARY
   ============================================================ */

function renderCSVSummary(rows) {

    const summary =
        $("csvSummary");

    if (!summary) return;

    const total =
        rows.length;

    const valid =
        rows.filter(
            row => row.__valid
        ).length;

    const invalid =
        total - valid;

    summary.innerHTML = `

        <div class="summary-item">
            <span>TOTAL</span>
            <strong>${total}</strong>
        </div>

        <div class="summary-item">
            <span>VALID</span>
            <strong>${valid}</strong>
        </div>

        <div class="summary-item">
            <span>INVALID</span>
            <strong>${invalid}</strong>
        </div>

    `;
}


/* ============================================================
   SHOW CSV ERRORS
   ============================================================ */

function renderCSVErrors(errors) {

    const box =
        $("csvErrors");

    if (!box) return;

    if (!errors.length) {

        box.style.display = "none";

        box.innerHTML = "";

        return;
    }

    box.style.display = "block";

    box.innerHTML = `

        <strong>
            CSV Validation Errors
        </strong>

        ${errors.map(error => `
            <p>
                ${escapeHTML(error)}
            </p>
        `).join("")}

    `;
}


/* ============================================================
   SHOW CSV PREVIEW
   ============================================================ */

function renderCSVPreview(rows) {

    const preview =
        $("csvPreview");

    if (!preview) return;

    if (!rows.length) {

        preview.innerHTML = "";

        return;
    }

    preview.innerHTML = `

        <table class="preview-table">

            <thead>

                <tr>

                    <th>Row</th>
                    <th>Category</th>
                    <th>Question</th>
                    <th>Option A</th>
                    <th>Option B</th>
                    <th>Option C</th>
                    <th>Option D</th>
                    <th>Correct</th>
                    <th>Status</th>

                </tr>

            </thead>

            <tbody>

                ${rows.map(row => `

                    <tr class="${
                        row.__valid
                            ? "valid-row"
                            : "invalid-row"
                    }">

                        <td>
                            ${row.__row}
                        </td>

                        <td>
                            ${escapeHTML(
                                row.category
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                row.question
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                row.option_a
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                row.option_b
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                row.option_c
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                row.option_d
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                row.correct_answer
                            )}
                        </td>

                        <td>

                            ${
                                row.__valid

                                    ? `<span class="status active">
                                         Valid
                                       </span>`

                                    : `<span class="status blocked">
                                         Invalid
                                       </span>`
                            }

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>
    `;
}


/* ============================================================
   VALIDATE CSV
   ============================================================ */

async function validateCSVFile() {

    const input =
        $("csvFile");

    if (!input?.files?.length) {

        showMessage(
            "Please select a CSV file first.",
            "error"
        );

        return;
    }

    const file =
        input.files[0];

    try {

        const text =
            await file.text();

        const rows =
            parseCSV(text);

        const result =
            validateCSVData(rows);

        validatedCSVRows =
            result.validRows;

        renderCSVSummary(
            validatedCSVRows
        );

        renderCSVErrors(
            result.errors
        );

        renderCSVPreview(
            validatedCSVRows
        );

        const validCount =
            validatedCSVRows.filter(
                row => row.__valid
            ).length;

        const actions =
            $("csvImportActions");

        if (actions) {

            actions.style.display =
                validCount
                    ? "block"
                    : "none";
        }

        if (validCount) {

            showMessage(
                `${validCount} valid question(s) ready to import.`
            );

        } else {

            showMessage(
                "No valid questions found.",
                "error"
            );
        }

    } catch (error) {

        console.error(
            "CSV validation error:",
            error
        );

        showMessage(
            "Unable to read CSV file.",
            "error"
        );
    }
}


/* ============================================================
   IMPORT CSV QUESTIONS
   ============================================================ */

async function importCSVQuestions() {

    const validRows =
        validatedCSVRows.filter(
            row => row.__valid
        );

    if (!validRows.length) {

        showMessage(
            "No valid questions available for import.",
            "error"
        );

        return;
    }

    const button =
        $("importCsv");

    if (button) {
        button.disabled = true;
    }

    try {

        const records =
            validRows.map(row => ({

                category:
                    row.category,

                question:
                    row.question,

                option_a:
                    row.option_a,

                option_b:
                    row.option_b,

                option_c:
                    row.option_c,

                option_d:
                    row.option_d,

                correct_answer:
                    row.correct_answer

            }));

        const {
            error
        } = await quizSupabase
            .from("questions")
            .insert(records);

        if (error) {

            console.error(
                "CSV import error:",
                error
            );

            showMessage(
                "Unable to import questions.",
                "error"
            );

            return;
        }

        showMessage(
            `${records.length} question(s) imported successfully.`
        );

        validatedCSVRows = [];

        if ($("csvFile")) {
            $("csvFile").value = "";
        }

        if ($("csvSummary")) {
            $("csvSummary").innerHTML = "";
        }

        if ($("csvErrors")) {

            $("csvErrors").style.display =
                "none";

            $("csvErrors").innerHTML = "";
        }

        if ($("csvPreview")) {
            $("csvPreview").innerHTML = "";
        }

        if ($("csvImportActions")) {

            $("csvImportActions")
                .style.display = "none";
        }

        await loadQuestions();
        await loadStatistics();

    } finally {

        if (button) {
            button.disabled = false;
        }
    }
}


/* ============================================================
   DOWNLOAD CSV TEMPLATE
   ============================================================ */

function downloadCSVTemplate() {

    const rows = [

        {

            category: "Python",

            question:
                "Which keyword is used to define a function in Python?",

            option_a: "function",

            option_b: "def",

            option_c: "define",

            option_d: "func",

            correct_answer: "B"
        }

    ];

    downloadCSV(
        "IT_Arena_Questions_Template.csv",
        rows
    );

    showMessage(
        "CSV template downloaded successfully."
    );
}


/* ============================================================
   CANCEL CSV
   ============================================================ */

function cancelCSV() {

    validatedCSVRows = [];

    if ($("csvFile")) {
        $("csvFile").value = "";
    }

    if ($("csvSummary")) {
        $("csvSummary").innerHTML = "";
    }

    if ($("csvErrors")) {

        $("csvErrors").style.display =
            "none";

        $("csvErrors").innerHTML = "";
    }

    if ($("csvPreview")) {
        $("csvPreview").innerHTML = "";
    }

    if ($("csvImportActions")) {

        $("csvImportActions")
            .style.display = "none";
    }
}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   LOGOUT
   ============================================================ */

async function logout() {

    const {
        error
    } = await quizSupabase.auth.signOut();

    if (error) {

        console.error(
            "Logout error:",
            error
        );

        showMessage(
            "Unable to logout.",
            "error"
        );

        return;
    }

    window.location.href =
        "login.html";
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function setupEventListeners() {

    $("logoutBtn")
        ?.addEventListener(
            "click",
            logout
        );


    $("questionForm")
        ?.addEventListener(
            "submit",
            createQuestion
        );


    $("refreshResults")
        ?.addEventListener(
            "click",
            async () => {

                await loadResults();

                await loadStudents();

                await loadStatistics();

                showMessage(
                    "Admin data refreshed."
                );
            }
        );


    $("questionSearch")
        ?.addEventListener(
            "input",
            renderQuestions
        );


    $("subjectFilter")
        ?.addEventListener(
            "change",
            renderQuestions
        );


    $("downloadTemplate")
        ?.addEventListener(
            "click",
            downloadCSVTemplate
        );


    $("validateCsv")
        ?.addEventListener(
            "click",
            validateCSVFile
        );


    $("importCsv")
        ?.addEventListener(
            "click",
            importCSVQuestions
        );


    $("cancelCsv")
        ?.addEventListener(
            "click",
            cancelCSV
        );


    /*
       NEW REPORT BUTTONS

       These IDs must exist in admin.html:

       downloadFinishedCSV
       downloadWarningsCSV
    */

    $("downloadFinishedCSV")
        ?.addEventListener(
            "click",
            downloadWhoFinishedReport
        );


    $("downloadWarningsCSV")
        ?.addEventListener(
            "click",
            downloadWarningsBlocksReport
        );
}


/* ============================================================
   INITIALIZE ADMIN
   ============================================================ */

async function initAdmin() {

    try {

        const user =
            await checkAdmin();

        if (!user) return;

        const isAdmin =
            await checkAdminRole(user);

        if (!isAdmin) return;


        setupEventListeners();


        await Promise.all([
            loadStatistics(),
            loadResults(),
            loadQuestions(),
            loadStudents()
        ]);

    } catch (error) {

        console.error(
            "Admin initialization error:",
            error
        );

        showMessage(
            "Unable to initialize admin panel.",
            "error"
        );
    }
}


/* ============================================================
   START
   ============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initAdmin
    );

} else {

    initAdmin();
}