// ============================================================
// ST. MONICA LK3C BIBLE STUDY
// FIREBASE CHAT + ANONYMOUS AUTHENTICATION
// ============================================================


// ============================================================
// FIREBASE IMPORTS
// ============================================================

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


// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

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


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ============================================================
// SECTION NAVIGATION
// ============================================================

function showSection(sectionId) {

    const screens =
        document.querySelectorAll(".screen");

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


    // --------------------------------------------
    // PUBLIC CHAT
    // --------------------------------------------

    if (sectionId === "public-chat") {

        openChat();

    }
}


// Make showSection available to HTML onclick=""
window.showSection = showSection;


// ============================================================
// CHAT ELEMENTS
// ============================================================

const chatLogin =
    document.getElementById("chat-login");

const chatRoom =
    document.getElementById("chat-room");

const anonymousNameInput =
    document.getElementById("anonymous-name");

const enterChatButton =
    document.getElementById("enter-chat-btn");

const chatLoginMessage =
    document.getElementById("chat-login-message");

const chatMessages =
    document.getElementById("chat-messages");

const chatForm =
    document.getElementById("chat-form");

const messageInput =
    document.getElementById("message-input");

const sendMessageButton =
    document.getElementById("send-message-btn");

const currentUserNameElement =
    document.getElementById("current-user-name");

const changeNameButton =
    document.getElementById("change-name-btn");

const changeNameBottomButton =
    document.getElementById("change-name-bottom-btn");

const replyPreview =
    document.getElementById("reply-preview");

const replyPreviewUser =
    document.getElementById("reply-preview-user");

const replyPreviewText =
    document.getElementById("reply-preview-text");

const cancelReplyButton =
    document.getElementById("cancel-reply-btn");

const emojiButton =
    document.getElementById("emoji-btn");


// ============================================================
// CHAT STATE
// ============================================================

let currentUserName =
    localStorage.getItem(
        "bibleStudyAnonymousName"
    ) || "";

let replyingTo = null;

let unsubscribeMessages = null;

let latestMessages = [];

let isEnteringChat = false;


// ============================================================
// SHOW LOGIN MESSAGE
// ============================================================

function showChatLoginMessage(
    message,
    type = "error"
) {

    if (!chatLoginMessage) {
        return;
    }


    chatLoginMessage.textContent =
        message;


    chatLoginMessage.className =
        "chat-login-message";


    if (type === "success") {

        chatLoginMessage.classList.add(
            "success"
        );

    } else {

        chatLoginMessage.classList.add(
            "error"
        );
    }
}


// ============================================================
// FIREBASE ANONYMOUS AUTHENTICATION
// ============================================================

async function authenticateUser() {

    // If the user is already authenticated,
    // don't create another anonymous account.

    if (auth.currentUser) {

        return auth.currentUser;

    }


    try {

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


        throw error;
    }
}


// ============================================================
// OPEN CHAT
// ============================================================

async function openChat() {

    if (!chatLogin || !chatRoom) {
        return;
    }


    // --------------------------------------------
    // USER ALREADY HAS A SAVED NAME
    // --------------------------------------------

    if (currentUserName) {

        try {

            await authenticateUser();


            chatLogin.style.display =
                "none";


            chatRoom.style.display =
                "flex";


            updateUserDisplay();


            startRealtimeMessages();


        } catch (error) {

            console.error(
                "Could not open chat:",
                error
            );


            chatLogin.style.display =
                "block";


            chatRoom.style.display =
                "none";


            showChatLoginMessage(
                "Unable to connect to the chat. Please try again."
            );
        }


        return;
    }


    // --------------------------------------------
    // NO NAME YET
    // --------------------------------------------

    chatLogin.style.display =
        "block";


    chatRoom.style.display =
        "none";


    if (anonymousNameInput) {

        setTimeout(function() {

            anonymousNameInput.focus();

        }, 100);
    }
}


// ============================================================
// ENTER CHAT BUTTON
// ============================================================

if (enterChatButton) {

    enterChatButton.addEventListener(
        "click",
        function() {

            enterPublicChat();

        }
    );
}


