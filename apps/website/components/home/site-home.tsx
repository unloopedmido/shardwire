'use client';

import Link from 'next/link';
import { Highlight, themes } from 'prism-react-renderer';

const installCommand = "npm install shardwire";

const botCode = `import { createBotBridge } from 'shardwire';

// 1. Bot process: gateway + bridge server
const bridge = createBotBridge({
  token: process.env.DISCORD_TOKEN!,
  intents: ['Guilds', 'GuildMessages', 'GuildMembers', 'MessageContent'],
  server: {
    port: 3001,
    secrets: [process.env.SHARDWIRE_SECRET!],
  },
});

await bridge.ready();`;

const appCode = `import { connectBotBridge } from 'shardwire';

// 2. App process: WebSocket client + typed subscriptions
const app = connectBotBridge({
  url: 'ws://127.0.0.1:3001/shardwire',
  secret: process.env.SHARDWIRE_SECRET!,
  appName: 'dashboard',
});

app.on('messageCreate', ({ message }) => {
  console.log('message', message.channelId, message.content);
});

await app.ready();`;

type TerminalWindowProps = {
  children: React.ReactNode;
  title?: string;
};

function TerminalWindow({ children, title }: TerminalWindowProps) {
  return (
    <div className="bg-[color:var(--site-background-elevated)] border border-[color:var(--site-line)] rounded-xl shadow-2xl w-full overflow-hidden">
      <div className="border-b border-[color:var(--site-line)] px-3 py-2 flex items-center gap-1.5 bg-[color:var(--site-background)]">
        <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm" />
        <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm" />
        {title ? (
          <div className="font-mono text-xs text-[color:var(--color-fd-muted-foreground)] ml-4">
            {title}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

type SyntaxCodeBlockProps = {
  code: string;
  filename: string;
};

function SyntaxCodeBlock({ code, filename }: SyntaxCodeBlockProps) {
  return (
    <div className="overflow-x-auto">
      <div className="font-mono text-xs text-[color:var(--color-fd-muted-foreground)] mb-4">
        {filename}
      </div>
      <Highlight code={code} language="tsx" theme={themes.oneDark}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} font-mono text-[13px] leading-relaxed m-0`}
            style={{ ...style, backgroundColor: 'transparent', margin: 0 }}
          >
            {tokens.map((line, lineIndex) => (
              <div key={lineIndex} {...getLineProps({ line })}>
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

export function SiteHome() {
  return (
    <main className="min-h-screen bg-[color:var(--site-background)] font-sans text-[color:var(--site-foreground)]">
      {/* Hero Section */}
      <section className="px-6 py-24 sm:py-32 max-w-5xl mx-auto border-x border-[color:var(--site-line)] min-h-screen flex flex-col justify-center">
        
        <div className="space-y-6 max-w-2xl mb-12">
          <div className="flex items-center gap-3 text-[color:var(--color-fd-muted-foreground)] font-mono text-xs uppercase tracking-widest">
            <span className="w-2 h-2 bg-[color:var(--site-foreground)] rounded-full animate-pulse opacity-50" />
            Runtime Separation for Discord
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-[color:var(--site-foreground)] m-0 p-0 leading-tight">
            Keep the gateway stable. <br />
            <span className="text-[color:var(--color-fd-muted-foreground)]">Move the rest independently.</span>
          </h1>
          
          <p className="text-base text-[color:var(--color-fd-muted-foreground)] leading-relaxed max-w-xl">
            Shardwire splits Discord event runtime from the app code that consumes it. A TypeScript-first bridge with scoped secrets, strict startup contracts, and generated reference docs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--site-line)] border border-[color:var(--site-line)] rounded-sm overflow-hidden mb-12">
          {/* Quick Start pane */}
          <div className="bg-[color:var(--site-background)] p-6 sm:p-8 flex flex-col">
            <h2 className="text-sm font-mono text-[color:var(--site-foreground)] mb-4 flex items-center gap-2">
              <span className="text-[color:var(--color-fd-muted-foreground)]">01.</span> Install
            </h2>
            <TerminalWindow>
              <div className="p-4 font-mono text-sm text-[color:var(--site-foreground)] overflow-x-auto">
                <span className="text-[color:var(--color-fd-muted-foreground)] select-none mr-3">$</span>
                <span>{installCommand}</span>
              </div>
            </TerminalWindow>
            
            <div className="mt-auto pt-8">
              <Link 
                href="/docs/getting-started" 
                className="inline-flex items-center text-sm font-medium text-[color:var(--site-foreground)] hover:text-[color:var(--color-fd-muted-foreground)] transition-colors"
              >
                Read the getting started guide 
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
          
          {/* View Docs pane */}
          <div className="bg-[color:var(--site-background)] p-6 sm:p-8 flex flex-col">
            <h2 className="text-sm font-mono text-[color:var(--site-foreground)] mb-4 flex items-center gap-2">
              <span className="text-[color:var(--color-fd-muted-foreground)]">02.</span> Reference
            </h2>
            <p className="text-sm text-[color:var(--color-fd-muted-foreground)] mb-6">
              Full API surfaces generated directly from TypeScript source code. Browse the bridge architecture, transports, and strictly-typed events.
            </p>
            <div className="mt-auto">
              <Link 
                href="/docs/reference" 
                className="inline-flex items-center px-4 py-2 bg-[color:var(--site-foreground)] text-[color:var(--site-background)] text-sm font-medium hover:opacity-80 transition-opacity rounded-sm"
              >
                Browse API Reference
              </Link>
            </div>
          </div>
        </div>

        {/* Code Example Section */}
        <TerminalWindow title="Split Architecture Example">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-[color:var(--site-line)] divide-y md:divide-y-0">
            <div className="p-6 overflow-x-auto bg-[color:var(--site-background)]">
              <SyntaxCodeBlock code={botCode} filename="bot-process.ts" />
            </div>
            <div className="p-6 overflow-x-auto bg-[color:var(--site-background)]">
              <SyntaxCodeBlock code={appCode} filename="app-process.ts" />
            </div>
          </div>
        </TerminalWindow>
        
      </section>

      {/* Feature list minimal */}
      <section
        aria-labelledby="home-features-heading"
        className="px-6 py-24 border-t border-[color:var(--site-line)] bg-[color:var(--site-background-elevated)]"
      >
        <h2 id="home-features-heading" className="sr-only">
          Product focus
        </h2>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 border-x border-[color:var(--site-line)] px-6">
          <div className="flex-1">
             <div className="font-mono text-[10px] text-[color:var(--color-fd-muted-foreground)] uppercase tracking-widest mb-3">Architecture</div>
             <h3 className="text-[color:var(--site-foreground)] font-medium mb-2">Bridge-first Design</h3>
             <p className="text-sm text-[color:var(--color-fd-muted-foreground)] leading-relaxed">
               The docs start with the runtime split itself: what moves to the bot process, what stays in your app process, and where capabilities are negotiated.
             </p>
          </div>
          <div className="flex-1">
             <div className="font-mono text-[10px] text-[color:var(--color-fd-muted-foreground)] uppercase tracking-widest mb-3">Operations</div>
             <h3 className="text-[color:var(--site-foreground)] font-medium mb-2">Built for Production</h3>
             <p className="text-sm text-[color:var(--color-fd-muted-foreground)] leading-relaxed">
               Deployment, diagnostics, scoped-secret safety, and troubleshooting live alongside API docs instead of as an afterthought.
             </p>
          </div>
          <div className="flex-1">
             <div className="font-mono text-[10px] text-[color:var(--color-fd-muted-foreground)] uppercase tracking-widest mb-3">Guarantees</div>
             <h3 className="text-[color:var(--site-foreground)] font-medium mb-2">Strict Startup</h3>
             <p className="text-sm text-[color:var(--color-fd-muted-foreground)] leading-relaxed">
               Strict startup turns mismatches into startup failures instead of silent drift. Mismatched intents break instantly, not at runtime.
             </p>
          </div>
        </div>
      </section>

    </main>
  );
}
