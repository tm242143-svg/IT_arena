(async () => {
    "use strict";

    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    const {
        data: { user }
    } = await quizSupabase.auth.getUser();

    if (!user) {
        return location.href = "login.html";
    }


    /* =====================================================
       LOAD PROFILE
       ===================================================== */

    const {
        data: profile,
        error: profileError
    } = await quizSupabase
        .from("profiles")
        .select("role,blocked,warning_count")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile) {
        return location.href = "login.html";
    }


    /* =====================================================
       BLOCKED USER CHECK
       ===================================================== */

    if (profile.blocked) {
        return location.href = "dashboard.html";
    }


    /* =====================================================
       GET SELECTED SUBJECT
       ===================================================== */

    const subject =
        new URLSearchParams(location.search)
            .get("subject") || "Python";

    const subjectElement =
        document.getElementById("subject");

    if (subjectElement) {
        subjectElement.textContent = subject;
    }


    /* =====================================================
       LOAD QUESTIONS
       ===================================================== */

    const {
        data,
        error
    } = await quizSupabase
        .from("questions")
        .select("*")
        .ilike("category", subject.trim());

    if (error) {
        return msg(
            "Could not load questions: " +
            error.message
        );
    }


    /* =====================================================
       NO QUESTIONS
       ===================================================== */

    if (!data?.length) {
        return msg(
            "No questions found for this subject. Ask the admin to add questions."
        );
    }


    /* =====================================================
       FISHER-YATES SHUFFLE
       
       Creates a proper random order.
       ===================================================== */

    function shuffleArray(array) {

        const result = [...array];

        for (
            let i = result.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [
                result[i],
                result[j]
            ] = [
                result[j],
                result[i]
            ];
        }

        return result;
    }


    /* =====================================================
       SHUFFLE QUESTION ORDER
       
       Every student gets a different question sequence.
       ===================================================== */

    let questions =
        shuffleArray(data);


    /* =====================================================
       CREATE RANDOMIZED OPTIONS FOR EACH QUESTION
       
       Each question gets its own randomized A/B/C/D order.
       
       IMPORTANT:
       originalKey keeps track of the real answer
       from the database.
       ===================================================== */

    questions = questions.map(question => {

        const originalOptions = [
            {
                key: "A",
                value:
                    question.option_a ??
                    question.a ??
                    ""
            },
            {
                key: "B",
                value:
                    question.option_b ??
                    question.b ??
                    ""
            },
            {
                key: "C",
                value:
                    question.option_c ??
                    question.c ??
                    ""
            },
            {
                key: "D",
                value:
                    question.option_d ??
                    question.d ??
                    ""
            }
        ];


        /* ---------------------------------------------
           Remove completely empty options
           --------------------------------------------- */

        const validOptions =
            originalOptions.filter(
                option =>
                    option.value !== null &&
                    option.value !== undefined &&
                    String(option.value).trim() !== ""
            );


        /* ---------------------------------------------
           Shuffle options
           --------------------------------------------- */

        const shuffledOptions =
            shuffleArray(validOptions);


        return {
            ...question,

            randomizedOptions:
                shuffledOptions
        };
    });


    /* =====================================================
       QUIZ STATE
       ===================================================== */

    let idx = 0;

    /*
       Stores the DISPLAYED option key.

       Example:
       Student sees:

       A = Java
       B = Python
       C = C++
       D = HTML

       If student selects B,
       answers[0] = "B".
    */

    let answers =
        Array(questions.length).fill(null);


    let warningCount =
        Number(
            profile.warning_count || 0
        );


    let warningLocked = false;

    let lastViolation = 0;

    let submitted = false;


    /* =====================================================
       WARNING ELEMENTS
       ===================================================== */

    const overlay =
        document.getElementById(
            "warningOverlay"
        );

    const warningText =
        document.getElementById(
            "warningText"
        );

    const warningCountEl =
        document.getElementById(
            "warningCount"
        );

    const continueBtn =
        document.getElementById(
            "continueExam"
        );


    /* =====================================================
       RECORD WARNING
       ===================================================== */

    async function recordWarning(reason) {

        if (
            submitted ||
            warningLocked
        ) {
            return;
        }


        const now = Date.now();


        if (
            now - lastViolation <
            2500
        ) {
            return;
        }


        lastViolation = now;

        warningLocked = true;


        warningCount =
            Math.min(
                3,
                warningCount + 1
            );


        const {
            data: warningResult,
            error: warningError
        } = await quizSupabase.rpc(
            "record_quiz_warning"
        );


        if (warningError) {

            warningLocked = false;

            return msg(
                "Could not record the warning: " +
                warningError.message
            );
        }


        warningCount =
            Number(
                warningResult?.warning_count ??
                warningCount + 1
            );


        const blocked =
            Boolean(
                warningResult?.blocked ??
                warningCount >= 3
            );


        if (warningCountEl) {

            warningCountEl.textContent =
                `Warning ${warningCount} of 3`;
        }


        if (warningText) {

            warningText.innerHTML =
                blocked

                    ? `
                        <strong>Exam blocked.</strong>
                        <br>
                        You reached 3 warnings.
                        Your quiz has been locked.
                        Please contact the administrator.
                    `

                    : `
                        <strong>
                            Warning ${warningCount} of 3.
                        </strong>
                        <br>
                        ${reason}
                        <br>
                        <small>
                            Stay on this quiz page.
                            Leaving the tab or switching
                            windows again will create
                            another warning.
                        </small>
                    `;
        }


        if (overlay) {
            overlay.classList.remove("hidden");
        }


        if (blocked) {

            if (continueBtn) {
                continueBtn.textContent =
                    "Quiz Blocked";

                continueBtn.disabled = true;
            }

        } else {

            if (continueBtn) {
                continueBtn.textContent =
                    "Return to Quiz";

                continueBtn.disabled = false;
            }
        }
    }


    /* =====================================================
       CONTINUE AFTER WARNING
       ===================================================== */

    if (continueBtn) {

        continueBtn.onclick = () => {

            if (warningCount >= 3) {
                return;
            }

            if (overlay) {
                overlay.classList.add(
                    "hidden"
                );
            }

            warningLocked = false;

            enterFullscreen();
        };
    }


    /* =====================================================
       FULLSCREEN
       ===================================================== */

    async function enterFullscreen() {

        try {

            if (!document.fullscreenElement) {

                await document.documentElement
                    .requestFullscreen();
            }

        } catch (e) {

            /*
               Browser may deny fullscreen.
               We don't stop the quiz.
            */
        }
    }


    /* =====================================================
       QUIZ MONITORING
       ===================================================== */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (document.hidden) {

                recordWarning(
                    "You switched away from the quiz or changed browser tab."
                );
            }
        }
    );


    window.addEventListener(
        "blur",
        () => {

            recordWarning(
                "The quiz window lost focus."
            );
        }
    );


    document.addEventListener(
        "fullscreenchange",
        () => {

            if (
                !document.fullscreenElement &&
                !submitted &&
                !warningLocked
            ) {

                recordWarning(
                    "Fullscreen mode was exited during the quiz."
                );
            }
        }
    );


    window.addEventListener(
        "beforeunload",
        event => {

            if (!submitted) {

                event.preventDefault();

                event.returnValue =
                    "Leaving the quiz may create a warning.";
            }
        }
    );


    /* =====================================================
       GET RANDOMIZED OPTIONS
       ===================================================== */

    function opts(question) {

        return question.randomizedOptions || [];
    }


    /* =====================================================
       RENDER QUESTION
       ===================================================== */

    function render() {

        const question =
            questions[idx];


        /* ---------------------------------------------
           Question text
           --------------------------------------------- */

        const questionElement =
            document.getElementById(
                "question"
            );

        if (questionElement) {

            questionElement.textContent =
                question.question ||
                question.question_text ||
                "Question";
        }


        /* ---------------------------------------------
           Progress
           --------------------------------------------- */

        const progressText =
            document.getElementById(
                "progressText"
            );

        if (progressText) {

            progressText.textContent =
                `Question ${idx + 1} of ${questions.length}`;
        }


        const progressBar =
            document.getElementById(
                "progressBar"
            );

        if (progressBar) {

            progressBar.style.width =
                `${((idx + 1) / questions.length) * 100}%`;
        }


        /* ---------------------------------------------
           Render options
           --------------------------------------------- */

        const optionsContainer =
            document.getElementById(
                "options"
            );


        if (optionsContainer) {

            optionsContainer.innerHTML =
                opts(question)
                    .map(
                        (option, optionIndex) => {

                            /*
                               Display labels are always
                               A, B, C, D.

                               originalKey remembers the
                               original database option.
                            */

                            const displayKey =
                                String.fromCharCode(
                                    65 + optionIndex
                                );


                            const selected =
                                answers[idx] ===
                                displayKey;


                            return `
                                <button
                                    type="button"
                                    class="option ${selected ? "selected" : ""}"
                                    data-k="${displayKey}"
                                >
                                    <span class="option-key">
                                        ${displayKey}
                                    </span>

                                    <span class="option-value">
                                        ${escapeHtml(
                                            option.value
                                        )}
                                    </span>
                                </button>
                            `;
                        }
                    )
                    .join("");


            /* -----------------------------------------
               Option click handlers
               ----------------------------------------- */

            document
                .querySelectorAll(".option")
                .forEach(button => {

                    button.onclick = () => {

                        answers[idx] =
                            button.dataset.k;

                        render();
                    };
                });
        }


        /* ---------------------------------------------
           Previous button
           --------------------------------------------- */

        const prev =
            document.getElementById(
                "prev"
            );


        if (prev) {

            prev.disabled =
                idx === 0;


            prev.onclick = () => {

                if (idx > 0) {

                    idx--;

                    render();
                }
            };
        }


        /* ---------------------------------------------
           Next / Submit button
           --------------------------------------------- */

        const next =
            document.getElementById(
                "next"
            );


        if (next) {

            next.textContent =
                idx === questions.length - 1
                    ? "Submit Quiz ✓"
                    : "Next";


            next.onclick =
                idx === questions.length - 1

                    ? submit

                    : () => {

                        if (
                            answers[idx] == null
                        ) {

                            return msg(
                                "Please answer this question before moving on."
                            );
                        }


                        idx++;

                        render();
                    };
        }
    }


    /* =====================================================
       MESSAGE
       ===================================================== */

    function msg(text) {

        const message =
            document.getElementById(
                "msg"
            );


        if (message) {
            message.textContent = text;
        }
    }


    /* =====================================================
       SUBMIT QUIZ
       ===================================================== */

    async function submit() {

        if (warningCount >= 3) {
            return;
        }


        /* ---------------------------------------------
           Check every question answered
           --------------------------------------------- */

        if (
            answers.some(
                answer => !answer
            )
        ) {

            return msg(
                "Please answer every question before submitting."
            );
        }


        submitted = true;


        /* ---------------------------------------------
           Calculate score
           --------------------------------------------- */

        const correct =
            questions.reduce(
                (score, question, questionIndex) => {

                    /*
                       Student selected a DISPLAY key:
                       A / B / C / D

                       We convert that display key
                       back to the original database
                       option key.

                       Example:

                       Database:
                       A = Python
                       B = Java
                       C = C++

                       Randomized display:
                       A = Java
                       B = C++
                       C = Python

                       Student selects C.

                       Display C corresponds to
                       original database A.

                       Therefore originalKey = A.
                    */


                    const selectedDisplayKey =
                        answers[questionIndex];


                    const selectedOptionIndex =
                        selectedDisplayKey.charCodeAt(0) -
                        65;


                    const selectedOption =
                        question
                            .randomizedOptions[
                                selectedOptionIndex
                            ];


                    if (!selectedOption) {
                        return score;
                    }


                    const correctAnswer =
                        String(
                            question.correct_answer ??
                            question.correct ??
                            ""
                        )
                            .trim()
                            .toUpperCase();


                    const isCorrect =
                        selectedOption.key ===
                        correctAnswer;


                    return score +
                        (isCorrect ? 1 : 0);

                },
                0
            );


        /* ---------------------------------------------
           Percentage
           --------------------------------------------- */

        const percentage =
            Math.round(
                correct /
                questions.length *
                100
            );


        /* ---------------------------------------------
           Result payload
           --------------------------------------------- */

        const payload = {

            user_id:
                user.id,

            subject:
                subject,

            score:
                correct,

            total_questions:
                questions.length,

            percentage:
                percentage,

            completed_at:
                new Date().toISOString()
        };


        /* ---------------------------------------------
           Save result
           --------------------------------------------- */

        const {
            error
        } = await quizSupabase
            .from("quiz_results")
            .insert(payload);


        if (error) {

            submitted = false;

            return msg(
                "Could not submit the quiz: " +
                error.message
            );
        }


        /* ---------------------------------------------
           Exit fullscreen
           --------------------------------------------- */

        try {

            if (document.fullscreenElement) {

                await document.exitFullscreen();
            }

        } catch (e) {
            // Ignore fullscreen exit errors
        }


        /* ---------------------------------------------
           Go to result page
           --------------------------------------------- */

        location.href =
            `result.html?subject=${encodeURIComponent(subject)}` +
            `&score=${correct}` +
            `&total=${questions.length}` +
            `&percentage=${percentage}`;
    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(
                /[&<>'"]/g,
                character => {

                    const entities = {

                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        "'": "&#39;",
                        '"': "&quot;"
                    };

                    return entities[
                        character
                    ];
                }
            );
    }


    /* =====================================================
       START QUIZ
       ===================================================== */

    render();


    /* ---------------------------------------------
       Enter fullscreen shortly after quiz loads
       --------------------------------------------- */

    setTimeout(
        enterFullscreen,
        400
    );

})();
