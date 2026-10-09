
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    limit,
    serverTimestamp,
    writeBatch
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =========================================================
// GROUPS
// =========================================================

const GROUPS = {
    "charles-lwanga": {
        name: "St. Charles Lwanga",
        countId: "count-charles-lwanga"
    },
    "st-williams": {
        name: "St. Williams",
        countId: "count-st-williams"
    },
    "st-camillas": {
        name: "St. Camillas",
        countId: "count-st-camillas"
    },
    "mathias-mulumba": {
        name: "St. Mathias Mulumba",
        countId: "count-mathias-mulumba"
    },
    "st-vincent": {
        name: "St. Vincent",
        countId: "count-st-vincent"
    }
};

// =========================================================
// DOM ELEMENTS
// =========================================================

const membershipForm = document.getElementById("membership-form");
const membershipForms = document.getElementById("membership-forms");
const membershipStatus = document.getElementById("membership-status");
const membershipMessage = document.getElementById("membership-message");
const membershipSubmit = document.getElementById("membership-submit");

const loginForm = document.getElementById("membership-login-form");
const loginMessage = document.getElementById("membership-login-message");
const loginSubmit = document.getElementById("membership-login-submit");

const fullNameInput = document.getElementById("member-full-name");
const phoneInput = document.getElementById("member-phone");
const passwordInput = document.getElementById("member-password");
const groupInput = document.getElementById("member-group");

const loginPhoneInput = document.getElementById("login-member-phone");
const loginPasswordInput = document.getElementById("login-member-password");

const chatLogin = document.getElementById("chat-login");
const anonymousNameInput = document.getElementById("anonymous-name");
const enterChatButton = document.getElementById("enter-chat-btn");
const chatLoginMessage = document.getElementById("chat-login-message");

const chatRoom = document.getElementById("chat-room");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const currentUserName = document.getElementById("current-user-name");

const replyPreview = document.getElementById("reply-preview");
const replyPreviewUser = document.getElementById("reply-preview-user");
const replyPreviewText = document.getElementById("reply-preview-text");
const cancelReplyButton = document.getElementById("cancel-reply-btn");

const emojiButton = document.getElementById("emoji-btn");
const changeNameButton = document.getElementById("change-name-btn");
const changeNameBottomButton = document.getElementById("change-name-bottom-btn");

// =========================================================
// APPLICATION STATE
// =========================================================

let currentUser = null;
let currentMember = null;

let unsubscribeChat = null;
let unsubscribeGroupCounts = null;

let replyToMessage = null;
let registrationInProgress = false;
let authCheckInProgress = false;
let profileLoadVersion = 0;

// =========================================================
// GENERAL HELPERS
// =========================================================

function showMessage(element, message, type = "info") {
    if (!element) return;

    element.textContent = message;
    element.dataset.type = type;
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
    if (!button) return;

    if (loading) {
        if (!button.disabled) {
            button.dataset.originalText = button.textContent;
        }

        button.disabled = true;
        button.textContent = loadingText;
    } else {
        button.disabled = false;

        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

function normalizePhoneNumber(value) {
    let digits = String(value || "").replace(/\D/g, "");

    if (digits.startsWith("0")) {
        digits = "254" + digits.substring(1);
    } else if (digits.startsWith("7") || digits.startsWith("1")) {
        digits = "254" + digits;
    }

    return /^254[17]\d{8}$/.test(digits) ? digits : null;
}

function phoneToEmail(phoneDigits) {
    return `${phoneDigits}@members.stmonicalk3c.invalid`;
}

function translateAuthError(error) {
    const messages = {
        "auth/email-already-in-use":
            "An account already exists with this phone number. Please sign in.",
        "auth/invalid-email":
            "The phone number or account details are invalid.",
        "auth/weak-password":
            "Use a password containing at least 6 characters.",
        "auth/invalid-credential":
            "Incorrect phone number or password.",
        "auth/user-not-found":
            "No account was found. Please register first.",
        "auth/wrong-password":
            "Incorrect phone number or password.",
        "auth/too-many-requests":
            "Too many attempts. Please wait and try again.",
        "auth/network-request-failed":
            "Network error. Check your internet connection.",
        "auth/operation-not-allowed":
            "Email/password sign-in is not enabled in Firebase."
    };

    return messages[error.code] ||
        error.message ||
        "Something went wrong. Please try again.";
}

function showMembershipScreen() {
    document.body.classList.add("auth-locked");

    if (membershipForms) membershipForms.hidden = false;
    if (membershipStatus) membershipStatus.hidden = true;

    showSection("membership");
}

// =========================================================
// PAGE NAVIGATION
// =========================================================

function showSection(sectionId) {
    const requestedSection = document.getElementById(sectionId);

    if (!requestedSection) {
        sectionId = "home";
    }

    if (!currentUser || currentUser.isAnonymous || !currentMember) {
        sectionId = "membership";
    }

    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.remove("active-section");
    });

    const activeSection = document.getElementById(sectionId);

    if (activeSection) {
        activeSection.classList.add("active-section");
    }

    if (currentUser && !currentUser.isAnonymous && currentMember) {
        document.body.classList.remove("auth-locked");
    } else {
        document.body.classList.add("auth-locked");
    }

    if (window.location.hash !== `#${sectionId}`) {
        history.replaceState(null, "", `#${sectionId}`);
    }

    if (sectionId === "public-chat") {
        prepareChat();
    }
}
window.showSection = showSection;

