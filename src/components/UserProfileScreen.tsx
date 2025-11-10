import { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ArrowLeft, User, Mail, Phone, Edit2, Save, X } from 'lucide-react';
import { ReferralSection } from './ReferralSection';

interface UserProfileScreenProps {
  userName: string;
  userEmail: string;
  userPhone?: string;
  userId: string;
  onBack: () => void;
  onUpdateProfile: (data: { name: string; phone?: string }) => void;
}

export function UserProfileScreen({
  userName,
  userEmail,
  userPhone = '',
  userId,
  onBack,
  onUpdateProfile
}: UserProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState(userPhone);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdateProfile({ name, phone });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(userName);
    setPhone(userPhone);
    setIsEditing(false);
  };

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-white pb-safe-nav">
      {/* Header */}
      <div className="px-6 pb-6 border-b border-gray-100" style={{ paddingTop: `calc(3rem + env(safe-area-inset-top))` }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        </div>
      </div>

      <div className="px-6 py-8">
        {/* Avatar Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center mb-8"
        >
          <Avatar className="w-24 h-24 mb-4">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
          <p className="text-gray-500 text-sm">{userEmail}</p>
        </motion.div>

        {/* Profile Information */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{userName}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  Email Address
                </Label>
                <p className="text-gray-600">{userEmail}</p>
                <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  Phone Number
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 XXX XXX XXXX"
                    className="w-full"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {userPhone || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Account Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm mb-1">Member Since</p>
                <p className="text-gray-900 font-semibold">
                  {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm mb-1">Total Transactions</p>
                <p className="text-gray-900 font-semibold">0</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Referral Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <ReferralSection userId={userId} />
        </motion.div>

        {/* Security Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Card className="p-4 border border-blue-100 bg-blue-50">
            <p className="text-blue-900 text-sm">
              🔒 Your profile information is encrypted and stored securely. We never share your personal data with third parties.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

