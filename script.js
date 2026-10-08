import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyDAm9gekwQUIeJ51sX9QraOEejHBJc6Xf4",
    authDomain: "bible-study-2440c.firebaseapp.com",
    projectId: "bible-study-2440c",
    storageBucket: "bible-study-2440c.firebasestorage.app",
    messagingSenderId: "856615640461",
    appId: "1:856615640461:web:b792dd2867a71f12a731c4",
    measurementId: "G-D5D1178QMV"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showSection(sectionId) {

    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });

    const section = document.getElementById(sectionId);

    if (section) {
        section.classList.add("active");
    }

    if (sectionId === "story") {
        loadStory();
    }

    if (sectionId === "questions") {
        loadQuestions();
    }

    if (sectionId === "public-chat") {
        openChat();
    }
}

window.showSection = showSection;


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = text || "";

    return div.innerHTML;
}


function formatContent(text) {

    return escapeHtml(text)
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");
}


/* =========================================================
   STORY
========================================================= */

async function loadStory() {

    const container =
        document.getElementById("story-content");

    if (!container) return;

    try {

        const storyRef =
            doc(db, "content", "story");

        const snapshot =
            await getDoc(storyRef);

        if (!snapshot.exists()) {

            container.innerHTML =
                "<p>Story coming soon.</p>";

            return;
        }

        const data = snapshot.data();

        const title =
            data.title || "The Missing Piece";

        const body =
            data.body || "Story coming soon.";

        container.innerHTML = `
            <h2>${escapeHtml(title)}</h2>

            <div class="story-text">
                <p>${formatContent(body)}</p>
            </div>
        `;

    } catch (error) {

        console.error(
            "Error loading story:",
            error
        );

        container.innerHTML =
            "<p>Unable to load the story right now.</p>";
    }
}


/* =========================================================
   QUESTIONS
========================================================= */

async function loadQuestions() {

    const container =
        document.getElementById("questions-content");

    if (!container) return;

    try {

        const questionsRef =
            doc(db, "content", "questions");

        const snapshot =
            await getDoc(questionsRef);

        if (!snapshot.exists()) {

            container.innerHTML =
                "<p>Questions coming soon.</p>";

            return;
        }

        const data = snapshot.data();

        const title =
            data.title || "Reflection Questions";

        const body =
            data.body || "Questions coming soon.";

        container.innerHTML = `
            <h2>${escapeHtml(title)}</h2>

            <div class="questions-text">
                <p>${formatContent(body)}</p>
            </div>
        `;

    } catch (error) {

        console.error(
            "Error loading questions:",
            error
        );

        container.innerHTML =
            "<p>Unable to load the questions right now.</p>";
    }
}


/* =========================================================
   ADMIN
========================================================= */

let currentUser = null;

let isAdmin = false;


/* =========================================================
   CHECK ADMIN
========================================================= */

async function checkAdmin(user) {

    if (!user) {

        isAdmin = false;

        return false;
    }

    try {

        const adminRef =
            doc(db, "admins", user.uid);

        const adminSnapshot =
            await getDoc(adminRef);

        isAdmin =
            adminSnapshot.exists();

        return isAdmin;

    } catch (error) {

        console.error(
            "Admin check failed:",
            error
        );

        isAdmin = false;

        return false;
    }
}


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        currentUser = user;

        if (!user) {

            isAdmin = false;

            hideAdminButton();

            return;
        }

        const admin =
            await checkAdmin(user);

        if (admin) {

            showAdminButton();

            console.log(
                "Admin authenticated."
            );

        } else {

            hideAdminButton();

            console.log(
                "User is not an admin."
            );
        }
    }
);


/* =========================================================
   ADMIN BUTTON
========================================================= */

function showAdminButton() {

    const button =
        document.getElementById("admin-button");

    if (button) {

        button.style.display =
            "flex";
    }
}


function hideAdminButton() {

    const button =
        document.getElementById("admin-button");

    if (button) {

        button.style.display =
            "none";
    }
}


/* =========================================================
   OPEN ADMIN
========================================================= */

