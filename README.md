# 🎨 Collaborative Drawing App

A sleek, browser-based sketching application featuring real-time synchronization. Built with the native Canvas API and powered by WebSockets, it allows users to jump into shared rooms and create art together instantly.

---

## Live Demo

| Version | Description | Link |
| :--- | :--- | :--- |
| **Frontend Only** | Static version (Client-side only). No real-time sync. | [View Demo](https://jaydeep077.github.io/Drawing_app) |
| **Collaborative** | Full suite with Node.js & WebSocket synchronization. | [Join Room](https://drawing-app-v2mx.onrender.com) |

---

##  Tech Stack

### Frontend
* **Canvas API**
* **JavaScript**
* **CSS3** 

### Backend
* **Node.js:** The runtime environment.
* **WS (WebSocket Library):** Handles low-latency, bidirectional communication.

---

##   Architecture



When a user draws on the canvas, the coordinates are captured and sent via WebSockets to the Node.js server. The server then broadcasts these coordinates to all other connected clients in that specific room, who render the lines on their local canvas.

---

##  Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Jaydeep077/Drawing_app.git](https://github.com/Jaydeep077/Drawing_app.git)
   cd Drawing_app

2. **Install dependencies:**
```bash
npm install
```
3. **Start the server:**
```bash
node server.js
```
**Access the App:**
Open your browser and navigate to: 
```bash
 http://localhost:3000
 ```

How to Collaborate
To draw with friends, simply append a room ID to your URL. Anyone using the same room ID will be connected to the same canvas in real-time.

Example URL:

https://drawing-app-v2mx.onrender.com/?room=my-secret-room
