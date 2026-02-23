const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 850,
    height: 1050,
    webPreferences: {
      preload: path.join(__dirname,'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:false
    },
  });

  win.loadURL('http://localhost:5173');
}

app.whenReady().then(() => {
  createWindow();

  const pyPath = path.join(__dirname, 'python', 'input_listen.py');
  const py = spawn('python3', ['-u',pyPath]);
  
  py.stdout.on('data', (data) => {
    const lines = data.toString().trim().split("\n");
    //console.log(lines)
    lines.forEach(line => {
      try {
      const event = JSON.parse(line);
      sendEvent(event);   // send OBJECT not string
    } catch (err) {
      //Not everything is a JSON line. Potentially Ignore, display message. 
      //Most likely the detects so   
      sendEvent(line);
        
      }
    });
  });
  
});

function sendEvent(event)
{
  win.webContents.send("input-event", event);
}