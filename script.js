// =========================================================
// ST. MONICA LK3C — BIBLE STUDY
// Firebase + Navigation + Public Chat
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


// =========================================================
// FIREBASE CONFIGURATION
// =========================================================

const firebaseConfig = {
    apiKey: "AIzaSyDAm9gekwQUIeJ51sX9QraOEejHBJc6Xf4",
    authDomain: "bible-study-2440c.firebaseapp.com",
    projectId: "bible-study-2440c",
    storageBucket: "bible-study-2440c.firebasestorage.app",
    messagingSenderId: "856615640461",
    appId: "1:856615640461:web:b792dd2867a71f12a731c4",
    measurementId: "G-D5D1178QMV"
};


// =========================================================
// INITIALIZE FIREBASE
// =========================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =========================================================
// ELEMENTS
// =========================================================

const chatLogin = document.getElementById("chat-login");
const chatRoom = document.getElementById("chat-room");

const anonymousNameInput =
    document.getElementById("anonymous-name");

const enterChatBtn =
    document.getElementById("enter-chat-btn");

const chatLoginMessage =
    document.getElementById("chat-login-message");

const chatMessages =
    document.getElementById("chat-messages");

const chatForm =
    document.getElementById("chat-form");

const messageInput =
    document.getElementById("message-input");

const sendMessageBtn =
    document.getElementById("send-message-btn");

const currentUserName =
    document.getElementById("current-user-name");

const changeNameBtn =
    document.getElementById("change-name-btn");

const changeNameBottomBtn =
    document.getElementById("change-name-bottom-btn");

const emojiBtn =
    document.getElementById("emoji-btn");

const replyPreview =
    document.getElementById("reply-preview");

const replyPreviewUser =
    document.getElementById("reply-preview-user");

const replyPreviewText =
    document.getElementById("reply-preview-text");

const cancelReplyBtn =
    document.getElementById("cancel-reply-btn");


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let currentUser = null;
let currentAnonymousName = "";
let selectedReply = null;
let unsubscribeMessages = null;

const NAME_STORAGE_KEY = "bibleStudyAnonymousName";


// =========================================================
// PAGE NAVIGATION
// =========================================================

function showSection(sectionId) {

    const sections =
        document.querySelectorAll(".page-section");

    sections.forEach(section => {
        section.classList.remove("active-section");
    });

    const target =
        document.getElementById(sectionId);

    if (!target) {
        console.warn("Section not found:", sectionId);
        return;
    }

    target.classList.add("active-section");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    // Update URL hash without reloading the page
    try {
        history.replaceState(null, "", "#" + sectionId);
    } catch (error) {
        console.warn("Could not update URL:", error);
    }

    // If Public Chat is opened, prepare the chat
    if (sectionId === "public-chat") {
        prepareChat();
    }
}


// Make showSection available to inline HTML onclick=""
window.showSection = showSection;


// =========================================================
// NAVIGATION LINKS
// =========================================================

document.querySelectorAll(".main-nav a").forEach(link => {

    link.addEventListener("click", event => {

        const href = link.getAttribute("href");

        if (!href || !href.startsWith("#")) {
            return;
        }

        event.preventDefault();

        const sectionId = href.substring(1);

        showSection(sectionId);
    });

});


// =========================================================
// HOME BUTTONS
// =========================================================

document.querySelectorAll(".primary-button").forEach(button => {

    button.addEventListener("click", event => {

        event.preventDefault();

        showSection("story");

    });

});


document.querySelectorAll(".secondary-button").forEach(button => {

    button.addEventListener("click", event => {

        event.preventDefault();

        showSection("public-chat");

    });

});


// =========================================================
// LOAD SECTION FROM URL HASH
// =========================================================

function loadInitialSection() {

    const hash =
        window.location.hash.replace("#", "");

    const validSections = [
        "home",
        "story",
        "questions",
        "prayers",
        "public-chat"
    ];

    if (validSections.includes(hash)) {
        showSection(hash);
    } else {
        showSection("home");
    }
}


// =========================================================
// NAME HELPERS
// =========================================================

