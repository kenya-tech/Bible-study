// ========================================
// ST. MONICA LK3C BIBLE STUDY
// FIREBASE CHAT + ANONYMOUS AUTHENTICATION
// ========================================


// ========================================
// FIREBASE IMPORTS
// ========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


// ========================================
// FIREBASE CONFIGURATION
// ========================================

const firebaseConfig = {

    apiKey:
        "AIzaSyDAm9gekwQUIeJ51sX9QraOEejHBJc6Xf4",

    authDomain:
        "bible-study-2440c.firebaseapp.com",

    projectId:
        "bible-study-2440c",

    storageBucket:
        "bible-study-2440c.firebasestorage.app",

    messagingSenderId:
        "856615640461",

    appId:
        "1:856615640461:web:b792dd2867a71f12a731c4",

    measurementId:
        "G-D5D1178QMV"
};


// ========================================
// INITIALIZE FIREBASE
// ========================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ========================================
// SECTION NAVIGATION
// ========================================

function showSection(sectionId) {

    const screens = document.querySelectorAll(".screen");

    screens.forEach(function(screen) {
        screen.classList.remove("active");
    });

    const selectedSection =
        document.getElementById(sectionId);

    if (!selectedSection) {
        return;
    }

    selectedSection.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (sectionId === "public-chat") {

        setTimeout(function() {
            openChat();
        }, 50);
    }
}

window.showSection = showSection;


// ========================================
// CHAT ELEMENTS
// ========================================

const chatLogin =
    document.getElementById("chat-login");

const chatRoom =
    document.getElementById("chat-room");

const anonymousNameInput =
    document.getElementById("anonymous-name");

const enterChatButton =
    document.getElementById("enter-chat-button");

const chatLoginError =
    document.getElementById("chat-login-error");

const anonymousIDElement =
    document.getElementById("anonymous-id");

const chatForm =
    document.getElementById("chat-form");

const chatInput =
    document.getElementById("chat-message");

const chatMessages =
    document.getElementById("chat-messages");

const replyPreview =
    document.getElementById("reply-preview");

const replyName =
    document.getElementById("reply-name");

const replyText =
    document.getElementById("reply-text");

const cancelReplyButton =
    document.getElementById("cancel-reply");

const changeChatNameButton =
    document.getElementById("change-chat-name");

const emojiButton =
    document.getElementById("emoji-button");


// ========================================
// CHAT STATE
// ========================================

let currentUserName =
    localStorage.getItem("bibleStudyAnonymousName");

let replyingTo = null;

let unsubscribeMessages = null;

let latestMessages = [];


// ========================================
// FIREBASE ANONYMOUS LOGIN
// ========================================

async function authenticateUser() {

    try {

        if (auth.currentUser) {
            return auth.currentUser;
        }

        const result =
            await signInAnonymously(auth);

        console.log(
            "Anonymous Firebase user signed in:",
            result.user.uid
        );

        return result.user;

    } catch (error) {

        console.error(
            "Anonymous authentication failed:",
            error
        );

        showChatLoginError(
            "Unable to connect to the chat. Please try again."
        );

        throw error;
    }
}


// ========================================
// OPEN CHAT
// ========================================

async function openChat() {

    if (!chatLogin || !chatRoom) {
        return;
    }

    if (currentUserName) {

        try {

            await authenticateUser();

            chatLogin.style.display = "none";

            chatRoom.style.display = "flex";

            updateUserDisplay();

            startRealtimeMessages();

        } catch (error) {

            console.error(
                "Could not open chat:",
                error
            );
        }

    } else {

        chatLogin.style.display = "flex";

        chatRoom.style.display = "none";

        setTimeout(function() {

            if (anonymousNameInput) {
                anonymousNameInput.focus();
            }

        }, 100);
    }
}


// ========================================
// ENTER CHAT BUTTON
// ========================================

if (enterChatButton) {

    enterChatButton.addEventListener(
        "click",
        function() {
            enterPublicChat();
        }
    );
}


// ========================================
// ENTER WITH ENTER KEY
// ========================================

if (anonymousNameInput) {

    anonymousNameInput.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                event.preventDefault();

                enterPublicChat();
            }
        }
    );
}


// ========================================
// ENTER PUBLIC CHAT
// ========================================

async function enterPublicChat() {

    if (!anonymousNameInput) {
        return;
    }

    const enteredName =
        anonymousNameInput.value.trim();

    if (!enteredName) {

        showChatLoginError(
            "Please choose an anonymous name."
        );

        return;
    }

    if (enteredName.length < 2) {

        showChatLoginError(
            "Your anonymous name should have at least 2 characters."
        );

        return;
    }

    if (enteredName.length > 25) {

        showChatLoginError(
            "Your anonymous name is too long."
        );

        return;
    }

    try {

        enterChatButton.disabled = true;

        enterChatButton.textContent = "Connecting...";

        await authenticateUser();

        currentUserName = enteredName;

        localStorage.setItem(
            "bibleStudyAnonymousName",
            currentUserName
        );

        chatLoginError.textContent = "";

        chatLogin.style.display = "none";

        chatRoom.style.display = "flex";

        updateUserDisplay();

        startRealtimeMessages();

    } catch (error) {

        console.error(
            "Error entering public chat:",
            error
        );

        showChatLoginError(
            "Could not connect to the chat. Please try again."
        );

    } finally {

        enterChatButton.disabled = false;

        enterChatButton.textContent =
            "Enter Public Chat";
    }
}


