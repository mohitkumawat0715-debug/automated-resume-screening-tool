/* Follow the instructions found in the description to complete the JavaScript functionality.*/

let todoList = [{
    text: "Learn HTML"
},
{
    text: "Learn CSS"
},
{
    text: "Learn JavaScript"
}
];

function createAndAppendTodo(todo) {
let todoItemsContainerEl = document.getElementById("todoItemsContainer");
let todoElement = document.createElement("li");
todoElement.classList.add("todo-item-container", "d-flex", "flex-row");
todoItemsContainerEl.appendChild(todoElement);

let inputElement = document.createElement("input");
inputElement.type = "checkbox";
inputElement.id = "checkboxInput";
inputElement.classList.add("checkbox-input");
todoElement.appendChild(inputElement);

let labelContainer = document.createElement("div");
labelContainer.classList.add("d-flex", "flex-row", "label-container");
todoElement.appendChild(labelContainer);
console.log(todoElement);

let labelElement = document.createElement("label");
labelElement.setAttribute("for", "checkboxInput");
labelElement.classList.add("checkbox-label");
labelElement.textContent = todo.text;
labelContainer.appendChild(labelElement);

let deleteItemContainer = document.createElement("div");
deleteItemContainer.classList.add("delete-icon-container");
labelContainer.appendChild(deleteItemContainer);

let deleteIcon = document.createElement("i");
deleteIcon.classList.add("far", "fa-trash-alt", "delete-icon");
deleteItemContainer.appendChild(deleteIcon);

}
for (let eachTodo of todoList) {
createAndAppendTodo(eachTodo);

}