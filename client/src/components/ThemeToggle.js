import React from 'react';
import { Sun, Moon, Clock } from 'lucide-react';

const ThemeToggle = ({ themeMode, onToggle, getThemeIcon, getThemeLabel }) => {
    const getIconComponent = () => {
        if (themeMode === 'auto') {
            return <Clock size={20} />;
        } else if (themeMode === 'dark') {
            return <Moon size={20} />;
        } else {
            return <Sun size={20} />;
        }
    };

    return (
        <button
            className="theme-toggle-button"
            onClick={onToggle}
            title={`Current theme: ${getThemeLabel()}`}
            aria-label={`Switch theme (Current: ${getThemeLabel()})`}
        >
            <div className="theme-icon">
                {getIconComponent()}
            </div>
            <span className="theme-text">{themeMode.toUpperCase()}</span>
        </button>
    );
};

export default ThemeToggle;
