import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Mail, Lock, User, Key, Eye, EyeOff, ArrowRight, AlertCircle,
  Sun, Moon, Sunrise, Sunset, CloudRain, Stars, UserPlus,
  MessageCircle, X, Send, HelpCircle, Zap
} from "lucide-react";
import "./Register.css";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    pic: "",
    secretKey: "",
    dob:""
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [showLoginRedirect, setShowLoginRedirect] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dark mode state
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    return saved || 'auto'; // 'auto', 'light', 'dark'
  });

  const [currentTheme, setCurrentTheme] = useState('light');
  const [timeOfDay, setTimeOfDay] = useState('day');

  // Smart Assistant states
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([
    {
      id: 1,
      type: 'bot',
      message: "Hi! I'm here to help with registration. What can I assist you with?",
      timestamp: new Date()
    }
  ]);
  const [userMessage, setUserMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const navigate = useNavigate();

  // Time-based theming system
  const getTimeBasedTheme = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 8) {
      return { theme: 'light', timeOfDay: 'dawn', period: 'Dawn' };
    } else if (hour >= 8 && hour < 12) {
      return { theme: 'light', timeOfDay: 'morning', period: 'Morning' };
    } else if (hour >= 12 && hour < 17) {
      return { theme: 'light', timeOfDay: 'afternoon', period: 'Afternoon' };
    } else if (hour >= 17 && hour < 20) {
      return { theme: 'light', timeOfDay: 'evening', period: 'Evening' };
    } else if (hour >= 20 && hour < 22) {
      return { theme: 'dark', timeOfDay: 'dusk', period: 'Dusk' };
    } else {
      return { theme: 'dark', timeOfDay: 'night', period: 'Night' };
    }
  };

  // Apply theme based on mode and time
  useEffect(() => {
    const updateTheme = () => {
      const timeTheme = getTimeBasedTheme();

      let finalTheme = 'light';
      if (themeMode === 'auto') {
        finalTheme = timeTheme.theme;
        setTimeOfDay(timeTheme.timeOfDay);
      } else if (themeMode === 'dark') {
        finalTheme = 'dark';
        setTimeOfDay('night');
      } else {
        finalTheme = 'light';
        setTimeOfDay('day');
      }

      setCurrentTheme(finalTheme);

      // Apply theme classes
      document.body.className = '';
      document.body.classList.add(`theme-${finalTheme}`);
      document.body.classList.add(`time-${timeOfDay}`);
    };

    updateTheme();

    // Update theme every minute when in auto mode
    let interval;
    if (themeMode === 'auto') {
      interval = setInterval(updateTheme, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [themeMode, timeOfDay]);

  // Store theme preference
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const cycleTheme = () => {
    const modes = ['auto', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  const getThemeIcon = () => {
    if (themeMode === 'auto') {
      const timeTheme = getTimeBasedTheme();
      switch (timeTheme.timeOfDay) {
        case 'dawn':
          return <Sunrise size={20} />;
        case 'morning':
        case 'afternoon':
          return <Sun size={20} />;
        case 'evening':
          return <Sunset size={20} />;
        case 'dusk':
          return <CloudRain size={20} />;
        case 'night':
          return <Stars size={20} />;
        default:
          return <Sun size={20} />;
      }
    } else if (themeMode === 'dark') {
      return <Moon size={20} />;
    } else {
      return <Sun size={20} />;
    }
  };

  const getThemeLabel = () => {
    if (themeMode === 'auto') {
      const timeTheme = getTimeBasedTheme();
      return `Auto (${timeTheme.period})`;
    }
    return themeMode.charAt(0).toUpperCase() + themeMode.slice(1);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setErrorMessage(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setShowLoginRedirect(false);
    setIsLoading(true);

    try {
      const { data } = await axios.post(
          process.env.REACT_APP_API_URL + "/api/user/register",
          formData
      );
      localStorage.setItem("userInfo", JSON.stringify(data));
      navigate("/chats");
    } catch (error) {
      const serverMsg = error?.response?.data?.message;
      if (serverMsg && serverMsg.toLowerCase().includes("user already exists")) {
        setErrorMessage(
            "A user with this email address already exists. Please log in with your credentials or use a different email."
        );
        setShowLoginRedirect(true);
      } else {
        setErrorMessage("Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Assistant Functions
  const getSmartResponse = (message) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('password') && (lowerMessage.includes('requirements') || lowerMessage.includes('strong'))) {
      return {
        message: "For a strong password, use at least 8 characters with a mix of uppercase, lowercase, numbers, and special characters. Avoid common words or personal information.",
        actions: []
      };
    }

    if (lowerMessage.includes('secret key') || lowerMessage.includes('optional')) {
      return {
        message: "The secret key is optional and can be used for additional security. You can leave it blank if you don't need this feature.",
        actions: []
      };
    }

    if (lowerMessage.includes('email') && (lowerMessage.includes('exists') || lowerMessage.includes('taken'))) {
      return {
        message: "If your email is already registered, you can log in instead or try password reset if you forgot your credentials.",
        actions: [
          { text: "Go to Login", action: () => navigate("/") },
          { text: "Reset Password", action: () => navigate("/forgot-password") }
        ]
      };
    }

    if (lowerMessage.includes('login') || lowerMessage.includes('sign in')) {
      return {
        message: "Already have an account? I can take you to the login page right away!",
        actions: [
          { text: "Go to Login", action: () => navigate("/") }
        ]
      };
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return {
        message: "I'm here to help with registration! Common questions: password requirements, secret key usage, or existing account issues.",
        actions: [
          { text: "Password Help", action: () => {} },
          { text: "Go to Login", action: () => navigate("/") }
        ]
      };
    }

    return {
      message: "I can help you with registration questions! Feel free to ask about password requirements, the secret key field, or any other concerns.",
      actions: [
        { text: "Go to Login", action: () => navigate("/") },
        { text: "Contact Support", action: () => window.open('mailto:support@kava.com') }
      ]
    };
  };

  const sendMessage = async () => {
    if (!userMessage.trim()) return;

    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      message: userMessage,
      timestamp: new Date()
    };

    setAssistantMessages(prev => [...prev, newUserMessage]);
    setUserMessage('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getSmartResponse(userMessage);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        message: response.message,
        actions: response.actions,
        timestamp: new Date()
      };

      setAssistantMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickAction = (actionText, actionFn) => {
    const quickMessage = {
      id: Date.now(),
      type: 'user',
      message: actionText,
      timestamp: new Date()
    };

    setAssistantMessages(prev => [...prev, quickMessage]);
    actionFn();

    // Add confirmation message
    setTimeout(() => {
      const confirmMessage = {
        id: Date.now() + 1,
        type: 'bot',
        message: `Great! I've helped you with "${actionText}". Is there anything else I can assist you with?`,
        timestamp: new Date()
      };
      setAssistantMessages(prev => [...prev, confirmMessage]);
    }, 500);
  };

  return (
      <div className={`register-container theme-${currentTheme} time-${timeOfDay}`}>
        {/* Atmospheric Elements */}
        <div className="atmospheric-elements">
          {timeOfDay === 'night' && (
              <>
                <div className="stars"></div>
                <div className="shooting-star"></div>
              </>
          )}
          {timeOfDay === 'dawn' && (
              <div className="sunrise-rays"></div>
          )}
          {timeOfDay === 'dusk' && (
              <div className="dusk-clouds"></div>
          )}
          {(timeOfDay === 'morning' || timeOfDay === 'afternoon') && (
              <div className="day-particles"></div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
            className="theme-toggle"
            onClick={cycleTheme}
            aria-label={`Current theme: ${getThemeLabel()}`}
            title={`Click to cycle theme (Current: ${getThemeLabel()})`}
        >
          <div className="toggle-icon">
            {getThemeIcon()}
          </div>
          <div className="theme-label">{themeMode === 'auto' ? 'AUTO' : themeMode.toUpperCase()}</div>
        </button>

        <div className="register-card animate-slide-up">
          <div className="register-back animate-fade-in" onClick={() => navigate("/")}>
            ← Back to Login
          </div>

          <div className="register-header animate-fade-in">
            <h1>Create Your Account</h1>
            <p>Join Kava and start connecting with others</p>
          </div>

          <form className="register-form animate-slide-in" onSubmit={handleSubmit}>
            <div className="input-group animate-slide-in-delayed-1">
              <div className="input-wrapper">
                <div className="input-icon">
                  <User size={20}/>
                </div>
                <input
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                    disabled={isLoading}
                />
              </div>
            </div>

            <div className="input-group animate-slide-in-delayed-2">
              <div className="input-wrapper">
                <div className="input-icon">
                  <Mail size={20}/>
                </div>
                <input
                    name="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    type="email"
                    className="form-input"
                    disabled={isLoading}
                />
              </div>
            </div>

            <div className="input-group animate-slide-in-delayed-3">
              <div className="input-wrapper">
                <div className="input-icon">
                  <Lock size={20}/>
                </div>
                <input
                    name="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    type={showPassword ? "text" : "password"}
                    className="form-input"
                    disabled={isLoading}
                />
                <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <div className="input-group animate-slide-in-delayed-4">
              <div className="input-wrapper">
                <div className="input-icon">
                  <Key size={20}/>
                </div>
                <input
                    name="secretKey"
                    placeholder="Secret key (optional)"
                    value={formData.secretKey}
                    onChange={handleChange}
                    className="form-input"
                    disabled={isLoading}
                />
              </div>
              <div className="input-hint">
                Optional: Used for accessing hidden chats
              </div>
            </div>
            <div className="input-group animate-slide-in-delayed-5">
              <div className="input-wrapper">
                <div className="input-icon">
                  <Key size={20}/>
                </div>
                <input
                    name="dateOfBirth"
                    placeholder="Enter your date of birth"
                    value={formData.dob}
                    onChange={handleChange}
                    className="form-input"
                    disabled={isLoading}
                />
              </div>
            </div>
            {errorMessage && (
                <div className="error-message animate-shake">
                  <div className="error-content">
                    <AlertCircle size={18}/>
                    <span className="error-text">
                                    {errorMessage}
                      {showLoginRedirect && (
                          <span
                              className="register-login-link"
                              onClick={() => navigate("/")}
                          >
                                            {" "}Log in here
                                        </span>
                      )}
                                </span>
                  </div>
                </div>
            )}

            <button
                type="submit"
                className="register-button animate-slide-in-delayed-5"
                disabled={isLoading}
            >
              {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Creating Account...
                  </>
              ) : (
                  <>
                    Create Account
                    <UserPlus size={18}/>
                  </>
              )}
            </button>
          </form>

          <div className="register-footer animate-fade-in">
            <div className="footer-link">
              Already have an account?{" "}
              <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate("/")}
              >
                Sign in here
              </button>
            </div>
          </div>
        </div>

        {/* Smart Assistant Chatbot */}
        <div className={`assistant-container ${showAssistant ? 'active' : ''}`}>
          {!showAssistant && (
              <button
                  className="assistant-trigger"
                  onClick={() => setShowAssistant(true)}
                  aria-label="Open help assistant"
              >
                <MessageCircle size={24} />
                <div className="assistant-badge">
                  <HelpCircle size={12} />
                </div>
              </button>
          )}

          {showAssistant && (
              <div className="assistant-chat animate-slide-up">
                <div className="assistant-header">
                  <div className="assistant-info">
                    <div className="assistant-avatar">
                      <Zap size={16} />
                    </div>
                    <div>
                      <h4>Registration Assistant</h4>
                      <span>Here to help</span>
                    </div>
                  </div>
                  <button
                      className="assistant-close"
                      onClick={() => setShowAssistant(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="assistant-messages">
                  {assistantMessages.map((msg) => (
                      <div key={msg.id} className={`message ${msg.type}`}>
                        <div className="message-content">
                          <p>{msg.message}</p>
                          {msg.actions && msg.actions.length > 0 && (
                              <div className="message-actions">
                                {msg.actions.map((action, index) => (
                                    <button
                                        key={index}
                                        className="action-button"
                                        onClick={() => handleQuickAction(action.text, action.action)}
                                    >
                                      {action.text}
                                    </button>
                                ))}
                              </div>
                          )}
                        </div>
                      </div>
                  ))}

                  {isTyping && (
                      <div className="message bot">
                        <div className="message-content">
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                  )}
                </div>

                <div className="assistant-input">
                  <div className="input-wrapper">
                    <input
                        type="text"
                        placeholder="Ask me about registration..."
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="assistant-text-input"
                    />
                    <button
                        className="send-button"
                        onClick={sendMessage}
                        disabled={!userMessage.trim()}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}

export default Register;
