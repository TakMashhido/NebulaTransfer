import React from 'react';
import { Layout, Typography, Switch } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store'; // Corrected path
import { toggleTheme } from '../store/themeSlice';

const { Title } = Typography;

const MainHeader: React.FC = () => {
  const dispatch = useDispatch();
  const currentTheme = useSelector((state: RootState) => state.theme.currentTheme);

  const handleThemeChange = (checked: boolean) => {
    dispatch(toggleTheme());
  };

  return (
    <Layout.Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        // background: currentTheme === 'dark' ? '#001529' : '#f0f2f5', // Example background
      }}
    >
      <Title level={3} style={{ color: currentTheme === 'dark' ? 'white' : 'black', margin: 0 }}>
        P2P File Transfer
      </Title>
      <Switch
        checkedChildren={<SunOutlined />}
        unCheckedChildren={<MoonOutlined />}
        onChange={handleThemeChange}
        checked={currentTheme === 'light'}
        aria-label="Toggle theme"
      />
    </Layout.Header>
  );
};

export default MainHeader;
