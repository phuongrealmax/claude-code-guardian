'use client'

import { useState } from 'react'

interface CheckoutButtonProps {
  tier: 'team' | 'enterprise'
  className?: string
  children: React.ReactNode
}

export default function CheckoutButton({ tier, className = '', children }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')

  const handleClick = () => {
    if (tier === 'enterprise') {
      window.location.href = 'mailto:hello@codeguardian.studio?subject=Enterprise Inquiry'
      return
    }
    setShowModal(true)
  }

  const handleCheckout = async () => {
    if (!email) {
      setError('Please enter your email')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, email }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEmail('')
    setError('')
  }

  return (
    <>
      <button onClick={handleClick} className={className} type="button">
        {children}
      </button>

      {showModal && (
        <div className="checkout-modal-overlay" onClick={closeModal}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="checkout-modal-close"
              onClick={closeModal}
              aria-label="Close"
            >
              &times;
            </button>

            <h3>Start Team Trial</h3>
            <p>Enter your email to continue to checkout.</p>

            <div className="checkout-form">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
                autoFocus
              />

              {error && <p className="checkout-error">{error}</p>}

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="btn btn-primary checkout-submit"
              >
                {loading ? 'Loading...' : 'Continue to Paddle'}
              </button>
            </div>

            <p className="checkout-note">
              $19/month per user. Cancel anytime. Powered by Paddle.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
