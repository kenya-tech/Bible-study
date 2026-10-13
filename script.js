```javascript
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

// ======================================================
// 1. FIREBASE CONFIGURATION
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyDAm9gekwQUIeJ51sX9QraOEejHBJc6Xf4",
  authDomain: "bible-study-2440c.firebaseapp.com",
  projectId: "bible-study-2440c",
  storageBucket: "bible-study-2440c.firebasestorage.app",
  messagingSenderId: "856615640461",
  appId: "1:856615640461:web:b792dd2867a71f12a731c4",
  measurementId: "G-D5D1178QMV"
};

const ADMIN_UID = "XI74ZBUYJPY9mUNNRRta37euib92";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ======================================================
// 2. BIBLE STUDY GROUPS
// ======================================================

const GROUPS = {
  "charles-lwanga": {
    name: "St. Charles Lwanga",
    countId: "count-charles-lwanga",
    icon: "✝️"
  },
  "st-williams": {
    name: "St. Williams",
    countId: "count-st-williams",
    icon: "🕊️"
  },
  "st-camillas": {
    name: "St. Camillas",
    countId: "count-st-camillas",
    icon: "📖"
  },
  "mathias-mulumba": {
    name: "St. Mathias Mulumba",
    countId: "count-mathias-mulumba",
    icon: "🙏"
  },
  "st-vincent": {
    name: "St. Vincent",
    countId: "count-st-vincent",
    icon: "✨"
  }
};

// ======================================================
// 3. HELPERS AND STATE
// ======================================================

const $ = id => document.getElementById(id);

const first = (...ids) =>
  ids.map(id => $(id)).find(Boolean) || null;

const fieldValue = (...ids) =>
  (first(...ids)?.value || "").trim();

let currentUser = null;
let currentMember = null;
let unsubscribeChat = null;
let unsubscribeGroupCounts = null;
let unsubscribeStudyContent = null;
let replyToMessage = null;
let registrationInProgress = false;
let authCheckVersion = 0;
let chatTouchStartX = null;

const membershipChoice = $("membership-choice");
const membershipForms = $("membership-forms");
const membershipStatus = $("membership-status");

const membershipMessage = first(
  "membership-message",
  "membership-status-message"
);

const loginMessage = first(
  "membership-login-message",
  "login-message"
);

const chatJoinPanel = $("chat-join-panel");
const chatRoom = $("chat-room");
const chatMessages = $("chat-messages");

function show(element) {
  if (element) element.hidden = false;
}

function hide(element) {
  if (element) element.hidden = true;
}

function showMessage(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
}

function setLoading(button, loading, text = "Please wait…") {
  if (!button) return;

  if (loading) {
    if (!button.disabled) {
      button.dataset.originalText = button.textContent;
    }

    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

function normalizePhoneNumber(input) {
  let digits = String(input || "").replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = "254" + digits.slice(1);
  } else if (digits.startsWith("7") || digits.startsWith("1")) {
    digits = "254" + digits;
  }

  return /^254[17]\d{8}$/.test(digits) ? digits : null;
}

function phoneToEmail(phoneDigits) {
  return `${phoneDigits}@members.stmonicalk3c.invalid`;
}

function authError(error) {
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

  return messages[error?.code] ||
    "Something went wrong. Check your connection and try again.";
}

function isAdmin() {
  return Boolean(currentUser && currentUser.uid === ADMIN_UID);
}

function isMember() {
  return Boolean(currentUser && currentMember);
}

// ======================================================
// 4. MEMBERSHIP FORMS
// ======================================================

function showMembershipChoice() {
  show(membershipChoice);
  hide(membershipForms);
  hide(membershipStatus);
  hide(first("membership-register-form", "membership-form"));
  hide(first("member-login-form", "membership-login-form"));

  showMessage(membershipMessage, "");
  showMessage(loginMessage, "");
}

function showRegistrationForm() {
  hide(membershipChoice);
  show(membershipForms);
  show(first("membership-register-form", "membership-form"));
  hide(first("member-login-form", "membership-login-form"));
  hide(membershipStatus);

  showMessage(membershipMessage, "");
}

function showLoginForm() {
  hide(membershipChoice);
  show(membershipForms);
  hide(first("membership-register-form", "membership-form"));
  show(first("member-login-form", "membership-login-form"));
  hide(membershipStatus);

  showMessage(loginMessage, "");
}

first("show-register-btn", "show-register-button")
  ?.addEventListener("click", showRegistrationForm);

first("show-login-btn", "show-login-button")
  ?.addEventListener("click", showLoginForm);

first("switch-to-login-btn", "switch-to-login")
  ?.addEventListener("click", showLoginForm);

first("switch-to-register-btn", "switch-to-register")
  ?.addEventListener("click", showRegistrationForm);

document.querySelectorAll(".back-to-choice").forEach(button => {
  button.addEventListener("click", showMembershipChoice);
});

// ======================================================
// 5. NAVIGATION
// ======================================================

const PROTECTED_SECTIONS = new Set([
  "story",
  "questions",
  "prayers",
  "public-chat"
]);

function showSection(sectionId) {
  if (!$(sectionId)) sectionId = "home";

  if (!currentUser && PROTECTED_SECTIONS.has(sectionId)) {
    sectionId = "membership";
  }

  if (sectionId === "admin") {
    sectionId = isAdmin() ? "membership" : "home";
  }

  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.remove("active-section");
    section.hidden = true;
  });

  const selected = $(sectionId);

  if (selected) {
    selected.hidden = false;
    selected.classList.add("active-section");
  }

  document.body.classList.toggle("auth-locked", !currentUser);

  const groupsContent = $("member-groups-content");

  if (groupsContent) {
    groupsContent.hidden = !isMember();
  }

  if (window.location.hash !== `#${sectionId}`) {
    history.replaceState(null, "", `#${sectionId}`);
  }

  if (sectionId === "public-chat") {
    prepareChat();
  }
}

