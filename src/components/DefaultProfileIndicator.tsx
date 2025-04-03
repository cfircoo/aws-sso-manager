import { AwsAccount } from '../types/aws';

interface DefaultProfileIndicatorProps {
  profile: {
    accountId: string;
    roleName: string;
    found: boolean;
  } | null;
  accounts?: AwsAccount[];
}

const DefaultProfileIndicator = ({ profile, accounts = [] }: DefaultProfileIndicatorProps) => {
  if (!profile?.found) return null;
  
  // Find the account name for the default profile
  const account = accounts.find(acc => acc.accountId === profile.accountId);
  const accountName = account?.accountName || profile.accountId;
  
  return (
    <div className="my-4 flex items-center text-sm text-gray-600">
      <span className="mr-2">Default Profile:</span>
      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
        {accountName} ({profile.roleName})
      </span>
    </div>
  );
};

export default DefaultProfileIndicator; 