
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
// HTML ELEMENTS
// =========================================================

const membershipChoice = document.getElementById("membership-choice");
const showRegisterButton = document.getElementById("show-register-btn");
const showLoginButton = document.getElementById("show-login-btn");

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
const sendMessageButton = document.getElementById("send-message-btn");
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
            "An account already exists with this phone number. Please log in.",
        "auth/invalid-email":
            "The account details are invalid.",
        "auth/weak-password":
            "Your password must contain at least 6 characters.",
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
        "Something went wrong. Please check your connection and try again.";
}

function hideElement(element) {
    if (element) element.hidden = true;
}

function showElement(element) {
    if (element) element.hidden = false;
}

// =========================================================
// MEMBERSHIP WELCOME SCREEN
// =========================================================

function showMembershipChoice() {
    showElement(membershipChoice);
    hideElement(membershipForms);
    hideElement(membershipStatus);

    if (membershipForm) membershipForm.hidden = true;
    if (loginForm) loginForm.hidden = true;

    showMessage(membershipMessage, "");
    showMessage(loginMessage, "");
}

function showRegistrationForm() {
    hideElement(membershipChoice);
    showElement(membershipForms);

    if (membershipForm) membershipForm.hidden = false;
    if (loginForm) loginForm.hidden = true;

    hideElement(membershipStatus);
    showMessage(membershipMessage, "");
}

function showLoginForm() {
    hideElement(membershipChoice);
    showElement(membershipForms);

    if (membershipForm) membershipForm.hidden = true;
    if (loginForm) loginForm.hidden = false;

    hideElement(membershipStatus);
    showMessage(loginMessage, "");
}

showRegisterButton?.addEventListener("click", showRegistrationForm);
showLoginButton?.addEventListener("click", showLoginForm);

document.querySelectorAll(".back-to-choice").forEach(button => {
    button.addEventListener("click", showMembershipChoice);
});

// =========================================================
// PAGE NAVIGATION
// =========================================================

function showSection(sectionId) {
    if (!document.getElementById(sectionId)) {
        sectionId = "home";
    }

    const authenticated =
        currentUser &&
        !currentUser.isAnonymous &&
        currentMember;

    if (!authenticated) {
        sectionId = "membership";
    }

    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.remove("active-section");
    });

    const section = document.getElementById(sectionId);

    if (section) {
        section.classList.add("active-section");
    }

    if (authenticated) {
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

// Make showSection available to HTML onclick attributes.
window.showSection = showSection;

// Support navigation elements that use data-section.
document.querySelectorAll("[data-section]").forEach(element => {
    element.addEventListener("click", event => {
        event.preventDefault();
        showSection(element.dataset.section);
    });
});

function showMembershipScreen() {
    document.body.classList.add("auth-locked");

    showMembershipChoice();

    if (membershipStatus) {
        membershipStatus.replaceChildren();
        hideElement(membershipStatus);
    }

    showSection("membership");
}

// =========================================================
// REGISTER A MEMBER
// =========================================================

async function registerMember(event) {
    event.preventDefault();

    const fullName = fullNameInput?.value.trim() || "";
    const phoneNumber = normalizePhoneNumber(phoneInput?.value);
    const password = passwordInput?.value || "";
    const groupId = groupInput?.value || "";

    if (fullName.length < 2 || fullName.length > 80) {
        showMessage(
            membershipMessage,
            "Enter your full name.",
            "error"
        );
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

        // If Auth succeeded but the profile failed to save,
        // sign out so the incomplete account does not unlock the site.
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
// LOG IN A MEMBER
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

        await displayMemberScreen(currentUser, currentMember);
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
        showElement(membershipStatus);
    }

    hideElement(membershipChoice);
    hideElement(membershipForms);

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

        if (unsubscribeChat) {
            unsubscribeChat();
            unsubscribeChat = null;
        }

        if (chatRoom) chatRoom.style.display = "none";
        if (chatLogin) chatLogin.style.display = "";

        showMembershipScreen();
        return;
    }

    // Registration saves the member profile immediately after
    // Firebase Authentication creates the account.
    if (registrationInProgress) return;

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
    }
});

