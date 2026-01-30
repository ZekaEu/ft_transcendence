import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button, Input, Card, Avatar, Spinner, Badge } from '../components/common'
import toast from 'react-hot-toast'

function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      // TODO: Call userService.searchUsers(searchQuery)
      console.log('Searching for:', searchQuery)
      toast.info('Search functionality coming soon!')
    } catch (err) {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async (friendId) => {
    try {
      // TODO: Call userService.addFriend(user.id, friendId)
      toast.success('Friend added!')
    } catch (err) {
      toast.error('Failed to add friend')
    }
  }

  const handleRemoveFriend = async (friendId) => {
    try {
      // TODO: Call userService.removeFriend(user.id, friendId)
      setFriends(friends.filter((f) => f.id !== friendId))
      toast.success('Friend removed')
    } catch (err) {
      toast.error('Failed to remove friend')
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Friends</h1>

      {/* Search */}
      <Card className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search for users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            Search
          </Button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((result) => (
              <div key={result.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <Avatar src={result.avatar} alt={result.username} size="md" />
                  <div>
                    <p className="font-semibold">{result.username}</p>
                    <Badge variant="success">Online</Badge>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAddFriend(result.id)}>
                  Add Friend
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Friends List */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Friends ({friends.length})</h2>

        {friends.length === 0 ? (
          <p className="text-gray-600">You don't have any friends yet. Search for users to add them!</p>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-4 border rounded">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={friend.avatar}
                    alt={friend.username}
                    size="md"
                    online={friend.online}
                  />
                  <div>
                    <p className="font-semibold">{friend.username}</p>
                    <p className="text-sm text-gray-500">
                      {friend.online ? 'Online now' : 'Last seen recently'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleRemoveFriend(friend.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default FriendsPage
