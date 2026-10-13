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
// 3. SHORTCUTS AND APPLICATION STATE
// ======================================================

const $ = id => document.getElementById(id);

let currentUser = null;
let currentMember = null;

let unsubscribeChat = null;
let unsubscribeGroupCounts = null;
let unsubscribeStudyContent = null;

let replyToMessage = null;
let registrationInProgress = false;
let profileLoadVersion = 0;
let chatTouchStartX = null;

const membershipChoice = $("membership-choice");
const membershipForms = $("membership-forms");
const membershipForm = $("membership-form");
const loginForm = $("membership-login-form");
const membershipStatus = $("membership-status");

const membershipMessage = $("membership-message");
const loginMessage = $("membership-login-message");

const memberGroupsContent = $("member-groups-content");

const chatJoinPanel = $("chat-join-panel");
const chatRoom = $("chat-room");
const chatMessages = $("chat-messages");

// ======================================================
// 4. GENERAL HELPERS
// ======================================================

function showMessage(element, message, type = "info") {
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
}

function show(element) {
  if (element) element.hidden = false;
}

function hide(element) {
  if (element) element.hidden = true;
}

function setLoading(button, loading, loadingText = "Please wait…") {
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
// 5. MEMBERSHIP SCREEN
// ======================================================

function showMembershipChoice() {
  show(membershipChoice);
  hide(membershipForms);
  hide(membershipStatus);
  hide(membershipForm);
  hide(loginForm);

  showMessage(membershipMessage, "");
  showMessage(loginMessage, "");
}

function showRegistrationForm() {
  hide(membershipChoice);
  show(membershipForms);
  show(membershipForm);
  hide(loginForm);
  hide(membershipStatus);

  showMessage(membershipMessage, "");
}

function showLoginForm() {
  hide(membershipChoice);
  show(membershipForms);
  hide(membershipForm);
  show(loginForm);
  hide(membershipStatus);

  showMessage(loginMessage, "");
}

$("show-register-btn")?.addEventListener(
  "click",
  showRegistrationForm
);

$("show-login-btn")?.addEventListener(
  "click",
  showLoginForm
);

$("switch-to-login-btn")?.addEventListener(
  "click",
  showLoginForm
);

$("switch-to-register-btn")?.addEventListener(
  "click",
  showRegistrationForm
);

document.querySelectorAll(".back-to-choice").forEach(button => {
  button.addEventListener("click", showMembershipChoice);
});

// ======================================================
// 6. PAGE NAVIGATION AND MEMBER-ONLY SECTIONS
// ======================================================

const PROTECTED_SECTIONS = new Set([
  "story",
  "questions",
  "prayers",
  "public-chat",
  "admin"
]);

function showSection(sectionId) {
  if (!$(sectionId)) {
    sectionId = "home";
  }

  if (!currentUser && PROTECTED_SECTIONS.has(sectionId)) {
    sectionId = "membership";
  }

  if (sectionId === "admin" && !isAdmin()) {
    sectionId = "home";
  }

  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.remove("active-section");
    section.hidden = true;
  });

  const selectedSection = $(sectionId);

  if (selectedSection) {
    selectedSection.hidden = false;
    selectedSection.classList.add("active-section");
  }

  document.body.classList.toggle("auth-locked", !currentUser);

  if (memberGroupsContent) {
    memberGroupsContent.hidden = !isMember();
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

// Support existing navigation links that call showSection('section-id').
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
// 7. REGISTER A MEMBER
// ======================================================

async function registerMember(event) {
  event.preventDefault();

  const fullName = $("member-full-name")?.value.trim() || "";
  const phoneNumber = normalizePhoneNumber(
    $("member-phone")?.value
  );
  const password = $("member-password")?.value || "";
  const groupId = $("member-group")?.value || "";

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

  setLoading(
    $("membership-submit"),
    true,
    "Creating account…"
  );

  showMessage(
    membershipMessage,
    "Creating your account…"
  );

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
    currentMember = {
      fullName,
      phoneNumber,
      groupId
    };

    $("member-password").value = "";

    startGroupCountListener();
    await displayMemberScreen(createdUser, currentMember);
  } catch (error) {
    console.error("Registration error:", error);

    showMessage(
      membershipMessage,
      authError(error),
      "error"
    );

    if (createdUser) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("Sign-out after registration failure:", signOutError);
      }
    }
  } finally {
    registrationInProgress = false;

    setLoading(
      $("membership-submit"),
      false
    );
  }
}

