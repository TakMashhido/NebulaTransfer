import React, {createContext, useContext} from 'react'; // Removed useState, useEffect
import {ConfigProvider, theme as antdTheme} from 'antd';
import { useSelector } from 'react-redux'; // Import useSelector
import { RootState } from '../store'; // Adjust path if necessary, store/index.ts exports RootState

interface ThemeContextProps {
  dark: boolean;
  toggle: () => void; // This toggle will be a placeholder
}

const ThemeContext = createContext<ThemeContextProps>({
  dark: false, // Default value, will be overridden by Redux state
  toggle: () => {} // Placeholder
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  // Get theme from Redux store
  const currentTheme = useSelector((state: RootState) => state.theme.currentTheme);
  const antdDark = currentTheme === 'dark';

  // const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark'); // Removed
  // const toggle = () => setDark((d) => !d); // Removed
  // useEffect(() => { // Removed - localStorage sync is now in themeSlice.ts
  //   localStorage.setItem('theme', dark ? 'dark' : 'light');
  // }, [dark]);

  const placeholderToggle = () => {
    console.warn(
      'ThemeContext toggle used from ThemeProvider is not connected to Redux. ' +
      'Ensure theme changes are dispatched via Redux actions from components like ThemeToggle.'
    );
  };

  // Define the "Deep Blue & Aqua" palettes
  const darkPalette = {
    colorPrimary: '#2979FF',    // Electric Blue (Accent)
    colorBgBase: '#000033',     // Very Dark Blue/Almost Black (App Background)
    colorTextBase: '#B3E5FC',   // Light Aqua/Pastel Blue (Primary Text)
    colorTextSecondary: '#80DEEA', // Lighter Aqua variant for secondary text
    colorBorder: 'rgba(41, 121, 255, 0.3)', // Subtle border from primary
    colorBorderSecondary: 'rgba(41, 121, 255, 0.2)', // Slightly more subtle border
    colorBgContainerDisabled: 'rgba(255, 255, 255, 0.08)', // Disabled background
    colorTextDisabled: 'rgba(255, 255, 255, 0.3)',      // Disabled text
    // Card Background: '#1A237E' as rgba(26, 35, 126, 0.7) - will be handled by CSS
  };

  const lightPalette = {
    colorPrimary: '#00BCD4',    // Bright Aqua/Cyan (Accent)
    colorBgBase: '#FFFFFF',     // White (App Background)
    colorTextBase: '#0D47A1',   // Deep Blue (Primary Text)
    colorTextSecondary: '#455A64', // Blue Grey for secondary text
    colorBorder: 'rgba(0, 188, 212, 0.4)',   // Subtle border from primary
    colorBorderSecondary: 'rgba(0, 188, 212, 0.2)', // Slightly more subtle border
    colorBgContainerDisabled: 'rgba(0, 0, 0, 0.04)',    // Disabled background
    colorTextDisabled: 'rgba(0, 0, 0, 0.25)',         // Disabled text
    // Card Background: '#E0F7FA' as rgba(224, 247, 250, 0.7) - will be handled by CSS
  };

  const themeConfig = {
    algorithm: antdDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, // Use antdDark
    token: {
      fontFamily: 'Inter, sans-serif',
      borderRadiusLG: 12, // borderRadius for Cards
      ...(antdDark ? darkPalette : lightPalette), // Use antdDark
    },
    // Example for component-specific tokens, if needed later:
    // components: {
    //   Card: {
    //     colorBgContainer: antdDark ? 'rgba(26, 35, 126, 0.7)' : 'rgba(224, 247, 250, 0.7)',
    //   }
    // }
  };

  return (
    <ThemeContext.Provider value={{dark: antdDark, toggle: placeholderToggle}}>
      <ConfigProvider theme={themeConfig}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
