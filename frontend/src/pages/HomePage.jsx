import React from 'react'
import { Card } from '../components/common'

function HomePage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Welcome to Triple Trouble Trivia</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hover>
          <h2 className="text-xl font-bold text-gray-900 mb-3">🎮 Play Trivia</h2>
          <p className="text-gray-600">
            Challenge your friends in real-time multiplayer trivia games
          </p>
        </Card>

        <Card hover>
          <h2 className="text-xl font-bold text-gray-900 mb-3">🏆 Tournaments</h2>
          <p className="text-gray-600">
            Participate in organized tournaments and climb the leaderboards
          </p>
        </Card>

        <Card hover>
          <h2 className="text-xl font-bold text-gray-900 mb-3">👥 Friends</h2>
          <p className="text-gray-600">
            Connect with friends and track their progress
          </p>
        </Card>
      </div>
    </div>
  )
}

export default HomePage
