'use client'

import { useEffect, useState } from 'react'

export default function WorkflowDiagram() {
  const [stats, setStats] = useState({
    filesScanned: 0,
    risksFound: 0,
    risksBlocked: 0,
    safeActions: 0
  })

  useEffect(() => {
    const targets = { filesScanned: 212, risksFound: 23, risksBlocked: 20, safeActions: 189 }
    const duration = 2000
    const steps = 60
    const interval = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)

      setStats({
        filesScanned: Math.round(targets.filesScanned * eased),
        risksFound: Math.round(targets.risksFound * eased),
        risksBlocked: Math.round(targets.risksBlocked * eased),
        safeActions: Math.round(targets.safeActions * eased)
      })

      if (step >= steps) clearInterval(timer)
    }, interval)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="workflow-container">
      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '32px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{stats.filesScanned}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Files Scanned</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>{stats.risksFound}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Risks Found</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{stats.risksBlocked}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Blocked</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{stats.safeActions}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Safe Actions</div>
        </div>
      </div>

      <svg
        viewBox="0 0 700 620"
        className="mx-auto w-full max-w-[480px] sm:max-w-[640px]"
        style={{ display: 'block', height: 'auto' }}
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
          <marker
            id="arrowhead-green"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
          </marker>
          <marker
            id="arrowhead-red"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
          </marker>
        </defs>

        {/* Task to Safety Gate - vertical connection */}
        <path
          id="path1"
          d="M 350 80 L 350 130"
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

        {/* Safety Gate to Analysis */}
        <path
          id="path1b"
          d="M 350 185 L 350 230"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="workflow-line"
        />
        <circle r="2" fill="rgba(255,255,255,0.6)">
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href="#path1b" />
          </animateMotion>
        </circle>

        {/* Analysis to Code Scan - orthogonal path */}
        <path
          id="path2"
          d="M 250 257 L 180 257 L 180 340"
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
          d="M 450 257 L 520 257 L 520 340"
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
          d="M 200 400 L 200 430 L 270 430 L 270 455"
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
          d="M 500 400 L 500 430 L 430 430 L 430 455"
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

        {/* Hotspots to Plan - split to blocked/safe */}
        <path
          id="path6a"
          d="M 300 515 L 300 545 L 180 545 L 180 570"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          markerEnd="url(#arrowhead-red)"
          className="workflow-line"
        />
        <circle r="2" fill="#ef4444">
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href="#path6a" />
          </animateMotion>
        </circle>

        <path
          id="path6b"
          d="M 400 515 L 400 545 L 520 545 L 520 570"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          markerEnd="url(#arrowhead-green)"
          className="workflow-line"
        />
        <circle r="2" fill="#22c55e">
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href="#path6b" />
          </animateMotion>
        </circle>

        {/* Node 1: AI Request */}
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
            AI REQUEST
          </text>
          <text
            x="290"
            y="67"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Claude / Cursor
          </text>
        </g>

        {/* Node 1.5: Safety Gate */}
        <g className="workflow-node">
          <rect
            x="265"
            y="130"
            width="170"
            height="55"
            rx="4"
            fill="rgba(59, 130, 246, 0.1)"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="2"
          />
          {/* Shield icon */}
          <path
            d="M 285 150 L 285 162 C 285 167 290 172 295 174 C 300 172 305 167 305 162 L 305 150 L 295 147 Z"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
          />
          <text
            x="315"
            y="156"
            fill="#3b82f6"
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.5"
          >
            CCG SAFETY GATE
          </text>
          <text
            x="285"
            y="175"
            fill="rgba(255,255,255,0.7)"
            fontSize="11"
          >
            Guard rules • Policy check
          </text>
        </g>

        {/* Node 2: Agent Selection */}
        <g className="workflow-node">
          <rect
            x="250"
            y="230"
            width="200"
            height="55"
            rx="4"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          <text
            x="270"
            y="248"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.5"
          >
            ANALYSIS
          </text>
          <text
            x="270"
            y="267"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Select Agent
          </text>
          <text
            x="270"
            y="280"
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
          >
            Code Optimizer
          </text>
        </g>

        {/* Node 3: Code Scan with safety badge */}
        <g className="workflow-node">
          <rect
            x="100"
            y="340"
            width="200"
            height="60"
            rx="4"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          <text
            x="120"
            y="358"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.5"
          >
            SCAN
          </text>
          <text
            x="120"
            y="377"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Repository Scan
          </text>
          <text
            x="120"
            y="390"
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
          >
            Find files & structure
          </text>
          {/* Safe badge */}
          <rect x="250" y="345" width="40" height="16" rx="3" fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="1"/>
          <text x="258" y="356" fill="#22c55e" fontSize="8" fontWeight="600">SAFE</text>
        </g>

        {/* Node 4: Metrics Analysis with warning badge */}
        <g className="workflow-node">
          <rect
            x="400"
            y="340"
            width="200"
            height="60"
            rx="4"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
          <text
            x="420"
            y="358"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontWeight="500"
            letterSpacing="0.5"
          >
            METRICS
          </text>
          <text
            x="420"
            y="377"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Calculate Complexity
          </text>
          <text
            x="420"
            y="390"
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
          >
            Nesting & branches
          </text>
          {/* Warning badge */}
          <rect x="550" y="345" width="40" height="16" rx="3" fill="rgba(251, 191, 36, 0.2)" stroke="#fbbf24" strokeWidth="1"/>
          <text x="553" y="356" fill="#fbbf24" fontSize="8" fontWeight="600">WARN</text>
        </g>

        {/* Node 5: Hotspot Detection - CCG checkpoint */}
        <g className="workflow-node">
          <rect
            x="250"
            y="455"
            width="200"
            height="60"
            rx="4"
            fill="rgba(59, 130, 246, 0.1)"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="2"
          />
          {/* Shield icon */}
          <path
            d="M 265 470 L 265 482 C 265 487 270 492 275 494 C 280 492 285 487 285 482 L 285 470 L 275 467 Z"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
          />
          <text
            x="295"
            y="476"
            fill="#3b82f6"
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.5"
          >
            CCG CHECKPOINT
          </text>
          <text
            x="265"
            y="495"
            fill="rgba(255,255,255,0.95)"
            fontSize="13"
            fontWeight="500"
          >
            Identify Hotspots
          </text>
          <text
            x="265"
            y="508"
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
          >
            Block high-risk • Allow safe
          </text>
        </g>

        {/* Node 6a: Blocked Actions */}
        <g className="workflow-node">
          <rect
            x="100"
            y="570"
            width="160"
            height="45"
            rx="4"
            fill="rgba(239, 68, 68, 0.1)"
            stroke="#ef4444"
            strokeWidth="1.5"
          />
          <circle cx="125" cy="592" r="8" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="1"/>
          <line x1="121" y1="588" x2="129" y2="596" stroke="#ef4444" strokeWidth="1.5"/>
          <line x1="129" y1="588" x2="121" y2="596" stroke="#ef4444" strokeWidth="1.5"/>
          <text
            x="140"
            y="588"
            fill="#ef4444"
            fontSize="10"
            fontWeight="600"
          >
            BLOCKED
          </text>
          <text
            x="140"
            y="603"
            fill="rgba(255,255,255,0.6)"
            fontSize="11"
          >
            20 risky actions
          </text>
        </g>

        {/* Node 6b: Safe Actions - Generate Plan */}
        <g className="workflow-node">
          <rect
            x="440"
            y="570"
            width="160"
            height="45"
            rx="4"
            fill="rgba(34, 197, 94, 0.1)"
            stroke="#22c55e"
            strokeWidth="1.5"
          />
          <circle cx="465" cy="592" r="8" fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="1"/>
          <polyline points="460,592 464,596 472,588" fill="none" stroke="#22c55e" strokeWidth="1.5"/>
          <text
            x="480"
            y="588"
            fill="#22c55e"
            fontSize="10"
            fontWeight="600"
          >
            APPROVED
          </text>
          <text
            x="480"
            y="603"
            fill="rgba(255,255,255,0.6)"
            fontSize="11"
          >
            189 safe actions
          </text>
        </g>
      </svg>
    </div>
  )
}
