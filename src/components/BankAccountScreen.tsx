import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PageHeader } from './ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Building2, Trash2, CheckCircle2, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { bankVerificationService, type BankListItem } from '../services/bankVerification';
import { getBankByCode } from '../data/nigerianBanks';

interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isVerified?: boolean;
  logo?: string;
}

interface BankAccountScreenProps {
  userId: string;
  bankAccounts: BankAccount[];
  onAddAccount: (account: Omit<BankAccount, 'id'>) => void;
  onDeleteAccount: (id: string) => void;
  onBack: () => void;
}

export function BankAccountScreen({ userId, bankAccounts, onAddAccount, onDeleteAccount, onBack }: BankAccountScreenProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [banks, setBanks] = useState<BankListItem[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<BankListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [showBankList, setShowBankList] = useState(false);

  // Load banks on mount
  useEffect(() => {
    loadBanks();
  }, []);

  // Filter banks based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBanks(banks);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredBanks(
        banks.filter(bank =>
          bank.name.toLowerCase().includes(query) ||
          (bank.slug && bank.slug.includes(query))
        )
      );
    }
  }, [searchQuery, banks]);

  const loadBanks = async () => {
    try {
      setIsLoadingBanks(true);
      const bankList = await bankVerificationService.getBanks();
      setBanks(bankList);
      setFilteredBanks(bankList);
    } catch (error) {
      console.error('Error loading banks:', error);
      toast.error('Failed to load banks');
    } finally {
      setIsLoadingBanks(false);
    }
  };

  const handleVerifyAccount = async () => {
    if (!selectedBankCode || !accountNumber) {
      toast.error('Please select a bank and enter account number');
      return;
    }

    if (accountNumber.length !== 10) {
      toast.error('Account number must be 10 digits');
      return;
    }

    setIsVerifying(true);

    try {
      const result = await bankVerificationService.verifyAccount(
        selectedBankCode,
        accountNumber
      );

      setAccountName(result.accountName);
      toast.success('Account verified successfully!', {
        description: result.accountName,
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error('Verification failed', {
        description: error.message || 'Could not verify account. Please check details and try again.',
      });
      setAccountName('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddAccount = async () => {
    if (!selectedBankCode || !accountNumber || !accountName) {
      toast.error('Please complete account verification');
      return;
    }

    try {
      const selectedBank = banks.find(b => b.code === selectedBankCode);

      // Add to database
      await bankVerificationService.addBankAccount(
        userId,
        selectedBankCode,
        accountNumber,
        accountName
      );

      // Add to local state
      onAddAccount({
        bankName: selectedBank?.name || 'Unknown Bank',
        bankCode: selectedBankCode,
        accountNumber,
        accountName,
        isVerified: true,
        logo: selectedBank?.logo,
      });

      toast.success('Bank account added successfully!');
      setShowAddForm(false);
      setSelectedBankCode('');
      setAccountNumber('');
      setAccountName('');
      setSearchQuery('');
    } catch (error: any) {
      console.error('Error adding account:', error);
      toast.error('Failed to add bank account', {
        description: error.message,
      });
    }
  };

  const handleDeleteAccount = () => {
    if (deleteAccountId) {
      onDeleteAccount(deleteAccountId);
      toast.success('Bank account removed');
      setDeleteAccountId(null);
    }
  };

  return (
    <div className="pb-safe-nav bg-white min-h-screen">
      <PageHeader
        title="Bank Accounts"
        description="Manage your withdrawal accounts"
        onBack={onBack}
      />

      <div className="px-6 space-y-4">
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </Button>
        )}

        {showAddForm && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Card className="p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Account</h3>

              <div className="space-y-4">
                {/* Bank Selection with Search */}
                <div className="space-y-2">
                  <Label>Select Bank</Label>

                  {/* Search Input */}
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search for your bank..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowBankList(true)}
                      className="pl-10 w-full"
                    />
                  </div>

                  {/* Bank List - Only show when focused/searching */}
                  {showBankList && (
                    <>
                      {isLoadingBanks ? (
                        <div className="p-4 text-center text-gray-500 border border-gray-200 rounded-lg">
                          Loading banks...
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                          {filteredBanks.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No banks found
                            </div>
                          ) : (
                            filteredBanks.map((bank) => (
                              <button
                                key={bank.code}
                                onClick={() => {
                                  setSelectedBankCode(bank.code);
                                  setAccountName(''); // Reset account name when bank changes
                                  setShowBankList(false); // Close the list after selection
                                  setSearchQuery(''); // Clear search
                                }}
                                className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                  selectedBankCode === bank.code ? 'bg-blue-50 hover:bg-blue-50' : ''
                                }`}
                              >
                                {/* Bank Icon - Simple icon without logo */}
                                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="w-5 h-5 text-blue-600" />
                                </div>

                                {/* Bank Info */}
                                <div className="flex-1 text-left">
                                  <p className="font-medium text-gray-900 text-sm">{bank.name}</p>
                                </div>

                                {/* Selected Indicator */}
                                {selectedBankCode === bank.code && (
                                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Selected Bank Display */}
                  {selectedBankCode && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-900">
                        Selected: <span className="font-semibold">
                          {banks.find(b => b.code === selectedBankCode)?.name}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Account Number Input */}
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="0123456789"
                      value={accountNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setAccountNumber(value);
                        setAccountName(''); // Reset account name when number changes
                      }}
                      maxLength={10}
                      disabled={!selectedBankCode}
                    />
                    <Button
                      onClick={handleVerifyAccount}
                      disabled={!selectedBankCode || accountNumber.length !== 10 || isVerifying}
                      variant="outline"
                      className="flex-shrink-0"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Enter your 10-digit account number
                  </p>
                </div>

                {/* Verified Account Name */}
                {accountName && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 p-4 rounded-xl border border-green-200"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900 mb-1">Account Verified</p>
                        <p className="text-green-800 font-semibold">{accountName}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleAddAccount}
                    disabled={!accountName}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Account
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedBankCode('');
                      setAccountNumber('');
                      setAccountName('');
                      setSearchQuery('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <div className="space-y-3">
          {bankAccounts.length === 0 && !showAddForm && (
            <Card className="p-8 text-center border border-gray-100">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">No bank accounts yet</p>
              <p className="text-gray-500">Add a bank account to receive your Naira</p>
            </Card>
          )}

          {bankAccounts.map((account, index) => {
            const bankData = getBankByCode(account.bankCode);

            return (
              <motion.div
                key={account.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Bank Logo */}
                      <div className="w-11 h-11 rounded-lg bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden p-1.5">
                        {account.logo || bankData?.logo ? (
                          <img
                            src={account.logo || bankData?.logo}
                            alt={account.bankName}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                            }}
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      {/* Account Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{account.bankName}</p>
                          {account.isVerified && (
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 font-mono">{account.accountNumber}</p>
                        <p className="text-sm text-gray-700 mt-1">{account.accountName}</p>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeleteAccountId(account.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!deleteAccountId} onOpenChange={() => setDeleteAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this bank account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
