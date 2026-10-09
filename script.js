
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

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
    setDoc,
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
// BIBLE STUDY GROUPS
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
// ELEMENTS
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

let currentUser = null;
let unsubscribeChat = null;
let unsubscribeGroupCounts = null;
let replyToMessage = null;

// =========================================================
// GENERAL HELPERS
// =========================================================

function showMessage(element, message, type = "info") {
    if (!element) return;

    element.textContent = message;
    element.dataset.type = type;
    element.setAttribute("role", "status");
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
    if (!button) return;

    if (loading) {
        button.dataset.originalText = button.textContent;
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

    if (!/^254[17]\d{8}$/.test(digits)) {
        return null;
    }

    return digits;
}

function phoneToEmail(phoneDigits) {
    return `${phoneDigits}@members.stmonicalk3c.invalid`;
}

function translateAuthError(error) {
    const messages = {
        "auth/email-already-in-use":
            "An account already exists with this phone number. Please log in.",
        "auth/invalid-email":
            "The phone number or account details are invalid.",
        "auth/weak-password":
            "Your password is too weak. Use at least 6 characters.",
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
            "Email/password login is not enabled in Firebase."
    };

    return messages[error.code] ||
        error.message ||
        "Something went wrong. Please try again.";
}

// =========================================================
// PAGE NAVIGATION
// =========================================================

function showSection(sectionId) {
    // Do not allow signed-out visitors to access other sections.
    if (!currentUser || currentUser.isAnonymous) {
        sectionId = "membership";
    }

    const target = document.getElementById(sectionId);

    if (!target) {
        sectionId = "home";
    }

    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.remove("active-section");
    });

    const activeSection = document.getElementById(sectionId);

    if (activeSection) {
        activeSection.classList.add("active-section");
    }

    if (currentUser && !currentUser.isAnonymous) {
        document.body.classList.remove("auth-locked");
    } else {
        document.body.classList.add("auth-locked");
        sectionId = "membership";
    }

    if (window.location.hash !== `#${sectionId}`) {
        history.replaceState(null, "", `#${sectionId}`);
    }

    if (sectionId === "public-chat" && currentUser && !currentUser.isAnonymous) {
        prepareChat();
    }
}

document.querySelectorAll("[data-section]").forEach(element => {
    element.addEventListener("click", event => {
        event.preventDefault();
        showSection(element.dataset.section);
    });
});

// Support navigation links that use href="#section-id".
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
        const sectionId = link.getAttribute("href").slice(1);

        if (document.getElementById(sectionId)) {
            event.preventDefault();
            showSection(sectionId);
        }
    });
});

// =========================================================
// MEMBERSHIP REGISTRATION
// =========================================================

async function registerMember(event) {
    event.preventDefault();

    if (!fullNameInput || !phoneInput || !passwordInput || !groupInput) {
        showMessage(
            membershipMessage,
            "The registration form is missing a required field.",
            "error"
        );
        return;
    }

    const fullName = fullNameInput.value.trim();
    const phoneNumber = normalizePhoneNumber(phoneInput.value);
    const password = passwordInput.value;
    const groupId = groupInput.value;

    if (fullName.length < 2) {
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
            "Please select a valid Bible study group.",
            "error"
        );
        return;
    }

    setButtonLoading(membershipSubmit, true, "Creating account...");
    showMessage(membershipMessage, "Creating your account...");

    try {
        const credential = await createUserWithEmailAndPassword(
            auth,
            phoneToEmail(phoneNumber),
            password
        );

        const user = credential.user;

        const batch = writeBatch(db);

        batch.set(doc(db, "members", user.uid), {
            fullName,
            phoneNumber,
            groupId,
            createdAt: serverTimestamp()
        });

        batch.set(doc(db, "groupMemberships", user.uid), {
            groupId,
            joinedAt: serverTimestamp()
        });

        await batch.commit();

        passwordInput.value = "";

        showMessage(
            membershipMessage,
            "Registration successful! Welcome to St. Monica LK3C.",
            "success"
        );

        await showSignedInMember(user);

    } catch (error) {
        console.error("Registration error:", error);

        showMessage(
            membershipMessage,
            translateAuthError(error),
            "error"
        );
    } finally {
        setButtonLoading(membershipSubmit, false);
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

    const phoneNumber = normalizePhoneNumber(
        loginPhoneInput ? loginPhoneInput.value : ""
    );

    const password = loginPasswordInput
        ? loginPasswordInput.value
        : "";

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

    setButtonLoading(loginSubmit, true, "Logging in...");
    showMessage(loginMessage, "Checking your account...");

    try {
        const credential = await signInWithEmailAndPassword(
            auth,
            phoneToEmail(phoneNumber),
            password
        );

        const profile = await getDoc(
            doc(db, "members", credential.user.uid)
        );

        if (!profile.exists()) {
            await signOut(auth);

            showMessage(
                loginMessage,
                "Your member profile could not be found. Please contact the Bible study leadership.",
                "error"
            );

            return;
        }

        if (loginPasswordInput) {
            loginPasswordInput.value = "";
        }

        showMessage(loginMessage, "Login successful!", "success");
        await showSignedInMember(credential.user);

    } catch (error) {
        console.error("Login error:", error);

        showMessage(
            loginMessage,
            translateAuthError(error),
            "error"
        );
    } finally {
        setButtonLoading(loginSubmit, false);
    }
}