// ============================================================
// ENTER CHAT USING ENTER KEY
// ============================================================

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


// ============================================================
// ENTER PUBLIC CHAT
// ============================================================

async function enterPublicChat() {

    // Prevent double clicks.

    if (isEnteringChat) {
        return;
    }


    isEnteringChat = true;


    // --------------------------------------------
    // GET NAME
    // --------------------------------------------

    const enteredName =
        anonymousNameInput
            ? anonymousNameInput.value.trim()
            : "";


    // --------------------------------------------
    // CHECK EMPTY NAME
    // --------------------------------------------

    if (!enteredName) {

        showChatLoginMessage(
            "Please choose an anonymous name."
        );


        if (anonymousNameInput) {
            anonymousNameInput.focus();
        }


        isEnteringChat = false;

        return;
    }


    // --------------------------------------------
    // CHECK MINIMUM LENGTH
    // --------------------------------------------

    if (enteredName.length < 2) {

        showChatLoginMessage(
            "Your name should have at least 2 characters."
        );


        anonymousNameInput.focus();


        isEnteringChat = false;

        return;
    }


    // --------------------------------------------
    // CHECK MAXIMUM LENGTH
    // --------------------------------------------

    if (enteredName.length > 25) {

        showChatLoginMessage(
            "Your name must be 25 characters or less."
        );


        isEnteringChat = false;

        return;
    }


    // --------------------------------------------
    // LOADING STATE
    // --------------------------------------------

    if (enterChatButton) {

        enterChatButton.disabled =
            true;

        enterChatButton.innerHTML =
            `Connecting... <span>⏳</span>`;
    }


    showChatLoginMessage(
        "Connecting to the public chat...",
        "success"
    );


    try {

        // ----------------------------------------
        // FIREBASE AUTHENTICATION
        // ----------------------------------------

        await authenticateUser();


        // ----------------------------------------
        // SAVE NAME
        // ----------------------------------------

        currentUserName =
            enteredName;


        localStorage.setItem(
            "bibleStudyAnonymousName",
            currentUserName
        );


        // ----------------------------------------
        // UPDATE DISPLAY
        // ----------------------------------------

        updateUserDisplay();


        // ----------------------------------------
        // HIDE LOGIN
        // SHOW CHAT
        // ----------------------------------------

        chatLogin.style.display =
            "none";


        chatRoom.style.display =
            "flex";


        // ----------------------------------------
        // START REAL-TIME CHAT
        // ----------------------------------------

        startRealtimeMessages();


        // ----------------------------------------
        // FOCUS MESSAGE INPUT
        // ----------------------------------------

        setTimeout(function() {

            if (messageInput) {
                messageInput.focus();
            }

        }, 300);


    } catch (error) {

        console.error(
            "Error entering public chat:",
            error
        );


        let errorMessage =
            "Could not connect to the chat. Please try again.";


        // Firebase-specific errors

        if (
            error &&
            error.code ===
            "auth/operation-not-allowed"
        ) {

            errorMessage =
                "Anonymous sign-in is not enabled in Firebase Authentication.";

        }


        if (
            error &&
            error.code ===
            "auth/network-request-failed"
        ) {

            errorMessage =
                "Network connection failed. Please check your internet connection.";

        }


        showChatLoginMessage(
            errorMessage
        );


        chatLogin.style.display =
            "block";


        chatRoom.style.display =
            "none";


    } finally {

        isEnteringChat = false;


        if (enterChatButton) {

            enterChatButton.disabled =
                false;

            enterChatButton.innerHTML =
                `Enter Public Chat <span>→</span>`;
        }
    }
}


// ============================================================
// UPDATE CURRENT USER DISPLAY
// ============================================================

function updateUserDisplay() {

    if (currentUserNameElement) {

        currentUserNameElement.textContent =
            currentUserName || "Anonymous";

    }
}


// ============================================================
// FIRESTORE COLLECTION
// ============================================================

const messagesCollection =
    collection(
        db,
        "publicChatMessages"
    );


// ============================================================
// START REAL-TIME MESSAGES
// ============================================================