window.showSection = showSection;

document.querySelectorAll("[data-section]").forEach(element => {
  element.addEventListener("click", event => {
    event.preventDefault();
    showSection(element.dataset.section);
  });
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    const sectionId = link.getAttribute("href")?.slice(1);

    if ($(sectionId)?.classList.contains("page-section")) {
      event.preventDefault();
      showSection(sectionId);
    }
  });
});

// ======================================================
// 6. REGISTER A MEMBER
// ======================================================

async function registerMember(event) {
  event.preventDefault();

  const fullName = fieldValue("member-full-name", "member-name");

  const phoneNumber = normalizePhoneNumber(
    fieldValue("member-phone", "register-phone")
  );

  const password =
    first("member-password", "register-password")?.value || "";

  const confirmPassword =
    first("member-confirm-password", "confirm-password")?.value || "";

  const groupId = fieldValue("member-group", "register-group");

  if (fullName.length < 2 || fullName.length > 80) {
    showMessage(
      membershipMessage,
      "Enter your full name (2–80 characters).",
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

  if (confirmPassword && password !== confirmPassword) {
    showMessage(
      membershipMessage,
      "The passwords do not match.",
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

  const button = first(
    "membership-submit",
    "membership-register-btn",
    "register-btn"
  );

  registrationInProgress = true;
  setLoading(button, true, "Creating account…");
  showMessage(membershipMessage, "Creating your account…");

  let createdUser = null;

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      phoneToEmail(phoneNumber),
      password
    );

    createdUser = credential.user;

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

    currentUser = createdUser;
    currentMember = { fullName, phoneNumber, groupId };

    const passwordField = first("member-password", "register-password");
    const confirmField = first(
      "member-confirm-password",
      "confirm-password"
    );

    if (passwordField) passwordField.value = "";
    if (confirmField) confirmField.value = "";

    await displayMemberScreen(createdUser, currentMember);
  } catch (error) {
    console.error("Registration error:", error);
    showMessage(membershipMessage, authError(error), "error");

    if (createdUser) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("Sign-out after registration failure:", signOutError);
      }
    }
  } finally {
    registrationInProgress = false;
    setLoading(button, false);
  }
}

first("membership-register-form", "membership-form")
  ?.addEventListener("submit", registerMember);

// ======================================================
// 7. LOG IN A MEMBER
// ======================================================