if (loginForm) {
    loginForm.addEventListener("submit", loginMember);
}

// =========================================================
// AUTHENTICATED MEMBER SCREEN
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
        greeting.textContent =
            `Welcome, ${member.fullName || "Member"}!`;

        const groupText = document.createElement("p");
        groupText.textContent = group
            ? `Your Bible study group: ${group.name}`
            : "Your membership is active.";

        const logoutButton = document.createElement("button");
        logoutButton.type = "button";
        logoutButton.className = "membership-submit";
        logoutButton.textContent = "Sign Out";

        logoutButton.addEventListener("click", async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Sign out error:", error);
                alert("Unable to sign out. Please try again.");
            }
        });

        membershipStatus.append(greeting, groupText, logoutButton);
        membershipStatus.hidden = false;

        if (membershipForms) {
            membershipForms.hidden = true;
        }

        document.body.classList.remove("auth-locked");
        showSection("home");

    } catch (error) {
        console.error("Could not load member profile:", error);
    }
}

// =========================================================
// AUTH STATE — LOGIN-FIRST WEBSITE
// =========================================================

onAuthStateChanged(auth, async user => {
    currentUser = user;

    if (user && !user.isAnonymous) {
        try {
            const profile = await getDoc(
                doc(db, "members", user.uid)
            );

            if (profile.exists()) {
                await showSignedInMember(user);
                return;
            }

            // An authenticated account without a member profile
            // must not unlock the website.
            await signOut(auth);

        } catch (error) {
            console.error("Could not verify member:", error);
        }
    }

    document.body.classList.add("auth-locked");

    if (membershipForms) {
        membershipForms.hidden = false;
    }

    if (membershipStatus) {
        membershipStatus.hidden = true;
    }

    showSection("membership");
});

// =========================================================
// LIVE BIBLE STUDY GROUP COUNTS
// =========================================================

function startGroupCountListener() {
    if (unsubscribeGroupCounts) {
        unsubscribeGroupCounts();
    }

    const membershipsRef = collection(db, "groupMemberships");

    unsubscribeGroupCounts = onSnapshot(
        membershipsRef,
        snapshot => {
            const counts = {};

            Object.keys(GROUPS).forEach(groupId => {
                counts[groupId] = 0;
            });

            snapshot.forEach(memberDoc => {
                const data = memberDoc.data();

                if (Object.prototype.hasOwnProperty.call(
                    counts,
                    data.groupId
                )) {
                    counts[data.groupId]++;
                }
            });

            Object.entries(GROUPS).forEach(([groupId, group]) => {
                const countElement = document.getElementById(group.countId);

                if (countElement) {
                    countElement.textContent = counts[groupId];
                }
            });
        },
        error => {
            console.error("Group counts error:", error);
        }
    );
}

startGroupCountListener();

// =========================================================
// PUBLIC CHAT
// =========================================================

const chatLogin = document.getElementById("chat-login");
const anonymousNameInput = document.getElementById("anonymous-name");
const enterChatButton = document.getElementById("enter-chat-btn");
const chatRoom = document.getElementById("chat-room");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatNameDisplay = document.getElementById("chat-name-display");
const chatMessageInput = document.getElementById("chat-message");
const chatReplyPreview = document.getElementById("chat-reply-preview");
const cancelReplyButton = document.getElementById("cancel-reply");
const changeNameButton = document.getElementById("change-chat-name");

function getChatName() {
    return localStorage.getItem("stMonicaChatName") || "";
}

function saveChatName(name) {
    localStorage.setItem("stMonicaChatName", name);
}