window.openAdmin = async function () {

    /*
       If the current user is already authenticated
       and is an admin, open the editor.
    */

    if (currentUser) {

        const admin =
            await checkAdmin(currentUser);

        if (admin) {

            showSection("admin");

            await loadAdminContent();

            return;
        }
    }


    /*
       Otherwise ask for the admin email/password.
    */

    const email =
        prompt(
            "Enter your admin email:"
        );

    if (!email) return;


    const password =
        prompt(
            "Enter your admin password:"
        );

    if (!password) return;


    try {

        const result =
            await signInWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );

        const admin =
            await checkAdmin(result.user);

        if (!admin) {

            alert(
                "This account does not have admin access."
            );

            await signOut(auth);

            return;
        }


        currentUser =
            result.user;

        isAdmin = true;

        showAdminButton();

        showSection("admin");

        await loadAdminContent();

    } catch (error) {

        console.error(
            "Admin login error:",
            error
        );

        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            alert(
                "Incorrect email or password."
            );

        } else {

            alert(
                "Admin login failed. Please try again."
            );
        }
    }
};


/* =========================================================
   LOAD ADMIN CONTENT
========================================================= */

async function loadAdminContent() {

    if (!isAdmin) return;


    const storyTitle =
        document.getElementById(
            "admin-story-title"
        );

    const storyBody =
        document.getElementById(
            "admin-story-body"
        );

    const questionsTitle =
        document.getElementById(
            "admin-questions-title"
        );

    const questionsBody =
        document.getElementById(
            "admin-questions-body"
        );


    try {

        const storySnapshot =
            await getDoc(
                doc(db, "content", "story")
            );


        if (storySnapshot.exists()) {

            const story =
                storySnapshot.data();

            if (storyTitle) {

                storyTitle.value =
                    story.title || "";
            }

            if (storyBody) {

                storyBody.value =
                    story.body || "";
            }
        }


        const questionsSnapshot =
            await getDoc(
                doc(db, "content", "questions")
            );


        if (questionsSnapshot.exists()) {

            const questions =
                questionsSnapshot.data();

            if (questionsTitle) {

                questionsTitle.value =
                    questions.title || "";
            }

            if (questionsBody) {

                questionsBody.value =
                    questions.body || "";
            }
        }

    } catch (error) {

        console.error(
            "Could not load admin content:",
            error
        );

        alert(
            "Unable to load the editor content."
        );
    }
}


/* =========================================================
   SAVE STORY
========================================================= */

window.saveStory = async function () {

    if (!isAdmin) {

        alert(
            "You are not authorized to edit the story."
        );

        return;
    }


    const title =
        document
            .getElementById(
                "admin-story-title"
            )
            .value
            .trim();


    const body =
        document
            .getElementById(
                "admin-story-body"
            )
            .value
            .trim();


    if (!title || !body) {

        alert(
            "Please enter both a title and the story."
        );

        return;
    }


    try {

        await setDoc(
            doc(db, "content", "story"),
            {
                title: title,
                body: body
            },
            {
                merge: true
            }
        );


        alert(
            "Story saved successfully."
        );


        await loadStory();

    } catch (error) {

        console.error(
            "Story save error:",
            error
        );

        alert(
            "Could not save the story."
        );
    }
};


/* =========================================================
   SAVE QUESTIONS
========================================================= */

window.saveQuestions = async function () {

    if (!isAdmin) {

        alert(
            "You are not authorized to edit the questions."
        );

        return;
    }


    const title =
        document
            .getElementById(
                "admin-questions-title"
            )
            .value
            .trim();


    const body =
        document
            .getElementById(
                "admin-questions-body"
            )
            .value
            .trim();


    if (!title || !body) {

        alert(
            "Please enter both a title and the questions."
        );

        return;
    }


    try {

        await setDoc(
            doc(db, "content", "questions"),
            {
                title: title,
                body: body
            },
            {
                merge: true
            }
        );


        alert(
            "Questions saved successfully."
        );


        await loadQuestions();

    } catch (error) {

        console.error(
            "Questions save error:",
            error
        );

        alert(
            "Could not save the questions."
        );
    }
};


/* =========================================================
   PUBLIC CHAT
========================================================= */

let currentUserName =
    localStorage.getItem(
        "bibleStudyAnonymousName"
    );

let messagesListener = null;

let replyingTo = null;


const chatLogin =
    document.getElementById("chat-login");

const chatRoom =
    document.getElementById("chat-room");

const anonymousName =
    document.getElementById("anonymous-name");

