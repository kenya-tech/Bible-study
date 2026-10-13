
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// Firebase project already used by the St. Monica LK3C Bible Study website.
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

const GROUPS = {
  "charles-lwanga": { name: "St. Charles Lwanga", countId: "count-charles-lwanga" },
  "st-williams": { name: "St. Williams", countId: "count-st-williams" },
  "st-camillas": { name: "St. Camillas", countId: "count-st-camillas" },
  "mathias-mulumba": { name: "St. Mathias Mulumba", countId: "count-mathias-mulumba" },
  "st-vincent": { name: "St. Vincent", countId: "count-st-vincent" }
};

const $ = id => document.getElementById(id);
const membershipChoice = $("membership-choice");
const membershipForms = $("membership-forms");
const membershipForm = $("membership-form");
const loginForm = $("membership-login-form");
const membershipStatus = $("membership-status");
const membershipMessage = $("membership-message");
const loginMessage = $("membership-login-message");
const memberGroupsContent = $("member-groups-content");
const chatLogin = $("chat-login");
const chatRoom = $("chat-room");
const chatMessages = $("chat-messages");

let currentUser = null;
let currentMember = null;
let unsubscribeChat = null;
let unsubscribeGroupCounts = null;
let replyToMessage = null;
let registrationInProgress = false;
let profileLoadVersion = 0;
let chatTouchStartX = null;

