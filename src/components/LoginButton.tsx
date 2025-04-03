interface LoginButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const LoginButton = ({ onClick, isLoading }: LoginButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded text-lg font-medium"
    >
      {isLoading ? 'Loading...' : 'Login with AWS SSO'}
    </button>
  );
};

export default LoginButton; 