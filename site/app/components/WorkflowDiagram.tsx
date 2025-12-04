'use client'

export default function WorkflowDiagram() {
  return (
    <div className="workflow-container">
      <svg
        width="100%"
        height="600"
        viewBox="0 0 800 600"
        style={{ maxWidth: '900px', margin: '0 auto', display: 'block' }}
      >
        {/* Connecting lines */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="rgba(255,255,255,0.3)" />
          </marker>
        </defs>

        {/* Line from Task to Agent Selection */}
        <path
          d="M 400 80 L 400 140"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />

        {/* Line from Agent Selection to Code Scan */}
        <path
          d="M 400 200 L 250 260"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />

        {/* Line from Agent Selection to Complexity Analysis */}
        <path
          d="M 400 200 L 550 260"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />

        {/* Line from Code Scan to Hotspot Detection */}
        <path
          d="M 250 320 L 250 380"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />

        {/* Line from Complexity Analysis to Hotspot Detection */}
        <path
          d="M 550 320 L 400 380"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />

        {/* Line from Hotspot Detection to Refactor Plan */}
        <path
          d="M 325 440 L 325 500"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />

        {/* Node 1: Task Input (Trigger) */}
        <g className="workflow-node">
          <rect
            x="320"
            y="40"
            width="160"
            height="60"
            rx="8"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
          />
          <circle cx="340" cy="60" r="4" fill="#10b981" />
          <text
            x="360"
            y="62"
            fill="rgba(255,255,255,0.9)"
            fontSize="14"
            fontWeight="600"
          >
            Task Input
          </text>
          <text
            x="360"
            y="80"
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
          >
            Refactor Request
          </text>
        </g>

        {/* Node 2: Agent Selection */}
        <g className="workflow-node">
          <rect
            x="300"
            y="150"
            width="200"
            height="60"
            rx="8"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
          />
          <svg x="320" y="165" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <text
            x="350"
            y="175"
            fill="rgba(255,255,255,0.9)"
            fontSize="14"
            fontWeight="600"
          >
            Agent Selection
          </text>
          <text
            x="350"
            y="193"
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
          >
            Code Optimizer
          </text>
        </g>

        {/* Node 3: Code Scan (left branch) */}
        <g className="workflow-node">
          <rect
            x="150"
            y="270"
            width="200"
            height="60"
            rx="8"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
          />
          <svg x="170" y="285" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <text
            x="200"
            y="295"
            fill="rgba(255,255,255,0.9)"
            fontSize="14"
            fontWeight="600"
          >
            Scan Repository
          </text>
          <text
            x="200"
            y="313"
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
          >
            Find large files
          </text>
        </g>

        {/* Node 4: Complexity Analysis (right branch) */}
        <g className="workflow-node">
          <rect
            x="450"
            y="270"
            width="200"
            height="60"
            rx="8"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
          />
          <svg x="470" y="285" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <text
            x="500"
            y="295"
            fill="rgba(255,255,255,0.9)"
            fontSize="14"
            fontWeight="600"
          >
            Analyze Metrics
          </text>
          <text
            x="500"
            y="313"
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
          >
            Calculate complexity
          </text>
        </g>

        {/* Node 5: Hotspot Detection (merge) */}
        <g className="workflow-node">
          <rect
            x="225"
            y="390"
            width="200"
            height="60"
            rx="8"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
          />
          <circle cx="245" cy="410" r="4" fill="#f59e0b" />
          <text
            x="265"
            y="412"
            fill="rgba(255,255,255,0.9)"
            fontSize="14"
            fontWeight="600"
          >
            Identify Hotspots
          </text>
          <text
            x="265"
            y="430"
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
          >
            Rank by priority
          </text>
        </g>

        {/* Node 6: Generate Plan */}
        <g className="workflow-node">
          <rect
            x="225"
            y="510"
            width="200"
            height="60"
            rx="8"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
          />
          <svg x="245" y="525" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <text
            x="275"
            y="542"
            fill="rgba(255,255,255,0.9)"
            fontSize="14"
            fontWeight="600"
          >
            Generate Plan
          </text>
          <text
            x="275"
            y="560"
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
          >
            Latent Chain Mode
          </text>
        </g>

        {/* Right side info labels */}
        <text x="500" y="420" fill="rgba(255,255,255,0.4)" fontSize="12">
          Auto-decompose
        </text>
        <text x="500" y="460" fill="rgba(255,255,255,0.4)" fontSize="12">
          Memory recall
        </text>
        <text x="500" y="500" fill="rgba(255,255,255,0.4)" fontSize="12">
          Guard validation
        </text>
        <text x="500" y="540" fill="rgba(255,255,255,0.4)" fontSize="12">
          Report generation
        </text>
      </svg>
    </div>
  )
}
