Project for CPSC 362
Team #13

WeColor is a web-based collaborative pixel art canvas that allows users to select colors, place pixels on a grid, and create artwork together in real time.

Running the Project

This project is designed to run locally.
Because the backend must be running for the website to function, the site cannot be accessed from a normal URL unless the user has the full project code.

Requirements:
     Node.js installed
     Full project folder (front-end and backend)
     Clone of the GitHub repository
     How to Start the Backend
     Open the project in VS Code
     Open a terminal
     Navigate into the backend folder:
          cd backend
    Start the server:
          node server.js

You should see:
WeColor backend running on port 80

The backend must stay running the entire time you use the website.

How to Launch the Website:
     While the backend is running, open the front-end in the browser by visiting:
http://wecolor.local/index.html


This URL works only on the machine that is running the backend server.

Features:

Pixel Placement: Click any cell on the canvas to apply the selected color.
Color Selection: Choose from a full palette or use quick-select color buttons.
Grid Rendering: Dynamically generated grid for smooth drawing.
Zoom Controls: Zoom in or out for detailed work.
Cursor Hover Highlight: See which cell is currently targeted.
Clear Canvas (Admin Tool): Reset the entire canvas with one click.
Login Functionality: Allows users to log in or identify themselves.
Canvas Sync Behavior: Updates the canvas consistently while drawing.
