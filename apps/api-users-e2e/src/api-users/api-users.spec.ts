import { spawn } from 'child_process';
import { join } from 'path';
import axios from 'axios';

describe('CLI tests', () => {
  it('should print a message', async() => {
    const cliPath = join(process.cwd(), 'apps/api-users/dist');
    const processServer = spawn('node', [cliPath]);
    await new Promise(res => setTimeout(res, 1000)); // aguarda subir
    const response = await axios.get('http://localhost:3000');
    expect(response.status).toBe(200);
    processServer.kill()
  });
});