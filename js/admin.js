/* =========================================================
   IT ARENA - ADMIN CONTROL ROOM
   Complete corrected admin.js
   ========================================================= */

(async () => {

    "use strict";

    /* =====================================================
       AUTHENTICATION / ADMIN CHECK
       ===================================================== */

    const {
        data: { user },
        error: authError
    } = await quizSupabase.auth.getUser();

    if (authError || !user) {
        window.location.href = "login.html";
        return;
    }

    const {
        data: profile,
        error: profileError
    } = await quizSupabase
        .from("profiles")
        .select("role,name")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Admin profile error:", profileError);

        alert(
            "Unable to verify your admin account: " +
            profileError.message
        );

        window.location.href = "login.html";
        return;
    }

    if (!profile || profile.role !== "admin") {
        window.location.href = "dashboard.html";
        return;
    }


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const qform =
        document.getElementById("questionForm");

    const qmsg =
        document.getElementById("adminMessage");

    const resultsBody =
        document.getElementById("resultsBody");

    const questionsBody =
        document.getElementById("questionsBody");

    const studentsBody =
        document.getElementById("studentsBody");

    const refreshResults =
        document.getElementById("refreshResults");

    const questionSearch =
        document.getElementById("questionSearch");

    const subjectFilter =
        document.getElementById("subjectFilter");

    const totalQuestions =
        document.getElementById("totalQuestions");

    const totalStudents =
        document.getElementById("totalStudents");

    const totalAttempts =
        document.getElementById("totalAttempts");

    const csvFile =
        document.getElementById("csvFile");

    const downloadTemplate =
        document.getElementById("downloadTemplate");

    const validateCsv =
        document.getElementById("validateCsv");

    const importCsv =
        document.getElementById("importCsv");

    const cancelCsv =
        document.getElementById("cancelCsv");

    const csvSummary =
        document.getElementById("csvSummary");

    const csvErrors =
        document.getElementById("csvErrors");

    const csvPreview =
        document.getElementById("csvPreview");

    const csvImportActions =
        document.getElementById("csvImportActions");


    /* =====================================================
       GLOBAL DATA
       ===================================================== */

    let allQuestions = [];

    let validatedCsvRows = [];

    let csvHasBeenValidated = false;


    /* =====================================================
       MESSAGE HELPER
       ===================================================== */

    function showMessage(message, type = "") {

        if (!qmsg) {
            console.log(message);
            return;
        }

        qmsg.textContent = message;

        qmsg.className = "admin-message";

        if (type) {
            qmsg.classList.add(type);
        }
    }


    /* =====================================================
       HTML ESCAPE
       ===================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/[&<>'"]/g, character => {

                const entities = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    "'": "&#39;",
                    '"': "&quot;"
                };

                return entities[character];
            });
    }


    /* =====================================================
       CSV ESCAPE
       ===================================================== */

    function csvEscape(value) {

        const text = String(value ?? "");

        if (
            text.includes(",") ||
            text.includes('"') ||
            text.includes("\n") ||
            text.includes("\r")
        ) {
            return `"${text.replace(/"/g, '""')}"`;
        }

        return text;
    }


    /* =====================================================
       DOWNLOAD CSV TEMPLATE
       ===================================================== */

    if (downloadTemplate) {

        downloadTemplate.addEventListener(
            "click",
            () => {

                const headers = [
                    "category",
                    "question",
                    "option_a",
                    "option_b",
                    "option_c",
                    "option_d",
                    "correct_answer"
                ];

                const exampleRows = [

                    [
                        "Python",
                        "Which keyword is used to define a function in Python?",
                        "function",
                        "def",
                        "define",
                        "func",
                        "B"
                    ],

                    [
                        "HTML",
                        "Which tag is used to create a hyperlink?",
                        "<link>",
                        "<a>",
                        "<href>",
                        "<url>",
                        "B"
                    ]

                ];

                const csvContent = [
                    headers,
                    ...exampleRows
                ]
                    .map(row =>
                        row.map(csvEscape).join(",")
                    )
                    .join("\r\n");

                const blob = new Blob(
                    [csvContent],
                    {
                        type: "text/csv;charset=utf-8;"
                    }
                );

                const url =
                    URL.createObjectURL(blob);

                const link =
                    document.createElement("a");

                link.href = url;

                link.download =
                    "it-arena-question-template.csv";

                document.body.appendChild(link);

                link.click();

                document.body.removeChild(link);

                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 100);

                showMessage(
                    "CSV template downloaded successfully.",
                    "success"
                );
            }
        );
    }


    /* =====================================================
       MANUAL QUESTION CREATION
       ===================================================== */

    if (qform) {

        qform.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                showMessage(
                    "Creating question..."
                );

                const row = {

                    category:
                        document
                            .getElementById("category")
                            ?.value
                            .trim(),

                    question:
                        document
                            .getElementById("question")
                            ?.value
                            .trim(),

                    option_a:
                        document
                            .getElementById("optionA")
                            ?.value
                            .trim(),

                    option_b:
                        document
                            .getElementById("optionB")
                            ?.value
                            .trim(),

                    option_c:
                        document
                            .getElementById("optionC")
                            ?.value
                            .trim(),

                    option_d:
                        document
                            .getElementById("optionD")
                            ?.value
                            .trim(),

                    correct_answer:
                        document
                            .getElementById("correctAnswer")
                            ?.value
                            .trim()
                            .toUpperCase()

                };


                if (
                    !row.category ||
                    !row.question ||
                    !row.option_a ||
                    !row.option_b ||
                    !row.option_c ||
                    !row.option_d
                ) {

                    showMessage(
                        "Please fill in all question fields.",
                        "error"
                    );

                    return;
                }


                if (
                    !["A", "B", "C", "D"]
                        .includes(row.correct_answer)
                ) {

                    showMessage(
                        "Correct answer must be A, B, C or D.",
                        "error"
                    );

                    return;
                }


                const {
                    error
                } = await quizSupabase
                    .from("questions")
                    .insert(row);


                if (error) {

                    console.error(
                        "Question creation error:",
                        error
                    );

                    showMessage(
                        "Could not create question: " +
                        error.message,
                        "error"
                    );

                    return;
                }


                showMessage(
                    "Question created successfully.",
                    "success"
                );


                qform.reset();

                await loadQuestions();

            }
        );
    }


    /* =====================================================
       LOAD QUESTIONS
       ===================================================== */

    async function loadQuestions() {

        if (!questionsBody) return;

        questionsBody.innerHTML = `
            <tr>
                <td colspan="5">
                    Loading questions...
                </td>
            </tr>
        `;

        try {

            const {
                data,
                error
            } = await quizSupabase
                .from("questions")
                .select("*")
                .order("category")
                .order("id");

            if (error) {
                throw error;
            }

            allQuestions =
                Array.isArray(data)
                    ? data
                    : [];

            updateQuestionStats();

            populateCategoryFilter();

            renderQuestions();

        } catch (error) {

            console.error(
                "Questions loading error:",
                error
            );

            questionsBody.innerHTML = `
                <tr>
                    <td colspan="5"
                        class="error-text">
                        Failed to load questions:
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;

            if (totalQuestions) {
                totalQuestions.textContent = "0";
            }
        }
    }


    /* =====================================================
       QUESTION STATISTICS
       ===================================================== */

    function updateQuestionStats() {

        if (totalQuestions) {
            totalQuestions.textContent =
                allQuestions.length;
        }
    }


    /* =====================================================
       CATEGORY FILTER
       ===================================================== */

    function populateCategoryFilter() {

        if (!subjectFilter) return;

        const currentValue =
            subjectFilter.value;

        const categories =
            [...new Set(
                allQuestions
                    .map(question =>
                        String(
                            question.category || ""
                        ).trim()
                    )
                    .filter(Boolean)
            )]
                .sort(
                    (a, b) =>
                        a.localeCompare(b)
                );


        subjectFilter.innerHTML = `
            <option value="">
                All Subjects
            </option>
        `;


        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value = category;

            option.textContent = category;

            subjectFilter.appendChild(option);

        });


        if (
            categories.includes(currentValue)
        ) {
            subjectFilter.value =
                currentValue;
        }
    }


    /* =====================================================
       RENDER QUESTIONS
       ===================================================== */

    function renderQuestions() {

        if (!questionsBody) return;

        const searchText =
            questionSearch
                ?.value
                ?.trim()
                ?.toLowerCase() || "";

        const selectedCategory =
            subjectFilter?.value || "";


        const filtered =
            allQuestions.filter(question => {

                const category =
                    String(
                        question.category || ""
                    );

                const questionText =
                    String(
                        question.question || ""
                    );


                const matchesSearch =
                    !searchText ||
                    category
                        .toLowerCase()
                        .includes(searchText) ||
                    questionText
                        .toLowerCase()
                        .includes(searchText);


                const matchesCategory =
                    !selectedCategory ||
                    category === selectedCategory;


                return (
                    matchesSearch &&
                    matchesCategory
                );
            });


        if (!filtered.length) {

            questionsBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        No matching questions found.
                    </td>
                </tr>
            `;

            return;
        }


        questionsBody.innerHTML =
            filtered
                .map(question => {

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    question.id
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    question.category
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    question.question
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    question.correct_answer
                                )}
                            </td>

                            <td>

                                <div class="action-buttons">

                                    <button
                                        type="button"
                                        class="btn danger small delete-question"
                                        data-id="${escapeHtml(
                                            question.id
                                        )}">

                                        Delete

                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;

                })
                .join("");


        document
            .querySelectorAll(".delete-question")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () =>
                        deleteQuestion(
                            button.dataset.id
                        )
                );

            });
    }


    /* =====================================================
       DELETE QUESTION
       ===================================================== */

    async function deleteQuestion(id) {

        if (!id) return;

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this question?"
            );

        if (!confirmed) return;

        showMessage(
            "Deleting question..."
        );


        try {

            const {
                error
            } = await quizSupabase
                .from("questions")
                .delete()
                .eq("id", id);


            if (error) {
                throw error;
            }


            showMessage(
                "Question deleted successfully.",
                "success"
            );


            await loadQuestions();

        } catch (error) {

            console.error(
                "Delete question error:",
                error
            );

            showMessage(
                "Could not delete question: " +
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       QUESTION SEARCH
       ===================================================== */

    if (questionSearch) {

        questionSearch.addEventListener(
            "input",
            renderQuestions
        );
    }


    /* =====================================================
       SUBJECT FILTER
       ===================================================== */

    if (subjectFilter) {

        subjectFilter.addEventListener(
            "change",
            renderQuestions
        );
    }


    /* =====================================================
       LOAD COMPLETED RESULTS
       ===================================================== */

    async function loadResults() {

        if (!resultsBody) return;

        resultsBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Loading completed attempts...
                </td>
            </tr>
        `;


        try {

            /*
             * Your original Admin system uses the
             * get_admin_results PostgreSQL function.
             *
             * We keep that structure here.
             */

            const {
                data,
                error
            } = await quizSupabase
                .rpc("get_admin_results");


            if (error) {
                throw error;
            }


            if (!data || !data.length) {

                resultsBody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            No completed quizzes yet.
                        </td>
                    </tr>
                `;

                if (totalAttempts) {
                    totalAttempts.textContent = "0";
                }

                return;
            }


            if (totalAttempts) {
                totalAttempts.textContent =
                    data.length;
            }


            resultsBody.innerHTML =
                data
                    .map(result => {

                        const score =
                            Number(
                                result.score
                            ) || 0;

                        const total =
                            Number(
                                result.total_questions
                            ) || 0;

                        const percentage =
                            Number(
                                result.percentage
                            ) || 0;


                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        result.student_name ||
                                        "Student"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        result.email || ""
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        result.subject ||
                                        result.category ||
                                        ""
                                    )}
                                </td>

                                <td>
                                    ${score}/${total}
                                </td>

                                <td>
                                    ${percentage}%
                                </td>

                                <td>
                                    ${
                                        result.completed_at
                                            ? escapeHtml(
                                                new Date(
                                                    result.completed_at
                                                ).toLocaleString()
                                            )
                                            : "—"
                                    }
                                </td>

                            </tr>
                        `;

                    })
                    .join("");


        } catch (error) {

            console.error(
                "Results loading error:",
                error
            );

            resultsBody.innerHTML = `
                <tr>
                    <td colspan="6"
                        class="error-text">

                        Failed to load completed attempts:

                        ${escapeHtml(
                            error.message
                        )}

                    </td>
                </tr>
            `;

            if (totalAttempts) {
                totalAttempts.textContent = "0";
            }
        }
    }


    /* =====================================================
       LOAD STUDENTS
       ===================================================== */

    async function loadStudents() {

        if (!studentsBody) return;

        studentsBody.innerHTML = `
            <tr>
                <td colspan="5">
                    Loading students...
                </td>
            </tr>
        `;


        try {

            const {
                data,
                error
            } = await quizSupabase
                .from("profiles")
                .select(
                    "id,name,email,warning_count,blocked"
                )
                .eq("role", "student")
                .order("name");


            if (error) {
                throw error;
            }


            if (!data || !data.length) {

                studentsBody.innerHTML = `
                    <tr>
                        <td colspan="5">
                            No students yet.
                        </td>
                    </tr>
                `;

                if (totalStudents) {
                    totalStudents.textContent = "0";
                }

                return;
            }


            if (totalStudents) {
                totalStudents.textContent =
                    data.length;
            }


            studentsBody.innerHTML =
                data
                    .map(student => {

                        const warningCount =
                            Number(
                                student.warning_count
                            ) || 0;


                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        student.name ||
                                        "Student"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        student.email ||
                                        ""
                                    )}
                                </td>

                                <td>
                                    ${warningCount}/3
                                </td>

                                <td>

                                    ${
                                        student.blocked

                                            ? `
                                                <span
                                                    class="status blocked">
                                                    Blocked
                                                </span>
                                              `

                                            : `
                                                <span
                                                    class="status active">
                                                    Active
                                                </span>
                                              `
                                    }

                                </td>

                                <td>

                                    ${
                                        student.blocked

                                            ? `
                                                <button
                                                    type="button"
                                                    class="btn small unblock"
                                                    data-id="${escapeHtml(
                                                        student.id
                                                    )}">

                                                    Unblock

                                                </button>
                                              `

                                            : "—"
                                    }

                                </td>

                            </tr>
                        `;

                    })
                    .join("");


            document
                .querySelectorAll(".unblock")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        () =>
                            unblockStudent(
                                button.dataset.id
                            )
                    );

                });


        } catch (error) {

            console.error(
                "Students loading error:",
                error
            );

            studentsBody.innerHTML = `
                <tr>
                    <td colspan="5"
                        class="error-text">

                        Failed to load students:

                        ${escapeHtml(
                            error.message
                        )}

                    </td>
                </tr>
            `;

            if (totalStudents) {
                totalStudents.textContent = "0";
            }
        }
    }


    /* =====================================================
       UNBLOCK STUDENT
       ===================================================== */

    async function unblockStudent(id) {

        if (!id) return;

        const confirmed =
            window.confirm(
                "Unblock this student and reset their warnings?"
            );

        if (!confirmed) return;

        showMessage(
            "Unblocking student..."
        );


        try {

            const {
                error
            } = await quizSupabase
                .from("profiles")
                .update({
                    blocked: false,
                    warning_count: 0
                })
                .eq("id", id);


            if (error) {
                throw error;
            }


            showMessage(
                "Student unblocked successfully.",
                "success"
            );


            await loadStudents();


        } catch (error) {

            console.error(
                "Unblock error:",
                error
            );

            showMessage(
                "Could not unblock student: " +
                error.message,
                "error"
            );
        }
    }


    /* =====================================================
       CSV PARSER
       ===================================================== */

    function parseCSV(text) {

        const rows = [];

        let row = [];

        let value = "";

        let insideQuotes = false;


        for (
            let i = 0;
            i < text.length;
            i++
        ) {

            const character =
                text[i];

            const nextCharacter =
                text[i + 1];


            if (
                character === '"' &&
                insideQuotes &&
                nextCharacter === '"'
            ) {

                value += '"';

                i++;

                continue;
            }


            if (character === '"') {

                insideQuotes =
                    !insideQuotes;

                continue;
            }


            if (
                character === "," &&
                !insideQuotes
            ) {

                row.push(value);

                value = "";

                continue;
            }


            if (
                (
                    character === "\n" ||
                    character === "\r"
                ) &&
                !insideQuotes
            ) {

                if (
                    character === "\r" &&
                    nextCharacter === "\n"
                ) {
                    i++;
                }


                row.push(value);

                value = "";


                if (
                    row.some(
                        cell =>
                            String(cell)
                                .trim() !== ""
                    )
                ) {

                    rows.push(row);
                }


                row = [];

                continue;
            }


            value += character;
        }


        if (
            value !== "" ||
            row.length > 0
        ) {

            row.push(value);

            if (
                row.some(
                    cell =>
                        String(cell)
                            .trim() !== ""
                )
            ) {

                rows.push(row);
            }
        }


        return rows;
    }


    /* =====================================================
       NORMALIZE CSV HEADER
       ===================================================== */

    function normalizeHeader(header) {

        return String(header ?? "")
            .replace(/^\uFEFF/, "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");
    }


    /* =====================================================
       VALIDATE CSV
       ===================================================== */

    async function validateCSVFile() {

        if (!csvFile?.files?.length) {

            showMessage(
                "Please select a CSV file first.",
                "error"
            );

            return;
        }


        const file =
            csvFile.files[0];


        if (
            !file.name
                .toLowerCase()
                .endsWith(".csv")
        ) {

            showMessage(
                "Please select a valid CSV file.",
                "error"
            );

            return;
        }


        showMessage(
            "Reading and validating CSV..."
        );


        let text;


        try {

            text =
                await file.text();

        } catch (error) {

            console.error(
                "CSV read error:",
                error
            );

            showMessage(
                "Could not read CSV file.",
                "error"
            );

            return;
        }


        const parsedRows =
            parseCSV(text);


        if (!parsedRows.length) {

            showMessage(
                "The CSV file is empty.",
                "error"
            );

            return;
        }


        parsedRows[0][0] =
            String(
                parsedRows[0][0] || ""
            ).replace(
                /^\uFEFF/,
                ""
            );


        const headers =
            parsedRows[0]
                .map(normalizeHeader);


        const requiredHeaders = [
            "category",
            "question",
            "option_a",
            "option_b",
            "option_c",
            "option_d",
            "correct_answer"
        ];


        const missingHeaders =
            requiredHeaders.filter(
                header =>
                    !headers.includes(header)
            );


        if (missingHeaders.length) {

            showMessage(
                "CSV is missing required columns: " +
                missingHeaders.join(", "),
                "error"
            );


            showCsvErrors([
                "Missing columns: " +
                missingHeaders.join(", ")
            ]);

            return;
        }


        const columnIndexes = {};


        requiredHeaders.forEach(header => {

            columnIndexes[header] =
                headers.indexOf(header);

        });


        const errors = [];

        const validRows = [];

        const duplicateKeys =
            new Set();


        for (
            let index = 1;
            index < parsedRows.length;
            index++
        ) {

            const csvRow =
                parsedRows[index];

            const rowNumber =
                index + 1;


            const row = {

                category:
                    String(
                        csvRow[
                            columnIndexes.category
                        ] || ""
                    ).trim(),

                question:
                    String(
                        csvRow[
                            columnIndexes.question
                        ] || ""
                    ).trim(),

                option_a:
                    String(
                        csvRow[
                            columnIndexes.option_a
                        ] || ""
                    ).trim(),

                option_b:
                    String(
                        csvRow[
                            columnIndexes.option_b
                        ] || ""
                    ).trim(),

                option_c:
                    String(
                        csvRow[
                            columnIndexes.option_c
                        ] || ""
                    ).trim(),

                option_d:
                    String(
                        csvRow[
                            columnIndexes.option_d
                        ] || ""
                    ).trim(),

                correct_answer:
                    String(
                        csvRow[
                            columnIndexes.correct_answer
                        ] || ""
                    )
                        .trim()
                        .toUpperCase()
            };


            if (
                !Object.values(row)
                    .some(
                        value =>
                            value !== ""
                    )
            ) {
                continue;
            }


            const rowErrors = [];


            if (!row.category) {
                rowErrors.push(
                    "Category is empty"
                );
            }


            if (!row.question) {
                rowErrors.push(
                    "Question is empty"
                );
            }


            if (!row.option_a) {
                rowErrors.push(
                    "Option A is empty"
                );
            }


            if (!row.option_b) {
                rowErrors.push(
                    "Option B is empty"
                );
            }


            if (!row.option_c) {
                rowErrors.push(
                    "Option C is empty"
                );
            }


            if (!row.option_d) {
                rowErrors.push(
                    "Option D is empty"
                );
            }


            if (
                !["A", "B", "C", "D"]
                    .includes(
                        row.correct_answer
                    )
            ) {

                rowErrors.push(
                    "Correct answer must be A, B, C or D"
                );
            }


            const duplicateKey =
                [
                    row.category,
                    row.question
                ]
                    .join("||")
                    .toLowerCase();


            if (
                duplicateKeys.has(
                    duplicateKey
                )
            ) {

                rowErrors.push(
                    "Duplicate question in CSV"
                );
            }


            duplicateKeys.add(
                duplicateKey
            );


            const existingQuestion =
                allQuestions.some(
                    existing => {

                        return (

                            String(
                                existing.category ||
                                ""
                            )
                                .trim()
                                .toLowerCase() ===
                            row.category
                                .toLowerCase()

                            &&

                            String(
                                existing.question ||
                                ""
                            )
                                .trim()
                                .toLowerCase() ===
                            row.question
                                .toLowerCase()

                        );
                    }
                );


            if (existingQuestion) {

                rowErrors.push(
                    "Question already exists in question bank"
                );
            }


            if (rowErrors.length) {

                errors.push({
                    rowNumber,
                    errors: rowErrors,
                    row
                });

            } else {

                validRows.push(row);
            }
        }


        validatedCsvRows =
            validRows;

        csvHasBeenValidated =
            true;


        renderCsvSummary(
            parsedRows.length - 1,
            validRows.length,
            errors.length
        );


        renderCsvErrors(errors);


        renderCsvPreview(
            validRows,
            errors
        );


        if (
            validRows.length > 0
        ) {

            if (csvImportActions) {
                csvImportActions.style.display =
                    "flex";
            }

            showMessage(
                `${validRows.length} valid question(s) ready to import.`,
                "success"
            );

        } else {

            if (csvImportActions) {
                csvImportActions.style.display =
                    "none";
            }

            showMessage(
                "No valid questions found in CSV.",
                "error"
            );
        }
    }


    /* =====================================================
       CSV SUMMARY
       ===================================================== */

    function renderCsvSummary(
        total,
        valid,
        invalid
    ) {

        if (!csvSummary) return;


        csvSummary.innerHTML = `

            <div class="summary-item">

                <span>
                    TOTAL ROWS
                </span>

                <strong>
                    ${total}
                </strong>

            </div>


            <div class="summary-item">

                <span>
                    VALID
                </span>

                <strong>
                    ${valid}
                </strong>

            </div>


            <div class="summary-item">

                <span>
                    INVALID
                </span>

                <strong>
                    ${invalid}
                </strong>

            </div>

        `;
    }


    /* =====================================================
       CSV ERRORS
       ===================================================== */

    function renderCsvErrors(errors) {

        if (!csvErrors) return;


        if (!errors.length) {

            csvErrors.style.display =
                "none";

            csvErrors.innerHTML = "";

            return;
        }


        csvErrors.style.display =
            "block";


        csvErrors.innerHTML = `

            <strong>
                ${errors.length} invalid row(s)
            </strong>

            ${errors
                .map(error => `

                    <p>

                        <b>
                            Row ${error.rowNumber}:
                        </b>

                        ${escapeHtml(
                            error.errors.join("; ")
                        )}

                    </p>

                `)
                .join("")}

        `;
    }


    /* =====================================================
       CSV PREVIEW
       ===================================================== */

    function renderCsvPreview(
        validRows,
        errors
    ) {

        if (!csvPreview) return;


        const previewRows = [

            ...validRows.map(row => ({
                valid: true,
                row
            })),

            ...errors.map(error => ({
                valid: false,
                row: error.row,
                rowNumber: error.rowNumber,
                error: error.errors.join("; ")
            }))

        ];


        if (!previewRows.length) {

            csvPreview.innerHTML = "";

            return;
        }


        csvPreview.innerHTML = `

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

                    ${previewRows
                        .map(item => {

                            const row =
                                item.row;

                            return `

                                <tr
                                    class="${
                                        item.valid
                                            ? "valid-row"
                                            : "invalid-row"
                                    }">

                                    <td>
                                        ${
                                            item.rowNumber ||
                                            "✓"
                                        }
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            row.category
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            row.question
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            row.option_a
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            row.option_b
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            row.option_c
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            row.option_d
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            row.correct_answer
                                        )}
                                    </td>

                                    <td>

                                        ${
                                            item.valid

                                                ? `
                                                    <span
                                                        class="status active">
                                                        Valid
                                                    </span>
                                                  `

                                                : `
                                                    <span
                                                        class="status blocked"
                                                        title="${escapeHtml(
                                                            item.error
                                                        )}">
                                                        Invalid
                                                    </span>
                                                  `
                                        }

                                    </td>

                                </tr>

                            `;

                        })
                        .join("")}

                </tbody>

            </table>

        `;
    }


    /* =====================================================
       VALIDATE CSV BUTTON
       ===================================================== */

    if (validateCsv) {

        validateCsv.addEventListener(
            "click",
            validateCSVFile
        );
    }


    /* =====================================================
       CSV FILE CHANGE
       ===================================================== */

    if (csvFile) {

        csvFile.addEventListener(
            "change",
            () => {

                csvHasBeenValidated =
                    false;

                validatedCsvRows = [];


                if (csvSummary) {
                    csvSummary.innerHTML =
                        "";
                }


                if (csvErrors) {

                    csvErrors.style.display =
                        "none";

                    csvErrors.innerHTML =
                        "";
                }


                if (csvPreview) {
                    csvPreview.innerHTML =
                        "";
                }


                if (csvImportActions) {

                    csvImportActions.style.display =
                        "none";
                }
            }
        );
    }


    /* =====================================================
       IMPORT CSV
       ===================================================== */

    if (importCsv) {

        importCsv.addEventListener(
            "click",
            async () => {

                if (
                    !csvHasBeenValidated ||
                    !validatedCsvRows.length
                ) {

                    showMessage(
                        "Please validate the CSV before importing.",
                        "error"
                    );

                    return;
                }


                const confirmed =
                    window.confirm(
                        `Import ${validatedCsvRows.length} valid question(s)?`
                    );


                if (!confirmed) return;


                importCsv.disabled =
                    true;


                showMessage(
                    "Importing questions..."
                );


                try {

                    const {
                        data,
                        error
                    } = await quizSupabase
                        .from("questions")
                        .insert(
                            validatedCsvRows
                        )
                        .select();


                    if (error) {
                        throw error;
                    }


                    const importedCount =
                        data?.length ||
                        validatedCsvRows.length;


                    showMessage(
                        `${importedCount} question(s) imported successfully.`,
                        "success"
                    );


                    if (csvFile) {
                        csvFile.value = "";
                    }


                    validatedCsvRows = [];

                    csvHasBeenValidated =
                        false;


                    if (csvSummary) {
                        csvSummary.innerHTML =
                            "";
                    }


                    if (csvErrors) {

                        csvErrors.innerHTML =
                            "";

                        csvErrors.style.display =
                            "none";
                    }


                    if (csvPreview) {
                        csvPreview.innerHTML =
                            "";
                    }


                    if (csvImportActions) {

                        csvImportActions.style.display =
                            "none";
                    }


                    await loadQuestions();


                } catch (error) {

                    console.error(
                        "CSV import error:",
                        error
                    );

                    showMessage(
                        "CSV import failed: " +
                        error.message,
                        "error"
                    );

                } finally {

                    importCsv.disabled =
                        false;
                }
            }
        );
    }


    /* =====================================================
       CANCEL CSV
       ===================================================== */

    if (cancelCsv) {

        cancelCsv.addEventListener(
            "click",
            () => {

                validatedCsvRows = [];

                csvHasBeenValidated =
                    false;


                if (csvFile) {
                    csvFile.value = "";
                }


                if (csvSummary) {
                    csvSummary.innerHTML =
                        "";
                }


                if (csvErrors) {

                    csvErrors.innerHTML =
                        "";

                    csvErrors.style.display =
                        "none";
                }


                if (csvPreview) {
                    csvPreview.innerHTML =
                        "";
                }


                if (csvImportActions) {

                    csvImportActions.style.display =
                        "none";
                }


                showMessage(
                    "CSV import cancelled."
                );
            }
        );
    }


    /* =====================================================
       REFRESH ALL ADMIN DATA
       ===================================================== */

    if (refreshResults) {

        refreshResults.addEventListener(
            "click",
            async () => {

                showMessage(
                    "Refreshing admin data..."
                );


                await Promise.allSettled([
                    loadQuestions(),
                    loadResults(),
                    loadStudents()
                ]);


                showMessage(
                    "Admin data refreshed.",
                    "success"
                );
            }
        );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    const logoutBtn =
        document.getElementById("logoutBtn");


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            async () => {

                showMessage(
                    "Logging out..."
                );


                const {
                    error
                } = await quizSupabase
                    .auth
                    .signOut();


                if (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                    showMessage(
                        "Logout failed: " +
                        error.message,
                        "error"
                    );

                    return;
                }


                window.location.href =
                    "login.html";
            }
        );
    }


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    console.log(
        "IT Arena Admin Control Room initialized."
    );


    /*
     * Use Promise.allSettled instead of Promise.all.
     *
     * This is important:
     * if one database operation fails, the other
     * sections will still load.
     */

    await Promise.allSettled([

        loadQuestions(),

        loadResults(),

        loadStudents()

    ]);


})();