// The HTML has inline onclick handlers.
// These listeners support navigation links without inline handlers too.
document.querySelectorAll("[data-section]").forEach(element => {
    element.addEventListener("click", event => {
        event.preventDefault();
        showSection(element.dataset.section);
    });
});

// =========================================================
// REGISTRATION
// =========================================================

async function registerMember(event) {
    event.preventDefault();

    const fullName = fullNameInput?.value.trim() || "";
    const phoneNumber = normalizePhoneNumber(phoneInput?.value);
    const password = passwordInput?.value || "";
    const groupId = groupInput?.value || "";

    if (fullName.length < 2 || fullName.length > 80) {
        showMessage(membershipMessage, "Enter your full name.", "error");
        return;
    }

    if (!phoneNumber) {
        showMessage(
            membershipMessage,
            "Enter a valid Kenyan phone number, e.g. 0712345678.",
            "error"
        );
        return;
    }

    if (password.length < 6) {
        showMessage(
            membershipMessage,
            "Your password must contain at least 6 characters.",
            "error"
        );
        return;
    }

    if (!GROUPS[groupId]) {
        showMessage(
            membershipMessage,
            "Please select a Bible study group.",
            "error"
        );
        return;
    }

    registrationInProgress = true;
    setButtonLoading(membershipSubmit, true, "Creating account...");
    showMessage(membershipMessage, "Creating your account...");

    let createdUser = null;

    try {
        const credential = await createUserWithEmailAndPassword(
            auth,
            phoneToEmail(phoneNumber),
            password
        );

        createdUser = credential.user;
        currentUser = createdUser;

        const batch = writeBatch(db);

        batch.set(doc(db, "members", createdUser.uid), {
            fullName,
            phoneNumber,
            groupId,
            createdAt: serverTimestamp()
        });

        batch.set(doc(db, "groupMemberships", createdUser.uid), {
            groupId,
            joinedAt: serverTimestamp()
        });

        await batch.commit();

        currentMember = {
            fullName,
            phoneNumber,
            groupId
        };

        if (passwordInput) passwordInput.value = "";

        showMessage(
            membershipMessage,
            "Registration successful! Welcome to St. Monica LK3C.",
            "success"
        );

        await displayMemberScreen(createdUser, currentMember);
    } catch (error) {
        console.error("Registration error:", error);

        showMessage(
            membershipMessage,
            translateAuthError(error),
            "error"
        );

        // If account creation succeeded but saving the profile failed,
        // do not leave the new account signed in without a usable profile.
        if (createdUser && currentUser?.uid === createdUser.uid) {
            try {
                await signOut(auth);
            } catch (signOutError) {
                console.error("Cleanup sign-out error:", signOutError);
            }
        }
    } finally {
        registrationInProgress = false;
        setButtonLoading(membershipSubmit, false);
    }
}

membershipForm?.addEventListener("submit", registerMember);

// =========================================================
// MEMBER LOGIN
// =========================================================

