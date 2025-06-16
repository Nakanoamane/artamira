import React from 'react';

interface ErrorPageProps {
  statusCode: number;
  message: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ statusCode, message }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <img src="/images/icon.svg" alt="Error Icon" className="w-48 h-48 mb-4" />
      <h2 className="text-5xl font-bold mb-4 text-light-cave-ochre">{statusCode}</h2>
      <p className="text-xl text-cave-ochre">{message}</p>
    </div>
  );
};

export default ErrorPage;