function startRealtimeMessages() {

    // Stop an old listener before creating
    // a new one.

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


                snapshot.forEach(
                    function(documentSnapshot) {

                        latestMessages.push({

                            id:
                                documentSnapshot.id,

                            ...documentSnapshot.data()

                        });

                    }
                );


                renderCurrentMessages();

            },


            function(error) {

                console.error(
                    "Firestore error:",
                    error
                );


                if (!chatMessages) {
                    return;
                }


                chatMessages.innerHTML = "";


                const errorCard =
                    document.createElement("div");


                errorCard.className =
                    "chat-welcome-card";


                const icon =
                    document.createElement("div");


                icon.className =
                    "welcome-icon";


                icon.textContent =
                    "⚠️";


                const title =
                    document.createElement("h3");


                title.textContent =
                    "Chat connection problem";


                const text =
                    document.createElement("p");


                text.textContent =
                    "We could not load the messages. Please refresh and try again.";


                errorCard.appendChild(icon);

                errorCard.appendChild(title);

                errorCard.appendChild(text);


                chatMessages.appendChild(
                    errorCard
                );
            }
        );
}


// ============================================================
// RENDER ALL MESSAGES
// ============================================================

function renderCurrentMessages() {

    if (!chatMessages) {
        return;
    }


    chatMessages.innerHTML =
        "";


    // --------------------------------------------
    // NO MESSAGES
    // --------------------------------------------

    if (latestMessages.length === 0) {

        const welcomeCard =
            document.createElement("div");


        welcomeCard.className =
            "chat-welcome-card";


        const icon =
            document.createElement("div");


        icon.className =
            "welcome-icon";


        icon.textContent =
            "👋";


        const title =
            document.createElement("h3");


        title.textContent =
            "Welcome to the discussion!";


        const paragraph =
            document.createElement("p");


        paragraph.textContent =
            "Share your thoughts, reflections and questions about today's Bible study.";


        welcomeCard.appendChild(icon);

        welcomeCard.appendChild(title);

        welcomeCard.appendChild(paragraph);


        chatMessages.appendChild(
            welcomeCard
        );


        return;
    }


    // --------------------------------------------
    // DISPLAY MESSAGES
    // --------------------------------------------

    latestMessages.forEach(
        function(message) {

            createMessageElement(
                message
            );

        }
    );


    scrollChatToBottom();
}


// ============================================================
// CREATE MESSAGE ELEMENT
// ============================================================

function createMessageElement(message) {

    const messageWrapper =
        document.createElement("div");


    const isMine =
        auth.currentUser &&
        message.uid ===
        auth.currentUser.uid;


    messageWrapper.className =
        isMine
            ? "message-wrapper mine"
            : "message-wrapper other";


    const bubble =
        document.createElement("div");


    bubble.className =
        "message-bubble";


    // --------------------------------------------
    // REPLY
    // --------------------------------------------

    if (message.replyTo) {

        const originalReply =
            document.createElement("div");


        originalReply.className =
            "message-reply";


        const repliedUser =
            document.createElement("strong");


        repliedUser.textContent =
            message.replyTo.user ||
            "Anonymous";


        const repliedText =
            document.createElement("p");


        repliedText.textContent =
            message.replyTo.text ||
            "";


        originalReply.appendChild(
            repliedUser
        );


        originalReply.appendChild(
            repliedText
        );


        bubble.appendChild(
            originalReply
        );
    }


    // --------------------------------------------
    // USER NAME
    // --------------------------------------------

    const username =
        document.createElement("div");


    username.className =
        "message-user";


    username.textContent =
        message.user ||
        "Anonymous";


    bubble.appendChild(
        username
    );


    // --------------------------------------------
    // MESSAGE TEXT
    // --------------------------------------------

    const messageText =
        document.createElement("div");


    messageText.className =
        "message-text";


    messageText.textContent =
        message.text ||
        "";


    bubble.appendChild(
        messageText
    );


    // --------------------------------------------
    // TIME
    // --------------------------------------------

    const messageTime =
        document.createElement("div");


    messageTime.className =
        "message-time";


    messageTime.textContent =
        formatTime(
            message.timestamp
        );


    bubble.appendChild(
        messageTime
    );


    // --------------------------------------------
    // REPLY BUTTON
    // --------------------------------------------

    const replyButton =
        document.createElement("button");


    replyButton.type =
        "button";


    replyButton.className =
        "reply-message-button";


    replyButton.textContent =
        "↩ Reply";


    replyButton.setAttribute(
        "aria-label",
        "Reply to message"
    );


    replyButton.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();


            startReply(
                message
            );
        }
    );


    bubble.appendChild(
        replyButton
    );


    messageWrapper.appendChild(
        bubble
    );


    chatMessages.appendChild(
        messageWrapper
    );


    // --------------------------------------------
    // MOBILE SWIPE TO REPLY
    // --------------------------------------------

    enableSwipeReply(
        messageWrapper,
        message
    );
}