function getSavedName() {

    return localStorage.getItem(NAME_STORAGE_KEY) || "";
}


function saveName(name) {

    localStorage.setItem(
        NAME_STORAGE_KEY,
        name
    );
}


function clearSavedName() {

    localStorage.removeItem(NAME_STORAGE_KEY);
}


function validateName(name) {

    const cleanedName = name.trim();

    if (cleanedName.length < 2) {
        return "Please enter a name with at least 2 characters.";
    }

    if (cleanedName.length > 25) {
        return "Your name must be 25 characters or less.";
    }

    return "";
}


// =========================================================
// PREPARE CHAT
// =========================================================

function prepareChat() {

    const savedName = getSavedName();

    if (savedName) {

        anonymousNameInput.value = savedName;

    }

}


// =========================================================
// FIREBASE ANONYMOUS AUTHENTICATION
// =========================================================

async function ensureAnonymousAuth() {

    if (auth.currentUser) {

        currentUser = auth.currentUser;

        return currentUser;
    }

    try {

        const result =
            await signInAnonymously(auth);

        currentUser = result.user;

        return currentUser;

    } catch (error) {

        console.error(
            "Anonymous authentication failed:",
            error
        );

        throw error;
    }
}


// =========================================================
// ENTER PUBLIC CHAT
// =========================================================

async function enterPublicChat() {

    const name =
        anonymousNameInput.value.trim();

    const validationError =
        validateName(name);

    if (validationError) {

        chatLoginMessage.textContent =
            validationError;

        return;
    }

    chatLoginMessage.textContent =
        "Joining chat...";

    enterChatBtn.disabled = true;

    try {

        const user =
            await ensureAnonymousAuth();

        currentUser = user;
        currentAnonymousName = name;

        saveName(name);

        if (currentUserName) {
            currentUserName.textContent = name;
        }

        chatLogin.style.display = "none";
        chatRoom.style.display = "block";

        chatLoginMessage.textContent = "";

        startMessageListener();

        setTimeout(() => {

            messageInput.focus();

        }, 150);

    } catch (error) {

        console.error(error);

        chatLoginMessage.textContent =
            "Unable to enter the chat. Please try again.";

    } finally {

        enterChatBtn.disabled = false;
    }
}


// =========================================================
// ENTER CHAT BUTTON
// =========================================================

if (enterChatBtn) {

    enterChatBtn.addEventListener(
        "click",
        enterPublicChat
    );

}


// Allow Enter key to join chat
if (anonymousNameInput) {

    anonymousNameInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                enterPublicChat();

            }

        }
    );

}


// =========================================================
// AUTH STATE
// =========================================================

onAuthStateChanged(auth, user => {

    currentUser = user;

    console.log(
        "Firebase auth state:",
        user ? user.uid : "Not signed in"
    );

});


// =========================================================
// PUBLIC CHAT — REAL-TIME LISTENER
// =========================================================