async function loginMember(event) {
    event.preventDefault();

    const phoneNumber = normalizePhoneNumber(loginPhoneInput?.value);
    const password = loginPasswordInput?.value || "";

    if (!phoneNumber) {
        showMessage(
            loginMessage,
            "Enter the Kenyan phone number you used to register.",
            "error"
        );
        return;
    }

    if (!password) {
        showMessage(loginMessage, "Enter your password.", "error");
        return;
    }

    setButtonLoading(loginSubmit, true, "Signing in...");
    showMessage(loginMessage, "Checking your account...");

    try {
        const credential = await signInWithEmailAndPassword(
            auth,
            phoneToEmail(phoneNumber),
            password
        );

        const profileSnapshot = await getDoc(
            doc(db, "members", credential.user.uid)
        );

        if (!profileSnapshot.exists()) {
            showMessage(
                loginMessage,
                "Your member profile could not be found. Please contact the Bible study leadership.",
                "error"
            );

            await signOut(auth);
            return;
        }

        currentUser = credential.user;
        currentMember = profileSnapshot.data();

        if (loginPasswordInput) loginPasswordInput.value = "";

        showMessage(loginMessage, "Login successful!", "success");

        await displayMemberScreen(currentUser, currentMember);
    } catch (error) {
        console.error("Login error:", error);

        showMessage(loginMessage, translateAuthError(error), "error");
    } finally {
        setButtonLoading(loginSubmit, false);
    }
}

loginForm?.addEventListener("submit", loginMember);

// =========================================================
// SIGNED-IN MEMBER SCREEN
// =========================================================

async function displayMemberScreen(user, member) {
    if (!user || user.isAnonymous || !member) return;

    currentUser = user;
    currentMember = member;

    if (membershipStatus) {
        membershipStatus.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = `Welcome, ${member.fullName || "Member"}!`;

        const groupText = document.createElement("p");
        const group = GROUPS[member.groupId];

        groupText.textContent = group
            ? `Your Bible study group: ${group.name}`
            : "Your membership is active.";

        const signOutButton = document.createElement("button");
        signOutButton.type = "button";
        signOutButton.className = "membership-submit";
        signOutButton.textContent = "Sign Out";

        signOutButton.addEventListener("click", async () => {
            setButtonLoading(signOutButton, true, "Signing out...");

            try {
                await signOut(auth);
            } catch (error) {
                console.error("Sign-out error:", error);
                alert("Unable to sign out. Please try again.");
                setButtonLoading(signOutButton, false);
            }
        });

        membershipStatus.append(heading, groupText, signOutButton);
        membershipStatus.hidden = false;
    }

    if (membershipForms) membershipForms.hidden = true;

    document.body.classList.remove("auth-locked");

    showSection("home");
}

// =========================================================
// AUTHENTICATION STATE
// =========================================================

onAuthStateChanged(auth, async user => {
    currentUser = user;
    const thisCheck = ++profileLoadVersion;

    if (!user || user.isAnonymous) {
        currentMember = null;
        authCheckInProgress = false;

        if (unsubscribeChat) {
            unsubscribeChat();
            unsubscribeChat = null;
        }

        if (chatRoom) chatRoom.style.display = "none";
        if (chatLogin) chatLogin.style.display = "";

        showMembershipScreen();
        return;
    }

    // Registration creates the Auth account before writing its profile.
    // Let the registration function finish rather than signing out too early.
    if (registrationInProgress) {
        return;
    }

    authCheckInProgress = true;

    try {
        const profileSnapshot = await getDoc(
            doc(db, "members", user.uid)
        );

        if (thisCheck !== profileLoadVersion) return;

        if (!profileSnapshot.exists()) {
            currentMember = null;
            await signOut(auth);
            return;
        }

        currentMember = profileSnapshot.data();
        await displayMemberScreen(user, currentMember);
    } catch (error) {
        console.error("Member verification error:", error);

        if (thisCheck === profileLoadVersion) {
            currentMember = null;
            showMembershipScreen();
            showMessage(
                membershipMessage,
                "We could not verify your membership. Check your connection and try again.",
                "error"
            );
        }
    } finally {
        if (thisCheck === profileLoadVersion) {
            authCheckInProgress = false;
        }
    }
});

// =========================================================
// LIVE GROUP COUNTS
// =========================================================