async function loginMember(event) {
  event.preventDefault();

  const phoneNumber = normalizePhoneNumber(
    fieldValue(
      "login-phone",
      "login-member-phone",
      "member-login-phone"
    )
  );

  const password =
    first(
      "login-password",
      "login-member-password",
      "member-login-password"
    )?.value || "";

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

  const button = first(
    "membership-login-submit",
    "member-login-btn",
    "login-btn"
  );

  setLoading(button, true, "Signing in…");
  showMessage(loginMessage, "Checking your account…");

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      phoneToEmail(phoneNumber),
      password
    );

    const profile = await getDoc(
      doc(db, "members", credential.user.uid)
    );

    if (!profile.exists() && credential.user.uid !== ADMIN_UID) {
      await signOut(auth);

      showMessage(
        loginMessage,
        "Your member profile could not be found. Please contact the Bible study leadership.",
        "error"
      );
      return;
    }

    currentUser = credential.user;

    currentMember = profile.exists()
      ? profile.data()
      : { fullName: "Administrator", groupId: "" };

    const passwordField = first(
      "login-password",
      "login-member-password",
      "member-login-password"
    );

    if (passwordField) passwordField.value = "";

    await displayMemberScreen(currentUser, currentMember);
  } catch (error) {
    console.error("Login error:", error);
    showMessage(loginMessage, authError(error), "error");
  } finally {
    setLoading(button, false);
  }
}

first("member-login-form", "membership-login-form")
  ?.addEventListener("submit", loginMember);

// ======================================================
// 8. MEMBER DASHBOARD AND ADMIN VISIBILITY
// ======================================================

async function displayMemberScreen(user, member) {
  if (!user || user.isAnonymous || !member) return;

  currentUser = user;
  currentMember = member;

  if (membershipStatus) {
    membershipStatus.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = `Welcome, ${member.fullName || "Member"}!`;

    const group = document.createElement("p");

    group.textContent = GROUPS[member.groupId]
      ? `Your Bible study group: ${GROUPS[member.groupId].name}`
      : isAdmin()
        ? "Administrator account"
        : "Your membership is active.";

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "membership-submit";
    logout.textContent = "Sign Out";

    logout.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Sign-out error:", error);
        alert("Unable to sign out. Please try again.");
      }
    });

    membershipStatus.append(heading, group, logout);
    show(membershipStatus);
  }

  hide(membershipChoice);
  hide(membershipForms);
  hide(first("membership-register-form", "membership-form"));
  hide(first("member-login-form", "membership-login-form"));
  show($("member-groups-content"));

  document.body.classList.remove("auth-locked");

  if (isAdmin()) {
    show($("admin-editor"));
    await loadAdminContent();
  } else {
    hide($("admin-editor"));
  }

  startGroupCountListener();
  startStudyContentListener();
  showSection("home");
}

// ======================================================
// 9. FIREBASE AUTHENTICATION STATE
// ======================================================

onAuthStateChanged(auth, async user => {
  currentUser = user;
  const version = ++authCheckVersion;

  if (!user) {
    currentMember = null;

    if (unsubscribeChat) {
      unsubscribeChat();
      unsubscribeChat = null;
    }

    if (unsubscribeGroupCounts) {
      unsubscribeGroupCounts();
      unsubscribeGroupCounts = null;
    }

    if (unsubscribeStudyContent) {
      unsubscribeStudyContent();
      unsubscribeStudyContent = null;
    }

    hide(chatRoom);
    show(chatJoinPanel);
    hide($("admin-editor"));
    hide($("member-groups-content"));

    document.body.classList.add("auth-locked");

    showMembershipChoice();
    showSection("home");
    return;
  }

  if (registrationInProgress) return;

  try {
    const profile = await getDoc(doc(db, "members", user.uid));

    if (version !== authCheckVersion) return;

    if (!profile.exists() && user.uid !== ADMIN_UID) {
      currentMember = null;
      await signOut(auth);
      return;
    }

    currentMember = profile.exists()
      ? profile.data()
      : { fullName: "Administrator", groupId: "" };

    await displayMemberScreen(user, currentMember);
  } catch (error) {
    console.error("Profile verification error:", error);

    currentMember = null;
    hide($("admin-editor"));
    showMembershipChoice();

    showMessage(
      membershipMessage,
      "We could not verify your membership. Check your connection and try again.",
      "error"
    );
  }
});

// ======================================================
// 10. GROUP MEMBER COUNTS
// ======================================================

function startGroupCountListener() {
  if (!currentUser) return;

  if (unsubscribeGroupCounts) {
    unsubscribeGroupCounts();
  }

  unsubscribeGroupCounts = onSnapshot(
    collection(db, "groupMemberships"),
    snapshot => {
      const counts = Object.fromEntries(
        Object.keys(GROUPS).map(id => [id, 0])
      );

      snapshot.forEach(memberDoc => {
        const groupId = memberDoc.data().groupId;

        if (Object.prototype.hasOwnProperty.call(counts, groupId)) {
          counts[groupId]++;
        }
      });

      Object.entries(GROUPS).forEach(([groupId, group]) => {
        const countElement = $(group.countId);

        if (countElement) {
          countElement.textContent = `Members: ${counts[groupId]}`;
        }
      });
    },
    error => console.error("Group count listener error:", error)
  );
}

