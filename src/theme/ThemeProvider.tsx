import React, {createContext, useContext, useState, useEffect} from 'react';
import {ConfigProvider, theme as antdTheme} from 'antd';

interface ThemeContextProps {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  dark: false,
  toggle: () => {}
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  const toggle = () => setDark((d) => !d);

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <ThemeContext.Provider value={{dark, toggle}}>
      <ConfigProvider theme={{algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm}}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