function startGroupCountListener() {
    if (unsubscribeGroupCounts) unsubscribeGroupCounts();

    unsubscribeGroupCounts = onSnapshot(
        collection(db, "groupMemberships"),
        snapshot => {
            const counts = {};

            Object.keys(GROUPS).forEach(groupId => {
                counts[groupId] = 0;
            });

            snapshot.forEach(memberDoc => {
                const groupId = memberDoc.data().groupId;

                if (Object.prototype.hasOwnProperty.call(counts, groupId)) {
                    counts[groupId]++;
                }
            });

            Object.entries(GROUPS).forEach(([groupId, group]) => {
                const element = document.getElementById(group.countId);

                if (element) {
                    element.textContent = `Members: ${counts[groupId]}`;
                }
            });
        },
        error => {
            console.error("Group count error:", error);
        }
    );
}

startGroupCountListener();

// =========================================================
// PUBLIC CHAT — MATCHES THE CURRENT HTML
// =========================================================

function getChatName() {
    try {
        return localStorage.getItem("stMonicaChatName") || "";
    } catch {
        return "";
    }
}

function saveChatName(name) {
    try {
        localStorage.setItem("stMonicaChatName", name);
    } catch (error) {
        console.error("Could not save chat name:", error);
    }
}

function prepareChat() {
    // This website uses login-first access, so members must sign in first.
    if (!currentUser || currentUser.isAnonymous || !currentMember) {
        if (chatLogin) chatLogin.style.display = "";
        if (chatRoom) chatRoom.style.display = "none";
        return;
    }

    const savedName = getChatName();

    if (!savedName) {
        if (chatLogin) chatLogin.style.display = "";
        if (chatRoom) chatRoom.style.display = "none";
        return;
    }

    if (anonymousNameInput) anonymousNameInput.value = savedName;

    if (chatLogin) chatLogin.style.display = "none";
    if (chatRoom) chatRoom.style.display = "";

    if (currentUserName) currentUserName.textContent = savedName;

    listenForChatMessages();
}

enterChatButton?.addEventListener("click", () => {
    if (!currentUser || currentUser.isAnonymous || !currentMember) {
        showMessage(
            chatLoginMessage,
            "Please sign in to your St. Monica account first.",
            "error"
        );
        showSection("membership");
        return;
    }

    const name = anonymousNameInput?.value.trim() || "";

    if (name.length < 2 || name.length > 25) {
        showMessage(
            chatLoginMessage,
            "Enter a chat name between 2 and 25 characters.",
            "error"
        );
        return;
    }

    saveChatName(name);

    if (currentUserName) currentUserName.textContent = name;

    showMessage(chatLoginMessage, "");
    prepareChat();
});

// =========================================================
// LOAD CHAT MESSAGES
// =========================================================

function listenForChatMessages() {
    if (!chatMessages || !currentUser || currentUser.isAnonymous) return;

    if (unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }

    const messagesQuery = query(
        collection(db, "publicChatMessages"),
        orderBy("timestamp", "asc"),
        limit(100)
    );

    unsubscribeChat = onSnapshot(
        messagesQuery,
        snapshot => {
            chatMessages.replaceChildren();

            snapshot.forEach(messageDoc => {
                renderChatMessage(messageDoc.id, messageDoc.data());
            });

            chatMessages.scrollTop = chatMessages.scrollHeight;
        },
        error => {
            console.error("Chat listener error:", error);
            showMessage(
                chatLoginMessage,
                "Unable to load chat messages. Check your Firestore rules and connection.",
                "error"
            );
        }
    );
}

// =========================================================
// RENDER A CHAT MESSAGE
// =========================================================