// ========================================
// LOGIN ERROR
// ========================================

function showChatLoginError(message) {

    if (!chatLoginError) {
        return;
    }

    chatLoginError.textContent = message;
}


// ========================================
// UPDATE USER DISPLAY
// ========================================

function updateUserDisplay() {

    if (anonymousIDElement) {

        anonymousIDElement.textContent =
            currentUserName || "Anonymous";
    }
}


// ========================================
// CHANGE ANONYMOUS NAME
// ========================================

if (changeChatNameButton) {

    changeChatNameButton.addEventListener(
        "click",
        function() {

            const newName =
                prompt(
                    "Choose a new anonymous name:",
                    currentUserName || ""
                );

            if (!newName) {
                return;
            }

            const cleanedName =
                newName.trim();

            if (cleanedName.length < 2) {

                alert(
                    "Your anonymous name should have at least 2 characters."
                );

                return;
            }

            if (cleanedName.length > 25) {

                alert(
                    "Your anonymous name is too long."
                );

                return;
            }

            currentUserName = cleanedName;

            localStorage.setItem(
                "bibleStudyAnonymousName",
                currentUserName
            );

            updateUserDisplay();

            renderCurrentMessages();
        }
    );
}


// ========================================
// FIRESTORE COLLECTION
// ========================================

const messagesCollection =
    collection(
        db,
        "publicChatMessages"
    );


// ========================================
// REAL-TIME MESSAGES
// ========================================

function startRealtimeMessages() {

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    const messagesQuery =
        query(
            messagesCollection,
            orderBy(
                "timestamp",
                "asc"
            )
        );

    unsubscribeMessages =
        onSnapshot(
            messagesQuery,

            function(snapshot) {

                latestMessages = [];

                snapshot.forEach(function(doc) {

                    latestMessages.push({
                        id: doc.id,
                        ...doc.data()
                    });

                });

                renderCurrentMessages();
            },

            function(error) {

                console.error(
                    "Firestore error:",
                    error
                );

                if (chatMessages) {

                    chatMessages.innerHTML = `

                        <div class="chat-welcome">

                            <div class="chat-welcome-icon">
                                ⚠️
                            </div>

                            <h3>
                                Chat connection problem
                            </h3>

                            <p>
                                Please check your Firebase
                                configuration and security rules.
                            </p>

                        </div>

                    `;
                }
            }
        );
}


// ========================================
// RENDER MESSAGES
// ========================================

function renderCurrentMessages() {

    if (!chatMessages) {
        return;
    }

    chatMessages.innerHTML = "";

    if (latestMessages.length === 0) {

        chatMessages.innerHTML = `

            <div class="chat-welcome">

                <div class="chat-welcome-icon">
                    ✝
                </div>

                <h3>
                    Welcome to the discussion
                </h3>

                <p>
                    Share your thoughts about the Bible study
                    and listen to what others have to say.
                </p>

            </div>

        `;

        return;
    }

    latestMessages.forEach(function(message) {

        createMessageElement(message);

    });

    scrollChatToBottom();
}


// ========================================
// CREATE MESSAGE
// ========================================

function createMessageElement(message) {

    const messageWrapper =
        document.createElement("div");

    const isMine =
        message.uid === auth.currentUser?.uid;

    messageWrapper.className =
        isMine
            ? "message-wrapper mine"
            : "message-wrapper other";

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";


    // ====================================
    // REPLY
    // ====================================

    if (message.replyTo) {

        const originalReply =
            document.createElement("div");

        originalReply.className =
            "message-reply";

        const replyUser =
            document.createElement("strong");

        replyUser.textContent =
            message.replyTo.user || "Anonymous";

        const replyMessage =
            document.createElement("p");

        replyMessage.textContent =
            message.replyTo.text || "";

        originalReply.appendChild(replyUser);

        originalReply.appendChild(replyMessage);

        bubble.appendChild(originalReply);
    }


    // ====================================
    // USER NAME
    // ====================================

    if (!isMine) {

        const username =
            document.createElement("strong");

        username.className =
            "message-username";

        username.textContent =
            message.user || "Anonymous";

        bubble.appendChild(username);
    }


    // ====================================
    // MESSAGE TEXT
    // ====================================

    const messageText =
        document.createElement("p");

    messageText.className =
        "message-text";

    messageText.textContent =
        message.text || "";

    bubble.appendChild(messageText);


    // ====================================
    // TIME
    // ====================================

    const messageTime =
        document.createElement("span");

    messageTime.className =
        "message-time";

    messageTime.textContent =
        formatTime(message.timestamp);

    bubble.appendChild(messageTime);


    // ====================================
    // REPLY BUTTON
    // ====================================

    const replyButton =
        document.createElement("button");

    replyButton.className =
        "message-reply-button";

    replyButton.type =
        "button";

    replyButton.textContent =
        "↩";

    replyButton.setAttribute(
        "aria-label",
        "Reply to message"
    );

    replyButton.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();

            startReply(message);
        }
    );

    bubble.appendChild(replyButton);

    messageWrapper.appendChild(bubble);

    chatMessages.appendChild(messageWrapper);

    enableSwipeReply(
        messageWrapper,
        message
    );
}