const enterChatButton =
    document.getElementById("enter-chat-button");

const changeNameButton =
    document.getElementById("change-name-button");

const chatMessages =
    document.getElementById("chat-messages");

const chatForm =
    document.getElementById("chat-form");

const chatMessage =
    document.getElementById("chat-message");

const replyPreview =
    document.getElementById("reply-preview");

const anonymousId =
    document.getElementById("anonymous-id");

const emojiButton =
    document.getElementById("emoji-button");


/* =========================================================
   ANONYMOUS CHAT AUTH
========================================================= */

async function authenticateChatUser() {

    /*
       If an admin is already logged in,
       we use that authenticated account.

       Otherwise we use Firebase Anonymous Auth.
    */

    if (auth.currentUser) {

        return auth.currentUser;
    }

    const result =
        await signInAnonymously(auth);

    return result.user;
}


/* =========================================================
   OPEN CHAT
========================================================= */

async function openChat() {

    if (!chatLogin || !chatRoom) {
        return;
    }


    if (!currentUserName) {

        chatLogin.style.display =
            "block";

        chatRoom.style.display =
            "none";

        return;
    }


    try {

        await authenticateChatUser();


        if (anonymousId) {

            anonymousId.textContent =
                currentUserName;
        }


        chatLogin.style.display =
            "none";

        chatRoom.style.display =
            "flex";


        if (!messagesListener) {

            startRealtimeMessages();
        }

    } catch (error) {

        console.error(
            "Chat authentication failed:",
            error
        );

        alert(
            "Unable to connect to the chat."
        );
    }
}


/* =========================================================
   ENTER CHAT
========================================================= */

if (enterChatButton) {

    enterChatButton.addEventListener(
        "click",
        async () => {

            const name =
                anonymousName.value.trim();


            if (
                name.length < 2 ||
                name.length > 25
            ) {

                alert(
                    "Please enter a name between 2 and 25 characters."
                );

                return;
            }


            try {

                await authenticateChatUser();


                currentUserName =
                    name;


                localStorage.setItem(
                    "bibleStudyAnonymousName",
                    name
                );


                openChat();

            } catch (error) {

                console.error(error);

                alert(
                    "Unable to enter the chat."
                );
            }
        }
    );
}


/* =========================================================
   CHANGE NAME
========================================================= */

if (changeNameButton) {

    changeNameButton.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "bibleStudyAnonymousName"
            );

            currentUserName = null;


            if (chatLogin) {

                chatLogin.style.display =
                    "block";
            }


            if (chatRoom) {

                chatRoom.style.display =
                    "none";
            }
        }
    );
}


/* =========================================================
   REALTIME CHAT
========================================================= */

const messagesCollection =
    collection(
        db,
        "publicChatMessages"
    );


function startRealtimeMessages() {

    const messagesQuery =
        query(
            messagesCollection,
            orderBy(
                "timestamp",
                "asc"
            )
        );


    messagesListener =
        onSnapshot(
            messagesQuery,
            snapshot => {

                if (!chatMessages) {
                    return;
                }


                chatMessages.innerHTML = "";


                snapshot.forEach(
                    messageSnapshot => {

                        createMessageElement(
                            messageSnapshot.data(),
                            messageSnapshot.id
                        );
                    }
                );


                chatMessages.scrollTop =
                    chatMessages.scrollHeight;

            },
            error => {

                console.error(
                    "Realtime chat error:",
                    error
                );
            }
        );
}


/* =========================================================
   CREATE CHAT MESSAGE
========================================================= */

