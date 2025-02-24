export default function msgBox(title, contents, status) {
    // Check if there's a msg-box element already
    var box = document.querySelector(".msg-box")
    if (!box) {
        box = document.createElement("div")
        box.className = "msg-box"
        box.id = "msg-box"
        document.body.appendChild(box);
    }

    const html = `
    <div class = "msg-box-title">
        ${title}
    </div>
    <div class = "msg-box-container">
    <div class = "msg-box-body" id = "msg-box-body">
    </div>
    <div class = "msg-box-body">
    <br/>
    <button type = "submit" data-prevent-double-click="true" class="msg-box-button" data-module="govuk-button" id="msgbox-ok">
     Dismiss 
    </button>
    </div>
    </div>
    `
    // bad
    box.innerHTML = html
    // Add in body element
    document.getElementById("msg-box-body").appendChild(contents)


    // Remove box when clicking button
    document.getElementById("msgbox-ok").addEventListener("click", (event) => {
            document.getElementById("msg-box").remove();
        }
    )
}