// ============================================================
// FORMAT MESSAGE TIME
// ============================================================

function formatTime(timestamp) {

    if (!timestamp) {
        return "";
    }


    let date;


    if (
        timestamp &&
        typeof timestamp.toDate ===
        "function"
    ) {

        date =
            timestamp.toDate();

    } else {

        date =
            new Date(timestamp);
    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

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


// ============================================================
// SEND MESSAGE
// ============================================================

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            // ----------------------------------------
            // CHECK NAME
            // ----------------------------------------

            if (!currentUserName) {

                openChat();

                return;
            }


            // ----------------------------------------
            // CHECK AUTHENTICATION
            // ----------------------------------------

            if (!auth.currentUser) {

                try {

                    await authenticateUser();

                } catch (error) {

                    return;
                }
            }


            // ----------------------------------------
            // GET MESSAGE
            // ----------------------------------------

            if (!messageInput) {
                return;
            }


            const text =
                messageInput.value.trim();


            if (!text) {
                return;
            }


            // ----------------------------------------
            // CHECK LENGTH
            // ----------------------------------------

            if (text.length > 500) {

                alert(
                    "Your message is too long. Please keep it under 500 characters."
                );

                return;
            }


            // ----------------------------------------
            // DISABLE SEND BUTTON
            // ----------------------------------------

            if (sendMessageButton) {

                sendMessageButton.disabled =
                    true;
            }


            // ----------------------------------------
            // CREATE MESSAGE
            // ----------------------------------------

            const newMessage = {

                uid:
                    auth.currentUser.uid,

                user:
                    currentUserName,

                text:
                    text,

                timestamp:
                    Date.now()
            };


            // ----------------------------------------
            // ADD REPLY IF NECESSARY
            // ----------------------------------------

            if (replyingTo) {

                newMessage.replyTo = {

                    user:
                        replyingTo.user ||
                        "Anonymous",

                    text:
                        replyingTo.text ||
                        ""
                };
            }


            try {

                await addDoc(
                    messagesCollection,
                    newMessage
                );


                // Clear input

                messageInput.value =
                    "";


                // Clear reply

                cancelReply();


            } catch (error) {

                console.error(
                    "Error sending message:",
                    error
                );


                alert(
                    "Your message could not be sent. Please try again."
                );


            } finally {

                if (sendMessageButton) {

                    sendMessageButton.disabled =
                        false;
                }


                messageInput.focus();
            }
        }
    );
}


// ============================================================
// START REPLY
// ============================================================

function startReply(message) {

    replyingTo = {

        user:
            message.user ||
            "Anonymous",

        text:
            message.text ||
            ""
    };


    // --------------------------------------------
    // SHOW REPLY PREVIEW
    // --------------------------------------------

    if (replyPreview) {

        replyPreview.style.display =
            "flex";
    }


    if (replyPreviewUser) {

        replyPreviewUser.textContent =
            replyingTo.user;
    }


    if (replyPreviewText) {

        let preview =
            replyingTo.text;


        if (preview.length > 100) {

            preview =
                preview.substring(
                    0,
                    100
                ) + "...";
        }


        replyPreviewText.textContent =
            preview;
    }


    // --------------------------------------------
    // FOCUS MESSAGE INPUT
    // --------------------------------------------

    if (messageInput) {

        messageInput.focus();
    }
}


