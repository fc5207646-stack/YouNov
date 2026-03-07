
import React from 'react';
import { Helmet } from 'react-helmet';

const AccessDeniedPage = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Helmet>
        <title>YouNov - Access Denied | 尤诺夫·小说阅读平台</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="text-center">
        <p className="text-xl text-black font-medium">
          您访问的页面不存在
        </p>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
