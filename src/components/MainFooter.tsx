import React from 'react';
import { Layout, Typography } from 'antd';

const { Text } = Typography;

const MainFooter: React.FC = () => {
  return (
    <Layout.Footer style={{ textAlign: 'center' }}>
      <Text type="secondary">
        NebulaTransfer ©{new Date().getFullYear()} - Built with React, Ant Design, Redux, and PeerJS
      </Text>
    </Layout.Footer>
  );
};

export default MainFooter;