membershipForm?.addEventListener(
  "submit",
  registerMember
);

// ======================================================
// 8. LOG IN A MEMBER
// ======================================================

async function loginMember(event) {
  event.preventDefault();

  const phoneNumber = normalizePhoneNumber(
    $("login-member-phone")?.value
  );

  const password = $("login-member-password")?.value || "";

  if (!phoneNumber) {
    showMessage(
      loginMessage,
      "Enter the Kenyan phone number you used to register.",
      "error"
    );
    return;
  }

  if (!password) {
    showMessage(
      loginMessage,
      "Enter your password.",
      "error"
    );
    return;
  }

  setLoading(
    $("membership-login-submit"),
    true,
    "Signing in…"
  );

  showMessage(
    loginMessage,
    "Checking your account…"
  );

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

    currentUser = credential.user;
    currentMember = profile.data();

    $("login-member-password").value = "";

    await displayMemberScreen(
      currentUser,
      currentMember
    );
  } catch (error) {
    console.error("Login error:", error);

    showMessage(
      loginMessage,
      authError(error),
      "error"
    );
  } finally {
    setLoading(
      $("membership-login-submit"),
      false
    );
  }
}

loginForm?.addEventListener(
  "submit",
  loginMember
);

// ======================================================
// 9. MEMBER DASHBOARD AND SIGN-OUT
// ======================================================

async function displayMemberScreen(user, member) {
  if (!user || user.isAnonymous || !member) {
    return;
  }

  currentUser = user;
  currentMember = member;

  if (membershipStatus) {
    membershipStatus.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent =
      `Welcome, ${member.fullName || "Member"}!`;

    const group = document.createElement("p");

    group.textContent = GROUPS[member.groupId]
      ? `Your Bible study group: ${GROUPS[member.groupId].name}`
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
  hide(membershipForm);
  hide(loginForm);

  if (memberGroupsContent) {
    show(memberGroupsContent);
  }

  document.body.classList.remove("auth-locked");

  if (isAdmin()) {
    show($("admin"));
    await loadAdminContent();
  } else {
    hide($("admin"));
  }

  startGroupCountListener();
  startStudyContentListener();

  showSection("home");
}

// ======================================================
// 10. CHECK THE AUTHENTICATION STATE
// ======================================================

onAuthStateChanged(auth, async user => {
  currentUser = user;

  const thisCheck = ++profileLoadVersion;

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

    hide($("admin"));

    if (memberGroupsContent) {
      memberGroupsContent.hidden = true;
    }

    document.body.classList.add("auth-locked");

    showMembershipChoice();
    showSection("home");

    return;
  }

  if (registrationInProgress) {
    return;
  }

  try {
    const profile = await getDoc(
      doc(db, "members", user.uid)
    );

    if (thisCheck !== profileLoadVersion) {
      return;
    }

    // Allow the designated admin account to access the editor
    // even if it was created before member registration was added.
    if (!profile.exists() && user.uid === ADMIN_UID) {
      currentMember = {
        fullName: "Administrator",
        groupId: ""
      };

      await displayMemberScreen(user, currentMember);
      return;
    }

    if (!profile.exists()) {
      currentMember = null;
      await signOut(auth);
      return;
    }

    currentMember = profile.data();

    await displayMemberScreen(
      user,
      currentMember
    );
  } catch (error) {
    console.error("Profile verification error:", error);

    currentMember = null;

    showMembershipChoice();

    showMessage(
      membershipMessage,
      "We could not verify your membership. Check your connection and try again.",
      "error"
    );
  }
});
// ======================================================
// 11. GROUP MEMBER COUNTS
// ======================================================