function prepareChat() {
    if (!currentUser || currentUser.isAnonymous) {
        if (chatLogin) chatLogin.hidden = false;
        if (chatRoom) chatRoom.hidden = true;
        return;
    }

    if (chatLogin) chatLogin.hidden = true;
    if (chatRoom) chatRoom.hidden = false;

    const savedName = getChatName();

    if (chatNameDisplay) {
        chatNameDisplay.textContent = savedName || "St. Monica Member";
    }

    listenForChatMessages();
}

if (enterChatButton) {
    enterChatButton.addEventListener("click", () => {
        if (!currentUser || currentUser.isAnonymous) {
            alert("Please log in to your St. Monica account first.");
            showSection("membership");
            return;
        }

        const name = anonymousNameInput
            ? anonymousNameInput.value.trim()
            : "";

        if (name.length < 2 || name.length > 25) {
            alert("Enter a chat name between 2 and 25 characters.");
            return;
        }

        saveChatName(name);
        prepareChat();
    });
}

function listenForChatMessages() {
    if (!chatMessages || !currentUser || currentUser.isAnonymous) {
        return;
    }

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
                document.getElementById("chat-status"),
                "Unable to load chat messages. Please try again later.",
                "error"
            );
        }
    );
}

function renderChatMessage(messageId, message) {
    if (!chatMessages) return;

    const wrapper = document.createElement("div");
    wrapper.className = "chat-message";
    wrapper.dataset.messageId = messageId;

    const name = document.createElement("strong");
    name.className = "chat-message-user";
    name.textContent = message.user || "Member";

    const text = document.createElement("p");
    text.className = "chat-message-text";
    text.textContent = message.text || "";

    wrapper.append(name, text);

    if (message.replyText) {
        const quoted = document.createElement("blockquote");
        quoted.className = "chat-message-reply";
        quoted.textContent =
            `${message.replyUser || "Member"}: ${message.replyText}`;
        wrapper.insertBefore(quoted, text);
    }

    const replyButton = document.createElement("button");
    replyButton.type = "button";
    replyButton.className = "chat-reply-button";
    replyButton.textContent = "Reply";

    replyButton.addEventListener("click", () => {
        replyToMessage = {
            id: messageId,
            user: message.user || "Member",
            text: message.text || ""
        };

        if (chatReplyPreview) {
            chatReplyPreview.hidden = false;
            chatReplyPreview.textContent =
                `Replying to ${replyToMessage.user}: ${replyToMessage.text}`;
        }

        if (chatMessageInput) {
            chatMessageInput.focus();
        }
    });

    wrapper.append(replyButton);
    chatMessages.appendChild(wrapper);
}

if (cancelReplyButton) {
    cancelReplyButton.addEventListener("click", () => {
        replyToMessage = null;

        if (chatReplyPreview) {
            chatReplyPreview.hidden = true;
            chatReplyPreview.textContent = "";
        }
    });
}

if (changeNameButton) {
    changeNameButton.addEventListener("click", () => {
        const currentName = getChatName();
        const newName = prompt(
            "Choose your chat display name:",
            currentName
        );

        if (newName === null) return;

        const trimmedName = newName.trim();

        if (trimmedName.length < 2 || trimmedName.length > 25) {
            alert("Your name must be between 2 and 25 characters.");
            return;
        }

        saveChatName(trimmedName);

        if (chatNameDisplay) {
            chatNameDisplay.textContent = trimmedName;
        }
    });
}

if (chatForm) {
    chatForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!currentUser || currentUser.isAnonymous) {
            alert("Please log in before sending a message.");
            showSection("membership");
            return;
        }

        const messageInput = chatMessageInput || chatInput;

        if (!messageInput) {
            console.error("Chat message input was not found.");
            return;
        }

        const text = messageInput.value.trim();

        if (!text) return;

        if (text.length > 500) {
            alert("Messages cannot exceed 500 characters.");
            return;
        }

        const user = getChatName() || "St. Monica Member";

        const sendButton = chatForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

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

            messageInput.value = "";
            replyToMessage = null;

            if (chatReplyPreview) {
                chatReplyPreview.hidden = true;
                chatReplyPreview.textContent = "";
            }

        } catch (error) {
            console.error("Could not send chat message:", error);
            alert(
                "Your message could not be sent. Please check your connection and try again."
            );
        } finally {
            setButtonLoading(sendButton, false);
        }
    });
}

// =========================================================
// INITIAL PAGE
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    if (!currentUser || currentUser.isAnonymous) {
        document.body.classList.add("auth-locked");
        showSection("membership");
    }
});
