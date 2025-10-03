import React from 'react';

interface AvatarProps {
  avatar: {
    type: 'initials' | 'image';
    value: string;
    color?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ avatar, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const textSizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
  }

  if (avatar.type === 'image') {
    return (
      <img
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
        src={avatar.value}
        alt="User avatar"
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-semibold ${sizeClasses[size]} ${avatar.color || 'bg-blue-500'} ${className}`}
    >
      <span className={textSizeClasses[size]}>{avatar.value}</span>
    </div>
  );
};

export default Avatar;