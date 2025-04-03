import React, { useState } from 'react';
import './Terminal.css';

interface TerminalProps {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
  accountId: string;
  roleName: string;
  onClose: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ credentials, accountId, roleName, onClose }) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    try {
      setIsExecuting(true);
      setOutput(prev => `${prev}\n$ ${command}\n`);
      
      // Execute the command via Electron
      const result = await window.awsSso.runTerminalCommand({
        command,
        env: {
          AWS_ACCESS_KEY_ID: credentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
          AWS_SESSION_TOKEN: credentials.sessionToken,
          AWS_REGION: 'us-east-1' // Default region, could be made configurable
        }
      });
      
      // Add command output
      if (result.stdout) {
        setOutput(prev => `${prev}${result.stdout}\n`);
      }
      
      if (result.stderr) {
        setOutput(prev => `${prev}${result.stderr}\n`);
      }
      
      // Clear the command input
      setCommand('');
    } catch (error) {
      console.error('Error executing command:', error);
      setOutput(prev => `${prev}Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <h3>Terminal - {accountId} ({roleName})</h3>
        <button onClick={onClose} className="close-button">×</button>
      </div>
      <div className="terminal-output">
        <pre>{output || `Connected to AWS account ${accountId} with role ${roleName}\nType AWS commands to interact with this account. For example:\n$ aws s3 ls\n$ aws ec2 describe-instances\n`}</pre>
      </div>
      <form onSubmit={handleCommandSubmit} className="terminal-input-form">
        <div className="terminal-prompt">$</div>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="terminal-input"
          placeholder={isExecuting ? "Executing..." : "Enter command..."}
          autoFocus
          disabled={isExecuting}
        />
      </form>
    </div>
  );
};

export default Terminal; 