// ============================================================
// CANCEL REPLY
// ============================================================

function cancelReply() {

    replyingTo = null;


    if (replyPreview) {

        replyPreview.style.display =
            "none";
    }


    if (replyPreviewUser) {

        replyPreviewUser.textContent =
            "";
    }


    if (replyPreviewText) {

        replyPreviewText.textContent =
            "";
    }
}


// ============================================================
// CANCEL REPLY BUTTON
// ============================================================

if (cancelReplyButton) {

    cancelReplyButton.addEventListener(
        "click",
        function() {

            cancelReply();

        }
    );
}


// ============================================================
// CHANGE CHAT NAME
// ============================================================

function changeChatName() {

    const newName =
        prompt(
            "Choose a new anonymous name:",
            currentUserName || ""
        );


    if (newName === null) {
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
            "Your anonymous name must be 25 characters or less."
        );

        return;
    }


    currentUserName =
        cleanedName;


    localStorage.setItem(
        "bibleStudyAnonymousName",
        currentUserName
    );


    updateUserDisplay();


    // Re-render so the updated name is
    // reflected in the interface.

    renderCurrentMessages();
}


// Top change-name button

if (changeNameButton) {

    changeNameButton.addEventListener(
        "click",
        function() {

            changeChatName();

        }
    );
}


// Bottom change-name button

if (changeNameBottomButton) {

    changeNameBottomButton.addEventListener(
        "click",
        function() {

            changeChatName();

        }
    );
}


// ============================================================
// EMOJI BUTTON
// ============================================================

if (emojiButton) {

    emojiButton.addEventListener(
        "click",
        function() {

            if (!messageInput) {
                return;
            }


            const emojis = [

                "😊",
                "😂",
                "❤️",
                "🙏",
                "🔥",
                "👏",
                "😅",
                "😍",
                "😭",
                "🙌",
                "💯",
                "✨",
                "😇",
                "🤔",
                "👍",
                "✝️"

            ];


            const randomEmoji =
                emojis[
                    Math.floor(
                        Math.random() *
                        emojis.length
                    )
                ];


            const start =
                messageInput.selectionStart;


            const end =
                messageInput.selectionEnd;


            const currentValue =
                messageInput.value;


            messageInput.value =
                currentValue.substring(
                    0,
                    start
                ) +
                randomEmoji +
                currentValue.substring(
                    end
                );


            messageInput.focus();


            const cursorPosition =
                start +
                randomEmoji.length;


            messageInput.selectionStart =
                cursorPosition;


            messageInput.selectionEnd =
                cursorPosition;
        }
    );
}


// ============================================================
// MOBILE SWIPE TO REPLY
// ============================================================

function enableSwipeReply(
    element,
    message
) {

    let startX = 0;

    let currentX = 0;

    let isSwiping = false;


    // --------------------------------------------
    // TOUCH START
    // --------------------------------------------

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


            isSwiping =
                true;

        },
        {
            passive: true
        }
    );


    // --------------------------------------------
    // TOUCH MOVE
    // --------------------------------------------

    element.addEventListener(
        "touchmove",
        function(event) {

            if (
                !isSwiping ||
                !event.touches.length
            ) {

                return;
            }


            currentX =
                event.touches[0].clientX;


            const distance =
                currentX -
                startX;


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


    // --------------------------------------------
    // TOUCH END
    // --------------------------------------------

    element.addEventListener(
        "touchend",
        function() {

            if (!isSwiping) {
                return;
            }


            const distance =
                currentX -
                startX;


            element.style.transform =
                "";


            if (distance < -55) {

                startReply(
                    message
                );
            }


            isSwiping =
                false;

        }
    );
}


// ============================================================
// SCROLL CHAT TO BOTTOM
// ============================================================

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


// ============================================================
// INITIALISE
// ============================================================

updateUserDisplay();


// Don't automatically open Firebase authentication
// until the user actually enters the public chat.

console.log(
    "St. Monica LK3C Bible Study initialized successfully."
);

console.log(
    "Firebase project:",
    firebaseConfig.projectId
);
