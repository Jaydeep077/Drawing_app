const canvas = document.querySelector("canvas"),
toolBtns = document.querySelectorAll(".tool"),
fillColor = document.querySelector("#fill-color"),
sizeSlider = document.querySelector("#size-slider"),
colorBtns = document.querySelectorAll(".colors .option"),
colorPicker = document.querySelector("#color-picker"),
clearCanvas = document.querySelector(".clear-canvas"),
saveImg = document.querySelector(".save-img"),
ctx = canvas.getContext("2d");

// global variables with default value
let prevMouseX, prevMouseY, snapshot,
isDrawing = false,
selectedTool = "brush",
brushWidth = 5,
selectedColor = "#000";

const setCanvasBackground = () => {
    // setting whole canvas background to white, so the downloaded img background will be white
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = selectedColor; // setting fillstyle back to the selectedColor, it'll be the brush color
}

window.addEventListener("load", () => {
  
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    setCanvasBackground();
});

const drawRect = (e) => {
    
    if(!fillColor.checked) {
    //shape with border
        return ctx.strokeRect(e.offsetX, e.offsetY, prevMouseX - e.offsetX, prevMouseY - e.offsetY);
    }
    //fill the shape with color
    ctx.fillRect(e.offsetX, e.offsetY, prevMouseX - e.offsetX, prevMouseY - e.offsetY);
}

const drawCircle = (e) => {
    ctx.beginPath(); 
    let radius = Math.sqrt(Math.pow((prevMouseX - e.offsetX), 2) + Math.pow((prevMouseY - e.offsetY), 2));
    ctx.arc(prevMouseX, prevMouseY, radius, 0, 2 * Math.PI); 
    fillColor.checked ? ctx.fill() : ctx.stroke(); 
}

const drawTriangle = (e) => {
    ctx.beginPath(); // creating new path to draw circle
    ctx.moveTo(prevMouseX, prevMouseY); // moving triangle to the mouse pointer
    ctx.lineTo(e.offsetX, e.offsetY); // creating first line according to the mouse pointer
    ctx.lineTo(prevMouseX * 2 - e.offsetX, e.offsetY); // creating bottom line of triangle
    ctx.closePath(); // closing path of a triangle so the third line draw automatically
    fillColor.checked ? ctx.fill() : ctx.stroke(); // if fillColor is checked fill triangle else draw border
}

const startDraw = (e) => {
    isDrawing = true;

    // Save current canvas state for Undo
    saveHistory();

    prevMouseX = e.offsetX; // Save starting mouse X position
    prevMouseY = e.offsetY; // Save starting mouse Y position
    ctx.beginPath(); // Start new drawing path
    ctx.lineWidth = brushWidth; // Set brush width
    ctx.strokeStyle = selectedColor; // Set stroke color
    ctx.fillStyle = selectedColor; // Set fill color

    // Save snapshot of canvas before drawing
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
};


const drawing = (e) => {
    if(!isDrawing){
     return; // if isDrawing is false return from here
    }
    ctx.putImageData(snapshot, 0, 0);

    if(selectedTool === "brush" || selectedTool === "eraser") {
        // if selected tool is eraser then set strokeStyle to white 
        // to paint white color on to the existing canvas content else set the stroke color to selected color
        ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor;
        ctx.lineTo(e.offsetX, e.offsetY); // creating line according to the mouse pointer
        ctx.stroke(); // drawing/filling line with color
    } else if(selectedTool === "rectangle"){
        drawRect(e);
    } else if(selectedTool === "circle"){
        drawCircle(e);
    } else {
        drawTriangle(e);
    }
}

toolBtns.forEach(btn => {
    btn.addEventListener("click", () => { // adding click event to all tool option
        // removing active class from the previous option and adding on current clicked option
        document.querySelector(".options .active").classList.remove("active");
        btn.classList.add("active");
        selectedTool = btn.id;
    });
});

sizeSlider.addEventListener("change", () => brushWidth = sizeSlider.value); // passing slider value as brushSize

colorBtns.forEach(btn => {
    btn.addEventListener("click", () => { // adding click event to all color button
        // removing selected class from the previous option and adding on current clicked option
        document.querySelector(".options .selected").classList.remove("selected");
        btn.classList.add("selected");
        // passing selected btn background color as selectedColor value
        selectedColor = window.getComputedStyle(btn).getPropertyValue("background-color");
    });
});

colorPicker.addEventListener("change", () => {
    // passing picked color value from color picker to last color btn background
    selectedColor = colorPicker.value;
    ctx.strokeStyle=selectedColor;
    
});

clearCanvas.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // clearing whole canvas
    setCanvasBackground();
});

document.querySelector(".save-img").addEventListener("click", () => {
    const link = document.createElement("a");
    const format = document.querySelector("#format-selector").value;

    if (format === "svg") {
        // Convert canvas to SVG
        const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
            <foreignObject width="100%" height="100%">
                <canvas xmlns="http://www.w3.org/1999/xhtml" width="${canvas.width}" height="${canvas.height}">
                    ${canvas.toDataURL()}
                </canvas>
            </foreignObject>
        </svg>`;

        const blob = new Blob([svgData], { type: "image/svg+xml" });
        link.href = URL.createObjectURL(blob);
        link.download = "drawing.svg";
    } else {
        // Save as PNG or JPG
        link.download = `drawing.${format}`;
        link.href = canvas.toDataURL(`image/${format}`);
    }

    link.click();
});


canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", drawing);
canvas.addEventListener("mouseup", () => isDrawing = false);
// History stacks for undo/redo
let history = [], redoStack = [];

// Function to save canvas state
const saveHistory = () => {
    if (history.length > 10) history.shift(); // Limit history size
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    redoStack = []; // Clear redo stack when new action occurs
};

// Undo function
document.querySelector(".undo").addEventListener("click", () => {
    if (history.length > 0) {
        redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); // Save current state to redo stack
        ctx.putImageData(history.pop(), 0, 0); // Restore previous state
    }
});

// Redo function
document.querySelector(".redo").addEventListener("click", () => {
    if (redoStack.length > 0) {
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); // Save current state to history stack
        ctx.putImageData(redoStack.pop(), 0, 0); // Restore next state
    }
});

//mobile
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault(); // Prevent scrolling
    startDraw(e.touches[0]);
});

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault(); // Prevent scrolling
    drawing(e.touches[0]);
});

canvas.addEventListener("touchend", () => isDrawing = false);

