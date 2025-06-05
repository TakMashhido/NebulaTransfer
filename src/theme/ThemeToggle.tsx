import React from 'react';
import {Switch} from 'antd';
import {BulbOutlined} from '@ant-design/icons';
import {useTheme} from './ThemeProvider';

const ThemeToggle: React.FC = () => {
  const {dark, toggle} = useTheme();
  return (
    <Switch
      checked={dark}
      checkedChildren={<BulbOutlined />}
      unCheckedChildren={<BulbOutlined />}
      onChange={toggle}
    />
  );
};

export default ThemeToggle;