function addGroupIcons() {
  Object.entries(GROUPS).forEach(([groupId, group]) => {
    const card =
      document.querySelector(`[data-group="${groupId}"]`) ||
      $(`group-${groupId}`);

    if (!card || card.querySelector(".group-icon")) return;

    const icon = document.createElement("span");
    icon.className = "group-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = group.icon;

    card.prepend(icon);
  });
}

// ======================================================
// 11. DEFAULT STORY AND DISCUSSION QUESTIONS
// ======================================================

const defaultContent = {
  title: "LIFE AFTER CAMPUS",
  subtitle: "A story about success, choices, faith and values",

  story: `After graduation, Vincent and Annastacia entered the job market with the same dream: to build successful lives. Months passed, but neither could find a stable job. Vincent survived through small jobs while Annastacia struggled with rent, family pressure, and constant rejection.

Every morning, Vincent would wake up early, dress for interviews, and send applications. Most days ended with no response. He started taking temporary jobs just to put food on the table. His friends seemed to be moving ahead, and every graduation photo or new-job announcement on social media made him question whether he was falling behind.

Annastacia's situation became even more difficult. Her rent was overdue, her family needed her support, and she was constantly being asked when she would finally get a “real job.” Eventually, she got an opportunity at a big company. For the first time in months, she felt that her life was finally changing.

However, her boss soon made it clear that her career would move faster if she was willing to give him more than her work. At first, Annastacia refused and tried to prove herself through hard work. But as the pressure increased, she began wondering whether her principles could survive in a world where people seemed willing to do anything to get ahead.

Eventually, Annastacia made choices that helped her climb the corporate ladder, even though they conflicted with her values. Her salary increased, her lifestyle changed, and people began admiring her success. From the outside, she appeared to have everything. But privately, she struggled with the weight of the decisions she had made to get there.

Vincent, meanwhile, remained at the bottom. He watched former classmates get better jobs while he continued taking small opportunities. There were moments when he wanted to give up and wondered whether honesty, patience, and prayer were actually enough. Yet he continued learning new skills, taking whatever honest opportunities came his way, and trusting that his journey did not have to look like everyone else's.

Years later, Vincent and Annastacia met again. They talked about their lives and realized that neither had experienced the future they had imagined on graduation day. Annastacia had money and a powerful position, but carried regrets she rarely spoke about. Vincent had taken longer to build his career, but he was proud that he had not completely lost himself along the way.

They both learned that life after campus is not simply about finding a job or becoming successful. It is about facing pressure, making difficult choices, dealing with failure, and deciding what you are willing to sacrifice to become the person you want to be.`,

  verses: [
    {
      reference: "Proverbs 16:8",
      text: "Better a little with righteousness than much gain with injustice."
    },
    {
      reference: "Matthew 16:26",
      text: "What good will it be for someone to gain the whole world, yet forfeit their soul?"
    },
    {
      reference: "Psalm 37:7",
      text: "Be still before the Lord and wait patiently for him."
    },
    {
      reference: "Proverbs 3:5–6",
      text: "Trust in the Lord with all your heart and lean not on your own understanding."
    }
  ],

  questions: [
    {
      title: "Understanding Annastacia's Choices",
      text: "Was Annastacia completely wrong for the choices she made considering the financial and social pressure she was under? Where is the line between understanding someone's circumstances and excusing their actions?"
    },
    {
      title: "When Doing Right Feels Like Losing",
      text: "Vincent questioned whether honesty and patience were actually enough. Have you ever felt that doing the right thing puts you at a disadvantage while others seem to succeed through shortcuts?"
    },
    {
      title: "What Does Success Really Mean?",
      text: "What should success mean to a Christian after campus? Is it wealth, career, status, helping family, happiness, faith, or a combination of these?"
    },
    {
      title: "How Much Should We Compromise?",
      text: "If you were in Vincent's position and an opportunity required you to compromise your values, what factors would influence your decision? Is compromise ever justified?"
    },
    {
      title: "Protecting Your Identity",
      text: "Matthew 16:26 asks what it profits someone to gain the whole world but lose their soul. In today's competitive job market, what are young graduates most likely to sacrifice, and how can they protect their faith, values and identity?"
    }
  ]
};