function createMessageElement(
    message,
    messageId
) {

    if (!chatMessages) {
        return;
    }


    const element =
        document.createElement("div");


    const isMine =
        message.uid ===
        auth.currentUser?.uid;


    element.className =
        `chat-message ${
            isMine
                ? "mine"
                : "other"
        }`;


    let replyHTML = "";


    if (message.replyTo) {

        replyHTML = `
            <div class="reply-message">

                <strong>
                    ${escapeHtml(
                        message.replyTo.user ||
                        "Anonymous"
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        message.replyTo.text ||
                        ""
                    )}
                </span>

            </div>
        `;
    }


    const time =
        message.timestamp
            ? new Date(
                message.timestamp
            ).toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
            : "";


    element.innerHTML = `

        ${
            !isMine
                ? `
                    <div class="message-user">
                        ${escapeHtml(
                            message.user ||
                            "Anonymous"
                        )}
                    </div>
                  `
                : ""
        }


        ${replyHTML}


        <div class="message-text">
            ${escapeHtml(
                message.text || ""
            )}
        </div>


        <div class="message-bottom">

            <span class="message-time">
                ${time}
            </span>

            <button
                class="reply-button"
                type="button"
            >
                Reply
            </button>

        </div>
    `;


    const replyButton =
        element.querySelector(
            ".reply-button"
        );


    if (replyButton) {

        replyButton.addEventListener(
            "click",
            () => {

                setReply(
                    message,
                    messageId
                );
            }
        );
    }


    addSwipeReply(
        element,
        message,
        messageId
    );


    chatMessages.appendChild(
        element
    );
}


/* =========================================================
   SET REPLY
========================================================= */

function setReply(
    message,
    messageId
) {

    replyingTo = {

        id: messageId,

        user:
            message.user,

        text:
            message.text
    };


    if (!replyPreview) {
        return;
    }


    replyPreview.style.display =
        "block";


    replyPreview.innerHTML = `

        Replying to

        <strong>
            ${escapeHtml(
                message.user ||
                "Anonymous"
            )}
        </strong>

        <span>
            ${escapeHtml(
                message.text ||
                ""
            )}
        </span>

        <button
            type="button"
            id="cancel-reply"
        >
            ×
        </button>
    `;


    const cancelButton =
        document.getElementById(
            "cancel-reply"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            clearReply
        );
    }


    if (chatMessage) {

        chatMessage.focus();
    }
}


/* =========================================================
   CLEAR REPLY
========================================================= */

function clearReply() {

    replyingTo = null;


    if (replyPreview) {

        replyPreview.style.display =
            "none";

        replyPreview.innerHTML =
            "";
    }
}


/* =========================================================
   SEND CHAT MESSAGE
========================================================= */

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const text =
                chatMessage.value.trim();


            if (!text) {
                return;
            }


            if (!currentUserName) {

                alert(
                    "Please enter the chat first."
                );

                return;
            }


            try {

                const user =
                    await authenticateChatUser();


                const newMessage = {

                    uid:
                        user.uid,

                    user:
                        currentUserName,

                    text:
                        text,

                    timestamp:
                        Date.now(),

                    replyTo:
                        replyingTo
                            ? {
                                user:
                                    replyingTo.user,

                                text:
                                    replyingTo.text
                              }
                            : null
                };


                await addDoc(
                    messagesCollection,
                    newMessage
                );


                chatMessage.value =
                    "";


                clearReply();

            } catch (error) {

                console.error(
                    "Message sending error:",
                    error
                );

                alert(
                    "Message could not be sent."
                );
            }
        }
    );
}


/* =========================================================
   EMOJI
========================================================= */

if (emojiButton) {

    const emojis = [
        "🙏",
        "❤️",
        "😂",
        "😊",
        "🔥",
        "👏",
        "🙌",
        "😅",
        "💯",
        "✝️"
    ];


    emojiButton.addEventListener(
        "click",
        () => {

            const emoji =
                emojis[
                    Math.floor(
                        Math.random() *
                        emojis.length
                    )
                ];


            chatMessage.value +=
                emoji;


            chatMessage.focus();
        }
    );
}


/* =========================================================
   MOBILE SWIPE TO REPLY
========================================================= */

function addSwipeReply(
    element,
    message,
    messageId
) {

    let startX = 0;

    let currentX = 0;


    element.addEventListener(
        "touchstart",
        event => {

            startX =
                event.touches[0].clientX;

        },
        {
            passive: true
        }
    );


    element.addEventListener(
        "touchmove",
        event => {

            currentX =
                event.touches[0].clientX;

        },
        {
            passive: true
        }
    );


    element.addEventListener(
        "touchend",
        () => {

            const distance =
                currentX - startX;


            if (distance < -60) {

                setReply(
                    message,
                    messageId
                );
            }


            startX = 0;

            currentX = 0;
        }
    );
}


/* =========================================================
   INITIAL LOAD
========================================================= */

loadStory();

loadQuestions();


if (currentUserName) {

    openChat();
}
