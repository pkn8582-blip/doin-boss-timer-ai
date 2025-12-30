import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="mb-8 text-center">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-2">
        오딘 보스 타이머 AI
      </h1>
      <p className="text-slate-400 text-sm">
        스크린샷을 올리면 보스 젠 시간을 자동으로 계산해드립니다.
      </p>
    </header>
  );
};

export default Header;