// ======================================================
// 12. RENDER STORY, VERSES AND QUESTIONS
// ======================================================

function renderStoryAndQuestions(content) {
  const storySection = $("story");
  const heading = storySection?.querySelector(".section-heading h2");
  const subtitle = storySection?.querySelector(".section-heading p");
  const storyCard = storySection?.querySelector(".story-card");

  if (heading) {
    heading.textContent = content.title || defaultContent.title;
  }

  if (subtitle) {
    subtitle.textContent = content.subtitle || defaultContent.subtitle;
  }

  if (storyCard) {
    storyCard.replaceChildren();

    String(content.story || defaultContent.story)
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .forEach(paragraph => {
        const p = document.createElement("p");
        p.textContent = paragraph;
        storyCard.appendChild(p);
      });

    const verses = Array.isArray(content.verses)
      ? content.verses
      : defaultContent.verses;

    if (verses.length) {
      const verseHeading = document.createElement("h3");
      verseHeading.textContent = "Bible Verses for Reflection";
      storyCard.appendChild(verseHeading);

      verses.forEach(verse => {
        const p = document.createElement("p");
        const strong = document.createElement("strong");

        strong.textContent = `${verse.reference || ""}: `;

        p.append(
          strong,
          document.createTextNode(verse.text || "")
        );

        storyCard.appendChild(p);
      });
    }
  }

  const cards = [
    ...document.querySelectorAll("#questions .question-card")
  ];

  const questions =
    Array.isArray(content.questions) && content.questions.length
      ? content.questions
      : defaultContent.questions;

  questions.slice(0, 5).forEach((question, index) => {
    const card = cards[index];
    if (!card) return;

    const h3 = card.querySelector("h3");
    const p = card.querySelector("p");

    if (h3) {
      h3.textContent = question.title || `Question ${index + 1}`;
    }

    if (p) {
      p.textContent = question.text || "";
    }
  });
}

// ======================================================
// 13. ADMIN EDITOR
// ======================================================

function fillAdminForm(content) {
  const title = $("admin-story-title");
  const subtitle = $("admin-story-subtitle");
  const story = first("admin-story-content", "admin-story-text");

  if (title) title.value = content.title || defaultContent.title;
  if (subtitle) subtitle.value = content.subtitle || defaultContent.subtitle;

  if (story) {
    story.value = content.story || defaultContent.story;
  }

  defaultContent.questions.forEach((fallback, index) => {
    const number = index + 1;
    const question = content.questions?.[index] || fallback;

    const titleField = $(`admin-question-${number}-title`);

    const textField = first(
      `admin-question-${number}-prompt`,
      `admin-question-${number}-text`
    );

    if (titleField && textField) {
      titleField.value = question.title || fallback.title;
      textField.value = question.text || fallback.text;
      return;
    }

    const field = $(`admin-question-${number}`);

    if (field) {
      field.value =
        `${question.title || fallback.title}\n\n` +
        `${question.text || fallback.text}`;
    }
  });
}

function readAdminForm() {
  const questions = defaultContent.questions.map((fallback, index) => {
    const number = index + 1;

    const titleField = $(`admin-question-${number}-title`);

    const textField = first(
      `admin-question-${number}-prompt`,
      `admin-question-${number}-text`
    );

    if (titleField && textField) {
      return {
        title: titleField.value.trim(),
        text: textField.value.trim()
      };
    }

    const field = $(`admin-question-${number}`);
    const parts = (field?.value || "").split(/\n\s*\n/);

    return {
      title: (parts.shift() || "").trim() || fallback.title,
      text: parts.join("\n\n").trim()
    };
  });

  return {
    title: fieldValue("admin-story-title"),
    subtitle: fieldValue("admin-story-subtitle"),
    story: fieldValue("admin-story-content", "admin-story-text"),
    verses: defaultContent.verses,
    questions
  };
}

// ======================================================
// 14. LOAD ADMIN CONTENT
// ======================================================

async function loadAdminContent() {
  if (!isAdmin()) return;

  const message = first(
    "admin-editor-message",
    "admin-save-message"
  );

  try {
    const snapshot = await getDoc(
      doc(db, "studyContent", "weeklyStudy")
    );

    const content = snapshot.exists()
      ? { ...defaultContent, ...snapshot.data() }
      : defaultContent;

    renderStoryAndQuestions(content);
    fillAdminForm(content);

    showMessage(
      message,
      snapshot.exists()
        ? "Your saved content is loaded."
        : "Default content loaded. Save changes to store it in Firebase."
    );
  } catch (error) {
    console.error("Could not load study content:", error);

    renderStoryAndQuestions(defaultContent);
    fillAdminForm(defaultContent);

    showMessage(
      message,
      "Could not load saved content. Check your Firestore rules and internet connection.",
      "error"
    );
  }
}