function renderChatMessage(messageId, message) {
    if (!chatMessages) return;

    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    wrapper.dataset.messageId = messageId;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (message.replyText) {
        const quoted = document.createElement("div");
        quoted.className = "reply-preview";

        const quotedUser = document.createElement("strong");
        quotedUser.textContent = message.replyUser || "Member";

        const quotedText = document.createElement("p");
        quotedText.textContent = message.replyText;

        quoted.append(quotedUser, quotedText);
        bubble.appendChild(quoted);
    }

    const name = document.createElement("strong");
    name.className = "message-user";
    name.textContent = message.user || "Member";

    const text = document.createElement("p");
    text.className = "message-text";
    text.textContent = message.text || "";

    const time = document.createElement("span");
    time.className = "message-time";

    if (typeof message.timestamp === "number") {
        time.textContent = new Date(message.timestamp).toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
        );
    } else if (message.timestamp?.toDate) {
        time.textContent = message.timestamp.toDate().toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
        );
    }

    bubble.append(name, text, time);
    wrapper.appendChild(bubble);

    const replyButton = document.createElement("button");
    replyButton.type = "button";
    replyButton.className = "reply-message-button";
    replyButton.textContent = "Reply";

    replyButton.addEventListener("click", () => {
        replyToMessage = {
            id: messageId,
            user: message.user || "Member",
            text: message.text || ""
        };

        if (replyPreview) replyPreview.style.display = "flex";
        if (replyPreviewUser) {
            replyPreviewUser.textContent = replyToMessage.user;
        }
        if (replyPreviewText) {
            replyPreviewText.textContent = replyToMessage.text;
        }

        messageInput?.focus();
    });

    wrapper.appendChild(replyButton);
    chatMessages.appendChild(wrapper);
}

// =========================================================
// REPLY PREVIEW
// =========================================================

function clearReply() {
    replyToMessage = null;

    if (replyPreview) replyPreview.style.display = "none";
    if (replyPreviewUser) replyPreviewUser.textContent = "";
    if (replyPreviewText) replyPreviewText.textContent = "";
}

cancelReplyButton?.addEventListener("click", clearReply);

// =========================================================
// CHANGE CHAT NAME
// =========================================================

function changeChatName() {
    const currentName = getChatName();

    const newName = prompt(
        "Choose your chat display name:",
        currentName
    );

    if (newName === null) return;

    const trimmedName = newName.trim();

    if (trimmedName.length < 2 || trimmedName.length > 25) {
        alert("Your name must contain between 2 and 25 characters.");
        return;
    }

    saveChatName(trimmedName);

    if (currentUserName) currentUserName.textContent = trimmedName;
    if (anonymousNameInput) anonymousNameInput.value = trimmedName;
}

changeNameButton?.addEventListener("click", changeChatName);
changeNameBottomButton?.addEventListener("click", changeChatName);

// =========================================================
// EMOJI BUTTON
// =========================================================

emojiButton?.addEventListener("click", () => {
    const emojiChoices = [
        "🙏", "❤️", "😊", "😂", "👍",
        "🕊️", "✝️", "🙌", "✨", "💯"
    ];

    const choice = prompt(
        `Choose an emoji by entering its number:\n\n${emojiChoices
            .map((emoji, index) => `${index + 1}. ${emoji}`)
            .join("\n")}`
    );

    if (choice === null) return;

    const index = Number.parseInt(choice, 10) - 1;

    if (index < 0 || index >= emojiChoices.length || !Number.isInteger(index)) {
        alert("Choose a number from 1 to 10.");
        return;
    }

    if (messageInput) {
        messageInput.value += emojiChoices[index];
        messageInput.focus();
    }
});

// =========================================================
// SEND CHAT MESSAGE
// =========================================================

chatForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser || currentUser.isAnonymous || !currentMember) {
        alert("Please sign in before sending a message.");
        showSection("membership");
        return;
    }

    const text = messageInput?.value.trim() || "";

    if (!text) return;

    if (text.length > 500) {
        alert("Messages cannot exceed 500 characters.");
        return;
    }

    const user = getChatName() || currentMember.fullName || "St. Monica Member";

    const sendButton = document.getElementById("send-message-btn");
    setButtonLoading(sendButton, true, "Sending...");

    try {
        const messageData = {
            user,
            text,
            timestamp: Date.now()
        };

        if (replyToMessage) {
            messageData.replyTo = replyToMessage.id;
            messageData.replyUser = replyToMessage.user;
            messageData.replyText = replyToMessage.text;
        }

        await addDoc(
            collection(db, "publicChatMessages"),
            messageData
        );

        if (messageInput) messageInput.value = "";
        clearReply();
    } catch (error) {
        console.error("Could not send chat message:", error);

        alert(
            "Your message could not be sent. Check your connection and Firestore rules."
        );
    } finally {
        setButtonLoading(sendButton, false);
    }
});

// =========================================================
// INITIAL PAGE
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    if (!currentUser || currentUser.isAnonymous || !currentMember) {
        document.body.classList.add("auth-locked");
    }
});
