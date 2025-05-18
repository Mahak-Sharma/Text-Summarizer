import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to start the backend server
function startBackend() {
    console.log('Starting backend server...');
    const backendPath = join(__dirname, 'backend');
    const venvPath = join(backendPath, 'venv', 'Scripts', 'python');
    
    const backend = spawn(venvPath, ['main.py'], {
        cwd: backendPath,
        shell: true
    });

    backend.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    backend.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });

    backend.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

// Function to start the frontend server
function startFrontend() {
    console.log('Starting frontend server...');
    const frontend = spawn('npm', ['run', 'dev'], {
        shell: true
    });

    frontend.stdout.on('data', (data) => {
        console.log(`Frontend: ${data}`);
    });

    frontend.stderr.on('data', (data) => {
        console.error(`Frontend Error: ${data}`);
    });

    frontend.on('close', (code) => {
        console.log(`Frontend process exited with code ${code}`);
    });
}

// Start both servers
startBackend();
startFrontend(); 