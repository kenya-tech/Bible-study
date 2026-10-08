// ========================================
// ST. MONICA LK3C BIBLE STUDY
// CHAT + NAVIGATION
// ========================================


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


    if (selectedSection) {

        selectedSection.classList.add("active");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

}


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


// ========================================
// CHAT STATE
// ========================================

let currentUserName =
    localStorage.getItem("bibleStudyAnonymousName");

let replyingTo = null;


// ========================================
// OPEN CHAT
// ========================================

function openChat() {

    if (!chatLogin || !chatRoom) {
        return;
    }


    if (currentUserName) {

        chatLogin.style.display = "none";

        chatRoom.style.display = "flex";

        updateUserDisplay();

        loadLocalMessages();

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
// DETECT WHEN CHAT PAGE OPENS
// ========================================

const publicChatButton =
    document.querySelector(
        "[onclick=\"showSection('public-chat')\"]"
    );


if (publicChatButton) {

    publicChatButton.addEventListener(
        "click",
        function() {

            setTimeout(function() {
                openChat();
            }, 50);

        }
    );

}


// ========================================
// ENTER CHAT
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
// ENTER CHAT WITH ENTER KEY
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
// CREATE USER NAME
// ========================================

function enterPublicChat() {

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


    currentUserName =
        enteredName;


    localStorage.setItem(
        "bibleStudyAnonymousName",
        currentUserName
    );


    chatLoginError.textContent = "";


    chatLogin.style.display = "none";

    chatRoom.style.display = "flex";


    updateUserDisplay();

    loadLocalMessages();

}


// ========================================
// LOGIN ERROR
// ========================================

function showChatLoginError(message) {

    if (!chatLoginError) {
        return;
    }


    chatLoginError.textContent =
        message;

}


// ========================================
// UPDATE USER NAME
// ========================================

function updateUserDisplay() {

    if (anonymousIDElement) {

        anonymousIDElement.textContent =
            currentUserName;

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


            currentUserName =
                cleanedName;


            localStorage.setItem(
                "bibleStudyAnonymousName",
                currentUserName
            );


            updateUserDisplay();

            renderMessages();

        }
    );

}


// ========================================
// LOCAL MESSAGE STORAGE
//
// This is temporary.
// Firebase will replace this later.
// ========================================

function getStoredMessages() {

    const storedMessages =
        localStorage.getItem(
            "bibleStudyChatMessages"
        );


    if (!storedMessages) {

        return [];

    }


    try {

        return JSON.parse(
            storedMessages
        );

    } catch (error) {

        return [];

    }

}


// ========================================
// SAVE MESSAGES
// ========================================

function saveMessages(messages) {

    localStorage.setItem(
        "bibleStudyChatMessages",
        JSON.stringify(messages)
    );

}


// ========================================
// LOAD MESSAGES
// ========================================

function loadLocalMessages() {

    renderMessages();

}


// ========================================
// RENDER MESSAGES
// ========================================

function renderMessages() {

    if (!chatMessages) {
        return;
    }


    const messages =
        getStoredMessages();


    chatMessages.innerHTML = "";


    if (messages.length === 0) {

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


    messages.forEach(function(message) {

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
        message.user === currentUserName;


    messageWrapper.className =
        isMine
            ? "message-wrapper mine"
            : "message-wrapper other";


    const bubble =
        document.createElement("div");


    bubble.className =
        "message-bubble";


    // ====================================
    // REPLY PREVIEW INSIDE MESSAGE
    // ====================================

    if (message.replyTo) {

        const originalReply =
            document.createElement("div");


        originalReply.className =
            "message-reply";


        const replyUser =
            document.createElement("strong");


        replyUser.textContent =
            message.replyTo.user;


        const replyMessage =
            document.createElement("p");


        replyMessage.textContent =
            message.replyTo.text;


        originalReply.appendChild(
            replyUser
        );

        originalReply.appendChild(
            replyMessage
        );


        bubble.appendChild(
            originalReply
        );

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
            message.user;


        bubble.appendChild(
            username
        );

    }


    // ====================================
    // MESSAGE TEXT
    // ====================================

    const messageText =
        document.createElement("p");


    messageText.className =
        "message-text";


    messageText.textContent =
        message.text;


    bubble.appendChild(
        messageText
    );


    // ====================================
    // TIME
    // ====================================

    const messageTime =
        document.createElement("span");


    messageTime.className =
        "message-time";


    messageTime.textContent =
        formatTime(message.timestamp);


    bubble.appendChild(
        messageTime
    );


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


    bubble.appendChild(
        replyButton
    );


    messageWrapper.appendChild(
        bubble
    );


    chatMessages.appendChild(
        messageWrapper
    );


    // ====================================
    // MOBILE SWIPE SUPPORT
    // ====================================

    enableSwipeReply(
        messageWrapper,
        message
    );

}


// ========================================
// FORMAT TIME
// ========================================

function formatTime(timestamp) {

    const date =
        new Date(timestamp);


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
        function(event) {

            event.preventDefault();


            if (!currentUserName) {

                openChat();

                return;

            }


            const text =
                chatInput.value.trim();


            if (!text) {
                return;
            }


            const newMessage = {

                id:
                    Date.now().toString(),

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


            const messages =
                getStoredMessages();


            messages.push(
                newMessage
            );


            saveMessages(
                messages
            );


            chatInput.value = "";


            cancelReply();


            renderMessages();

        }
    );

}


// ========================================
// START REPLY
// ========================================

function startReply(message) {

    replyingTo =
        message;


    if (replyPreview) {

        replyPreview.style.display =
            "flex";

    }


    if (replyName) {

        replyName.textContent =
            message.user;

    }


    if (replyText) {

        replyText.textContent =
            message.text;

    }


    if (chatInput) {

        chatInput.focus();

    }

}


// ========================================
// CANCEL REPLY
// ========================================

function cancelReply() {

    replyingTo =
        null;


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
// MOBILE SWIPE-LEFT TO REPLY
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


    element.addEventListener(
        "touchmove",
        function(event) {

            if (!isSwiping) {
                return;
            }


            currentX =
                event.touches[0].clientX;


            const distance =
                currentX - startX;


            // We respond to a left swipe.
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


            element.style.transform =
                "";


            if (distance < -55) {

                startReply(message);

            }


            isSwiping =
                false;

        }
    );

}


// ========================================
// SCROLL CHAT TO BOTTOM
// ========================================

function scrollChatToBottom() {

    if (!chatMessages) {
        return;
    }


    setTimeout(function() {

        chatMessages.scrollTop =
            chatMessages.scrollHeight;

    }, 50);

}


// ========================================
// EMOJI BUTTON
// ========================================

const emojiButton =
    document.getElementById("emoji-button");


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


            chatInput.value +=
                randomEmoji;


            chatInput.focus();

        }
    );

}


// ========================================
// INITIALISE CHAT
// ========================================

if (chatLogin && chatRoom) {

    // The login screen remains available
    // until the user enters an anonymous name.

}