function startMessageListener() {

    if (unsubscribeMessages) {

        unsubscribeMessages();

        unsubscribeMessages = null;
    }

    const messagesRef =
        collection(db, "publicChatMessages");

    const messagesQuery =
        query(
            messagesRef,
            orderBy("timestamp", "asc")
        );

    unsubscribeMessages =
        onSnapshot(
            messagesQuery,
            snapshot => {

                chatMessages.innerHTML = "";

                snapshot.forEach(docSnapshot => {

                    const message = {
                        id: docSnapshot.id,
                        ...docSnapshot.data()
                    };

                    renderMessage(message);

                });

                scrollChatToBottom();

            },
            error => {

                console.error(
                    "Chat listener error:",
                    error
                );

                chatMessages.innerHTML = `
                    <div style="
                        text-align:center;
                        padding:30px;
                        color:#8b7c91;
                        font-size:13px;
                    ">
                        Unable to load messages right now.
                    </div>
                `;

            }
        );
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================================================
// FORMAT TIME
// =========================================================

function formatMessageTime(timestamp) {

    if (!timestamp) {
        return "";
    }

    const date =
        new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// =========================================================
// RENDER MESSAGE
// =========================================================

function renderMessage(message) {

    if (!chatMessages) {
        return;
    }

    const isMine =
        currentUser &&
        message.uid === currentUser.uid;

    const wrapper =
        document.createElement("div");

    wrapper.className =
        `message-wrapper ${
            isMine ? "mine" : "other"
        }`;

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";

    const userElement =
        document.createElement("div");

    userElement.className =
        "message-user";

    userElement.textContent =
        message.user || "Anonymous";

    const textElement =
        document.createElement("div");

    textElement.className =
        "message-text";

    textElement.textContent =
        message.text || "";

    bubble.appendChild(userElement);


    // -----------------------------------------------------
    // REPLY PREVIEW INSIDE MESSAGE
    // -----------------------------------------------------

    if (message.replyTo) {

        const replyBox =
            document.createElement("div");

        replyBox.style.marginBottom = "8px";
        replyBox.style.padding = "7px 9px";
        replyBox.style.borderLeft = "3px solid currentColor";
        replyBox.style.borderRadius = "6px";
        replyBox.style.opacity = "0.8";
        replyBox.style.fontSize = "11px";

        const replyUser =
            document.createElement("strong");

        replyUser.textContent =
            message.replyTo.user || "Anonymous";

        const replyText =
            document.createElement("div");

        replyText.textContent =
            message.replyTo.text || "";

        replyBox.appendChild(replyUser);
        replyBox.appendChild(replyText);

        bubble.appendChild(replyBox);
    }


    bubble.appendChild(textElement);


    // -----------------------------------------------------
    // TIME
    // -----------------------------------------------------

    const timeElement =
        document.createElement("span");

    timeElement.className =
        "message-time";

    timeElement.textContent =
        formatMessageTime(message.timestamp);

    bubble.appendChild(timeElement);


    // -----------------------------------------------------
    // REPLY BUTTON
    // -----------------------------------------------------

    const replyButton =
        document.createElement("button");

    replyButton.type = "button";

    replyButton.className =
        "reply-message-button";

    replyButton.textContent =
        "Reply";

    replyButton.addEventListener(
        "click",
        () => {

            selectMessageForReply(message);

        }
    );

    bubble.appendChild(replyButton);

    wrapper.appendChild(bubble);

    chatMessages.appendChild(wrapper);
}


// =========================================================
// SELECT MESSAGE FOR REPLY
// =========================================================

function selectMessageForReply(message) {

    selectedReply = {

        id: message.id,

        user: message.user || "Anonymous",

        text: message.text || ""

    };

    if (replyPreviewUser) {

        replyPreviewUser.textContent =
            `Replying to ${selectedReply.user}`;

    }

    if (replyPreviewText) {

        replyPreviewText.textContent =
            selectedReply.text;

    }

    if (replyPreview) {

        replyPreview.style.display = "flex";

    }

    if (messageInput) {

        messageInput.focus();

    }

}


// =========================================================
// CANCEL REPLY
// =========================================================

function cancelReply() {

    selectedReply = null;

    if (replyPreview) {

        replyPreview.style.display = "none";

    }

    if (replyPreviewUser) {

        replyPreviewUser.textContent = "";

    }

    if (replyPreviewText) {

        replyPreviewText.textContent = "";

    }
}


if (cancelReplyBtn) {

    cancelReplyBtn.addEventListener(
        "click",
        cancelReply
    );

}


// =========================================================
// SEND MESSAGE
// =========================================================

async function sendMessage(event) {

    event.preventDefault();

    const text =
        messageInput.value.trim();

    if (!text) {
        return;
    }

    if (text.length > 500) {

        alert("Your message is too long.");

        return;
    }

    try {

        const user =
            await ensureAnonymousAuth();

        if (!currentAnonymousName) {

            currentAnonymousName =
                getSavedName();

        }

        if (!currentAnonymousName) {

            showSection("public-chat");

            return;
        }

        sendMessageBtn.disabled = true;

        const messageData = {

            uid: user.uid,

            user: currentAnonymousName,

            text: text,

            timestamp: Date.now()

        };


        // Add reply information if replying
        if (selectedReply) {

            messageData.replyTo = {

                id: selectedReply.id,

                user: selectedReply.user,

                text: selectedReply.text

            };

        }


        await addDoc(
            collection(
                db,
                "publicChatMessages"
            ),
            messageData
        );


        messageInput.value = "";

        cancelReply();

        messageInput.focus();

    } catch (error) {

        console.error(
            "Could not send message:",
            error
        );

        alert(
            "Your message could not be sent. Please try again."
        );

    } finally {

        sendMessageBtn.disabled = false;

    }
}


if (chatForm) {

    chatForm.addEventListener(
        "submit",
        sendMessage
    );

}


// =========================================================
// CHANGE NAME
// =========================================================

function changeName() {

    const newName =
        prompt(
            "Enter the name you want to use in the chat:",
            currentAnonymousName || getSavedName()
        );

    if (newName === null) {
        return;
    }

    const cleanedName =
        newName.trim();

    const validationError =
        validateName(cleanedName);

    if (validationError) {

        alert(validationError);

        return;
    }

    currentAnonymousName =
        cleanedName;

    saveName(cleanedName);

    if (currentUserName) {

        currentUserName.textContent =
            cleanedName;

    }

    if (anonymousNameInput) {

        anonymousNameInput.value =
            cleanedName;

    }
}


if (changeNameBtn) {

    changeNameBtn.addEventListener(
        "click",
        changeName
    );

}


if (changeNameBottomBtn) {

    changeNameBottomBtn.addEventListener(
        "click",
        changeName
    );

}


// =========================================================
// EMOJI BUTTON
// =========================================================

if (emojiBtn) {

    emojiBtn.addEventListener(
        "click",
        () => {

            const emojis = [
                "😊",
                "🙏",
                "❤️",
                "😂",
                "🙌",
                "✝️",
                "🔥",
                "😅",
                "👏",
                "💯",
                "🕊️",
                "😢"
            ];

            const randomEmoji =
                emojis[
                    Math.floor(
                        Math.random() * emojis.length
                    )
                ];

            messageInput.value +=
                randomEmoji;

            messageInput.focus();

        }
    );

}


// =========================================================
// MOBILE SWIPE-TO-REPLY
// =========================================================

let touchStartX = 0;
let touchStartY = 0;

if (chatMessages) {

    chatMessages.addEventListener(
        "touchstart",
        event => {

            const touch =
                event.touches[0];

            touchStartX =
                touch.clientX;

            touchStartY =
                touch.clientY;

        },
        {
            passive: true
        }
    );


    chatMessages.addEventListener(
        "touchend",
        event => {

            const touch =
                event.changedTouches[0];

            const touchEndX =
                touch.clientX;

            const touchEndY =
                touch.clientY;

            const distanceX =
                touchEndX - touchStartX;

            const distanceY =
                touchEndY - touchStartY;


            // Horizontal swipe
            if (
                Math.abs(distanceX) > 70 &&
                Math.abs(distanceX) > Math.abs(distanceY)
            ) {

                const bubble =
                    event.target.closest(
                        ".message-bubble"
                    );

                if (!bubble) {
                    return;
                }

                const wrapper =
                    bubble.closest(
                        ".message-wrapper"
                    );

                if (!wrapper) {
                    return;
                }

                const replyButton =
                    bubble.querySelector(
                        ".reply-message-button"
                    );

                if (replyButton) {

                    replyButton.click();

                }

            }

        },
        {
            passive: true
        }
    );

}


// =========================================================
// SCROLL CHAT
// =========================================================

function scrollChatToBottom() {

    if (!chatMessages) {
        return;
    }

    setTimeout(() => {

        chatMessages.scrollTop =
            chatMessages.scrollHeight;

    }, 50);

}


// =========================================================
// KEYBOARD SHORTCUT
// =========================================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        event => {

            // Enter sends the message
            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                if (chatForm) {

                    chatForm.requestSubmit();

                }

            }

        }
    );

}


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        prepareChat();

        loadInitialSection();

        console.log(
            "St. Monica LK3C Bible Study loaded successfully."
        );

    }
);