function startGroupCountListener() {
  if (!currentUser) return;

  if (unsubscribeGroupCounts) {
    unsubscribeGroupCounts();
    unsubscribeGroupCounts = null;
  }

  unsubscribeGroupCounts = onSnapshot(
    collection(db, "groupMemberships"),
    snapshot => {
      const counts = {};

      Object.keys(GROUPS).forEach(groupId => {
        counts[groupId] = 0;
      });

      snapshot.forEach(memberDocument => {
        const groupId = memberDocument.data().groupId;

        if (Object.hasOwn(counts, groupId)) {
          counts[groupId]++;
        }
      });

      Object.entries(GROUPS).forEach(([groupId, group]) => {
        const countElement = $(group.countId);

        if (countElement) {
          countElement.textContent =
            `Members: ${counts[groupId]}`;
        }
      });
    },
    error => {
      console.error("Group count listener error:", error);
    }
  );
}

// Add icons only where the HTML has a suitable group card.
function addGroupIcons() {
  Object.entries(GROUPS).forEach(([groupId, group]) => {
    const card =
      document.querySelector(`[data-group="${groupId}"]`) ||
      $(`group-${groupId}`);

    if (!card) return;

    if (!card.querySelector(".group-icon")) {
      const icon = document.createElement("span");
      icon.className = "group-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = group.icon;

      card.prepend(icon);
    }
  });
}

// ======================================================
// 12. DEFAULT STORY AND DISCUSSION QUESTIONS
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
// 13. RENDER STORY AND QUESTIONS
// ======================================================

function getQuestionCards() {
  return [...document.querySelectorAll("#questions .question-card")];
}

function renderStoryAndQuestions(content) {
  const storySection = $("story");

  const storyHeading =
    storySection?.querySelector(".section-heading h2");

  const storySubtitle =
    storySection?.querySelector(".section-heading p");

  const storyCard =
    storySection?.querySelector(".story-card");

  if (storyHeading) {
    storyHeading.textContent =
      content.title || defaultContent.title;
  }

  if (storySubtitle) {
    storySubtitle.textContent =
      content.subtitle || defaultContent.subtitle;
  }

  if (storyCard) {
    storyCard.replaceChildren();

    String(content.story || defaultContent.story)
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .forEach(paragraph => {
        const element = document.createElement("p");
        element.textContent = paragraph;
        storyCard.appendChild(element);
      });
  }

  const cards = getQuestionCards();

  const questions =
    Array.isArray(content.questions) && content.questions.length
      ? content.questions
      : defaultContent.questions;

  questions.forEach((question, index) => {
    const card = cards[index];

    if (!card) return;

    const heading = card.querySelector("h3");
    const paragraph = card.querySelector("p");

    if (heading) {
      heading.textContent =
        question.title || `Question ${index + 1}`;
    }

    if (paragraph) {
      paragraph.textContent = question.text || "";
    }
  });
}

// ======================================================
// 14. ADMIN EDITOR: READ AND FILL FIELDS
// ======================================================

// These helpers support both the field IDs in your pasted HTML
// and the alternate IDs used in the earlier JavaScript.

function firstExistingId(...ids) {
  return ids.map(id => $(id)).find(Boolean) || null;
}

function setFieldValue(value, ...ids) {
  const field = firstExistingId(...ids);

  if (field) {
    field.value = value;
  }
}

function getFieldValue(...ids) {
  return firstExistingId(...ids)?.value.trim() || "";
}

function fillAdminForm(content) {
  setFieldValue(
    content.title || defaultContent.title,
    "admin-story-title"
  );

  setFieldValue(
    content.subtitle || defaultContent.subtitle,
    "admin-story-subtitle"
  );

  setFieldValue(
    content.story || defaultContent.story,
    "admin-story-content",
    "admin-story-text"
  );

  defaultContent.questions.forEach((fallback, index) => {
    const question = content.questions?.[index] || fallback;
    const number = index + 1;

    setFieldValue(
      question.title || "",
      `admin-question-${number}-title`,
      `admin-question-${number}`
    );

    setFieldValue(
      question.text || "",
      `admin-question-${number}-text`
    );
  });
}

