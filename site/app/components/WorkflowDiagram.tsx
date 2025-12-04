'use client'

export default function WorkflowDiagram() {
  return (
    <div className="workflow-container">
      <svg
        width="100%"
        height="550"
        viewBox="0 0 700 550"
        style={{ maxWidth: '800px', margin: '0 auto', display: 'block' }}
      >
        {/* Dashed connecting lines - Orthogonal with animated dots */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.25)" />
          </marker>
        </defs>

        {/* Task to Analysis - vertical connection */}
        <path
          id="path1"
          d="M 350 80 L 350 145"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />
        <circle r="2" fill="rgba(255,255,255,0.6)">
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href="#path1" />
          </animateMotion>
        </circle>

        {/* Analysis to Code Scan - orthogonal path */}
        <path
          id="path2"
          d="M 250 172 L 180 172 L 180 270"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />
        <circle r="2" fill="rgba(255,255,255,0.6)">
          <animateMotion dur="2.5s" repeatCount="indefinite">
            <mpath href="#path2" />
          </animateMotion>
        </circle>

        {/* Analysis to Metrics - orthogonal path */}
        <path
          id="path3"
          d="M 450 172 L 520 172 L 520 270"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />
        <circle r="2" fill="rgba(255,255,255,0.6)">
          <animateMotion dur="2.5s" repeatCount="indefinite">
            <mpath href="#path3" />
          </animateMotion>
        </circle>

        {/* Code Scan to Hotspots - orthogonal path */}
        <path
          id="path4"
          d="M 200 330 L 200 360 L 270 360 L 270 390"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />
        <circle r="2" fill="rgba(255,255,255,0.6)">
          <animateMotion dur="2.5s" repeatCount="indefinite">
            <mpath href="#path4" />
          </animateMotion>
        </circle>

        {/* Metrics to Hotspots - orthogonal path */}
        <path
          id="path5"
          d="M 500 330 L 500 360 L 430 360 L 430 390"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />
        <circle r="2" fill="rgba(255,255,255,0.6)">
          <animateMotion dur="2.5s" repeatCount="indefinite">
            <mpath href="#path5" />
          </animateMotion>
        </circle>

        {/* Hotspots to Plan - vertical connection */}
        <path
          id="path6"
          d="M 350 450 L 350 490"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />
        <circle r="2" fill="rgba(255,255,255,0.6)">
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href="#path6" />
          </animateMotion>
        </circle>

        {/* Node 1: Task Input */}
        <g className="workflow-node">
          <rect
            x="270"
            y="30"
            width="160"
            height="50"
            rx="4"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          <text
            x="290"
            y="48"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.5"
          >
            TRIGGER
          </text>
          <text
            x="290"
            y="67"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Task Input
          </text>
        </g>

        {/* Node 2: Agent Selection */}
        <g className="workflow-node">
          <rect
            x="250"
            y="145"
            width="200"
            height="55"
            rx="4"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          <text
            x="270"
            y="163"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.5"
          >
            ANALYSIS
          </text>
          <text
            x="270"
            y="182"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Select Agent
          </text>
          <text
            x="270"
            y="195"
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
          >
            Code Optimizer
          </text>
        </g>

        {/* Node 3: Code Scan */}
        <g className="workflow-node">
          <rect
            x="100"
            y="270"
            width="200"
            height="60"
            rx="4"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          <text
            x="120"
            y="288"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.5"
          >
            SCAN
          </text>
          <text
            x="120"
            y="307"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Repository Scan
          </text>
          <text
            x="120"
            y="320"
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
          >
            Find files & structure
          </text>
        </g>

        {/* Node 4: Metrics Analysis */}
        <g className="workflow-node">
          <rect
            x="400"
            y="270"
            width="200"
            height="60"
            rx="4"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          <text
            x="420"
            y="288"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.5"
          >
            METRICS
          </text>
          <text
            x="420"
            y="307"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Calculate Complexity
          </text>
          <text
            x="420"
            y="320"
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
          >
            Nesting & branches
          </text>
        </g>

        {/* Node 5: Hotspot Detection */}
        <g className="workflow-node">
          <rect
            x="250"
            y="390"
            width="200"
            height="60"
            rx="4"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          <text
            x="270"
            y="408"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.5"
          >
            CONDITION
          </text>
          <text
            x="270"
            y="427"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Identify Hotspots
          </text>
          <text
            x="270"
            y="440"
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
          >
            Rank by priority
          </text>
        </g>

        {/* Node 6: Generate Plan */}
        <g className="workflow-node">
          <rect
            x="250"
            y="490"
            width="200"
            height="55"
            rx="4"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          <text
            x="270"
            y="508"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.5"
          >
            ACTION
          </text>
          <text
            x="270"
            y="527"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Generate Refactor Plan
          </text>
          <text
            x="270"
            y="540"
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
          >
            Latent Chain Mode
          </text>
        </g>
      </svg>
    </div>
  )
}