// ========================================
// FORMAT TIME
// ========================================

function formatTime(timestamp) {

    if (!timestamp) {
        return "";
    }

    let date;

    if (
        timestamp &&
        typeof timestamp.toDate === "function"
    ) {

        date = timestamp.toDate();

    } else {

        date = new Date(timestamp);
    }

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString(
        [],
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


// ========================================
// SEND MESSAGE
// ========================================

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            if (!currentUserName) {

                openChat();

                return;
            }

            if (!auth.currentUser) {

                try {

                    await authenticateUser();

                } catch (error) {

                    return;
                }
            }

            if (!chatInput) {
                return;
            }

            const text =
                chatInput.value.trim();

            if (!text) {
                return;
            }

            if (text.length > 500) {

                alert(
                    "Your message is too long. Please keep it under 500 characters."
                );

                return;
            }

            const newMessage = {

                uid:
                    auth.currentUser.uid,

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

            try {

                await addDoc(
                    messagesCollection,
                    newMessage
                );

                chatInput.value = "";

                cancelReply();

            } catch (error) {

                console.error(
                    "Error sending message:",
                    error
                );

                alert(
                    "Your message could not be sent. Please try again."
                );
            }
        }
    );
}


// ========================================
// START REPLY
// ========================================

function startReply(message) {

    replyingTo = message;

    if (replyPreview) {

        replyPreview.style.display =
            "flex";
    }

    if (replyName) {

        replyName.textContent =
            message.user || "Anonymous";
    }

    if (replyText) {

        replyText.textContent =
            message.text || "";
    }

    if (chatInput) {
        chatInput.focus();
    }
}


// ========================================
// CANCEL REPLY
// ========================================

function cancelReply() {

    replyingTo = null;

    if (replyPreview) {

        replyPreview.style.display =
            "none";
    }
}


// ========================================
// CANCEL REPLY BUTTON
// ========================================

if (cancelReplyButton) {

    cancelReplyButton.addEventListener(
        "click",
        function() {

            cancelReply();

        }
    );
}


// ========================================
// MOBILE SWIPE LEFT TO REPLY
// ========================================

function enableSwipeReply(
    element,
    message
) {

    let startX = 0;

    let currentX = 0;

    let isSwiping = false;


    element.addEventListener(
        "touchstart",
        function(event) {

            if (!event.touches.length) {
                return;
            }

            startX =
                event.touches[0].clientX;

            currentX =
                startX;

            isSwiping = true;

        },
        {
            passive: true
        }
    );


    element.addEventListener(
        "touchmove",
        function(event) {

            if (!isSwiping || !event.touches.length) {
                return;
            }

            currentX =
                event.touches[0].clientX;

            const distance =
                currentX - startX;

            if (distance < -20) {

                element.style.transform =
                    `translateX(${Math.max(
                        distance,
                        -80
                    )}px)`;
            }

        },
        {
            passive: true
        }
    );


    element.addEventListener(
        "touchend",
        function() {

            if (!isSwiping) {
                return;
            }

            const distance =
                currentX - startX;

            element.style.transform = "";

            if (distance < -55) {

                startReply(message);
            }

            isSwiping = false;

        }
    );
}


// ========================================
// SCROLL TO BOTTOM
// ========================================

function scrollChatToBottom() {

    if (!chatMessages) {
        return;
    }

    setTimeout(
        function() {

            chatMessages.scrollTop =
                chatMessages.scrollHeight;

        },
        50
    );
}


// ========================================
// EMOJI BUTTON
// ========================================

if (emojiButton) {

    emojiButton.addEventListener(
        "click",
        function() {

            if (!chatInput) {
                return;
            }

            const emojis = [
                "🙏",
                "❤️",
                "😊",
                "😂",
                "🙌",
                "✝️",
                "✨",
                "😇",
                "💯"
            ];

            const randomEmoji =
                emojis[
                    Math.floor(
                        Math.random() *
                        emojis.length
                    )
                ];

            chatInput.value += randomEmoji;

            chatInput.focus();
        }
    );
}


// ========================================
// INITIALISE
// ========================================

console.log(
    "St. Monica LK3C Bible Study initialized."
);