function readAdminForm() {
  return {
    title: getFieldValue("admin-story-title"),

    subtitle: getFieldValue("admin-story-subtitle"),

    story: getFieldValue(
      "admin-story-content",
      "admin-story-text"
    ),

    questions: defaultContent.questions.map((fallback, index) => {
      const number = index + 1;

      return {
        title: getFieldValue(
          `admin-question-${number}-title`,
          `admin-question-${number}`
        ) || fallback.title,

        text: getFieldValue(
          `admin-question-${number}-text`
        ) || ""
      };
    })
  };
}

// ======================================================
// 15. LOAD ADMIN CONTENT FROM FIRESTORE
// ======================================================

async function loadAdminContent() {
  if (!isAdmin()) return;

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
      firstExistingId(
        "admin-editor-message",
        "admin-save-message"
      ),
      snapshot.exists()
        ? "Your saved content is loaded."
        : "Default content loaded. Save changes to store it in Firebase."
    );
  } catch (error) {
    console.error("Could not load study content:", error);

    renderStoryAndQuestions(defaultContent);
    fillAdminForm(defaultContent);

    showMessage(
      firstExistingId(
        "admin-editor-message",
        "admin-save-message"
      ),
      "Could not load saved content. Check your Firestore rules and internet connection.",
      "error"
    );
  }
}

// ======================================================
// 16. SAVE ADMIN CONTENT
// ======================================================

async function saveAdminContent() {
  if (!isAdmin()) {
    showMessage(
      firstExistingId(
        "admin-editor-message",
        "admin-save-message"
      ),
      "Only the authorized administrator can save content.",
      "error"
    );

    return;
  }

  const content = readAdminForm();

  if (
    !content.title ||
    !content.story ||
    content.questions.some(question =>
      !question.title || !question.text
    )
  ) {
    showMessage(
      firstExistingId(
        "admin-editor-message",
        "admin-save-message"
      ),
      "Complete the story title, story text, and all five question titles and prompts.",
      "error"
    );

    return;
  }

  const button = firstExistingId(
    "admin-save-btn",
    "admin-save-content-btn"
  );

  const messageElement = firstExistingId(
    "admin-editor-message",
    "admin-save-message"
  );

  setLoading(button, true, "Saving…");

  showMessage(
    messageElement,
    "Saving changes to Firebase…"
  );

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

    // Keep the admin editor fields in sync with what was saved.
    fillAdminForm(content);

    showMessage(
      messageElement,
      "Saved successfully. The updated story and questions are now live."
    );
  } catch (error) {
    console.error("Content save failed:", error);

    showMessage(
      messageElement,
      "Save failed. Check the Firestore rules for studyContent and confirm your admin account.",
      "error"
    );
  } finally {
    setLoading(button, false);
  }
}

firstExistingId(
  "admin-save-btn",
  "admin-save-content-btn"
)?.addEventListener("click", saveAdminContent);

// ======================================================
// 17. LIVE CONTENT UPDATES
// ======================================================

function startStudyContentListener() {
  if (!currentUser) return;

  if (unsubscribeStudyContent) {
    unsubscribeStudyContent();
    unsubscribeStudyContent = null;
  }

  unsubscribeStudyContent = onSnapshot(
    doc(db, "studyContent", "weeklyStudy"),
    snapshot => {
      const content = snapshot.exists()
        ? { ...defaultContent, ...snapshot.data() }
        : defaultContent;

      renderStoryAndQuestions(content);

      if (isAdmin()) {
        fillAdminForm(content);
      }
    },
    error => {
      console.error("Study content listener error:", error);

      // Only signed-in members receive the built-in fallback here.
      renderStoryAndQuestions(defaultContent);
    }
  );
}
// ======================================================
// 18. CHAT DISPLAY NAME
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

function chatField(...ids) {
  return firstExistingId(...ids);
}