// =========================================================
// LIVE GROUP MEMBERSHIP COUNTS
// =========================================================

function startGroupCountListener() {
    if (unsubscribeGroupCounts) {
        unsubscribeGroupCounts();
    }

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
// PUBLIC CHAT HELPERS
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
    if (!currentUser || currentUser.isAnonymous || !currentMember) {
        if (chatLogin) chatLogin.style.display = "";
        if (chatRoom) chatRoom.style.display = "none";
        return;
    }

    const savedName = getChatName();

    if (!savedName) {
        if (chatLogin) chatLogin.style.display = "";
        if (chatRoom) chatRoom.style.display = "none";

        if (anonymousNameInput && currentMember.fullName) {
            anonymousNameInput.value = currentMember.fullName;
        }

        return;
    }

    if (anonymousNameInput) {
        anonymousNameInput.value = savedName;
    }

    if (chatLogin) chatLogin.style.display = "none";
    if (chatRoom) chatRoom.style.display = "";

    if (currentUserName) {
        currentUserName.textContent = savedName;
    }

    listenForChatMessages();
}

// =========================================================
// ENTER PUBLIC CHAT
// =========================================================

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

    if (currentUserName) {
        currentUserName.textContent = name;
    }

    showMessage(chatLoginMessage, "");
    prepareChat();
});

// =========================================================
// LISTEN FOR CHAT MESSAGES
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
// DISPLAY A CHAT MESSAGE
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

        if (messageInput) messageInput.focus();
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
// CHANGE CHAT DISPLAY NAME
// =========================================================

function changeChatName() {
    const currentName = getChatName();

    const newName = prompt(
        "Choose your chat display name:",
        currentName || currentMember?.fullName || ""
    );

    if (newName === null) return;

    const trimmedName = newName.trim();

    if (trimmedName.length < 2 || trimmedName.length > 25) {
        alert("Your name must contain between 2 and 25 characters.");
        return;
    }

    saveChatName(trimmedName);

    if (currentUserName) {
        currentUserName.textContent = trimmedName;
    }

    if (anonymousNameInput) {
        anonymousNameInput.value = trimmedName;
    }
}

changeNameButton?.addEventListener("click", changeChatName);
changeNameBottomButton?.addEventListener("click", changeChatName);

// =========================================================
// EMOJI BUTTON
// =========================================================

emojiButton?.addEventListener("click", () => {
    const emojis = [
        "🙏", "❤️", "😊", "😂", "👍",
        "🕊️", "✝️", "🙌", "✨", "💯"
    ];

    const choice = prompt(
        "Choose an emoji by entering its number:\n\n" +
        emojis.map((emoji, index) => `${index + 1}. ${emoji}`).join("\n")
    );

    if (choice === null) return;

    const index = Number.parseInt(choice, 10) - 1;

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= emojis.length
    ) {
        alert("Choose a number from 1 to 10.");
        return;
    }

    if (messageInput) {
        messageInput.value += emojis[index];
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

    const user =
        getChatName() ||
        currentMember.fullName ||
        "St. Monica Member";

    setButtonLoading(sendMessageButton, true, "Sending...");

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

        if (messageInput) {
            messageInput.value = "";
        }

        clearReply();
    } catch (error) {
        console.error("Could not send chat message:", error);

        alert(
            "Your message could not be sent. Check your connection and Firestore rules."
        );
    } finally {
        setButtonLoading(sendMessageButton, false);
    }
});

// =========================================================
// INITIAL PAGE SETUP
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    if (!currentUser || currentUser.isAnonymous || !currentMember) {
        document.body.classList.add("auth-locked");
        showMembershipChoice();
    }
});

// Also initialize the membership screen if this module loads
// after the page's DOM is already available.
if (document.readyState !== "loading") {
    if (!currentUser || currentUser.isAnonymous || !currentMember) {
        document.body.classList.add("auth-locked");
        showMembershipChoice();
    }
}
