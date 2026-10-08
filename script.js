import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithEmailAndPassword,
    onAuthStateChanged
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


/* =========================
   FIREBASE
========================= */

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


/* =========================
   PAGE NAVIGATION
========================= */

function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });

    const section = document.getElementById(sectionId);

    if (section) {
        section.classList.add("active");
    }

    if (sectionId === "public-chat") {
        openChat();
    }

    if (sectionId === "story") {
        loadStory();
    }

    if (sectionId === "questions") {
        loadQuestions();
    }
}

window.showSection = showSection;


/* =========================
   STORY
========================= */

async function loadStory() {
    const storyContainer = document.getElementById("story-content");

    if (!storyContainer) return;

    try {
        const storyRef = doc(db, "content", "story");
        const storySnap = await getDoc(storyRef);

        if (!storySnap.exists()) {
            storyContainer.innerHTML = "<p>Story coming soon.</p>";
            return;
        }

        const data = storySnap.data();

        storyContainer.innerHTML = `
            <h2>${escapeHtml(data.title || "The Missing Piece")}</h2>
            <div class="story-text">
                ${formatContent(data.body || "Story coming soon.")}
            </div>
        `;

    } catch (error) {
        console.error("Error loading story:", error);
        storyContainer.innerHTML =
            "<p>Unable to load the story right now.</p>";
    }
}


/* =========================
   QUESTIONS
========================= */

async function loadQuestions() {
    const questionsContainer =
        document.getElementById("questions-content");

    if (!questionsContainer) return;

    try {
        const questionsRef = doc(db, "content", "questions");
        const questionsSnap = await getDoc(questionsRef);

        if (!questionsSnap.exists()) {
            questionsContainer.innerHTML =
                "<p>Questions coming soon.</p>";
            return;
        }

        const data = questionsSnap.data();

        questionsContainer.innerHTML = `
            <h2>${escapeHtml(data.title || "Reflection Questions")}</h2>
            <div class="questions-text">
                ${formatContent(data.body || "Questions coming soon.")}
            </div>
        `;

    } catch (error) {
        console.error("Error loading questions:", error);
        questionsContainer.innerHTML =
            "<p>Unable to load the questions right now.</p>";
    }
}


/* =========================
   CONTENT FORMATTING
========================= */

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatContent(text) {
    return escapeHtml(text)
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");

}


/* =========================
   ADMIN
========================= */

let currentUser = null;
let isAdmin = false;

onAuthStateChanged(auth, async (user) => {

    currentUser = user;

    if (!user) {
        isAdmin = false;
        return;
    }

    try {
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        isAdmin = adminSnap.exists();

        if (isAdmin) {
            console.log("Admin access granted.");
            showAdminButton();
        } else {
            console.log("Regular user.");
        }

    } catch (error) {
        console.error("Admin check failed:", error);
        isAdmin = false;
    }
});


function showAdminButton() {

    const button = document.getElementById("admin-button");

    if (button) {
        button.style.display = "block";
    }
}


window.openAdmin = function () {

    if (!isAdmin) {
        alert("You do not have permission to access the admin area.");
        return;
    }

    showSection("admin");
    loadAdminContent();

};


/* =========================
   ADMIN CONTENT EDITOR
========================= */

async function loadAdminContent() {

    if (!isAdmin) return;

    const storyTitle =
        document.getElementById("admin-story-title");

    const storyBody =
        document.getElementById("admin-story-body");

    const questionsTitle =
        document.getElementById("admin-questions-title");

    const questionsBody =
        document.getElementById("admin-questions-body");

    try {

        const storySnap =
            await getDoc(doc(db, "content", "story"));

        if (storySnap.exists()) {

            const story = storySnap.data();

            if (storyTitle) {
                storyTitle.value =
                    story.title || "";
            }

            if (storyBody) {
                storyBody.value =
                    story.body || "";
            }
        }


        const questionsSnap =
            await getDoc(doc(db, "content", "questions"));

        if (questionsSnap.exists()) {

            const questions =
                questionsSnap.data();

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

        alert("Unable to load the content.");
    }
}


/* =========================
   SAVE STORY
========================= */

window.saveStory = async function () {

    if (!isAdmin) {
        alert("You are not authorized.");
        return;
    }

    const title =
        document.getElementById("admin-story-title").value.trim();

    const body =
        document.getElementById("admin-story-body").value.trim();

    try {

        await setDoc(
            doc(db, "content", "story"),
            {
                title: title,
                body: body
            },
            { merge: true }
        );

        alert("Story saved successfully.");

        loadStory();

    } catch (error) {

        console.error("Story save error:", error);

        alert("Could not save the story.");
    }
};


/* =========================
   SAVE QUESTIONS
========================= */

window.saveQuestions = async function () {

    if (!isAdmin) {
        alert("You are not authorized.");
        return;
    }

    const title =
        document
            .getElementById("admin-questions-title")
            .value
            .trim();

    const body =
        document
            .getElementById("admin-questions-body")
            .value
            .trim();

    try {

        await setDoc(
            doc(db, "content", "questions"),
            {
                title: title,
                body: body
            },
            { merge: true }
        );

        alert("Questions saved successfully.");

        loadQuestions();

    } catch (error) {

        console.error(
            "Questions save error:",
            error
        );

        alert("Could not save the questions.");
    }
};


/* =========================
   PUBLIC CHAT
========================= */

let currentUserName =
    localStorage.getItem("bibleStudyAnonymousName");

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


/* =========================
   AUTHENTICATION
========================= */

async function authenticateUser() {

    if (auth.currentUser) {
        return auth.currentUser;
    }

    const result =
        await signInAnonymously(auth);

    return result.user;
}


/* =========================
   OPEN CHAT
========================= */

async function openChat() {

    if (!chatLogin || !chatRoom) return;

    if (!currentUserName) {

        chatLogin.style.display = "block";
        chatRoom.style.display = "none";

        return;
    }

    try {

        const user =
            await authenticateUser();

        if (anonymousId) {
            anonymousId.textContent =
                currentUserName;
        }

        chatLogin.style.display = "none";
        chatRoom.style.display = "flex";

        if (!messagesListener) {
            startRealtimeMessages();
        }

    } catch (error) {

        console.error(
            "Authentication failed:",
            error
        );

        alert(
            "Unable to connect to the chat."
        );
    }
}


/* =========================
   ENTER CHAT
========================= */

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

                await authenticateUser();

                currentUserName = name;

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


/* =========================
   CHANGE NAME
========================= */

if (changeNameButton) {

    changeNameButton.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "bibleStudyAnonymousName"
            );

            currentUserName = null;

            if (chatLogin) {
                chatLogin.style.display = "block";
            }

            if (chatRoom) {
                chatRoom.style.display = "none";
            }
        }
    );
}