// ======================================================
// 15. SAVE ADMIN CONTENT
// ======================================================

async function saveAdminContent(event) {
  if (event) event.preventDefault();

  const message = first(
    "admin-editor-message",
    "admin-save-message"
  );

  if (!isAdmin()) {
    showMessage(
      message,
      "Only the authorized administrator can save content.",
      "error"
    );
    return;
  }

  const content = readAdminForm();

  if (
    !content.title ||
    !content.story ||
    content.questions.some(q => !q.title || !q.text)
  ) {
    showMessage(
      message,
      "Complete the story title, story text, and all five question titles and prompts.",
      "error"
    );
    return;
  }

  const button = first(
    "admin-save-btn",
    "admin-save-content-btn"
  );

  setLoading(button, true, "Saving…");
  showMessage(message, "Saving changes to Firebase…");

  try {
    await setDoc(
      doc(db, "studyContent", "weeklyStudy"),
      {
        ...content,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      }
    );

    renderStoryAndQuestions(content);
    fillAdminForm(content);

    showMessage(
      message,
      "Saved successfully. The updated story and questions are now live."
    );
  } catch (error) {
    console.error("Content save failed:", error);

    showMessage(
      message,
      "Save failed. Check the Firestore rules for studyContent and confirm your admin account.",
      "error"
    );
  } finally {
    setLoading(button, false);
  }
}

first("admin-editor-form", "admin-content-form")
  ?.addEventListener("submit", saveAdminContent);

const adminSaveButton = first(
  "admin-save-btn",
  "admin-save-content-btn"
);

adminSaveButton?.addEventListener("click", event => {
  if (
    event.currentTarget.type === "submit" &&
    event.currentTarget.form
  ) {
    return;
  }

  saveAdminContent(event);
});

$("admin-reset-btn")?.addEventListener("click", () => {
  if (isAdmin()) loadAdminContent();
});

// ======================================================
// 16. LIVE CONTENT UPDATES
// ======================================================

function startStudyContentListener() {
  if (!currentUser) return;

  if (unsubscribeStudyContent) {
    unsubscribeStudyContent();
  }

  unsubscribeStudyContent = onSnapshot(
    doc(db, "studyContent", "weeklyStudy"),
    snapshot => {
      const content = snapshot.exists()
        ? { ...defaultContent, ...snapshot.data() }
        : defaultContent;

      renderStoryAndQuestions(content);

      if (
        isAdmin() &&
        !document.activeElement?.closest("#admin-editor")
      ) {
        fillAdminForm(content);
      }
    },
    error => {
      console.error("Study content listener error:", error);
      renderStoryAndQuestions(defaultContent);
    }
  );
}

// ======================================================
// 17. CHAT DISPLAY NAME
// ======================================================

function getChatName() {
  try {
    return localStorage.getItem("stMonicaChatName") || "";
  } catch (error) {
    console.warn("Could not read chat name:", error);
    return "";
  }
}

function saveChatName(name) {
  try {
    localStorage.setItem("stMonicaChatName", name);
  } catch (error) {
    console.warn("Could not save chat name:", error);
  }
}

function updateChatNameDisplays(name) {
  const currentName = first(
    "chat-current-user",
    "current-user-name"
  );

  const nameInput = first(
    "chat-display-name",
    "anonymous-name"
  );

  if (currentName) currentName.textContent = name;
  if (nameInput) nameInput.value = name;
}

// ======================================================
// 18. PREPARE CHAT
// ======================================================

function prepareChat() {
  if (!isMember()) {
    show(chatJoinPanel);
    hide(chatRoom);

    showMessage(
      first("chat-join-message", "chat-login-message"),
      "Please sign in to your St. Monica account first.",
      "error"
    );

    return;
  }

  const savedName = getChatName();

  if (!savedName) {
    show(chatJoinPanel);
    hide(chatRoom);

    const nameInput = first(
      "chat-display-name",
      "anonymous-name"
    );

    if (nameInput && currentMember?.fullName) {
      nameInput.value = currentMember.fullName;
    }

    return;
  }

  hide(chatJoinPanel);
  show(chatRoom);

  updateChatNameDisplays(savedName);
  listenForChatMessages();
}

