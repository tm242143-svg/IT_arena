You should not paste that code randomly. It needs to replace the part of your JavaScript that currently creates/loads the subject list.

If your current code has something like:

const subjects = [
    "Python",
    "Java",
    "C++",
    "DBMS",
    "HTML",
    "CSS",
    "JavaScript",
    "RPA"
];

or:

const subjects = ["Python", "Java", "C++", "DBMS"];

then replace that subject-loading logic with a function like this:

async function loadSubjects() {
    const { data, error } = await quizSupabase
        .from("questions")
        .select("subject");

    if (error) {
        console.error("Error loading subjects:", error);
        return;
    }

    const subjects = [...new Set(
        data
            .map(q => q.subject)
            .filter(Boolean)
    )];

    console.log("Available subjects:", subjects);

    // Display subjects in your subject-selection container
    const subjectContainer = document.getElementById("subjectContainer");

    if (!subjectContainer) {
        console.error("subjectContainer not found");
        return;
    }

    subjectContainer.innerHTML = "";

    if (subjects.length === 0) {
        subjectContainer.innerHTML = `
            <p class="no-subjects">
                No subjects are currently available.
            </p>
        `;
        return;
    }

    subjects.forEach(subject => {
        const button = document.createElement("button");

        button.className = "subject-btn";
        button.textContent = subject;

        button.addEventListener("click", () => {
            // Use your existing quiz-start function here
            startQuiz(subject);
        });

        subjectContainer.appendChild(button);
    });
}

Then call it after Supabase has been initialized:

document.addEventListener("DOMContentLoaded", () => {
    loadSubjects();
});
But there is one important thing

I don't know the exact function/element names in your current project. For example, your project might use:

loadPrograms();

or:

displaySubjects();

or:

renderSubjects();

and your HTML might use:

<div id="subjects"></div>

instead of:

<div id="subjectContainer"></div>

So if you paste this code directly, it could cause another error.

Send me your current dashboard.js / dashboard.html (or the JavaScript file where the subjects are displayed). I'll point out the exact lines to replace and give you the corrected complete code so that:

subjects with questions → shown
subjects with no questions → hidden
deleted all questions → no subjects shown
selecting a subject → loads its questions correctly
Pasted text(5).txt
Document
where can i replace that subject loading logic

I checked the uploaded admin JavaScript.

Important: don't replace anything in this admin.js

The code you uploaded is your Admin Control Room. It already gets subjects dynamically from the questions table through populateCategoryFilter():

function populateCategoryFilter() {
    ...
    const categories =
        [...new Set(
            allQuestions
                .map(question =>
                    String(question.category || "").trim()
                )
                .filter(Boolean)
        )]
        .sort(...);
}

So the code I previously gave you is not what you should replace here.

Your problem is most likely in the student page JavaScript, where the subjects are displayed.

Where you need to make the change

Find the JavaScript file that controls this flow:

dashboard.html
       ↓
Student selects subject
       ↓
Subject buttons/cards are displayed
       ↓
quiz.html

Look in that file for code containing things like:

const subjects = [...]

or:

["Python", "Java", "C++", ...]

or:

loadSubjects()

or:

renderSubjects()

or:

displaySubjects()
Your admin.js is already correct

When you delete questions from Admin, this part:

const {
    data,
    error
} = await quizSupabase
    .from("questions")
    .select("*")

gets the remaining questions.

Then:

populateCategoryFilter();

builds the Admin subject filter from the questions that actually exist.

So if you deleted all questions, Admin should show:

All Subjects

with no question records.

For the student side

The student subject list should use:

const { data, error } = await quizSupabase
    .from("questions")
    .select("category");

Notice: Your database column is called category, not subject.

This is important because your uploaded admin.js clearly inserts questions using:

category: ...

and retrieves:

question.category

Therefore, my earlier example using:

.select("subject")

would be wrong for your current database structure.

Use:

async function loadSubjects() {

    const { data, error } = await quizSupabase
        .from("questions")
        .select("category");

    if (error) {
        console.error("Error loading subjects:", error);
        return;
    }

    const subjects = [
        ...new Set(
            data
                .map(q => String(q.category || "").trim())
                .filter(Boolean)
        )
    ].sort();

    console.log("Available subjects:", subjects);

    // Use your existing subject-rendering code here
}
What I need from you

