import React, {useState, useEffect} from "react";
import axios from "axios";
import {useNavigate} from "react-router-dom";
import {
    Eye, EyeOff, Edit3, Save, Upload, ArrowLeft, User, Mail, Key, Camera,
    Sun, Moon, Sunrise, Sunset, CloudRain, Stars, AlertCircle, CheckCircle,
    MessageCircle, X, Send, HelpCircle, Zap, Shield, RefreshCw, Settings,
    Download, Trash2, Copy, Check, Smartphone, Lock, LogOut, UserCheck
} from "lucide-react";
import "./Profile.css";
import {arrayBufferToBase64} from "../utilities/image";

const Profile = () => {
    const [user, setUser] = useState(null);
    const [newKey, setNewKey] = useState("");
    const [newName, setNewName] = useState("");
    const [newDisplayName, setNewDisplayName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Editable states for each field
    const [isKeyEditable, setIsKeyEditable] = useState(false);
    const [isNameEditable, setIsNameEditable] = useState(false);
    const [isDisplayNameEditable, setIsDisplayNameEditable] = useState(false);
    const [isPasswordEditable, setIsPasswordEditable] = useState(false);

    const [showKey, setShowKey] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState({text: "", type: ""});
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [base64Image, setBase64Image] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Individual updating states
    const [isUpdatingKey, setIsUpdatingKey] = useState(false);
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const [copied, setCopied] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [isToggling2FA, setIsToggling2FA] = useState(false);

    // Theme state
    const [themeMode, setThemeMode] = useState(() => {
        const saved = localStorage.getItem('themeMode');
        return saved || 'auto';
    });
    const [currentTheme, setCurrentTheme] = useState('light');
    const [timeOfDay, setTimeOfDay] = useState('day');

    // Smart Assistant states
    const [showAssistant, setShowAssistant] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState([
        {
            id: 1,
            type: 'bot',
            message: "Hi! I'm here to help you manage your profile. What would you like to know?",
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
            return {theme: 'light', timeOfDay: 'dawn', period: 'Dawn'};
        } else if (hour >= 8 && hour < 12) {
            return {theme: 'light', timeOfDay: 'morning', period: 'Morning'};
        } else if (hour >= 12 && hour < 17) {
            return {theme: 'light', timeOfDay: 'afternoon', period: 'Afternoon'};
        } else if (hour >= 17 && hour < 20) {
            return {theme: 'light', timeOfDay: 'evening', period: 'Evening'};
        } else if (hour >= 20 && hour < 22) {
            return {theme: 'dark', timeOfDay: 'dusk', period: 'Dusk'};
        } else {
            return {theme: 'dark', timeOfDay: 'night', period: 'Night'};
        }
    };
    useEffect(() => {
        // Apply overflow hidden when component mounts
        document.body.style.overflow = 'hidden';

        // Cleanup - restore scrolling when component unmounts
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);
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
                    return <Sunrise size={20}/>;
                case 'morning':
                case 'afternoon':
                    return <Sun size={20}/>;
                case 'evening':
                    return <Sunset size={20}/>;
                case 'dusk':
                    return <CloudRain size={20}/>;
                case 'night':
                    return <Stars size={20}/>;
                default:
                    return <Sun size={20}/>;
            }
        } else if (themeMode === 'dark') {
            return <Moon size={20}/>;
        } else {
            return <Sun size={20}/>;
        }
    };

    const getThemeLabel = () => {
        if (themeMode === 'auto') {
            const timeTheme = getTimeBasedTheme();
            return `Auto (${timeTheme.period})`;
        }
        return themeMode.charAt(0).toUpperCase() + themeMode.slice(1);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

            if (!token) {
                setIsLoading(false);
                return;
            }

            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            try {
                const {data} = await axios.get(
                    process.env.REACT_APP_API_URL + "/api/user/profile",
                    config
                );
                if (data.profilePhoto && data.profilePhoto.data) {
                    setBase64Image(arrayBufferToBase64(data.profilePhoto.data));
                }
                setUser(data);
                setNewKey(data.secretKey || "");
                setNewName(data.name || "");
                setNewDisplayName(data.displayName || "");
                setTwoFactorEnabled(data.twoFactorEnabled || false);
            } catch (error) {
                setMessage({text: "Failed to load profile data.", type: "error"});
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    // Sign out function
    const handleSignOut = () => {
        localStorage.removeItem("userInfo");
        navigate("/login");
    };

    // Update functions for each field
    const updateKey = async () => {
        setIsUpdatingKey(true);
        const token = JSON.parse(localStorage.getItem("userInfo"))?.token;
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };

        try {
            const {data} = await axios.put(
                process.env.REACT_APP_API_URL + "/api/user/secret-key",
                {secretKey: newKey},
                config
            );

            const oldUserInfo = JSON.parse(localStorage.getItem("userInfo"));
            oldUserInfo.secretKey = newKey;
            localStorage.setItem("userInfo", JSON.stringify(oldUserInfo));
            window.dispatchEvent(new Event("userInfoUpdated"));
            setUser(data);
            setIsKeyEditable(false);
            setMessage({text: "Secret key updated successfully!", type: "success"});
        } catch (err) {
            setMessage({text: "Failed to update the secret key.", type: "error"});
        } finally {
            setIsUpdatingKey(false);
        }

        setTimeout(() => {
            setMessage({text: "", type: ""});
        }, 4000);
    };

    const updateName = async () => {
        setIsUpdatingName(true);
        const token = JSON.parse(localStorage.getItem("userInfo"))?.token;
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };

        try {
            const {data} = await axios.put(
                process.env.REACT_APP_API_URL + "/api/user/update-name",
                {name: newName},
                config
            );

            setUser(data);
            setIsNameEditable(false);
            setMessage({text: "Full name updated successfully!", type: "success"});
        } catch (err) {
            setMessage({text: "Failed to update the full name.", type: "error"});
        } finally {
            setIsUpdatingName(false);
        }

        setTimeout(() => {
            setMessage({text: "", type: ""});
        }, 4000);
    };

    const updateDisplayName = async () => {
        setIsUpdatingDisplayName(true);
        const token = JSON.parse(localStorage.getItem("userInfo"))?.token;
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };

        try {
            const {data} = await axios.put(
                process.env.REACT_APP_API_URL + "/api/user/update-display-name",
                {displayName: newDisplayName},
                config
            );

            setUser(data);
            setIsDisplayNameEditable(false);
            setMessage({text: "Display name updated successfully!", type: "success"});
        } catch (err) {
            setMessage({text: "Failed to update the display name.", type: "error"});
        } finally {
            setIsUpdatingDisplayName(false);
        }

        setTimeout(() => {
            setMessage({text: "", type: ""});
        }, 4000);
    };

    const updatePassword = async () => {
        if (newPassword !== confirmPassword) {
            setMessage({text: "Passwords do not match.", type: "error"});
            setTimeout(() => setMessage({text: "", type: ""}), 4000);
            return;
        }

        if (newPassword.length < 6) {
            setMessage({text: "Password must be at least 6 characters long.", type: "error"});
            setTimeout(() => setMessage({text: "", type: ""}), 4000);
            return;
        }

        setIsUpdatingPassword(true);
        const token = JSON.parse(localStorage.getItem("userInfo"))?.token;
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };

        try {
            await axios.put(
                process.env.REACT_APP_API_URL + "/api/user/update-password",
                {password: newPassword},
                config
            );

            setIsPasswordEditable(false);
            setNewPassword("");
            setConfirmPassword("");
            setMessage({text: "Password updated successfully!", type: "success"});
        } catch (err) {
            setMessage({text: "Failed to update the password.", type: "error"});
        } finally {
            setIsUpdatingPassword(false);
        }

        setTimeout(() => {
            setMessage({text: "", type: ""});
        }, 4000);
    };

    const navigateBack = () => {
        navigate("/chats");
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === "image/jpeg") {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setMessage({text: "", type: ""});
        } else {
            setMessage({text: "Only JPG images are allowed.", type: "error"});
            setTimeout(() => setMessage({text: "", type: ""}), 3000);
        }
    };

    const uploadProfilePicture = async () => {
        if (!selectedFile) {
            setMessage({text: "No file selected.", type: "error"});
            return;
        }

        setIsUploading(true);
        const token = JSON.parse(localStorage.getItem("userInfo"))?.token;
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
        };

        const formData = new FormData();
        formData.append("profilePhoto", selectedFile);
        formData.append("email", user.email);

        try {
            await axios.post(
                process.env.REACT_APP_API_URL + "/api/user/upload-photo",
                formData,
                config
            );
            setMessage({text: "Profile photo uploaded successfully!", type: "success"});

            // Refresh the profile to get the new image
            const {data} = await axios.get(
                process.env.REACT_APP_API_URL + "/api/user/profile",
                {headers: {Authorization: `Bearer ${token}`}}
            );
            if (data.profilePhoto && data.profilePhoto.data) {
                setBase64Image(arrayBufferToBase64(data.profilePhoto.data));
            }
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (err) {
            setMessage({text: "Failed to upload photo.", type: "error"});
        } finally {
            setIsUploading(false);
        }

        setTimeout(() => {
            setMessage({text: "", type: ""});
        }, 4000);
    };

    const cancelFileSelection = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setMessage({text: "", type: ""});
    };

    const copySecretKey = async () => {
        try {
            await navigator.clipboard.writeText(newKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            setMessage({text: "Failed to copy secret key.", type: "error"});
        }
    };

    const generateNewKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewKey(result);
        setMessage({text: "New secret key generated. Don't forget to save it!", type: "success"});
        setTimeout(() => setMessage({text: "", type: ""}), 3000);
    };

    const toggle2FA = async () => {
        setIsToggling2FA(true);
        const token = JSON.parse(localStorage.getItem("userInfo"))?.token;
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };

        try {
            const {data} = await axios.put(
                process.env.REACT_APP_API_URL + "/api/user/toggle-2fa",
                {
                    email: user.email,
                    enabled: !twoFactorEnabled
                },
                config
            );

            setTwoFactorEnabled(data.twoFactorEnabled);
            setMessage({
                text: `Two-factor authentication ${data.twoFactorEnabled ? 'enabled' : 'disabled'} successfully!`,
                type: "success"
            });
        } catch (err) {
            setMessage({text: "Failed to update two-factor authentication.", type: "error"});
        } finally {
            setIsToggling2FA(false);
        }

        setTimeout(() => {
            setMessage({text: "", type: ""});
        }, 4000);
    };

    // Smart Assistant Functions
    const getSmartResponse = (message) => {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('sign out') || lowerMessage.includes('logout') || lowerMessage.includes('log out')) {
            return {
                message: "You can sign out of your account using the sign out button. This will clear your session and redirect you to the login page.",
                actions: [
                    {text: "Sign Out", action: () => handleSignOut()}
                ]
            };
        }

        if (lowerMessage.includes('name') && (lowerMessage.includes('change') || lowerMessage.includes('edit') || lowerMessage.includes('update'))) {
            return {
                message: "You can edit both your full name and display name. Your full name is used for formal identification, while your display name is what others see in chats.",
                actions: [
                    {text: "Edit Full Name", action: () => setIsNameEditable(true)},
                    {text: "Edit Display Name", action: () => setIsDisplayNameEditable(true)}
                ]
            };
        }

        if (lowerMessage.includes('password') && (lowerMessage.includes('change') || lowerMessage.includes('update') || lowerMessage.includes('reset'))) {
            return {
                message: "You can update your password for enhanced security. Make sure to use a strong password with at least 6 characters.",
                actions: [
                    {text: "Change Password", action: () => setIsPasswordEditable(true)}
                ]
            };
        }

        if (lowerMessage.includes('secret') && lowerMessage.includes('key')) {
            return {
                message: "Your secret key is used for secure authentication. You can edit it, generate a new one, or copy it to clipboard. Make sure to keep it safe!",
                actions: [
                    {text: "Edit Secret Key", action: () => setIsKeyEditable(true)},
                    {text: "Generate New Key", action: () => generateNewKey()},
                    {text: "Copy Key", action: () => copySecretKey()}
                ]
            };
        }

        if (lowerMessage.includes('photo') || lowerMessage.includes('picture') || lowerMessage.includes('image')) {
            return {
                message: "You can update your profile photo by clicking on your current image. Only JPG files are supported for security reasons.",
                actions: [
                    {text: "Change Photo", action: () => document.getElementById('file-input')?.click()}
                ]
            };
        }

        if (lowerMessage.includes('theme') || lowerMessage.includes('dark') || lowerMessage.includes('light')) {
            return {
                message: "You can change the theme using the theme toggle button. It supports auto mode (changes based on time of day), light mode, and dark mode.",
                actions: [
                    {text: "Cycle Theme", action: () => cycleTheme()}
                ]
            };
        }

        if (lowerMessage.includes('2fa') || lowerMessage.includes('two factor') || lowerMessage.includes('authentication') || lowerMessage.includes('security')) {
            return {
                message: `Two-factor authentication adds an extra layer of security to your account. It's currently ${twoFactorEnabled ? 'enabled' : 'disabled'}. You can toggle it on or off using the security settings.`,
                actions: [
                    {text: `${twoFactorEnabled ? 'Disable' : 'Enable'} 2FA`, action: () => toggle2FA()}
                ]
            };
        }

        return {
            message: "I can help you with profile management tasks like updating your name, password, photo, managing your secret key, changing themes, or signing out.",
            actions: [
                {text: "Edit Full Name", action: () => setIsNameEditable(true)},
                {text: "Change Password", action: () => setIsPasswordEditable(true)},
                {text: "Edit Secret Key", action: () => setIsKeyEditable(true)},
                {text: "Sign Out", action: () => handleSignOut()}
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

    if (isLoading) {
        return (
            <div className={`profile-container theme-${currentTheme} time-${timeOfDay}`}>
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
                {/* Full-Screen Loading Overlay */}
                <div className="loading-overlay">
                    <div className="loading-backdrop"></div>
                    <div className="loading-content">
                        <div className="loading-card">
                            <div className="loading-animation">
                                <div className="loading-circle loading-circle-1"></div>
                                <div className="loading-circle loading-circle-2"></div>
                                <div className="loading-circle loading-circle-3"></div>
                            </div>
                            <h3 className="loading-title">Loading Your Profile</h3>
                            <p className="loading-subtitle">
                                Fetching your account information and preferences...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (!user) {
        return (
            <div className={`profile-container theme-${currentTheme} time-${timeOfDay}`}>
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

                <div className="error-state animate-fade-in">
                    <AlertCircle size={48}/>
                    <p>Unable to load profile. Please try again.</p>
                    <button onClick={navigateBack} className="btn btn-primary">
                        <ArrowLeft size={18}/>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`profile-container theme-${currentTheme} time-${timeOfDay}`}>
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

            <div className="profile-header animate-slide-down">
                <button onClick={navigateBack} className="back-button">
                    <ArrowLeft size={20}/>
                    Back to Chats
                </button>
                <h1>Profile Settings</h1>
                <button onClick={handleSignOut} className="back-button"
                        style={{background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.2)'}}>
                    <LogOut size={20}/>
                    Sign Out
                </button>
            </div>

            <div className="profile-card animate-slide-up">
                {/* Profile Picture Section */}
                <div className="profile-image-section animate-fade-in">
                    <div className="profile-image-container">
                        <img
                            src={
                                previewUrl ||
                                (base64Image
                                    ? `data:image/jpeg;base64,${base64Image}`
                                    : "https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=2")
                            }
                            alt="Profile"
                            className="profile-image"
                        />
                        <div className="image-overlay">
                            <label htmlFor="file-input" className="image-upload-trigger">
                                <Camera size={24}/>
                                <span>Change Photo</span>
                            </label>
                            <input
                                id="file-input"
                                type="file"
                                accept="image/jpeg"
                                onChange={handleFileChange}
                                className="hidden-input"
                            />
                        </div>
                    </div>

                    {selectedFile && (
                        <div className="file-upload-actions animate-slide-in">
                            <button
                                onClick={uploadProfilePicture}
                                disabled={isUploading}
                                className="btn btn-primary"
                            >
                                <Upload size={18}/>
                                Upload Photo
                            </button>
                            <button onClick={cancelFileSelection} className="btn btn-secondary">
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* User Information */}
                <div className="profile-info-section">
                    <div className="info-group animate-slide-in-delayed-1">
                        {/* Full Name Section */}
                        <div className="secret-key-section">
                            <div className="secret-key-header">
                                <div className="info-icon">
                                    <User size={20}/>
                                </div>
                                <label>Full Name</label>
                                <div className="key-actions">
                                    {!isNameEditable ? (
                                        <button
                                            onClick={() => setIsNameEditable(true)}
                                            className="btn btn-text"
                                        >
                                            <Edit3 size={16}/>
                                            Edit
                                        </button>
                                    ) : (
                                        <button
                                            onClick={updateName}
                                            disabled={isUpdatingName}
                                            className="btn btn-primary"
                                        >
                                            {isUpdatingName ? <div className="btn-spinner"></div> : <Save size={16}/>}
                                            Save
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="secret-key-input-group">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="secret-key-input"
                                    placeholder="Enter your full name"
                                    disabled={!isNameEditable}
                                />
                            </div>
                        </div>

                        {/* Display Name Section */}
                        <div className="secret-key-section">
                            <div className="secret-key-header">
                                <div className="info-icon">
                                    <UserCheck size={20}/>
                                </div>
                                <label>Display Name</label>
                                <div className="key-actions">
                                    {!isDisplayNameEditable ? (
                                        <button
                                            onClick={() => setIsDisplayNameEditable(true)}
                                            className="btn btn-text"
                                        >
                                            <Edit3 size={16}/>
                                            Edit
                                        </button>
                                    ) : (
                                        <button
                                            onClick={updateDisplayName}
                                            disabled={isUpdatingDisplayName}
                                            className="btn btn-primary"
                                        >
                                            {isUpdatingDisplayName ? <div className="btn-spinner"></div> :
                                                <Save size={16}/>}
                                            Save
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="secret-key-input-group">
                                <input
                                    type="text"
                                    value={newDisplayName}
                                    onChange={(e) => setNewDisplayName(e.target.value)}
                                    className="secret-key-input"
                                    placeholder="Enter your display name"
                                    disabled={!isDisplayNameEditable}
                                />
                            </div>
                        </div>

                        <div className="info-item">
                            <div className="info-icon">
                                <Mail size={20}/>
                            </div>
                            <div className="info-content">
                                <label>Email Address</label>
                                <span>{user.email}</span>
                            </div>
                        </div>

                        {/* Password Section */}
                        <div className="secret-key-section">
                            <div className="secret-key-header">
                                <div className="info-icon">
                                    <Lock size={20}/>
                                </div>
                                <label>Password</label>
                                <div className="key-actions">
                                    {!isPasswordEditable ? (
                                        <button
                                            onClick={() => setIsPasswordEditable(true)}
                                            className="btn btn-text"
                                        >
                                            <Edit3 size={16}/>
                                            Change
                                        </button>
                                    ) : (
                                        <button
                                            onClick={updatePassword}
                                            disabled={isUpdatingPassword}
                                            className="btn btn-primary"
                                        >
                                            {isUpdatingPassword ? <div className="btn-spinner"></div> :
                                                <Save size={16}/>}
                                            Save
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isPasswordEditable && (
                                <>
                                    <div className="secret-key-input-group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="secret-key-input"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            onClick={() => setShowPassword(prev => !prev)}
                                            className="visibility-toggle"
                                            title={showPassword ? "Hide Password" : "Show Password"}
                                        >
                                            {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                        </button>
                                    </div>
                                    <div className="secret-key-input-group">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="secret-key-input"
                                            placeholder="Confirm new password"
                                        />
                                        <button
                                            onClick={() => setShowConfirmPassword(prev => !prev)}
                                            className="visibility-toggle"
                                            title={showConfirmPassword ? "Hide Password" : "Show Password"}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Secret Key Section */}
                    <div className="secret-key-section animate-slide-in-delayed-2">
                        <div className="secret-key-header">
                            <div className="info-icon">
                                <Key size={20}/>
                            </div>
                            <label>Secret Key</label>
                            <div className="key-actions">
                                {!isKeyEditable ? (
                                    <button
                                        onClick={() => setIsKeyEditable(true)}
                                        className="btn btn-text"
                                    >
                                        <Edit3 size={16}/>
                                        Edit
                                    </button>
                                ) : (
                                    <button
                                        onClick={updateKey}
                                        disabled={isUpdatingKey}
                                        className="btn btn-primary"
                                    >
                                        {isUpdatingKey ? <div className="btn-spinner"></div> : <Save size={16}/>}
                                        Save
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="secret-key-input-group">
                            <input
                                type={showKey ? "text" : "password"}
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value)}
                                className="secret-key-input"
                                placeholder="Enter your secret key"
                                disabled={!isKeyEditable}
                            />
                            <button
                                onClick={() => setShowKey(prev => !prev)}
                                className="visibility-toggle"
                                title={showKey ? "Hide Key" : "Show Key"}
                            >
                                {showKey ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>

                        <div className="key-utilities">
                            <button
                                onClick={copySecretKey}
                                className="btn btn-secondary"
                                disabled={!newKey}
                            >
                                {copied ? <Check size={16}/> : <Copy size={16}/>}
                                {copied ? 'Copied!' : 'Copy Key'}
                            </button>
                            <button
                                onClick={generateNewKey}
                                className="btn btn-secondary"
                                disabled={!isKeyEditable}
                            >
                                <RefreshCw size={16}/>
                                Generate New
                            </button>
                        </div>
                    </div>
                    <div className="security-section animate-slide-in-delayed-3">
                        <div className="section-header">
                            <div className="info-icon">
                                <Shield size={20}/>
                            </div>
                            <div className="section-content">
                                <h3>Security Settings</h3>
                                <p>Manage your account security preferences</p>
                            </div>
                        </div>

                        <div className="security-option">
                            <div className="security-option-info">
                                <div className="security-icon">
                                    <Smartphone size={18}/>
                                </div>
                                <div className="security-details">
                                    <h4>Two-Factor Authentication</h4>
                                    <p>Add an extra layer of security to your account with SMS or email verification</p>
                                </div>
                            </div>
                            <div className="security-toggle">
                                <button
                                    className={`toggle-switch ${twoFactorEnabled ? 'enabled' : 'disabled'}`}
                                    onClick={toggle2FA}
                                    disabled={isToggling2FA}
                                    aria-label={`${twoFactorEnabled ? 'Disable' : 'Enable'} two-factor authentication`}
                                >
                                    <div className="toggle-slider">
                                        {isToggling2FA ? (
                                            <div className="toggle-spinner"></div>
                                        ) : (
                                            <div className="toggle-icon">
                                                {twoFactorEnabled ? <Lock size={12}/> : <Smartphone size={12}/>}
                                            </div>
                                        )}
                                    </div>
                                </button>
                                <span className="toggle-label">
                                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Settings Section */}


                {/* Message Display */}
                {message.text && (
                    <div className={`message-alert ${message.type} animate-slide-in`}>
                        <div className="alert-icon">
                            {message.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                        </div>
                        <p>{message.text}</p>
                    </div>
                )}
            </div>

            {/* Smart Assistant Chatbot */}
            <div className={`assistant-container ${showAssistant ? 'active' : ''}`}>
                {!showAssistant && (
                    <button
                        className="assistant-trigger"
                        onClick={() => setShowAssistant(true)}
                        aria-label="Open help assistant"
                    >
                        <MessageCircle size={24}/>
                        <div className="assistant-badge">
                            <HelpCircle size={12}/>
                        </div>
                    </button>
                )}

                {showAssistant && (
                    <div className="assistant-chat animate-slide-up">
                        <div className="assistant-header">
                            <div className="assistant-info">
                                <div className="assistant-avatar">
                                    <Zap size={16}/>
                                </div>
                                <div>
                                    <h4>Profile Assistant</h4>
                                    <span>Here to help</span>
                                </div>
                            </div>
                            <button
                                className="assistant-close"
                                onClick={() => setShowAssistant(false)}
                            >
                                <X size={18}/>
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
                                    placeholder="Ask me about your profile..."
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
                                    <Send size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
