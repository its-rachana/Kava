import { useState, useEffect } from 'react';

export const useTheme = () => {
    const [themeMode, setThemeMode] = useState(() => {
        const saved = localStorage.getItem('themeMode');
        return saved || 'auto'; // 'auto', 'light', 'dark'
    });

    const [currentTheme, setCurrentTheme] = useState('light');
    const [timeOfDay, setTimeOfDay] = useState('day');

    // Time-based theming system - matches Login.js exactly
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
            let finalTimeOfDay = 'day';

            if (themeMode === 'auto') {
                finalTheme = timeTheme.theme;
                finalTimeOfDay = timeTheme.timeOfDay;
            } else if (themeMode === 'dark') {
                finalTheme = 'dark';
                finalTimeOfDay = 'night';
            } else {
                finalTheme = 'light';
                finalTimeOfDay = 'day';
            }

            setCurrentTheme(finalTheme);
            setTimeOfDay(finalTimeOfDay);

            // Apply theme classes to body for global styling
            document.body.className = '';
            document.body.classList.add(`theme-${finalTheme}`);
            document.body.classList.add(`time-${finalTimeOfDay}`);
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
    }, [themeMode]);

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

    const getThemeClasses = () => {
        const isDarkMode = currentTheme === 'dark';
        return `${isDarkMode ? 'dark-mode' : 'light-mode'} ${timeOfDay}`;
    };

    const getThemeIcon = () => {
        if (themeMode === 'auto') {
            const timeTheme = getTimeBasedTheme();
            switch (timeTheme.timeOfDay) {
                case 'dawn':
                    return '🌅';
                case 'morning':
                case 'afternoon':
                    return '☀️';
                case 'evening':
                    return '🌇';
                case 'dusk':
                    return '🌆';
                case 'night':
                    return '🌙';
                default:
                    return '☀️';
            }
        } else if (themeMode === 'dark') {
            return '🌙';
        } else {
            return '☀️';
        }
    };

    const getThemeLabel = () => {
        if (themeMode === 'auto') {
            const timeTheme = getTimeBasedTheme();
            return `Auto (${timeTheme.period})`;
        }
        return themeMode.charAt(0).toUpperCase() + themeMode.slice(1);
    };

    return {
        themeMode,
        isDarkMode: currentTheme === 'dark',
        timeBasedTheme: timeOfDay,
        cycleTheme,
        getThemeClasses,
        getThemeIcon,
        getThemeLabel,
        currentTheme,
        timeOfDay
    };
};
