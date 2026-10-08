// ========================================
// BIBLE STUDY APP - JAVASCRIPT
// ========================================


// ========================================
// WELCOME BUTTON
// ========================================

const enterButton = document.querySelector("header button");

if (enterButton) {
    enterButton.addEventListener("click", function () {

        const storySection = document.getElementById("story");

        if (storySection) {
            storySection.scrollIntoView({
                behavior: "smooth"
            });
        }

    });
}


// ========================================
// CHAT
// ========================================

const chatForm = document.getElementById("chat-form");

const chatInput = document.getElementById("chat-message");

const chatMessages = document.getElementById("chat-messages");


if (chatForm && chatInput && chatMessages) {

    chatForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const message = chatInput.value.trim();

        // Do nothing if message is empty
        if (message === "") {
            return;
        }


        // Create message container
        const messageElement = document.createElement("div");

        messageElement.classList.add("chat-message");


        // Create anonymous user label
        const userElement = document.createElement("strong");

        userElement.textContent = "Anonymous";


        // Create message text
        const textElement = document.createElement("p");

        textElement.textContent = message;


        // Put username and message together
        messageElement.appendChild(userElement);

        messageElement.appendChild(textElement);


        // Remove "No messages yet" text
        const emptyMessage = chatMessages.querySelector("p");

        if (
            emptyMessage &&
            emptyMessage.textContent === "No messages yet."
        ) {
            chatMessages.innerHTML = "";
        }


        // Add message to chat
        chatMessages.appendChild(messageElement);


        // Clear input
        chatInput.value = "";


        // Scroll to newest message
        chatMessages.scrollTop = chatMessages.scrollHeight;

    });

}


// ========================================
// TEMPORARY ANONYMOUS ID
// ========================================

function generateAnonymousID() {

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const firstLetter =
        letters[Math.floor(Math.random() * letters.length)];

    const secondLetter =
        letters[Math.floor(Math.random() * letters.length)];


    const number =
        Math.floor(1000 + Math.random() * 9000);


    return "Anonymous-" + firstLetter + secondLetter + number;
}


const anonymousUser =
    document.querySelector("#anonymous-user strong");


if (anonymousUser) {

    const savedID =
        localStorage.getItem("bibleStudyAnonymousID");


    if (savedID) {

        anonymousUser.textContent = savedID;

    } else {

        const newID = generateAnonymousID();

        localStorage.setItem(
            "bibleStudyAnonymousID",
            newID
        );

        anonymousUser.textContent = newID;
    }

}


// ========================================
// CONSOLE MESSAGE
// ========================================

console.log(
    "St. Monica LK3C Bible Study app loaded successfully."
);