Please upload your dashboard.js (or whichever JS file displays the subject cards/buttons).

Then I can tell you exactly:

Replace lines X–Y with this code

and make it so that when you delete all questions for a subject:

Python → has questions → Python appears
Java → has questions → Java appears
RPA → 0 questions → RPA disappears

You do not need to change the admin.js you just uploaded.

7feb7b0b-f307-47d8-bc3e-e7b8605073c2.html
File
2bb8d066-91e4-4cf4-9845-e8435b391f91.html
File
bcf5ec47-31b3-4f9d-871e-27d6823da303.html
File
check and analyse all programs and where can i replace loadsubject program

Yes. I checked the three files you uploaded. The important finding is that your subject-selection code is not inside the uploaded dashboard.html; it loads a separate JavaScript file:

<script src="js/dashboard.js"></script>

Your dashboard.html contains the subject container:

<div id="subjects" class="subject-grid"></div>

and then loads dashboard.js.

Your admin.html is also using category, not subject, for the question database. The manual question form has:

<input id="category" type="text">

and the question filter is subjectFilter.

Exactly what you need to change
1. Open this file
js/dashboard.js

This is the file you need to modify.

Do not put the loadSubjects() code in:

admin.html
register.html
admin.js

Your dashboard.html explicitly loads:

<script src="js/dashboard.js"></script>

so dashboard.js is responsible for filling:

<div id="subjects"></div>
2. In dashboard.js, find the existing subject-loading code

Look for something similar to:

const subjects = [
    "Python",
    "Java",
    "C++",
    "DBMS",
    "HTML",
    "CSS",
    "JavaScript",
    "RPA"
];

or:

const programs = [...]

or:

const subjects = [...]

or code that contains:

document.getElementById("subjects")
3. Replace that part with this

Because your database uses category, use this:

