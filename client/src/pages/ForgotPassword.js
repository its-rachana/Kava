import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    Mail, KeyRound, ShieldCheck, Eye, EyeOff, ArrowRight, AlertCircle,
    CheckCircle, RefreshCw, Clock, ArrowLeft, Shield, Zap, Send,
    Sun, Moon, Sunrise, Sunset, CloudRain, Stars, MessageCircle,
    HelpCircle, X, User, Lock, AlertTriangle, Ban
} from "lucide-react";
import "./ForgotPassword.css";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentStep, setCurrentStep] = useState(1); // 1: Email, 2: OTP, 3: Reset
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Theme system (same as login)
    const [themeMode, setThemeMode] = useState(() => {
        const saved = localStorage.getItem('themeMode');
        return saved || 'auto';
    });
    const [currentTheme, setCurrentTheme] = useState('light');
    const [timeOfDay, setTimeOfDay] = useState('day');

    // Security features
    const [resetAttempts, setResetAttempts] = useState(() => {
        const saved = localStorage.getItem('resetAttempts');
        return saved ? JSON.parse(saved) : { count: 0, lastAttempt: null };
    });
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState(0);

    // Smart Assistant
    const [showAssistant, setShowAssistant] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState([
        {
            id: 1,
            type: 'bot',
            message: "Hi! I'm here to help you reset your password safely. What do you need assistance with?",
            timestamp: new Date()
        }
    ]);
    const [userMessage, setUserMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const navigate = useNavigate();
    const LOCKOUT_DURATION = 15 * 60; // 15 minutes
    const MAX_RESET_ATTEMPTS = 3;

    // Time-based theming (same as login)
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

    // Theme effect (same as login)
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
            document.body.className = '';
            document.body.classList.add(`theme-${finalTheme}`);
            document.body.classList.add(`time-${timeOfDay}`);
        };

        updateTheme();
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

    // OTP Timer
    useEffect(() => {
        let interval = null;
        if (otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer(timer => timer - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    // Lockout Timer
    useEffect(() => {
        let interval = null;
        if (lockoutTimer > 0) {
            interval = setInterval(() => {
                setLockoutTimer(timer => {
                    const newTimer = timer - 1;
                    if (newTimer <= 0) {
                        setIsLocked(false);
                        resetAttempts();
                    }
                    return newTimer;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [lockoutTimer]);

    // Check lockout on mount
    useEffect(() => {
        checkLockoutStatus();
    }, []);

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
                case 'dawn': return <Sunrise size={20} />;
                case 'morning':
                case 'afternoon': return <Sun size={20} />;
                case 'evening': return <Sunset size={20} />;
                case 'dusk': return <CloudRain size={20} />;
                case 'night': return <Stars size={20} />;
                default: return <Sun size={20} />;
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

    const checkLockoutStatus = () => {
        const now = Date.now();
        const { count, lastAttempt } = resetAttempts;

        if (count >= MAX_RESET_ATTEMPTS && lastAttempt) {
            const timeSinceLastAttempt = (now - lastAttempt) / 1000;
            if (timeSinceLastAttempt < LOCKOUT_DURATION) {
                setIsLocked(true);
                setLockoutTimer(Math.ceil(LOCKOUT_DURATION - timeSinceLastAttempt));
            } else {
                resetAttempts();
            }
        }
    };

    const incrementResetAttempts = () => {
        const newAttempts = {
            count: resetAttempts.count + 1,
            lastAttempt: Date.now()
        };
        setResetAttempts(newAttempts);
        localStorage.setItem('resetAttempts', JSON.stringify(newAttempts));

        if (newAttempts.count >= MAX_RESET_ATTEMPTS) {
            setIsLocked(true);
            setLockoutTimer(LOCKOUT_DURATION);
        }
    };

    // const resetAttempts = () => {
    //     const resetData = { count: 0, lastAttempt: null };
    //     setResetAttempts(resetData);
    //     localStorage.setItem('resetAttempts', JSON.stringify(resetData));
    // };

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength += 20;
        if (password.length >= 12) strength += 10;
        if (/[a-z]/.test(password)) strength += 15;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^A-Za-z0-9]/.test(password)) strength += 25;
        return Math.min(strength, 100);
    };

    const getPasswordStrengthColor = (strength) => {
        if (strength < 30) return '#dc2626';
        if (strength < 60) return '#f59e0b';
        if (strength < 80) return '#3b82f6';
        return '#10b981';
    };

    const getPasswordStrengthLabel = (strength) => {
        if (strength < 30) return 'Weak';
        if (strength < 60) return 'Fair';
        if (strength < 80) return 'Good';
        return 'Strong';
    };

    const handlePasswordChange = (password) => {
        setNewPassword(password);
        setPasswordStrength(calculatePasswordStrength(password));
        setError("");
    };

    const sendOTP = async () => {
        if (isLocked) {
            setError(`Too many attempts. Please wait ${Math.ceil(lockoutTimer / 60)} minutes.`);
            return;
        }

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            await axios.post(
                process.env.REACT_APP_API_URL + "/api/user/send-reset-otp",
                { email }
            );
            setCurrentStep(2);
            setOtpTimer(60);
            setSuccess("Reset code sent to your email!");
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Failed to send reset code";
            setError(errorMessage);
            incrementResetAttempts();
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOTP = async () => {
        setIsLoading(true);
        setError("");

        try {
            await axios.post(
                process.env.REACT_APP_API_URL + "/api/user/verify-reset-otp",
                { email, otpCode }
            );
            setCurrentStep(3);
            setSuccess("Code verified! Now set your new password.");
        } catch (error) {
            setError(error.response?.data?.message || "Invalid code");
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (passwordStrength < 50) {
            setError("Password is too weak. Please choose a stronger password.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            await axios.post(
                process.env.REACT_APP_API_URL + "/api/user/reset-password",
                { email, otpCode, newPassword }
            );

            resetAttempts(); // Reset attempts on success
            setSuccess("Password reset successfully! Redirecting to login...");

            setTimeout(() => {
                navigate("/");
            }, 2000);
        } catch (error) {
            setError(error.response?.data?.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    const resendOTP = async () => {
        if (otpTimer > 0) return;
        await sendOTP();
    };

    const goBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setError("");
            setSuccess("");
        } else {
            navigate("/");
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Smart Assistant functions (similar to login)
    const getSmartResponse = (message) => {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('code') || lowerMessage.includes('otp')) {
            return {
                message: "Having trouble with the reset code? Check your spam folder and make sure you entered the correct email. The code expires in 10 minutes.",
                actions: [
                    { text: "Resend Code", action: () => resendOTP() },
                    { text: "Change Email", action: () => setCurrentStep(1) }
                ]
            };
        }

        if (lowerMessage.includes('password') && lowerMessage.includes('strong')) {
            return {
                message: "For a strong password, use at least 8 characters with uppercase, lowercase, numbers, and special characters. Aim for 60+ strength score.",
                actions: []
            };
        }

        if (lowerMessage.includes('email') || lowerMessage.includes('not receiving')) {
            return {
                message: "If you're not receiving emails, check your spam/junk folder. Also verify you're using the correct email address associated with your account.",
                actions: [
                    { text: "Try Different Email", action: () => setCurrentStep(1) }
                ]
            };
        }

        return {
            message: "I can help with password reset issues, email problems, code verification, and creating strong passwords. What specific issue are you facing?",
            actions: [
                { text: "Email Issues", action: () => setCurrentStep(1) },
                { text: "Code Problems", action: () => resendOTP() },
                { text: "Back to Login", action: () => navigate("/") }
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

        setTimeout(() => {
            const confirmMessage = {
                id: Date.now() + 1,
                type: 'bot',
                message: `Great! I've helped you with "${actionText}". Anything else I can assist with?`,
                timestamp: new Date()
            };
            setAssistantMessages(prev => [...prev, confirmMessage]);
        }, 500);
    };

    const getStepIcon = (step) => {
        switch (step) {
            case 1: return <Mail size={24} />;
            case 2: return <ShieldCheck size={24} />;
            case 3: return <KeyRound size={24} />;
            default: return <Mail size={24} />;
        }
    };

    const getStepTitle = (step) => {
        switch (step) {
            case 1: return "Enter Email Address";
            case 2: return "Verify Reset Code";
            case 3: return "Create New Password";
            default: return "Reset Password";
        }
    };

    const getStepDescription = (step) => {
        switch (step) {
            case 1: return "We'll send a reset code to your email";
            case 2: return "Enter the 6-digit code from your email";
            case 3: return "Choose a strong new password";
            default: return "Reset your password";
        }
    };

    return (
        <div className={`forgot-container theme-${currentTheme} time-${timeOfDay}`}>
            {/* Atmospheric Elements */}
            <div className="atmospheric-elements">
                {timeOfDay === 'night' && (
                    <>
                        <div className="stars"></div>
                        <div className="shooting-star"></div>
                    </>
                )}
                {timeOfDay === 'dawn' && <div className="sunrise-rays"></div>}
                {timeOfDay === 'dusk' && <div className="dusk-clouds"></div>}
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
                <div className="toggle-icon">{getThemeIcon()}</div>
                <div className="theme-label">
                    {themeMode === 'auto' ? 'AUTO' : themeMode.toUpperCase()}
                </div>
            </button>

            <div className="forgot-card animate-slide-up">
                {/* Header */}
                <div className="forgot-header animate-fade-in">
                    <div className="step-icon">
                        {getStepIcon(currentStep)}
                    </div>
                    <h1>{getStepTitle(currentStep)}</h1>
                    <p>{getStepDescription(currentStep)}</p>
                </div>

                {/* Progress Indicator */}
                <div className="progress-steps animate-slide-in">
                    <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
                        <div className="step-number">1</div>
                        <div className="step-label">Email</div>
                    </div>
                    <div className={`progress-connector ${currentStep >= 2 ? 'active' : ''}`}></div>
                    <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
                        <div className="step-number">2</div>
                        <div className="step-label">Verify</div>
                    </div>
                    <div className={`progress-connector ${currentStep >= 3 ? 'active' : ''}`}></div>
                    <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
                        <div className="step-number">3</div>
                        <div className="step-label">Reset</div>
                    </div>
                </div>

                {/* Lockout Warning */}
                {isLocked && (
                    <div className="lockout-warning animate-slide-down">
                        <div className="lockout-content">
                            <Ban size={24} />
                            <div>
                                <p className="lockout-title">Too Many Reset Attempts</p>
                                <p className="lockout-text">
                                    Please wait {formatTime(lockoutTimer)} before trying again
                                </p>
                                <div className="lockout-timer">
                                    <Clock size={16} />
                                    <span>{formatTime(lockoutTimer)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 1: Email */}
                {currentStep === 1 && !isLocked && (
                    <form className="forgot-form animate-slide-in" onSubmit={(e) => { e.preventDefault(); sendOTP(); }}>
                        <div className="input-group animate-slide-in-delayed-1">
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Enter your email address"
                                    required
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError("");
                                        setSuccess("");
                                    }}
                                    className="form-input"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="forgot-button animate-slide-in-delayed-2"
                            disabled={isLoading || !email}
                        >
                            {isLoading ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    Sending Code...
                                </>
                            ) : (
                                <>
                                    Send Reset Code
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Step 2: OTP Verification */}
                {currentStep === 2 && (
                    <form className="forgot-form animate-fade-in" onSubmit={(e) => { e.preventDefault(); verifyOTP(); }}>
                        <div className="otp-info animate-slide-in">
                            <div className="otp-description">
                                We've sent a 6-digit code to <strong>{email}</strong>
                            </div>
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
                                    disabled={isLoading}
                                    maxLength="6"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="forgot-button animate-slide-in-delayed-2"
                            disabled={isLoading || otpCode.length !== 6}
                        >
                            {isLoading ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Verify Code
                                    <ShieldCheck size={18} />
                                </>
                            )}
                        </button>

                        <div className="otp-actions animate-slide-in-delayed-3">
                            <button
                                type="button"
                                className="resend-button"
                                onClick={resendOTP}
                                disabled={otpTimer > 0 || isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="loading-spinner"></div>
                                        Sending...
                                    </>
                                ) : otpTimer > 0 ? (
                                    <>Resend in {otpTimer}s</>
                                ) : (
                                    <>
                                        <RefreshCw size={16} />
                                        Resend Code
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: New Password */}
                {currentStep === 3 && (
                    <form className="forgot-form animate-slide-in" onSubmit={resetPassword}>
                        <div className="input-group animate-slide-in-delayed-1">
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Enter new password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                    className="form-input"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    disabled={isLoading}
                                >
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {newPassword && (
                                <div className="password-strength animate-fade-in">
                                    <div className="strength-bar">
                                        <div
                                            className="strength-fill"
                                            style={{
                                                width: `${passwordStrength}%`,
                                                backgroundColor: getPasswordStrengthColor(passwordStrength)
                                            }}
                                        ></div>
                                    </div>
                                    <div className="strength-label">
                                        Password Strength: {getPasswordStrengthLabel(passwordStrength)} ({passwordStrength}%)
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="input-group animate-slide-in-delayed-2">
                            <div className="input-wrapper">
                                <div className="input-icon">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm new password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setError("");
                                    }}
                                    className="form-input"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {confirmPassword && (
                                <div className={`password-match ${newPassword === confirmPassword ? 'match' : 'no-match'} animate-fade-in`}>
                                    {newPassword === confirmPassword ? (
                                        <>
                                            <CheckCircle size={16} />
                                            Passwords match
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle size={16} />
                                            Passwords don't match
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="forgot-button animate-slide-in-delayed-3"
                            disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordStrength < 50}
                        >
                            {isLoading ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    Updating Password...
                                </>
                            ) : (
                                <>
                                    Update Password
                                    <CheckCircle size={18} />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Error and Success Messages */}
                {error && (
                    <div className="error-message animate-shake">
                        <div className="error-content">
                            <AlertCircle size={18} />
                            <span className="error-text">{error}</span>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="success-message animate-slide-in">
                        <div className="success-content">
                            <CheckCircle size={18} />
                            <span className="success-text">{success}</span>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="forgot-actions animate-slide-in-delayed-4">
                    <button
                        type="button"
                        className="back-button"
                        onClick={goBack}
                        disabled={isLoading}
                    >
                        <ArrowLeft size={16} />
                        {currentStep === 1 ? "Back to Login" : "Back"}
                    </button>
                </div>

                <div className="forgot-footer animate-fade-in">
                    <div className="footer-link">
                        Remember your password?{" "}
                        <button
                            type="button"
                            className="link-button"
                            onClick={() => navigate("/")}
                        >
                            Sign In
                        </button>
                    </div>
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
                </div>
            </div>

            {/* Smart Assistant */}
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
                                    <h4>Reset Assistant</h4>
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
                                    placeholder="Ask me about password reset..."
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

export default ForgotPassword;
