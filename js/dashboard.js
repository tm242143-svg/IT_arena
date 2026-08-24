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