async function loadSubjects() {
    const { data, error } = await quizSupabase
        .from("questions")
        .select("category");

    if (error) {
        console.error("Error loading subjects:", error);
        return;
    }

    const subjects = [
        ...new Set(
            data
                .map(q => String(q.category || "").trim())
                .filter(Boolean)
        )
    ].sort();

    console.log("Available subjects:", subjects);

    const container = document.getElementById("subjects");

    if (!container) {
        console.error("Subject container not found.");
        return;
    }

    container.innerHTML = "";

    if (subjects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No subjects available</h3>
                <p>The administrator has not added any quiz questions yet.</p>
            </div>
        `;
        return;
    }

    subjects.forEach(subject => {
        const button = document.createElement("button");

        button.className = "subject-card";
        button.textContent = subject;

        button.addEventListener("click", () => {
            localStorage.setItem("selectedSubject", subject);
            window.location.href = "quiz.html";
        });

        container.appendChild(button);
    });
}

Then at the bottom of dashboard.js, call:

loadSubjects();
But there is one important issue

I don't want you to blindly replace the entire dashboard.js, because your existing project may already have:

authentication checking
admin link logic
logout
blocked-student checking
selected subject handling
quiz navigation

The correct change is only the subject-loading section.

Your current architecture is:
dashboard.html
       │
       │
       ├── supabase.js
       │
       ▼
 dashboard.js
       │
       ▼
 <div id="subjects">
       │
       ▼
Supabase questions table
       │
       ▼
category

Your uploaded dashboard.html confirms this structure.

After the fix

Suppose your questions table contains:

category	questions
Python	40
Java	30
RPA	20
DBMS	0

The dashboard should show:

Python
Java
RPA

and DBMS should not appear.

If you delete all questions:

questions table
      ↓
0 rows
      ↓
No subjects available

The old hard-coded subject names will no longer appear.

One more correction from my previous answer

I previously told you to use:

.from("questions")
.select("subject")

For your project, that is incorrect.

Your Admin page clearly uses the field:

category

for questions.

So your student dashboard should query:

.select("category")

not:

.select("subject")

If you upload js/dashboard.js, I can identify the exact existing function and tell you precisely which lines to replace rather than making you guess.

09379f09-ea3a-4f8f-b90a-eae28a834bdc.js
JavaScript
check and analyse this files and give replaceble  code for that file

I analyzed the uploaded JavaScript. The file you provided is admin.js, and the important point is:

You should NOT replace admin.js with a loadSubjects() function.

Your admin.js already correctly loads question categories from the questions table:

async function loadQuestions() {
    ...
    const { data, error } = await quizSupabase
        .from("questions")
        .select("*")
        .order("category")
        .order("id");
    ...
}

Then it builds the Admin subject filter using:

function populateCategoryFilter() {
    ...
    const categories = [...new Set(
        allQuestions
            .map(question => String(question.category || "").trim())
            .filter(Boolean)
    )];
}

So Admin is already using category correctly.

The file you need to replace

Your problem is on the student dashboard, not this admin.js.

You need to modify:

js/dashboard.js

Specifically, replace the existing function that creates the subject cards/buttons.

Use this complete function:

async function loadSubjects() {
    const container = document.getElementById("subjects");

    if (!container) {
        console.error("Subject container #subjects not found.");
        return;
    }

    // Show loading message
    container.innerHTML = `
        <div class="subject-loading">
            Loading subjects...
        </div>
    `;

    try {
        const { data, error } = await quizSupabase
            .from("questions")
            .select("category");

        if (error) {
            console.error("Error loading subjects:", error);

            container.innerHTML = `
                <div class="empty-state">
                    <h3>Unable to load subjects</h3>
                    <p>${escapeHtml(error.message)}</p>
                </div>
            `;

            return;
        }

        // Get unique categories that actually have questions
        const subjects = [
            ...new Set(
                (data || [])
                    .map(question =>
                        String(question.category || "").trim()
                    )
                    .filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b));

        console.log("Available subjects:", subjects);

        // No questions available
        if (subjects.length === 0) {

            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Subjects Available</h3>
                    <p>
                        No quiz questions have been added yet.
                    </p>
                </div>
            `;

            return;
        }

        // Clear loading message
        container.innerHTML = "";

        // Create subject cards
        subjects.forEach(subject => {

            const card = document.createElement("button");

            card.type = "button";
            card.className = "subject-card";

            card.textContent = subject;

            card.addEventListener("click", () => {

                // Store selected category
                localStorage.setItem(
                    "selectedSubject",
                    subject
                );

                // Open quiz
                window.location.href = "quiz.html";
            });

            container.appendChild(card);
        });

    } catch (error) {

        console.error(
            "Unexpected error while loading subjects:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">
                <h3>Something went wrong</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

Then make sure dashboard.js calls it once after the page loads:

document.addEventListener("DOMContentLoaded", () => {
    loadSubjects();
});
One thing to check

If your dashboard.js already has:

function escapeHtml(...)

keep it.

If it doesn't have escapeHtml(), add this before loadSubjects():

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
Your final behavior will be

If your database contains:

category    questions
---------------------
Python      40
Java        30
RPA         20
DBMS         0

Dashboard shows:

Python
Java
RPA

DBMS will not appear.

If you delete all questions, the dashboard will show:

No Subjects Available
No quiz questions have been added yet.
⚠️ Important

Do not use:

.from("questions")
.select("subject")

Your uploaded Admin code confirms that your actual question column is:

category

So the correct query for your project is:

.from("questions")
.select("category")

If you upload dashboard.js itself, I can give you the exact complete replacement section from your actual file, including preserving your existing animations, profile, logout, warning/blocking checks, and quiz navigation.

634530fd-75f3-412a-b62f-583b5f665d69.js
JavaScript
analyze this file and give exact complete replacement 

Yes. I analyzed the exact dashboard.js file you uploaded. The reason your deleted subjects are still appearing is this line:

const subjects=cats.length?cats:fallback;

When there are zero questions, cats is empty, so your code uses the hard-coded fallback subjects.

Exact complete replacement for your dashboard.js

Replace the entire contents of your current dashboard.js with this:

(async () => {
    "use strict";

    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    const {
        data: { user },
        error: authError
    } = await quizSupabase.auth.getUser();

    if (authError || !user) {
        window.location.href = "login.html";
        return;
    }


    /* =====================================================
       LOAD USER PROFILE
       ===================================================== */

    const {
        data: profile,
        error: profileError
    } = await quizSupabase
        .from("profiles")
        .select("role,blocked,warning_count,name")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile) {
        console.error("Profile loading error:", profileError);
        window.location.href = "login.html";
        return;
    }


    /* =====================================================
       BLOCKED STUDENT CHECK
       ===================================================== */

    if (profile.blocked) {

        alert(
            "Your account is blocked after three quiz warnings. Please contact the admin."
        );

        await quizSupabase.auth.signOut();

        window.location.href = "login.html";

        return;
    }


    /* =====================================================
       ADMIN LINK
       ===================================================== */

    const adminLink =
        document.getElementById("adminLink");

    if (
        adminLink &&
        profile.role === "admin"
    ) {
        adminLink.classList.remove("hidden");
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    const logoutButton =
        document.getElementById("logout");

    if (logoutButton) {

        logoutButton.onclick = async () => {

            const {
                error
            } = await quizSupabase.auth.signOut();

            if (error) {
                console.error(
                    "Logout error:",
                    error
                );
                return;
            }

            window.location.href =
                "login.html";
        };
    }


    /* =====================================================
       SUBJECT CONTAINER
       ===================================================== */

    const subjectsContainer =
        document.getElementById("subjects");

    if (!subjectsContainer) {

        console.error(
            "Subject container #subjects was not found."
        );

        return;
    }


    /* =====================================================
       SHOW LOADING
       ===================================================== */

    subjectsContainer.innerHTML = `
        <div class="subject-loading">
            Loading available subjects...
        </div>
    `;


    /* =====================================================
       LOAD SUBJECTS FROM QUESTIONS TABLE
       
       IMPORTANT:
       Your questions table uses "category",
       not "subject".
       ===================================================== */

    const {
        data: questionData,
        error: questionError
    } = await quizSupabase
        .from("questions")
        .select("category");


    /* =====================================================
       DATABASE ERROR
       ===================================================== */

    if (questionError) {

        console.error(
            "Error loading subjects:",
            questionError
        );

        subjectsContainer.innerHTML = `
            <div class="empty-state">
                <h2>Unable to Load Subjects</h2>
                <p>
                    There was a problem loading the available
                    quiz subjects. Please try again later.
                </p>
            </div>
        `;

        return;
    }


    /* =====================================================
       CREATE UNIQUE SUBJECT LIST
       ===================================================== */

    const subjects = [
        ...new Set(
            (questionData || [])
                .map(question =>
                    String(
                        question.category || ""
                    ).trim()
                )
                .filter(Boolean)
        )
    ].sort((a, b) =>
        a.localeCompare(b)
    );


    console.log(
        "Available subjects:",
        subjects
    );


    /* =====================================================
       NO QUESTIONS / NO SUBJECTS
       
       IMPORTANT:
       There is NO fallback subject list here.
       Therefore, if questions are deleted,
       the subject will disappear.
       ===================================================== */

    if (subjects.length === 0) {

        subjectsContainer.innerHTML = `
            <div class="empty-state">
                <h2>No Subjects Available</h2>
                <p>
                    No quiz questions have been added yet.
                </p>
            </div>
        `;

        return;
    }


    /* =====================================================
       SUBJECT ICONS
       ===================================================== */

    const subjectIcons = [
        "⌘",
        "☕",
        "⚙",
        "JS",
        "<>",
        "SQL",
        "DB",
        "OS",
        "NET",
        "DS"
    ];


    /* =====================================================
       DISPLAY SUBJECTS
       ===================================================== */

    subjectsContainer.innerHTML =
        subjects
            .map((subject, index) => {

                const icon =
                    subjectIcons[
                        index %
                        subjectIcons.length
                    ];


                return `
                    <a
                        class="subject-card"
                        style="--delay:${index}"
                        href="quiz.html?subject=${encodeURIComponent(subject)}"
                    >

                        <span class="number">
                            ${String(index + 1).padStart(2, "0")}
                        </span>

                        <div class="subject-icon">
                            ${icon}
                        </div>

                        <h2>
                            ${escapeHtml(subject)}
                        </h2>

                        <p>
                            Enter quiz →
                        </p>

                        <div class="mini-code">
                            while(skill){ learn(); }
                        </div>

                    </a>
                `;

            })
            .join("");


})();


/* =========================================================
   HTML ESCAPE
   Prevents category names from injecting HTML
   ========================================================= */

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
What I changed

Your original code had:

const fallback=[
    'Python',
    'Java',
    'C++',
    'JavaScript',
    'HTML & CSS',
    'SQL',
    'DBMS',
    'Operating Systems',
    'Computer Networks',
    'Data Structures'
];

const subjects=cats.length?cats:fallback;

That is exactly why the subjects remained after you deleted all questions.

I removed the fallback completely.

Now the behavior is:

questions table	Dashboard
Python has questions	Python shown
Java has questions	Java shown
RPA has questions	RPA shown
RPA has 0 questions	RPA hidden
All questions deleted	No Subjects Available

Also, I kept your existing:

Supabase authentication
blocked-user check
admin link
logout
animated subject cards
subject numbering
subject icons
quiz.html?subject=... navigation

So you can replace the entire contents of your uploaded dashboard.js with the code above.

One important note: after adding questions again through your Admin page, refresh the student dashboard. The newly available categories will then appear automatically.

/* =========================================================
IT ARENA - ADMIN CONTROL ROOM
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

if (
    profileError ||
    !profile ||
    profile.role !== "admin"
) {
    window.location.href = "dashboard.html";
    return;
}


/* =====================================================
   ELEMENTS
   ===================================================== */

const qform = document.getElementById("questionForm");
const qmsg = document.getElementById("adminMessage");

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

    if (!qmsg) return;

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

    downloadTemplate.addEventListener("click", () => {

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

    });

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


            /* Basic validation */

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


    questionsBody.innerHTML =
        `<tr>
            <td colspan="5">
                Loading...
            </td>
        </tr>`;


    const {
        data,
        error
    } = await quizSupabase
        .from("questions")
        .select("*")
        .order("category")
        .order("id");


    if (error) {

        questionsBody.innerHTML =
            `<tr>
                <td colspan="5"
                    class="error-text">
                    ${escapeHtml(error.message)}
                </td>
            </tr>`;

        return;
    }


    allQuestions =
        Array.isArray(data)
            ? data
            : [];


    updateQuestionStats();

    populateCategoryFilter();

    renderQuestions();

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


    subjectFilter.innerHTML =
        `<option value="">
            All Subjects
        </option>`;


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
        subjectFilter
            ?.value || "";


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

        questionsBody.innerHTML =
            `<tr>
                <td colspan="5">
                    No matching questions found.
                </td>
            </tr>`;

        return;
    }


    questionsBody.innerHTML =
        filtered.map(question => {

            return `
                <tr>

                    <td>
                        ${escapeHtml(question.id)}
                    </td>

                    <td>
                        ${escapeHtml(question.category)}
                    </td>

                    <td>
                        ${escapeHtml(question.question)}
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
                                data-id="${escapeHtml(question.id)}">

                                Delete

                            </button>

                        </div>

                    </td>

                </tr>
            `;

        }).join("");


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


    const {
        error
    } = await quizSupabase
        .from("questions")
        .delete()
        .eq("id", id);


    if (error) {

        showMessage(
            "Could not delete question: " +
            error.message,
            "error"
        );

        return;
    }


    showMessage(
        "Question deleted successfully.",
        "success"
    );


    await loadQuestions();

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
   LOAD RESULTS
   ===================================================== */

async function loadResults() {

    if (!resultsBody) return;


    resultsBody.innerHTML =
        `<tr>
            <td colspan="6">
                Loading...
            </td>
        </tr>`;


    const {
        data,
        error
    } = await quizSupabase
        .rpc("get_admin_results");


    if (error) {

        resultsBody.innerHTML =
            `<tr>
                <td colspan="6"
                    class="error-text">
                    ${escapeHtml(error.message)}
                </td>
            </tr>`;

        return;
    }


    if (!data?.length) {

        resultsBody.innerHTML =
            `<tr>
                <td colspan="6">
                    No completed quizzes yet.
                </td>
            </tr>`;


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
        data.map(result => {

            const score =
                Number(result.score) || 0;

            const total =
                Number(result.total_questions) || 0;

            const percentage =
                Number(result.percentage) || 0;


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
                            result.subject || ""
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

        }).join("");

}


/* =====================================================
   LOAD STUDENTS
   ===================================================== */

async function loadStudents() {

    if (!studentsBody) return;


    studentsBody.innerHTML =
        `<tr>
            <td colspan="5">
                Loading...
            </td>
        </tr>`;


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

        studentsBody.innerHTML =
            `<tr>
                <td colspan="5"
                    class="error-text">
                    ${escapeHtml(error.message)}
                </td>
            </tr>`;

        return;
    }


    if (!data?.length) {

        studentsBody.innerHTML =
            `<tr>
                <td colspan="5">
                    No students yet.
                </td>
            </tr>`;


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
        data.map(student => {

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
                            student.email || ""
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
                                        data-id="${escapeHtml(student.id)}">

                                        Unblock

                                    </button>
                                  `

                                : "—"
                        }

                    </td>

                </tr>
            `;

        }).join("");


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

        showMessage(
            "Could not unblock student: " +
            error.message,
            "error"
        );

        return;
    }


    showMessage(
        "Student unblocked successfully.",
        "success"
    );


    await loadStudents();

}


/* =====================================================
   CSV PARSER
   Handles commas inside quoted questions
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

        const character = text[i];

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


    /* Remove BOM */

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


        /* Ignore completely empty rows */

        if (
            !Object.values(row)
                .some(value => value !== "")
        ) {

            continue;

        }


        const rowErrors = [];


        /* Required values */

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


        /* Correct answer */

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


        /* Duplicate inside CSV */

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


        /* Check existing questions */

        const existingQuestion =
            allQuestions.some(existing => {

                return (
                    String(
                        existing.category || ""
                    )
                        .trim()
                        .toLowerCase() ===
                    row.category.toLowerCase()

                    &&

                    String(
                        existing.question || ""
                    )
                        .trim()
                        .toLowerCase() ===
                    row.question.toLowerCase()
                );

            });


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

    csvHasBeenValidated = true;


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

        ${errors.map(error => `

            <p>

                <b>
                    Row ${error.rowNumber}:
                </b>

                ${escapeHtml(
                    error.errors.join("; ")
                )}

            </p>

        `).join("")}

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

                    <th>
                        Row
                    </th>

                    <th>
                        Category
                    </th>

                    <th>
                        Question
                    </th>

                    <th>
                        Option A
                    </th>

                    <th>
                        Option B
                    </th>

                    <th>
                        Option C
                    </th>

                    <th>
                        Option D
                    </th>

                    <th>
                        Correct
                    </th>

                    <th>
                        Status
                    </th>

                </tr>

            </thead>

            <tbody>

                ${previewRows.map(item => {

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
                                    item.rowNumber
                                        || "✓"
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
                                                title="${escapeHtml(item.error)}">

                                                Invalid

                                            </span>
                                          `
                                }

                            </td>

                        </tr>

                    `;

                }).join("")}

            </tbody>

        </table>

    `;

}


/* =====================================================
   VALIDATE BUTTON
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


            importCsv.disabled = true;


            showMessage(
                "Importing questions..."
            );


            const {
                data,
                error
            } = await quizSupabase
                .from("questions")
                .insert(
                    validatedCsvRows
                )
                .select();


            importCsv.disabled = false;


            if (error) {

                showMessage(
                    "CSV import failed: " +
                    error.message,
                    "error"
                );

                return;

            }


            const importedCount =
                data?.length ||
                validatedCsvRows.length;


            showMessage(
                `${importedCount} question(s) imported successfully.`,
                "success"
            );


            /* Reset CSV UI */

            if (csvFile) {

                csvFile.value = "";

            }


            validatedCsvRows = [];

            csvHasBeenValidated = false;


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
   REFRESH RESULTS
   ===================================================== */

if (refreshResults) {

    refreshResults.addEventListener(
        "click",
        async () => {

            showMessage(
                "Refreshing admin data..."
            );


            await Promise.all([
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

            const {
                error
            } = await quizSupabase
                .auth
                .signOut();


            if (error) {

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

await Promise.all([
    loadQuestions(),
    loadResults(),
    loadStudents()
]);

})();

Close
