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
// ANONYMOUS ID
// ========================================

function generateAnonymousID() {

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";


    const firstLetter =
        letters[Math.floor(Math.random() * letters.length)];


    const secondLetter =
        letters[Math.floor(Math.random() * letters.length)];


    const number =
        Math.floor(1000 + Math.random() * 9000);


    return "Anonymous-" +
        firstLetter +
        secondLetter +
        number;

}


const anonymousIDElement =
    document.getElementById("anonymous-id");


if (anonymousIDElement) {

    let anonymousID =
        localStorage.getItem("bibleStudyAnonymousID");


    if (!anonymousID) {

        anonymousID = generateAnonymousID();


        localStorage.setItem(
            "bibleStudyAnonymousID",
            anonymousID
        );

    }


    anonymousIDElement.textContent =
        anonymousID;

}


// ========================================
// TEMPORARY LOCAL CHAT
// ========================================

const chatForm =
    document.getElementById("chat-form");


const chatInput =
    document.getElementById("chat-message");


const chatMessages =
    document.getElementById("chat-messages");


if (chatForm && chatInput && chatMessages) {

    chatForm.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            const message =
                chatInput.value.trim();


            if (!message) {
                return;
            }


            const emptyMessage =
                chatMessages.querySelector(".empty-chat");


            if (emptyMessage) {
                emptyMessage.remove();
            }


            const messageContainer =
                document.createElement("div");


            messageContainer.className =
                "chat-message";


            const username =
                document.createElement("strong");


            username.textContent =
                anonymousIDElement.textContent;


            const messageText =
                document.createElement("p");


            messageText.textContent =
                message;


            messageContainer.appendChild(username);

            messageContainer.appendChild(messageText);


            chatMessages.appendChild(
                messageContainer
            );


            chatInput.value = "";


            chatMessages.scrollTop =
                chatMessages.scrollHeight;

        }
    );

}