// ======================================================
// 19. JOIN CHAT
// ======================================================

async function joinChat(event) {
  if (event) event.preventDefault();

  if (!isMember()) {
    showMessage(
      first("chat-join-message", "chat-login-message"),
      "Please sign in to your St. Monica account first.",
      "error"
    );

    showSection("membership");
    return;
  }

  const name = fieldValue(
    "chat-display-name",
    "anonymous-name"
  );

  if (name.length < 2 || name.length > 25) {
    showMessage(
      first("chat-join-message", "chat-login-message"),
      "Choose a chat name between 2 and 25 characters.",
      "error"
    );
    return;
  }

  saveChatName(name);
  updateChatNameDisplays(name);

  showMessage(
    first("chat-join-message", "chat-login-message"),
    ""
  );

  prepareChat();
}

first("chat-join-form")?.addEventListener("submit", joinChat);

first("chat-join-btn", "enter-chat-btn")
  ?.addEventListener("click", event => {
    if (event.currentTarget.form) return;
    joinChat(event);
  });

// ======================================================
// 20. LOAD CHAT MESSAGES IN REAL TIME
// ======================================================

function listenForChatMessages() {
  if (!chatMessages || !isMember()) return;

  if (unsubscribeChat) {
    unsubscribeChat();
  }

  const messagesQuery = query(
    collection(db, "publicChatMessages"),
    orderBy("timestamp", "desc"),
    limit(100)
  );

  unsubscribeChat = onSnapshot(
    messagesQuery,
    snapshot => {
      chatMessages.replaceChildren();

      if (snapshot.empty) {
        const empty = document.createElement("p");
        empty.className = "chat-empty-state";
        empty.textContent = "Be the first to start the conversation.";
        chatMessages.appendChild(empty);
        return;
      }

      const messages = [];

      snapshot.forEach(messageDoc => {
        messages.push({
          id: messageDoc.id,
          data: messageDoc.data()
        });
      });

      messages.reverse().forEach(message => {
        renderChatMessage(message.id, message.data);
      });

      chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    error => {
      console.error("Chat listener error:", error);

      showMessage(
        first("chat-message-status", "chat-login-message"),
        "Unable to load chat. Check your internet connection and Firestore rules.",
        "error"
      );
    }
  );
}

// ======================================================
// 21. DISPLAY CHAT MESSAGES
// ======================================================

function renderChatMessage(id, message) {
  const ownMessage =
    Boolean(currentUser?.uid && message.uid === currentUser.uid);

  const wrapper = document.createElement("div");

  wrapper.className = ownMessage
    ? "message-wrapper own-message"
    : "message-wrapper other-message";

  wrapper.dataset.messageId = id;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  if (message.replyText) {
    const quote = document.createElement("div");
    quote.className = "reply-preview";

    const quotedName = document.createElement("strong");
    quotedName.textContent = message.replyUser || "Member";

    const quotedText = document.createElement("p");
    quotedText.textContent = message.replyText;

    quote.append(quotedName, quotedText);
    bubble.appendChild(quote);
  }

  const name = document.createElement("strong");
  name.className = "message-user";
  name.textContent = ownMessage
    ? "You"
    : (message.user || "Member");

  const text = document.createElement("p");
  text.className = "message-text";
  text.textContent = message.text || "";

  const time = document.createElement("span");
  time.className = "message-time";

  if (typeof message.timestamp === "number") {
    time.textContent = new Date(
      message.timestamp
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  } else if (message.timestamp?.toDate) {
    time.textContent = message.timestamp
      .toDate()
      .toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
  }

  bubble.append(name, text, time);
  wrapper.appendChild(bubble);

  const replyButton = document.createElement("button");
  replyButton.type = "button";
  replyButton.className = "reply-message-button";
  replyButton.textContent = "Reply";

  replyButton.addEventListener("click", () => {
    setReply({ ...message, id });
  });

  wrapper.appendChild(replyButton);

  wrapper.addEventListener("touchstart", event => {
    chatTouchStartX = event.changedTouches[0].screenX;
  }, { passive: true });

  wrapper.addEventListener("touchend", event => {
    const endX = event.changedTouches[0].screenX;

    if (
      chatTouchStartX !== null &&
      chatTouchStartX - endX > 65
    ) {
      setReply({ ...message, id });
    }

    chatTouchStartX = null;
  }, { passive: true });

  chatMessages.appendChild(wrapper);
}

// ======================================================
// 22. REPLY TO A MESSAGE
// ======================================================

function setReply(message) {
  replyToMessage = {
    id: message.id || "",
    user: message.user || "Member",
    text: message.text || ""
  };

  const preview = first(
    "chat-reply-preview",
    "reply-preview"
  );

  const replyName = first(
    "chat-reply-name",
    "reply-preview-user"
  );

  const replyText = first(
    "chat-reply-text",
    "reply-preview-text"
  );

  if (preview) {
    preview.hidden = false;
    preview.style.display = "flex";
  }

  if (replyName) replyName.textContent = replyToMessage.user;
  if (replyText) replyText.textContent = replyToMessage.text;

  first("chat-message-input", "message-input")?.focus();
}

function cancelReply() {
  replyToMessage = null;

  const preview = first(
    "chat-reply-preview",
    "reply-preview"
  );

  const replyName = first(
    "chat-reply-name",
    "reply-preview-user"
  );

  const replyText = first(
    "chat-reply-text",
    "reply-preview-text"
  );

  if (preview) {
    preview.hidden = true;
    preview.style.display = "none";
  }

  if (replyName) replyName.textContent = "";
  if (replyText) replyText.textContent = "";
}

first("chat-cancel-reply-btn", "cancel-reply-btn")
  ?.addEventListener("click", cancelReply);

// ======================================================
// 23. CHANGE CHAT NAME
// ======================================================

function changeChatName() {
  if (!isMember()) {
    showSection("membership");
    return;
  }

  const proposed = prompt(
    "Choose your chat display name:",
    getChatName() || currentMember?.fullName || ""
  );

  if (proposed === null) return;

  const name = proposed.trim();

  if (name.length < 2 || name.length > 25) {
    alert("Your name must contain between 2 and 25 characters.");
    return;
  }

  saveChatName(name);
  updateChatNameDisplays(name);
}

first("chat-change-name-btn", "change-name-btn")
  ?.addEventListener("click", changeChatName);

$("change-name-bottom-btn")
  ?.addEventListener("click", changeChatName);

// ======================================================
// 24. EMOJI PICKER
// ======================================================

$("emoji-btn")?.addEventListener("click", () => {
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

  const input = first("chat-message-input", "message-input");

  if (input) {
    input.value += emojis[index];
    input.focus();
  }
});

// ======================================================
// 25. SEND A CHAT MESSAGE
// ======================================================

async function sendChatMessage(event) {
  event.preventDefault();

  if (!isMember()) {
    showMessage(
      first("chat-message-status", "chat-login-message"),
      "Please sign in before sending a message.",
      "error"
    );

    showSection("membership");
    return;
  }

  const input = first("chat-message-input", "message-input");
  const text = input?.value.trim() || "";

  if (!text) return;

  if (text.length > 500) {
    showMessage(
      first("chat-message-status"),
      "Messages cannot exceed 500 characters.",
      "error"
    );
    return;
  }

  const button = first("chat-send-btn", "send-message-btn");

  setLoading(button, true, "Sending…");
  showMessage(first("chat-message-status"), "");

  try {
    const data = {
      user: getChatName() ||
        currentMember.fullName ||
        "St. Monica Member",
      text,
      uid: currentUser.uid,
      timestamp: Date.now()
    };

    if (replyToMessage) {
      data.replyTo = replyToMessage.id;
      data.replyUser = replyToMessage.user;
      data.replyText = replyToMessage.text;
    }

    await addDoc(
      collection(db, "publicChatMessages"),
      data
    );

    if (input) input.value = "";
    cancelReply();
  } catch (error) {
    console.error("Could not send chat message:", error);

    showMessage(
      first("chat-message-status"),
      "Your message could not be sent. Check your connection and Firestore rules.",
      "error"
    );
  } finally {
    setLoading(button, false);
  }
}

first("chat-message-form", "chat-form")
  ?.addEventListener("submit", sendChatMessage);

// ======================================================
// 26. INITIALIZE THE WEBSITE
// ======================================================

renderStoryAndQuestions(defaultContent);
addGroupIcons();

if (window.location.hash) {
  const initialSection = window.location.hash.slice(1);

  showSection(
    $(initialSection) && initialSection !== "admin"
      ? initialSection
      : "home"
  );
} else {
  showSection("home");
}
```
