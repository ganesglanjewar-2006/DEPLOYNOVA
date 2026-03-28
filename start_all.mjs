import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const services = [
  {
    name: '🚀 DeployNova Backend',
    cwd: path.join(__dirname, 'autodevops', 'server'),
    command: 'npm',
    args: ['run', 'dev'],
    color: '\x1b[36m' // Cyan
  },
  {
    name: '🖥️ DeployNova Client',
    cwd: path.join(__dirname, 'autodevops', 'client'),
    command: 'npm',
    args: ['run', 'dev'],
    color: '\x1b[35m' // Magenta
  },
  {
    name: '🧠 LifeOS Brain',
    cwd: path.join(__dirname, 'lifeos', 'server'),
    command: 'npm',
    args: ['run', 'dev'],
    color: '\x1b[32m' // Green
  }
];

console.log('\x1b[1m\x1b[34m[Ecosystem] Starting all DeployNova services...\x1b[0m\n');

services.forEach(service => {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    shell: true,
    stdio: 'pipe'
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`${service.color}[${service.name}]\x1b[0m ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`${service.color}[${service.name}] ERROR:\x1b[0m ${data}`);
  });

  child.on('close', (code) => {
    console.log(`${service.color}[${service.name}]\x1b[0m process exited with code ${code}`);
  });
});
