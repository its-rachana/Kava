import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, Shield,
    RefreshCw, Smartphone, Key, Sun, Moon, AlertTriangle,
    Clock, Ban, MessageCircle, X, Send, HelpCircle, Zap,
    Sunrise, Sunset, CloudRain, Stars
} from "lucide-react";
import "./Login.css";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loginMethod, setLoginMethod] = useState("password"); // "password" or "otp"

    // Dark mode state
    const [themeMode, setThemeMode] = useState(() => {
        const saved = localStorage.getItem('themeMode');
        return saved || 'auto'; // 'auto', 'light', 'dark'
    });

    const [currentTheme, setCurrentTheme] = useState('light');
    const [timeOfDay, setTimeOfDay] = useState('day');

    // Security states
    const [failedAttempts, setFailedAttempts] = useState(() => {
        const saved = localStorage.getItem('failedLoginAttempts');
        return saved ? JSON.parse(saved) : { count: 0, lastAttempt: null };
    });
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState(0);
    const [showSecurityWarning, setShowSecurityWarning] = useState(false);

    // Smart Assistant states
    const [showAssistant, setShowAssistant] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState([
        {
            id: 1,
            type: 'bot',
            message: "Hi! I'm here to help with any login issues. What can I assist you with?",
            timestamp: new Date()
        }
    ]);
    const [userMessage, setUserMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const navigate = useNavigate();
    const LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
    const MAX_ATTEMPTS = 5;

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

    // Check lockout status on component mount
    useEffect(() => {
        checkLockoutStatus();
    }, []);

    // Timer for OTP resend
    useEffect(() => {
        let interval = null;
        if (otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer(timer => timer - 1);
            }, 1000);
        } else if (otpTimer === 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    // Lockout timer
    useEffect(() => {
        let interval = null;
        if (lockoutTimer > 0) {
            interval = setInterval(() => {
                setLockoutTimer(timer => {
                    const newTimer = timer - 1;
                    if (newTimer <= 0) {
                        setIsLocked(false);
                        resetFailedAttempts();
                    }
                    return newTimer;
                });
            }, 1000);
        } else if (lockoutTimer === 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [lockoutTimer]);

    const checkLockoutStatus = () => {
        const now = Date.now();
        const { count, lastAttempt } = failedAttempts;

        if (count >= MAX_ATTEMPTS && lastAttempt) {
            const timeSinceLastAttempt = (now - lastAttempt) / 1000;
            if (timeSinceLastAttempt < LOCKOUT_DURATION) {
                setIsLocked(true);
                setLockoutTimer(Math.ceil(LOCKOUT_DURATION - timeSinceLastAttempt));
            } else {
                resetFailedAttempts();
            }
        }
    };

    const incrementFailedAttempts = async () => {
        const newAttempts = {
            count: failedAttempts.count + 1,
            lastAttempt: Date.now()
        };

        setFailedAttempts(newAttempts);
        localStorage.setItem('failedLoginAttempts', JSON.stringify(newAttempts));

        // Show security warning after 3 attempts
        if (newAttempts.count >= 3) {
            setShowSecurityWarning(true);
        }

        // Lock account after max attempts
        if (newAttempts.count >= MAX_ATTEMPTS) {
            setIsLocked(true);
            setLockoutTimer(LOCKOUT_DURATION);

            // Send security alert email
            try {
                await axios.post(
                    process.env.REACT_APP_API_URL + "/api/user/security-alert",
                    {
                        email,
                        alertType: 'account_locked',
                        attempts: newAttempts.count,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (error) {
                console.error('Failed to send security alert:', error);
            }
        }
    };

    const resetFailedAttempts = () => {
        const resetAttempts = { count: 0, lastAttempt: null };
        setFailedAttempts(resetAttempts);
        localStorage.setItem('failedLoginAttempts', JSON.stringify(resetAttempts));
        setShowSecurityWarning(false);
    };

    const handlePasswordLogin = async (e) => {
        e.preventDefault();

        if (isLocked) {
            setError(`Account locked. Try again in ${Math.ceil(lockoutTimer / 60)} minutes.`);
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const token = JSON.parse(localStorage.getItem("userInfo"))?.token;
            const config = token ? {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            } : {};

            const { data } = await axios.post(
                process.env.REACT_APP_API_URL + "/api/user/login",
                { email, password },
                config
            );

            // Reset failed attempts on successful login
            resetFailedAttempts();

            // Check if two-factor authentication is enabled
            if (data.twoFactorEnabled) {
                setTwoFactorEnabled(true);
                // Send OTP for two-factor authentication
                await sendOtpFor2FA();
            } else {
                // Store user info and redirect directly to chats
                console.log("login data")
                console.log(data)
                localStorage.setItem("userInfo", JSON.stringify(data));
                navigate("/chats");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Login failed";
            setError(errorMessage);

            // Increment failed attempts only for authentication failures
            if (error.response?.status === 401 || error.response?.status === 403) {
                await incrementFailedAttempts();
            }

            setIsLoading(false);
        } finally {
            if (!twoFactorEnabled) {
                setIsLoading(false);
            }
        }
    };

    const handleOtpLogin = async (e) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email address");
            return;
        }
        await sendOtp();
    };

    const sendOtpFor2FA = async () => {
        setIsSendingOtp(true);
        setError("");
        const { token } = JSON.parse(localStorage.getItem("userInfo"));
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            await axios.post(
                process.env.REACT_APP_API_URL + "/api/user/send-otp",
                { email },config
            );
            setIsOtpSent(true);
            setOtpTimer(60); // 60 seconds cooldown
            setError("");
        } catch (error) {
            setError("Failed to send OTP. Please try again.");
        } finally {
            setIsSendingOtp(false);
            setIsLoading(false);
        }
    };

    const sendOtp = async () => {
        setIsSendingOtp(true);
        setIsLoading(true); // Show the loading overlay animation
        setError("");

        try {
            const emailOtp = true;

            await axios.post(
                process.env.REACT_APP_API_URL + "/api/user/send-otp",
                { email }
            );

            setIsOtpSent(true);
            setOtpTimer(60); // 60 seconds cooldown
            setError("");
        } catch (error) {
            setError("Failed to send OTP. Please try again.");
        } finally {
            setIsSendingOtp(false);
            setIsLoading(false); // Hide the loading overlay animation
        }
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        setIsVerifyingOtp(true);
        setIsLoading(true); // Show the loading overlay animation
        setError("");

        try {
            const { data } = await axios.post(
                process.env.REACT_APP_API_URL + "/api/user/verify-otp",
                { email, otpCode }
            );

            localStorage.setItem("userInfo", JSON.stringify(data.userData));
            resetFailedAttempts(); // Reset on successful verification
            navigate("/chats");
        } catch (error) {
            setError(error.response?.data?.message || "Invalid OTP code");
        } finally {
            setIsVerifyingOtp(false);
            setIsLoading(false); // Hide the loading overlay animation
        }
    };

    const resendOtp = async () => {
        if (otpTimer > 0) return;

        if (twoFactorEnabled) {
            await sendOtpFor2FA();
        } else {
            await sendOtp();
        }
    };

    const goBackToLogin = () => {
        setIsOtpSent(false);
        setTwoFactorEnabled(false);
        setOtpCode("");
        setError("");
        setOtpTimer(0);
    };

    const switchLoginMethod = (method) => {
        setLoginMethod(method);
        setError("");
        setPassword("");
        setOtpCode("");
        setIsOtpSent(false);
        setTwoFactorEnabled(false);
        setOtpTimer(0);
    };

    const formatLockoutTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Smart Assistant Functions
    const getSmartResponse = (message) => {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('password') && (lowerMessage.includes('forgot') || lowerMessage.includes('reset'))) {
            return {
                message: "I can help you reset your password! Click the 'Reset Password' button below or use the 'Forgotten password?' link in the login form.",
                actions: [
                    { text: "Reset Password", action: () => navigate("/forgot-password") }
                ]
            };
        }

        if (lowerMessage.includes('otp') || lowerMessage.includes('code')) {
            return {
                message: "Having trouble with OTP? Make sure to check your spam folder. The code expires in 10 minutes. You can also try switching to password login.",
                actions: [
                    { text: "Switch to Password", action: () => switchLoginMethod("password") },
                    { text: "Resend OTP", action: () => resendOtp() }
                ]
            };
        }

        if (lowerMessage.includes('locked') || lowerMessage.includes('attempts')) {
            return {
                message: "Your account gets locked after 5 failed attempts for security. Wait 15 minutes or try password reset if you've forgotten your credentials.",
                actions: [
                    { text: "Reset Password", action: () => navigate("/forgot-password") }
                ]
            };
        }

        if (lowerMessage.includes('email') && lowerMessage.includes('not')) {
            return {
                message: "Make sure you're using the email address you registered with. Check for typos and ensure it's the correct format (example@domain.com).",
                actions: []
            };
        }

        if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
            return {
                message: "I'm here to help! Common issues I can assist with: forgotten passwords, OTP problems, account lockouts, and login troubleshooting.",
                actions: [
                    { text: "Forgot Password", action: () => navigate("/forgot-password") },
                    { text: "OTP Issues", action: () => switchLoginMethod("otp") }
                ]
            };
        }

        return {
            message: "I understand you're having trouble. Here are some quick solutions that might help:",
            actions: [
                { text: "Reset Password", action: () => navigate("/forgot-password") },
                { text: "Try OTP Login", action: () => switchLoginMethod("otp") },
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
        <div className={`login-container theme-${currentTheme} time-${timeOfDay}`}>
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

            <div className="login-card animate-slide-up">
                <div className="login-header animate-fade-in">
                    <h1>{isOtpSent ? "Verify Your Identity" : "Welcome Back"}</h1>
                    <p>{isOtpSent ? "Enter the verification code sent to your email" : "Sign in to continue to Kava"}</p>
                </div>

                {/* Security Warning */}
                {showSecurityWarning && !isLocked && (
                    <div className="security-warning animate-slide-down">
                        <div className="warning-content">
                            <AlertTriangle size={20} />
                            <div>
                                <p className="warning-title">Security Alert</p>
                                <p className="warning-text">
                                    {failedAttempts.count} failed login attempts. Account will be locked after {MAX_ATTEMPTS - failedAttempts.count} more failed attempts.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Account Locked Warning */}
                {isLocked && (
                    <div className="lockout-warning animate-slide-down">
                        <div className="lockout-content">
                            <Ban size={24} />
                            <div>
                                <p className="lockout-title">Account Temporarily Locked</p>
                                <p className="lockout-text">
                                    Too many failed attempts. Try again in {formatLockoutTime(lockoutTimer)}
                                </p>
                                <div className="lockout-timer">
                                    <Clock size={16} />
                                    <span>{formatLockoutTime(lockoutTimer)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!isOtpSent && !isLocked && (
                    <div className="login-method-selector animate-fade-in">
                        <div className="method-tabs">
                            <button
                                type="button"
                                className={`method-tab ${loginMethod === "password" ? "active" : ""}`}
                                onClick={() => switchLoginMethod("password")}
                            >
                                <Key size={18} />
                                Password
                            </button>
                            <button
                                type="button"
                                className={`method-tab ${loginMethod === "otp" ? "active" : ""}`}
                                onClick={() => switchLoginMethod("otp")}
                            >
                                <Smartphone size={18} />
                                Email OTP
                            </button>
                        </div>
                    </div>
                )}

                {!isOtpSent && !isLocked && loginMethod === "password" && (
                    <form className="login-form animate-slide-in" onSubmit={handlePasswordLogin}>
                        <div className="input-group animate-slide-in-delayed-1">
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    required
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError("");
                                    }}
                                    className="form-input"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="input-group animate-slide-in-delayed-2">
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    required
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError("");
                                    }}
                                    className="form-input"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="error-message animate-shake">
                                <div className="error-content">
                                    <AlertCircle size={18} />
                                    <span className="error-text">{error}</span>
                                </div>
                                <button
                                    type="button"
                                    className="forgot-password-link"
                                    onClick={() => navigate("/forgot-password")}
                                >
                                    Forgotten password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-button animate-slide-in-delayed-3"
                            disabled={isLoading}
                        >
                            Sign In
                            <ArrowRight size={18} />
                        </button>
                    </form>
                )}

                {!isOtpSent && !isLocked && loginMethod === "otp" && (
                    <form className="login-form animate-slide-in" onSubmit={handleOtpLogin}>
                        <div className="input-group animate-slide-in-delayed-1">
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    required
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError("");
                                    }}
                                    className="form-input"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="error-message animate-shake">
                                <div className="error-content">
                                    <AlertCircle size={18} />
                                    <span className="error-text">{error}</span>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-button animate-slide-in-delayed-2"
                            disabled={isLoading}
                        >
                            Send OTP
                            <Smartphone size={18} />
                        </button>
                    </form>
                )}

                {isOtpSent && (
                    <form className="login-form animate-fade-in" onSubmit={verifyOtp}>
                        <div className="otp-info animate-slide-in">
                            <div className="otp-icon">
                                <Shield size={24} />
                            </div>
                            <p className="otp-description">
                                {twoFactorEnabled
                                    ? `We've sent a 6-digit security code to ${email} for two-factor authentication`
                                    : `We've sent a 6-digit verification code to ${email}`
                                }
                            </p>
                        </div>

                        <div className="input-group animate-slide-in-delayed-1">
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Shield size={20} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    required
                                    value={otpCode}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setOtpCode(value);
                                        setError("");
                                    }}
                                    className="form-input otp-input"
                                    disabled={isVerifyingOtp}
                                    maxLength="6"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="error-message animate-shake">
                                <div className="error-content">
                                    <AlertCircle size={18} />
                                    <span className="error-text">{error}</span>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-button animate-slide-in-delayed-2"
                            disabled={isVerifyingOtp || otpCode.length !== 6}
                        >
                            {twoFactorEnabled ? "Verify Security Code" : "Verify Code"}
                            <Shield size={18} />
                        </button>

                        <div className="otp-actions animate-slide-in-delayed-3">
                            <button
                                type="button"
                                className="resend-button"
                                onClick={resendOtp}
                                disabled={otpTimer > 0 || isSendingOtp}
                            >
                                {otpTimer > 0 ? (
                                    <>
                                        Resend in {otpTimer}s
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={16} />
                                        Resend Code
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className="back-to-login"
                                onClick={goBackToLogin}
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </form>
                )}

                {/* Only show footer when NOT on OTP verification page */}
                {!isOtpSent && (
                    <div className="login-footer animate-fade-in">
                        <div className="footer-link">
                            Don't have an account?{" "}
                            <button
                                type="button"
                                className="link-button"
                                onClick={() => navigate("/register")}
                            >
                                Register here
                            </button>
                        </div>
                        <div className="footer-link">
                            Don't remember your password?{" "}
                            <button
                                type="button"
                                className="link-button"
                                onClick={() => navigate("/forgot-password")}
                            >
                                Reset password
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Full-Screen Loading Overlay */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-backdrop"></div>
                    <div className="loading-content">
                        <div className="loading-card">
                            <div className="loading-animation">
                                <div className="loading-circle loading-circle-1"></div>
                                <div className="loading-circle loading-circle-2"></div>
                                <div className="loading-circle loading-circle-3"></div>
                            </div>
                            <h3 className="loading-title">Taking you to the next step</h3>
                            <p className="loading-subtitle">
                                {isVerifyingOtp
                                    ? "Verifying your security code..."
                                    : isSendingOtp
                                        ? "Sending verification code to your email..."
                                        : "Proceeding towards two factor authentication"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
                                    <h4>Login Assistant</h4>
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
                                    placeholder="Ask me anything about login..."
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

export default Login;