/* =========================
   REALTIME MESSAGES
========================= */

const messagesCollection =
    collection(db, "publicChatMessages");


function startRealtimeMessages() {

    const messagesQuery =
        query(
            messagesCollection,
            orderBy("timestamp", "asc")
        );

    messagesListener =
        onSnapshot(
            messagesQuery,
            (snapshot) => {

                if (!chatMessages) return;

                chatMessages.innerHTML = "";

                snapshot.forEach(
                    (docSnapshot) => {

                        createMessageElement(
                            docSnapshot.data(),
                            docSnapshot.id
                        );

                    }
                );

                chatMessages.scrollTop =
                    chatMessages.scrollHeight;

            },
            (error) => {

                console.error(
                    "Realtime chat error:",
                    error
                );

            }
        );
}


/* =========================
   CREATE MESSAGE
========================= */

function createMessageElement(
    message,
    messageId
) {

    if (!chatMessages) return;

    const messageElement =
        document.createElement("div");

    const isMine =
        message.uid === auth.currentUser?.uid;

    messageElement.className =
        `chat-message ${
            isMine ? "mine" : "other"
        }`;

    let replyHTML = "";

    if (message.replyTo) {

        replyHTML = `
            <div class="reply-message">
                <strong>
                    ${escapeHtml(
                        message.replyTo.user || ""
                    )}
                </strong>
                <span>
                    ${escapeHtml(
                        message.replyTo.text || ""
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

    messageElement.innerHTML = `

        ${!isMine ? `
            <div class="message-user">
                ${escapeHtml(
                    message.user || "Anonymous"
                )}
            </div>
        ` : ""}

        ${replyHTML}

        <div class="message-text">
            ${escapeHtml(message.text || "")}
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
        messageElement.querySelector(
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
        messageElement,
        message,
        messageId
    );


    chatMessages.appendChild(
        messageElement
    );
}


/* =========================
   REPLY
========================= */

function setReply(
    message,
    messageId
) {

    replyingTo = {
        id: messageId,
        user: message.user,
        text: message.text
    };

    if (!replyPreview) return;

    replyPreview.style.display =
        "block";

    replyPreview.innerHTML = `
        Replying to
        <strong>
            ${escapeHtml(
                message.user || "Anonymous"
            )}
        </strong>
        <span>
            ${escapeHtml(
                message.text || ""
            )}
        </span>
        <button
            type="button"
            id="cancel-reply"
        >
            ×
        </button>
    `;

    const cancel =
        document.getElementById(
            "cancel-reply"
        );

    if (cancel) {

        cancel.addEventListener(
            "click",
            clearReply
        );
    }

    chatMessage.focus();
}


function clearReply() {

    replyingTo = null;

    if (replyPreview) {

        replyPreview.style.display =
            "none";

        replyPreview.innerHTML = "";
    }
}


/* =========================
   SEND MESSAGE
========================= */

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const text =
                chatMessage.value.trim();

            if (!text) return;

            if (!currentUserName) {
                alert(
                    "Please enter the chat first."
                );
                return;
            }

            try {

                const user =
                    await authenticateUser();

                const newMessage = {

                    uid: user.uid,

                    user: currentUserName,

                    text: text,

                    timestamp: Date.now(),

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

                chatMessage.value = "";

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


/* =========================
   EMOJI
========================= */

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

            chatMessage.value += emoji;

            chatMessage.focus();
        }
    );
}


/* =========================
   SWIPE LEFT TO REPLY
========================= */

function addSwipeReply(
    element,
    message,
    messageId
) {

    let startX = 0;
    let currentX = 0;

    element.addEventListener(
        "touchstart",
        (event) => {

            startX =
                event.touches[0].clientX;
        },
        { passive: true }
    );


    element.addEventListener(
        "touchmove",
        (event) => {

            currentX =
                event.touches[0].clientX;

        },
        { passive: true }
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


/* =========================
   INITIAL LOAD
========================= */

loadStory();
loadQuestions();

if (currentUserName) {
    openChat();
}
