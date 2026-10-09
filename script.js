
/* =========================================================
   ST. MONICA LK3C — BIBLE STUDY
   Firebase Authentication + Membership + Public Chat
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
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
    setDoc,
    writeBatch,
    serverTimestamp
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
// MEMBERSHIP GROUPS
// =========================================================

const GROUPS = {
    "charles-lwanga": {
        name: "St. Charles Lwanga",
        countElement: "count-charles-lwanga"
    },
    "st-williams": {
        name: "St. Williams",
        countElement: "count-st-williams"
    },
    "st-camillas": {
        name: "St. Camillas",
        countElement: "count-st-camillas"
    },
    "mathias-mulumba": {
        name: "St. Mathias Mulumba",
        countElement: "count-mathias-mulumba"
    },
    "st-vincent": {
        name: "St. Vincent",
        countElement: "count-st-vincent"
    }
};


// =========================================================
// ELEMENTS — MEMBERSHIP
// =========================================================

const membershipForm =
    document.getElementById("membership-form");

const membershipLoginForm =
    document.getElementById("membership-login-form");

const memberFullName =
    document.getElementById("member-full-name");

const memberPhone =
    document.getElementById("member-phone");

const memberPassword =
    document.getElementById("member-password");

const memberGroup =
    document.getElementById("member-group");

const membershipSubmit =
    document.getElementById("membership-submit");

const membershipMessage =
    document.getElementById("membership-message");

const loginMemberPhone =
    document.getElementById("login-member-phone");

const loginMemberPassword =
    document.getElementById("login-member-password");

const membershipLoginSubmit =
    document.getElementById("membership-login-submit");

const membershipLoginMessage =
    document.getElementById("membership-login-message");

const membershipStatus =
    document.getElementById("membership-status");

const membershipForms =
    document.getElementById("membership-forms");


// =========================================================
// ELEMENTS — PUBLIC CHAT
// =========================================================

const chatLogin =
    document.getElementById("chat-login");

const chatRoom =
    document.getElementById("chat-room");

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
let unsubscribeGroupCounts = null;

const NAME_STORAGE_KEY = "bibleStudyAnonymousName";


// =========================================================
// PAGE NAVIGATION
// =========================================================

function showSection(sectionId) {
    const sections = document.querySelectorAll(".page-section");

    sections.forEach(section => {
        section.classList.remove("active-section");
    });

    const target = document.getElementById(sectionId);

    if (!target) {
        console.warn("Section not found:", sectionId);
        return;
    }

    target.classList.add("active-section");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    try {
        history.replaceState(null, "", "#" + sectionId);
    } catch (error) {
        console.warn("Could not update URL:", error);
    }

    if (sectionId === "public-chat") {
        prepareChat();
    }
}

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
        showSection(href.substring(1));
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

        const onclickCode = button.getAttribute("onclick") || "";

        if (onclickCode.includes("'membership'") ||
            onclickCode.includes('"membership"')) {
            showSection("membership");
        } else {
            showSection("public-chat");
        }
    });
});


// =========================================================
// LOAD SECTION FROM URL HASH
// =========================================================

function loadInitialSection() {
    const hash = window.location.hash.replace("#", "");

    const validSections = [
        "home",
        "story",
        "questions",
        "membership",
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
// PHONE NUMBER HELPERS
// =========================================================

function normalizePhoneNumber(value) {
    let digits = value.replace(/\D/g, "");

    // Convert Kenyan local format, e.g. 0712345678,
    // into 254712345678.
    if (digits.startsWith("0") && digits.length === 10) {
        digits = "254" + digits.substring(1);
    } else if (
        (digits.startsWith("7") || digits.startsWith("1")) &&
        digits.length === 9
    ) {
        digits = "254" + digits;
    }

    // Accept the international Kenyan format.
    if (!digits.startsWith("254") || digits.length !== 12) {
        throw new Error(
            "Enter a valid Kenyan phone number, such as 0712345678 or +254712345678."
        );
    }

    return digits;
}


// Firebase Email/Password authentication requires an email.
// This creates a consistent login identifier from the phone number.
// It does NOT verify ownership of that phone number.
function phoneToEmail(phoneDigits) {
    return `${phoneDigits}@members.stmonicalk3c.invalid`;
}


// =========================================================
// MEMBERSHIP MESSAGE HELPERS
// =========================================================

function setMembershipMessage(message, isError = false) {
    if (!membershipMessage) return;

    membershipMessage.textContent = message;
    membershipMessage.classList.toggle("error", isError);
}

function setLoginMessage(message, isError = false) {
    if (!membershipLoginMessage) return;

    membershipLoginMessage.textContent = message;
    membershipLoginMessage.classList.toggle("error", isError);
}

function friendlyAuthError(error) {
    const code = error?.code || "";

    const messages = {
        "auth/email-already-in-use":
            "An account already exists for this phone number. Please sign in instead.",
        "auth/invalid-credential":
            "The phone number or password is incorrect.",
        "auth/invalid-email":
            "The login identifier was rejected by Firebase. Please check the authentication configuration.",
        "auth/weak-password":
            "Please choose a stronger password with at least 6 characters.",
        "auth/too-many-requests":
            "Too many attempts. Please wait a while and try again.",
        "auth/network-request-failed":
            "Network error. Check your internet connection and try again.",
        "auth/operation-not-allowed":
            "Email/Password sign-in is not enabled in Firebase Authentication."
    };

    return messages[code] ||
        error?.message ||
        "Something went wrong. Please try again.";
}


// =========================================================
// GROUP MEMBERSHIP COUNTS — REAL TIME
// =========================================================

function startGroupCountListener() {
    if (unsubscribeGroupCounts) {
        unsubscribeGroupCounts();
        unsubscribeGroupCounts = null;
    }

    const membershipsRef = collection(db, "groupMemberships");

    unsubscribeGroupCounts = onSnapshot(
        membershipsRef,
        snapshot => {
            const counts = {};

            Object.keys(GROUPS).forEach(groupId => {
                counts[groupId] = 0;
            });

            snapshot.forEach(documentSnapshot => {
                const data = documentSnapshot.data();

                if (
                    data.groupId &&
                    Object.prototype.hasOwnProperty.call(
                        counts,
                        data.groupId
                    )
                ) {
                    counts[data.groupId]++;
                }
            });

            Object.entries(GROUPS).forEach(([groupId, group]) => {
                const element = document.getElementById(
                    group.countElement
                );

                if (element) {
                    element.textContent =
                        `Members: ${counts[groupId]}`;
                }
            });
        },
        error => {
            console.error("Group count listener error:", error);

            Object.values(GROUPS).forEach(group => {
                const element = document.getElementById(
                    group.countElement
                );

                if (element) {
                    element.textContent = "Counts unavailable";
                }
            });
        }
    );
}


// =========================================================
// REGISTER A MEMBER
// =========================================================

async function registerMember(event) {
    event.preventDefault();

    if (!membershipForm) return;

    const fullName = memberFullName.value.trim();
    const rawPhone = memberPhone.value.trim();
    const password = memberPassword.value;
    const groupId = memberGroup.value;

    if (fullName.length < 2 || fullName.length > 80) {
        setMembershipMessage(
            "Enter a name between 2 and 80 characters.",
            true
        );
        return;
    }

    if (!Object.prototype.hasOwnProperty.call(GROUPS, groupId)) {
        setMembershipMessage(
            "Please select a valid Bible study group.",
            true
        );
        return;
    }

    if (password.length < 6) {
        setMembershipMessage(
            "Your password must contain at least 6 characters.",
            true
        );
        return;
    }

    let phoneDigits;

    try {
        phoneDigits = normalizePhoneNumber(rawPhone);
    } catch (error) {
        setMembershipMessage(error.message, true);
        return;
    }

    membershipSubmit.disabled = true;
    setMembershipMessage("Creating your membership...");

    let createdUser = null;

    try {
        // Firebase securely manages the password.
        const credential = await createUserWithEmailAndPassword(
            auth,
            phoneToEmail(phoneDigits),
            password
        );

        createdUser = credential.user;

        // Store private member details separately from public counts.
        // The public membership record contains no name or phone number.
        const batch = writeBatch(db);

        const privateMemberRef = doc(
            db,
            "members",
            createdUser.uid
        );

        const publicMembershipRef = doc(
            db,
            "groupMemberships",
            createdUser.uid
        );

        batch.set(privateMemberRef, {
            fullName: fullName,
            phoneNumber: phoneDigits,
            groupId: groupId,
            createdAt: serverTimestamp()
        });

        batch.set(publicMembershipRef, {
            groupId: groupId,
            joinedAt: serverTimestamp()
        });

        await batch.commit();

        membershipForm.reset();

        setMembershipMessage(
            `Welcome, ${fullName}! You have joined ${GROUPS[groupId].name}.`
        );

        await showSignedInMember(createdUser);

    } catch (error) {
        console.error("Membership registration failed:", error);

        if (createdUser && error.code !== "auth/email-already-in-use") {
            setMembershipMessage(
                "Your Firebase account may have been created, but the membership records could not be saved. Do not register repeatedly. Check your Firestore rules and try signing in again after the issue is fixed.",
                true
            );
        } else {
            setMembershipMessage(
                friendlyAuthError(error),
                true
            );
        }
    } finally {
        membershipSubmit.disabled = false;
    }
}

if (membershipForm) {
    membershipForm.addEventListener("submit", registerMember);
}


// =========================================================
// MEMBER LOGIN
// =========================================================

async function loginMember(event) {
    event.preventDefault();

    const rawPhone = loginMemberPhone.value.trim();
    const password = loginMemberPassword.value;

    let phoneDigits;

    try {
        phoneDigits = normalizePhoneNumber(rawPhone);
    } catch (error) {
        setLoginMessage(error.message, true);
        return;
    }

    membershipLoginSubmit.disabled = true;
    setLoginMessage("Signing in...");

    try {
        const credential = await signInWithEmailAndPassword(
            auth,
            phoneToEmail(phoneDigits),
            password
        );

        const memberSnapshot = await getDoc(
            doc(db, "members", credential.user.uid)
        );

        if (!memberSnapshot.exists()) {
            setLoginMessage(
                "Your account exists, but its membership profile was not found. Please contact the Bible Study administrator.",
                true
            );
            return;
        }

        loginMemberPassword.value = "";
        setLoginMessage("");

        await showSignedInMember(credential.user);

    } catch (error) {
        console.error("Member login failed:", error);
        setLoginMessage(friendlyAuthError(error), true);
    } finally {
        membershipLoginSubmit.disabled = false;
    }
}

if (membershipLoginForm) {
    membershipLoginForm.addEventListener("submit", loginMember);
}


// =========================================================
// SHOW SIGNED-IN MEMBER STATUS
// =========================================================

async function showSignedInMember(user) {
    if (!user || user.isAnonymous || !membershipStatus) {
        return;
    }

    try {
        const memberSnapshot = await getDoc(
            doc(db, "members", user.uid)
        );

        if (!memberSnapshot.exists()) {
            return;
        }

        const member = memberSnapshot.data();
        const group = GROUPS[member.groupId];

        membershipStatus.replaceChildren();

        const greeting = document.createElement("h3");
        greeting.textContent = `Welcome, ${member.fullName || "Member"}!`;

        const groupText = document.createElement("p");
        groupText.textContent = group
            ? `Your Bible study group: ${group.name}`
            : "Your membership is active.";

        const chatText = document.createElement("p");
        chatText.textContent =
            "You can read the same Bible study materials and join the public chat.";

        const logoutButton = document.createElement("button");
        logoutButton.type = "button";
        logoutButton.className = "membership-submit";
        logoutButton.textContent = "Sign Out";

        logoutButton.addEventListener("click", async () => {
            try {
                await signOut(auth);

                membershipStatus.hidden = true;

                if (membershipForms) {
                    membershipForms.hidden = false;
                }

                setMembershipMessage("You have signed out.");
            } catch (error) {
                console.error("Sign out failed:", error);
                alert("Unable to sign out. Please try again.");
            }
        });

        membershipStatus.append(
            greeting,
            groupText,
            chatText,
            logoutButton
        );

        membershipStatus.hidden = false;

        // Keep forms available for the moment, so the member can
        // sign out or another person can use the same device.
    } catch (error) {
        console.error("Could not load member profile:", error);
    }
}


// =========================================================
// AUTH STATE
// =========================================================

onAuthStateChanged(auth, user => {
    currentUser = user;

    console.log(
        "Firebase auth state:",
        user ? (user.isAnonymous ? "Anonymous" : "Member") : "Signed out"
    );

    if (user && !user.isAnonymous) {
        showSignedInMember(user);
    }
});


// =========================================================
// CHAT NAME HELPERS
// =========================================================

function getSavedName() {
    return localStorage.getItem(NAME_STORAGE_KEY) || "";
}

function saveName(name) {
    localStorage.setItem(NAME_STORAGE_KEY, name);
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

    if (savedName && anonymousNameInput) {
        anonymousNameInput.value = savedName;
    }
}


// =========================================================
// FIREBASE AUTH FOR PUBLIC CHAT
// =========================================================

async function ensureChatAuth() {
    if (auth.currentUser) {
        currentUser = auth.currentUser;
        return currentUser;
    }

    const result = await signInAnonymously(auth);
    currentUser = result.user;

    return currentUser;
}


// =========================================================
// ENTER PUBLIC CHAT
// =========================================================

async function enterPublicChat() {
    const name = anonymousNameInput.value.trim();
    const validationError = validateName(name);

    if (validationError) {
        chatLoginMessage.textContent = validationError;
        return;
    }

    chatLoginMessage.textContent = "Joining chat...";
    enterChatBtn.disabled = true;

    try {
        const user = await ensureChatAuth();

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
            if (messageInput) messageInput.focus();
        }, 150);

    } catch (error) {
        console.error("Could not enter chat:", error);

        chatLoginMessage.textContent =
            "Unable to enter the chat. Please try again.";
    } finally {
        enterChatBtn.disabled = false;
    }
}

if (enterChatBtn) {
    enterChatBtn.addEventListener("click", enterPublicChat);
}

if (anonymousNameInput) {
    anonymousNameInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            enterPublicChat();
        }
    });
}


// =========================================================
// PUBLIC CHAT — REAL-TIME LISTENER
// =========================================================

function startMessageListener() {
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    const messagesRef = collection(db, "publicChatMessages");
    const messagesQuery = query(
        messagesRef,
        orderBy("timestamp", "asc")
    );

    unsubscribeMessages = onSnapshot(
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
            console.error("Chat listener error:", error);

            chatMessages.textContent =
                "Unable to load messages right now.";
        }
    );
}


// =========================================================
// FORMAT TIME
// =========================================================

function formatMessageTime(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}


// =========================================================
// RENDER MESSAGE
// =========================================================

function renderMessage(message) {
    if (!chatMessages) return;

    const isMine =
        currentUser && message.uid === currentUser.uid;

    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${isMine ? "mine" : "other"}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    const userElement = document.createElement("div");
    userElement.className = "message-user";
    userElement.textContent = message.user || "Anonymous";

    bubble.appendChild(userElement);

    if (message.replyTo) {
        const replyBox = document.createElement("div");

        replyBox.style.marginBottom = "8px";
        replyBox.style.padding = "7px 9px";
        replyBox.style.borderLeft = "3px solid currentColor";
        replyBox.style.borderRadius = "6px";
        replyBox.style.opacity = "0.8";
        replyBox.style.fontSize = "11px";

        const replyUser = document.createElement("strong");
        replyUser.textContent = message.replyTo.user || "Anonymous";

        const replyText = document.createElement("div");
        replyText.textContent = message.replyTo.text || "";

        replyBox.append(replyUser, replyText);
        bubble.appendChild(replyBox);
    }

    const textElement = document.createElement("div");
    textElement.className = "message-text";
    textElement.textContent = message.text || "";

    bubble.appendChild(textElement);

    const timeElement = document.createElement("span");
    timeElement.className = "message-time";
    timeElement.textContent = formatMessageTime(message.timestamp);

    bubble.appendChild(timeElement);

    const replyButton = document.createElement("button");
    replyButton.type = "button";
    replyButton.className = "reply-message-button";
    replyButton.textContent = "Reply";

    replyButton.addEventListener("click", () => {
        selectMessageForReply(message);
    });

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

    replyPreviewUser.textContent =
        `Replying to ${selectedReply.user}`;

    replyPreviewText.textContent = selectedReply.text;
    replyPreview.style.display = "flex";
    messageInput.focus();
}


// =========================================================
// CANCEL REPLY
// =========================================================

function cancelReply() {
    selectedReply = null;

    if (replyPreview) replyPreview.style.display = "none";
    if (replyPreviewUser) replyPreviewUser.textContent = "";
    if (replyPreviewText) replyPreviewText.textContent = "";
}

if (cancelReplyBtn) {
    cancelReplyBtn.addEventListener("click", cancelReply);
}


// =========================================================
// SEND MESSAGE
// =========================================================

async function sendMessage(event) {
    event.preventDefault();

    const text = messageInput.value.trim();

    if (!text) return;

    if (text.length > 500) {
        alert("Your message is too long.");
        return;
    }

    try {
        const user = await ensureChatAuth();

        if (!currentAnonymousName) {
            currentAnonymousName = getSavedName();
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

        if (selectedReply) {
            messageData.replyTo = {
                id: selectedReply.id,
                user: selectedReply.user,
                text: selectedReply.text
            };
        }

        await addDoc(
            collection(db, "publicChatMessages"),
            messageData
        );

        messageInput.value = "";
        cancelReply();
        messageInput.focus();

    } catch (error) {
        console.error("Could not send message:", error);

        alert("Your message could not be sent. Please try again.");
    } finally {
        sendMessageBtn.disabled = false;
    }
}

if (chatForm) {
    chatForm.addEventListener("submit", sendMessage);
}


// =========================================================
// CHANGE CHAT NAME
// =========================================================

function changeName() {
    const newName = prompt(
        "Enter the name you want to use in the chat:",
        currentAnonymousName || getSavedName()
    );

    if (newName === null) return;

    const cleanedName = newName.trim();
    const validationError = validateName(cleanedName);

    if (validationError) {
        alert(validationError);
        return;
    }

    currentAnonymousName = cleanedName;
    saveName(cleanedName);

    if (currentUserName) {
        currentUserName.textContent = cleanedName;
    }

    if (anonymousNameInput) {
        anonymousNameInput.value = cleanedName;
    }
}

if (changeNameBtn) {
    changeNameBtn.addEventListener("click", changeName);
}

if (changeNameBottomBtn) {
    changeNameBottomBtn.addEventListener("click", changeName);
}


// =========================================================
// EMOJI BUTTON
// =========================================================

if (emojiBtn) {
    emojiBtn.addEventListener("click", () => {
        const emojis = [
            "😊", "🙏", "❤️", "😂", "🙌", "✝️",
            "🔥", "😅", "👏", "💯", "🕊️", "😢"
        ];

        const randomEmoji =
            emojis[Math.floor(Math.random() * emojis.length)];

        messageInput.value += randomEmoji;
        messageInput.focus();
    });
}


// =========================================================
// MOBILE SWIPE-TO-REPLY
// =========================================================

let touchStartX = 0;
let touchStartY = 0;

if (chatMessages) {
    chatMessages.addEventListener("touchstart", event => {
        const touch = event.touches[0];

        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: true });

    chatMessages.addEventListener("touchend", event => {
        const touch = event.changedTouches[0];

        const distanceX = touch.clientX - touchStartX;
        const distanceY = touch.clientY - touchStartY;

        if (
            Math.abs(distanceX) > 70 &&
            Math.abs(distanceX) > Math.abs(distanceY)
        ) {
            const bubble = event.target.closest(".message-bubble");
            if (!bubble) return;

            const replyButton =
                bubble.querySelector(".reply-message-button");

            if (replyButton) {
                replyButton.click();
            }
        }
    }, { passive: true });
}


// =========================================================
// SCROLL CHAT
// =========================================================

function scrollChatToBottom() {
    if (!chatMessages) return;

    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
}


// =========================================================
// ENTER KEY SENDS CHAT MESSAGE
// =========================================================

if (messageInput) {
    messageInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            if (chatForm) {
                chatForm.requestSubmit();
            }
        }
    });
}


// =========================================================
// INITIALIZE
// =========================================================

prepareChat();
loadInitialSection();
startGroupCountListener();

console.log("St. Monica LK3C Bible Study initialized.");
