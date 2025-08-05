// Test script to verify WebSocket markdown rendering
const WebSocket = require('ws');

async function testMarkdownRendering() {
    console.log('Testing WebSocket markdown rendering...\n');
    
    const ws = new WebSocket('ws://localhost:3000/chat');
    const session = crypto.randomUUID();
    
    const testMessages = [
        {
            name: 'Simple markdown',
            text: 'Please respond with: # Test Header\n**Bold text** and *italic text*'
        },
        {
            name: 'Code block',
            text: 'Show me a code example with:\n```javascript\nconst x = 42;\nconsole.log(x);\n```'
        },
        {
            name: 'List and links',
            text: 'Create a list:\n- Item 1\n- Item 2\n\nAnd a [link](https://example.com)'
        },
        {
            name: 'Security test',
            text: 'Try to inject: <script>alert("XSS")</script>'
        }
    ];
    
    ws.on('open', () => {
        console.log('Connected to WebSocket server');
        
        // Send test message
        const testMsg = {
            type: 'prompt',
            session: session,
            workspace: 'test',
            text: testMessages[0].text
        };
        
        console.log(`Sending test: ${testMessages[0].name}`);
        ws.send(JSON.stringify(testMsg));
    });
    
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log('Received:', msg.type);
        
        if (msg.type === 'assistant_text_delta') {
            console.log('Streaming text:', msg.text.substring(0, 50) + '...');
        }
        
        if (msg.type === 'assistant_text_end') {
            console.log('Message complete\n');
        }
    });
    
    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });
    
    ws.on('close', () => {
        console.log('Connection closed');
    });
}

// Run test if this script is executed directly
if (require.main === module) {
    testMarkdownRendering().catch(console.error);
}