function updateChatNameDisplays(name) {
  const currentName = chatField(
    "chat-current-user",
    "current-user-name"
  );

  if (currentName) {
    currentName.textContent = name;
  }

  const nameInput = chatField(
    "chat-display-name",
    "anonymous-name"
  );

  if (nameInput) {
    nameInput.value = name;
  }
}

// ======================================================
// 19. PREPARE THE CHAT SCREEN
// ======================================================

function prepareChat() {
  if (!isMember()) {
    show(chatJoinPanel);
    hide(chatRoom);

    showMessage(
      chatField("chat-join-message", "chat-login-message"),
      "Please sign in to your St. Monica account first.",
      "error"
    );

    return;
  }

  const savedName = getChatName();

  if (!savedName) {
    show(chatJoinPanel);
    hide(chatRoom);

    const nameInput = chatField(
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
// 20. JOIN THE CHAT
// ======================================================

async function joinChat(event) {
  event?.preventDefault();

  if (!isMember()) {
    showMessage(
      chatField("chat-join-message", "chat-login-message"),
      "Please sign in to your St. Monica account first.",
      "error"
    );

    showSection("membership");
    return;
  }

  const nameInput = chatField(
    "chat-display-name",
    "anonymous-name"
  );

  const name = nameInput?.value.trim() || "";

  if (name.length < 2 || name.length > 25) {
    showMessage(
      chatField("chat-join-message", "chat-login-message"),
      "Choose a chat name between 2 and 25 characters.",
      "error"
    );

    return;
  }

  saveChatName(name);
  updateChatNameDisplays(name);

  showMessage(
    chatField("chat-join-message", "chat-login-message"),
    ""
  );

  prepareChat();
}

chatField(
  "chat-join-form"
)?.addEventListener("submit", joinChat);

chatField(
  "chat-join-btn",
  "enter-chat-btn"
)?.addEventListener("click", event => {
  // If the button belongs to the form, the form submit handler
  // will perform the action.
  if (event.currentTarget.form) return;

  joinChat(event);
});

// ======================================================
// 21. LOAD CHAT MESSAGES IN REAL TIME
// ======================================================

function listenForChatMessages() {
  if (!chatMessages || !isMember()) return;

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

      if (snapshot.empty) {
        const empty = document.createElement("p");

        empty.className = "chat-empty-state";
        empty.textContent =
          "Be the first to start the conversation.";

        chatMessages.appendChild(empty);
        return;
      }

      snapshot.forEach(messageDocument => {
        renderChatMessage(
          messageDocument.id,
          messageDocument.data()
        );
      });

      chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    error => {
      console.error("Chat listener error:", error);

      showMessage(
        chatField("chat-message-status", "chat-login-message"),
        "Unable to load chat. Check your internet connection and Firestore rules.",
        "error"
      );
    }
  );
}

// ======================================================
// 22. DISPLAY A CHAT MESSAGE
// ======================================================

function renderChatMessage(id, message) {
  const ownMessage =
    currentUser?.uid &&
    message.uid === currentUser.uid;

  const wrapper = document.createElement("div");

  wrapper.className = ownMessage
    ? "message-wrapper own-message"
    : "message-wrapper other-message";

  wrapper.dataset.messageId = id;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  // Show the original message when this message is a reply.
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
    setReply({
      ...message,
      id
    });
  });

  wrapper.appendChild(replyButton);

  // Swiping left on a message starts a reply.
  wrapper.addEventListener(
    "touchstart",
    event => {
      chatTouchStartX = event.changedTouches[0].screenX;
    },
    { passive: true }
  );

  wrapper.addEventListener(
    "touchend",
    event => {
      const endX = event.changedTouches[0].screenX;

      if (
        chatTouchStartX !== null &&
        chatTouchStartX - endX > 65
      ) {
        setReply({
          ...message,
          id
        });
      }

      chatTouchStartX = null;
    },
    { passive: true }
  );

  chatMessages.appendChild(wrapper);
}

// ======================================================
// 23. REPLY TO A MESSAGE
// ======================================================