function showMessage(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
}
function hide(element) { if (element) element.hidden = true; }
function show(element) { if (element) element.hidden = false; }
function setLoading(button, loading, text = "Please wait…") {
  if (!button) return;
  if (loading) {
    if (!button.disabled) button.dataset.originalText = button.textContent;
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
function normalizePhoneNumber(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "254" + digits.slice(1);
  else if (digits.startsWith("7") || digits.startsWith("1")) digits = "254" + digits;
  return /^254[17]\d{8}$/.test(digits) ? digits : null;
}
function phoneToEmail(phoneDigits) {
  return `${phoneDigits}@members.stmonicalk3c.invalid`;
}
function authError(error) {
  const messages = {
    "auth/email-already-in-use": "An account already exists with this phone number. Please log in.",
    "auth/invalid-email": "The account details are invalid.",
    "auth/weak-password": "Your password must contain at least 6 characters.",
    "auth/invalid-credential": "Incorrect phone number or password.",
    "auth/user-not-found": "No account was found. Please register first.",
    "auth/wrong-password": "Incorrect phone number or password.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase."
  };
  return messages[error?.code] || "Something went wrong. Check your connection and try again.";
}

// Membership screen controls.
function showMembershipChoice() {
  show(membershipChoice); hide(membershipForms); hide(membershipStatus);
  hide(membershipForm); hide(loginForm);
  showMessage(membershipMessage, ""); showMessage(loginMessage, "");
}
function showRegistrationForm() {
  hide(membershipChoice); show(membershipForms); show(membershipForm); hide(loginForm); hide(membershipStatus);
  showMessage(membershipMessage, "");
}
function showLoginForm() {
  hide(membershipChoice); show(membershipForms); hide(membershipForm); show(loginForm); hide(membershipStatus);
  showMessage(loginMessage, "");
}
$("show-register-btn")?.addEventListener("click", showRegistrationForm);
$("show-login-btn")?.addEventListener("click", showLoginForm);
$("switch-to-login-btn")?.addEventListener("click", showLoginForm);
$("switch-to-register-btn")?.addEventListener("click", showRegistrationForm);
document.querySelectorAll(".back-to-choice").forEach(button =>
  button.addEventListener("click", showMembershipChoice)
);

// Page navigation. Logged-out visitors can read the story, questions and prayers;
// membership is required for the group area and public chat.
function showSection(sectionId) {
  if (!$(sectionId)) sectionId = "home";
  if ((sectionId === "public-chat" || sectionId === "admin") && !currentUser) {
    sectionId = "membership";
  }
  if (sectionId === "admin" && currentUser?.uid !== ADMIN_UID) {
    sectionId = "home";
  }

  document.querySelectorAll(".page-section").forEach(section =>
    section.classList.remove("active-section")
  );

  const section = $(sectionId);
  if (section) {
    section.hidden = false;
    section.classList.add("active-section");
  }

  document.body.classList.toggle("auth-locked", !currentUser);
  if (memberGroupsContent) memberGroupsContent.hidden = !currentMember;

  if (window.location.hash !== `#${sectionId}`) {
    history.replaceState(null, "", `#${sectionId}`);
  }
  if (sectionId === "public-chat") prepareChat();
}
window.showSection = showSection;

document.querySelectorAll("[data-section]").forEach(element =>
  element.addEventListener("click", event => {
    event.preventDefault();
    showSection(element.dataset.section);
  })
);

// Register member account. Phone numbers are converted to an internal email-format
// identifier because Firebase Email/Password authentication does not accept
// phone numbers as usernames.
async function registerMember(event) {
  event.preventDefault();

  const fullName = $("member-full-name")?.value.trim() || "";
  const phoneNumber = normalizePhoneNumber($("member-phone")?.value);
  const password = $("member-password")?.value || "";
  const groupId = $("member-group")?.value || "";

  if (fullName.length < 2 || fullName.length > 80) {
    return showMessage(membershipMessage, "Enter your full name.", "error");
  }
  if (!phoneNumber) {
    return showMessage(membershipMessage, "Enter a valid Kenyan phone number, e.g. 0712345678.", "error");
  }
  if (password.length < 6) {
    return showMessage(membershipMessage, "Your password must contain at least 6 characters.", "error");
  }
  if (!GROUPS[groupId]) {
    return showMessage(membershipMessage, "Please select a Bible study group.", "error");
  }

  registrationInProgress = true;
  setLoading($("membership-submit"), true, "Creating account…");
  showMessage(membershipMessage, "Creating your account…");

  let createdUser = null;

  try {
    const credential = await createUserWithEmailAndPassword(
      auth, phoneToEmail(phoneNumber), password
    );
    createdUser = credential.user;

    const batch = writeBatch(db);
    batch.set(doc(db, "members", createdUser.uid), {
      fullName, phoneNumber, groupId, createdAt: serverTimestamp()
    });
    batch.set(doc(db, "groupMemberships", createdUser.uid), {
      groupId, joinedAt: serverTimestamp()
    });

    await batch.commit();

    currentUser = createdUser;
    currentMember = { fullName, phoneNumber, groupId };
    $("member-password").value = "";

    await displayMemberScreen(createdUser, currentMember);
  } catch (error) {
    console.error("Registration error:", error);
    showMessage(membershipMessage, authError(error), "error");

    if (createdUser) {
      try { await signOut(auth); } catch (e) { console.error(e); }
    }
  } finally {
    registrationInProgress = false;
    setLoading($("membership-submit"), false);
  }
}
membershipForm?.addEventListener("submit", registerMember);

async function loginMember(event) {
  event.preventDefault();

  const phoneNumber = normalizePhoneNumber($("login-member-phone")?.value);
  const password = $("login-member-password")?.value || "";

  if (!phoneNumber) {
    return showMessage(loginMessage, "Enter the Kenyan phone number you used to register.", "error");
  }
  if (!password) {
    return showMessage(loginMessage, "Enter your password.", "error");
  }

  setLoading($("membership-login-submit"), true, "Signing in…");
  showMessage(loginMessage, "Checking your account…");

  try {
    const credential = await signInWithEmailAndPassword(
      auth, phoneToEmail(phoneNumber), password
    );
    const profile = await getDoc(doc(db, "members", credential.user.uid));

    if (!profile.exists()) {
      await signOut(auth);
      return showMessage(
        loginMessage,
        "Your member profile could not be found. Please contact the Bible study leadership.",
        "error"
      );
    }

    currentUser = credential.user;
    currentMember = profile.data();
    $("login-member-password").value = "";

    await displayMemberScreen(currentUser, currentMember);
  } catch (error) {
    console.error("Login error:", error);
    showMessage(loginMessage, authError(error), "error");
  } finally {
    setLoading($("membership-login-submit"), false);
  }
}
loginForm?.addEventListener("submit", loginMember);

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
      : "Your membership is active.";

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "membership-submit";
    logout.textContent = "Sign Out";
    logout.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (e) {
        console.error(e);
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
  show(memberGroupsContent);
  document.body.classList.remove("auth-locked");

  if (user.uid === ADMIN_UID) {
    show($("admin"));
    await loadAdminContent();
  } else {
    hide($("admin"));
  }

  showSection("home");
}

onAuthStateChanged(auth, async user => {
  currentUser = user;
  const check = ++profileLoadVersion;

  if (!user) {
    currentMember = null;

    if (unsubscribeChat) {
      unsubscribeChat();
      unsubscribeChat = null;
    }

    hide(chatRoom);
    show(chatLogin);
    hide($("admin"));
    document.body.classList.add("auth-locked");

    if (memberGroupsContent) memberGroupsContent.hidden = true;
    showMembershipChoice();
    return;
  }

  if (registrationInProgress) return;

  try {
    const profile = await getDoc(doc(db, "members", user.uid));
    if (check !== profileLoadVersion) return;

    // The admin may have been created before the member registration system.
    if (!profile.exists() && user.uid === ADMIN_UID) {
      currentMember = { fullName: "Administrator", groupId: "" };
      await displayMemberScreen(user, currentMember);
      return;
    }

    if (!profile.exists()) {
      currentMember = null;
      await signOut(auth);
      return;
    }

    currentMember = profile.data();
    await displayMemberScreen(user, currentMember);
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

// Group counts update live. If read rules block this collection, the rest of the site still works.
function startGroupCountListener() {
  if (unsubscribeGroupCounts) unsubscribeGroupCounts();

  unsubscribeGroupCounts = onSnapshot(collection(db, "groupMemberships"), snapshot => {
    const counts = Object.fromEntries(
      Object.keys(GROUPS).map(id => [id, 0])
    );

    snapshot.forEach(item => {
      const id = item.data().groupId;
      if (Object.hasOwn(counts, id)) counts[id]++;
    });

    Object.entries(GROUPS).forEach(([id, group]) => {
      const el = $(group.countId);
      if (el) el.textContent = `Members: ${counts[id]}`;
    });
  }, error => console.warn("Group counts unavailable:", error));
}
startGroupCountListener();

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

function getQuestionCards() {
  return [...document.querySelectorAll("#questions .question-card")];
}

function renderStoryAndQuestions(content) {
  const storySection = $("story");
  const storyHeading = storySection?.querySelector(".section-heading h2");
  const storySubtitle = storySection?.querySelector(".section-heading p");
  const storyCard = storySection?.querySelector(".story-card");

  if (storyHeading) {
    storyHeading.textContent = content.title || defaultContent.title;
  }

  if (storySubtitle) {
    storySubtitle.textContent = content.subtitle || defaultContent.subtitle;
  }

  if (storyCard) {
    storyCard.replaceChildren();

    String(content.story || "")
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .forEach(paragraph => {
        const p = document.createElement("p");
        p.textContent = paragraph;
        storyCard.appendChild(p);
      });
  }

  const cards = getQuestionCards();

  (content.questions || defaultContent.questions).forEach((question, index) => {
    const card = cards[index];
    if (!card) return;

    const heading = card.querySelector("h3");
    const paragraph = card.querySelector("p");

    if (heading) {
      heading.textContent = question.title || `Question ${index + 1}`;
    }

    if (paragraph) {
      paragraph.textContent = question.text || "";
    }
  });
}

function fillAdminForm(content) {
  $("admin-story-title").value =
    content.title || defaultContent.title;

  $("admin-story-subtitle").value =
    content.subtitle || defaultContent.subtitle;

  $("admin-story-text").value =
    content.story || defaultContent.story;

  defaultContent.questions.forEach((fallback, i) => {
    const q = content.questions?.[i] || fallback;

    $(`admin-question-${i + 1}-title`).value = q.title || "";
    $(`admin-question-${i + 1}-text`).value = q.text || "";
  });
}

function readAdminForm() {
  return {
    title: $("admin-story-title").value.trim(),

    subtitle: $("admin-story-subtitle").value.trim(),

    story: $("admin-story-text").value.trim(),

    questions: defaultContent.questions.map((_, i) => ({
      title: $(`admin-question-${i + 1}-title`).value.trim(),
      text: $(`admin-question-${i + 1}-text`).value.trim()
    }))
  };
}

async function loadAdminContent() {
  if (currentUser?.uid !== ADMIN_UID) return;

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
      $("admin-save-message"),
      snapshot.exists()
        ? "Your saved content is loaded."
        : "Default content loaded. Save changes to store it in Firebase."
    );
  } catch (error) {
    console.error("Could not load study content:", error);

    renderStoryAndQuestions(defaultContent);
    fillAdminForm(defaultContent);

    showMessage(
      $("admin-save-message"),
      "Could not load saved content. Check Firestore rules and try again.",
      "error"
    );
  }
}

$("admin-save-content-btn")?.addEventListener("click", async () => {
  if (currentUser?.uid !== ADMIN_UID) {
    showMessage(
      $("admin-save-message"),
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
      $("admin-save-message"),
      "Please complete the story title, story text, and all five question titles and prompts.",
      "error"
    );
    return;
  }

  const button = $("admin-save-content-btn");
  setLoading(button, true, "Saving…");

  showMessage(
    $("admin-save-message"),
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

    showMessage(
      $("admin-save-message"),
      "Saved successfully. The updated story and questions are now live."
    );
  } catch (error) {
    console.error("Content save failed:", error);

    showMessage(
      $("admin-save-message"),
      "Save failed. Confirm the Firestore studyContent rule allows your admin UID to write.",
      "error"
    );
  } finally {
    setLoading(button, false);
  }
});

// Everyone receives content changes live when the admin saves.
onSnapshotContent();

function onSnapshotContent() {
  onSnapshot(
    doc(db, "studyContent", "weeklyStudy"),
    snapshot => {
      if (snapshot.exists()) {
        renderStoryAndQuestions({
          ...defaultContent,
          ...snapshot.data()
        });
      } else {
        renderStoryAndQuestions(defaultContent);
      }
    },
    error => {
      console.warn(
        "Live content updates unavailable; using built-in content:",
        error
      );
      renderStoryAndQuestions(defaultContent);
    }
  );
}

function listenForChatMessages() {
  if (!chatMessages || !currentUser) return;

  if (unsubscribeChat) unsubscribeChat();

  const q = query(
    collection(db, "publicChatMessages"),
    orderBy("timestamp", "asc"),
    limit(100)
  );

  unsubscribeChat = onSnapshot(
    q,
    snapshot => {
      chatMessages.replaceChildren();

      if (snapshot.empty) {
        const empty = document.createElement("p");
        empty.className = "chat-empty-state";
        empty.textContent = "Be the first to start the conversation.";
        chatMessages.appendChild(empty);
        return;
      }

      snapshot.forEach(item => renderChatMessage(item.id, item.data()));
      chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    error => {
      console.error("Chat listener error:", error);
      showMessage(
        $("chat-login-message"),
        "Unable to load chat. Check your Firestore rules and internet connection.",
        "error"
      );
    }
  );
}

function renderChatMessage(id, message) {
  const own = Boolean(
    currentUser?.uid && message.uid === currentUser.uid
  );

  const wrapper = document.createElement("div");
  wrapper.className = own
    ? "message-wrapper own-message"
    : "message-wrapper other-message";

  wrapper.dataset.messageId = id;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  if (message.replyText) {
    const quote = document.createElement("div");
    quote.className = "reply-preview";

    const who = document.createElement("strong");
    who.textContent = message.replyUser || "Member";

    const quoteText = document.createElement("p");
    quoteText.textContent = message.replyText;

    quote.append(who, quoteText);
    bubble.appendChild(quote);
  }

  const name = document.createElement("strong");
  name.className = "message-user";
  name.textContent = own ? "You" : (message.user || "Member");

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

  const reply = document.createElement("button");
  reply.type = "button";
  reply.className = "reply-message-button";
  reply.textContent = "Reply";

  reply.addEventListener("click", () => {
    setReply({ ...message, id });
  });

  wrapper.appendChild(reply);

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
      if (
        chatTouchStartX !== null &&
        chatTouchStartX - event.changedTouches[0].screenX > 65
      ) {
        setReply({ ...message, id });
      }

      chatTouchStartX = null;
    },
    { passive: true }
  );

  chatMessages.appendChild(wrapper);
}

function setReply(message) {
  replyToMessage = {
    id: message.id || "",
    user: message.user || "Member",
    text: message.text || ""
  };

  if ($("reply-preview")) {
    $("reply-preview").style.display = "flex";
  }

  $("reply-preview-user").textContent = replyToMessage.user;
  $("reply-preview-text").textContent = replyToMessage.text;

  $("message-input")?.focus();
}

$("cancel-reply-btn")?.addEventListener("click", () => {
  replyToMessage = null;

  if ($("reply-preview")) {
    $("reply-preview").style.display = "none";
  }

  $("reply-preview-user").textContent = "";
  $("reply-preview-text").textContent = "";
});

// Change chat display name.
function changeChatName() {
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

  $("current-user-name").textContent = name;

  if ($("anonymous-name")) {
    $("anonymous-name").value = name;
  }
}

$("change-name-btn")?.addEventListener("click", changeChatName);
$("change-name-bottom-btn")?.addEventListener("click", changeChatName);

// Emoji picker.
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
    index < 0 ||
    index >= emojis.length ||
    !Number.isInteger(index)
  ) {
    alert("Choose a number from 1 to 10.");
    return;
  }

  $("message-input").value += emojis[index];
  $("message-input").focus();
});

// Send a public chat message.
$("chat-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser || !currentMember) {
    alert("Please sign in before sending a message.");
    showSection("membership");
    return;
  }

  const text = $("message-input")?.value.trim() || "";

  if (!text) return;

  if (text.length > 500) {
    alert("Messages cannot exceed 500 characters.");
    return;
  }

  setLoading($("send-message-btn"), true, "Sending…");

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

    $("message-input").value = "";
    replyToMessage = null;

    if ($("reply-preview")) {
      $("reply-preview").style.display = "none";
    }
  } catch (error) {
    console.error("Could not send chat message:", error);

    alert(
      "Your message could not be sent. Check your connection and Firestore rules."
    );
  } finally {
    setLoading($("send-message-btn"), false);
  }
});

// Initialize the page.
renderStoryAndQuestions(defaultContent);

if (window.location.hash && $(window.location.hash.slice(1))) {
  const initial = window.location.hash.slice(1);

  if (initial !== "admin") {
    showSection(initial);
  }
} else {
  showSection("home");
}
