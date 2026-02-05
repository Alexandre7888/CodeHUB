// Important: DO NOT remove this `ErrorBoundary` component.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-black text-white rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem("chat_user");
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("chat_user");
    setUser(null);
    // Optional: window.location.reload() for clean state
  };

  if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
         <div className="icon-loader animate-spin text-4xl text-[#00a884]"></div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#d1d7db]" data-name="app" data-file="app.js">
        {/* Green header background strip like WhatsApp Web */}
        <div className="absolute top-0 left-0 w-full h-32 bg-[#00a884] z-0"></div>
        
        <div className="relative z-10 h-screen w-full md:w-[1400px] md:h-[95vh] md:m-auto md:top-[2.5vh] shadow-lg overflow-hidden bg-white">
            {user ? (
                <ChatInterface user={user} onLogout={handleLogout} />
            ) : (
                <Login onLogin={handleLogin} />
            )}
        </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);