function setReply(message) {
  replyToMessage = {
    id: message.id || "",
    user: message.user || "Member",
    text: message.text || ""
  };

  const preview = chatField(
    "chat-reply-preview",
    "reply-preview"
  );

  const replyName = chatField(
    "chat-reply-name",
    "reply-preview-user"
  );

  const replyText = chatField(
    "chat-reply-text",
    "reply-preview-text"
  );

  if (preview) {
    preview.hidden = false;
    preview.style.display = "flex";
  }

  if (replyName) {
    replyName.textContent = replyToMessage.user;
  }

  if (replyText) {
    replyText.textContent = replyToMessage.text;
  }

  chatField(
    "chat-message-input",
    "message-input"
  )?.focus();
}

function cancelReply() {
  replyToMessage = null;

  const preview = chatField(
    "chat-reply-preview",
    "reply-preview"
  );

  if (preview) {
    preview.hidden = true;
    preview.style.display = "none";
  }

  const replyName = chatField(
    "chat-reply-name",
    "reply-preview-user"
  );

  const replyText = chatField(
    "chat-reply-text",
    "reply-preview-text"
  );

  if (replyName) replyName.textContent = "";
  if (replyText) replyText.textContent = "";
}

chatField(
  "chat-cancel-reply-btn",
  "cancel-reply-btn"
)?.addEventListener("click", cancelReply);

// ======================================================
// 24. CHANGE CHAT NAME
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

chatField(
  "chat-change-name-btn",
  "change-name-btn"
)?.addEventListener("click", changeChatName);

$("change-name-bottom-btn")?.addEventListener(
  "click",
  changeChatName
);

// ======================================================
// 25. EMOJI PICKER
// ======================================================

$("emoji-btn")?.addEventListener("click", () => {
  const emojis = [
    "🙏", "❤️", "😊", "😂", "👍",
    "🕊️", "✝️", "🙌", "✨", "💯"
  ];

  const choice = prompt(
    "Choose an emoji by entering its number:\n\n" +
    emojis.map((emoji, index) =>
      `${index + 1}. ${emoji}`
    ).join("\n")
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

  const input = chatField(
    "chat-message-input",
    "message-input"
  );

  if (input) {
    input.value += emojis[index];
    input.focus();
  }
});

// ======================================================
// 26. SEND A CHAT MESSAGE
// ======================================================

async function sendChatMessage(event) {
  event.preventDefault();

  if (!isMember()) {
    showMessage(
      chatField("chat-message-status", "chat-login-message"),
      "Please sign in before sending a message.",
      "error"
    );

    showSection("membership");
    return;
  }

  const input = chatField(
    "chat-message-input",
    "message-input"
  );

  const text = input?.value.trim() || "";

  if (!text) return;

  if (text.length > 500) {
    showMessage(
      chatField("chat-message-status"),
      "Messages cannot exceed 500 characters.",
      "error"
    );

    return;
  }

  const sendButton = chatField(
    "chat-send-btn",
    "send-message-btn"
  );

  setLoading(sendButton, true, "Sending…");

  showMessage(
    chatField("chat-message-status"),
    ""
  );

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

    if (input) {
      input.value = "";
    }

    cancelReply();
  } catch (error) {
    console.error("Could not send chat message:", error);

    showMessage(
      chatField("chat-message-status"),
      "Your message could not be sent. Check your connection and Firestore rules.",
      "error"
    );
  } finally {
    setLoading(sendButton, false);
  }
}

chatField(
  "chat-message-form",
  "chat-form"
)?.addEventListener("submit", sendChatMessage);

// ======================================================
// 27. INITIALIZE THE WEBSITE
// ======================================================

// Display the built-in content while Firebase checks authentication.
// Protected sections are redirected to membership until sign-in succeeds.
renderStoryAndQuestions(defaultContent);

addGroupIcons();

if (window.location.hash) {
  const initialSection = window.location.hash.slice(1);

  if ($(initialSection) && initialSection !== "admin") {
    showSection(initialSection);
  } else {
    showSection("home");
  }
} else {
  showSection("home");
}
