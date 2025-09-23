

import React from 'react';
// FIX: Update react-router-dom import for v5 compatibility
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const NotFoundScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-6xl font-extrabold text-primary-600">404</h1>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Page not found.
      </h2>
      <p className="mt-4 text-base text-gray-500">
        Sorry, we couldn’t find the page you’re looking for.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button>
          Go back home
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundScreen;